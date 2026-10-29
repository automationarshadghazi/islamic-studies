import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { validContent } from "../website/study-core.js";
import { createHash } from "node:crypto";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import * as he from "he";
const root = new URL("../", import.meta.url),
  out = new URL("dist/", root);
const read = (p) => readFile(new URL(p, root), "utf8");
const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const plain = (s) =>
  he
    .decode(s.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
const htmlFor = (md) =>
  sanitizeHtml(marked.parse(md), {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "h1",
      "h2",
      "h3",
      "h4",
      "input",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      input: ["type", "disabled", "checked"],
      h3: ["id"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: (tag, attrs) => ({
        tagName: tag,
        attribs: {
          ...attrs,
          ...(/^https?:/.test(attrs.href || "")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {}),
        },
      }),
    },
  });
const documents = {};
for (const [id, file] of Object.entries({
  paper3: "02_Paper3_Revision_Notes",
  paper4: "03_Paper4_Revision_Notes",
  guide: "04_Practice_Papers_and_Answer_Guide",
  practice3: "05_Paper3_Practice_Paper",
  practice4: "06_Paper4_Practice_Paper",
  audit: "01_Past_Paper_Audit_and_Predictions",
})) {
  const md = await read(`notes/${file}.md`),
    parts = md.split(/^## /m),
    sections = [];
  for (const part of parts.slice(1)) {
    const at = part.indexOf("\n"),
      title = part.slice(0, at).replace(/^\d+\.\s*/, ""),
      body = part.slice(at + 1);
    const html = htmlFor(body).replace(
      /<h3>(.*?)<\/h3>/g,
      (_, t) => `<h3 id="${slug(plain(t))}">${t}</h3>`,
    );
    sections.push({
      id: slug(title),
      title,
      html,
      text: plain(html),
      words: plain(html).split(/\s+/).length,
    });
  }
  documents[id] = {
    id,
    file,
    sections,
    intro: htmlFor(parts[0]),
    checklist: [...md.matchAll(/^- \[ \] (.+)$/gm)].map((m) => m[1]),
  };
}
// CSV with quoted fields: no runtime dependencies or requests to third parties.
function csv(s) {
  const lines = [];
  let row = [],
    cell = "",
    quote = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"') {
      if (quote && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else quote = !quote;
    } else if (c === "," && !quote) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" && !quote) {
      row.push(cell.replace(/\r$/, ""));
      lines.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    lines.push(row);
  }
  const head = lines.shift();
  if (quote || lines.some((r) => r.length !== head.length))
    throw Error("Malformed question CSV; refusing to drop records silently.");
  return lines.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
// Each Paper 4 core topic includes its required example chapters. Reviewing only
// the introductory principles must not silently mark the entire topic complete.
for (const id of ["paper3", "paper4"]) {
  const main = documents[id].sections.filter((s) =>
    /^Section [34]\.[1-4]/.test(s.title),
  );
  const companions =
    id === "paper3"
      ? [[], [], [], []]
      : [
          ["Early and historical women"],
          ["Contemporary pluralism"],
          ["Two reformers", "The crossover pages"],
        ];
  documents[id].modules = main.map((s, i) => ({
    id: s.id,
    sections: [
      s.id,
      ...companions[i].map((prefix) => {
        const match = documents[id].sections.find((x) =>
          x.title.startsWith(prefix),
        );
        if (!match) throw Error("Missing required study chapter: " + prefix);
        return match.id;
      }),
    ],
  }));
}
const data = {
  schemaVersion: 2,
  documents,
  questions: csv(await read("data/question_audit.csv")),
  resources: JSON.parse(await read("sources/resource_manifest.json")),
};
if (
  data.questions.length !== 70 ||
  new Set(data.questions.map((q) => [q.session, q.paper, q.question].join(":")))
    .size !== 70 ||
  data.resources.length !== 51
)
  throw Error(
    "Audit/source count mismatch; refusing to publish an incomplete build.",
  );
if (
  !validContent(data) ||
  data.questions.some(
    (q) => !data.resources.some((r) => r.filename === q.source_file),
  )
)
  throw Error("Built content failed its schema/source-coverage checks.");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(new URL("website/", root), out, { recursive: true });
await mkdir(new URL("downloads/", out));
for (const d of Object.values(documents))
  await cp(
    new URL(`notes/${d.file}.pdf`, root),
    new URL(`downloads/${d.file}.pdf`, out),
  );
for (const file of [
  "data/question_audit.csv",
  "sources/resource_manifest.csv",
  "Paper3_Paper4_Revision_Pack_OctNov2026.zip",
])
  await cp(
    new URL(file, root),
    new URL("downloads/" + file.split("/").pop(), out),
  );
await writeFile(new URL("content.json", out), JSON.stringify(data));
const publicFiles = [
  "index.html",
  "app.js",
  "study-core.js",
  "styles.css",
  "content.json",
  "favicon.svg",
  ...Object.values(documents).map((d) => `downloads/${d.file}.pdf`),
  "downloads/question_audit.csv",
  "downloads/resource_manifest.csv",
  "downloads/Paper3_Paper4_Revision_Pack_OctNov2026.zip",
].sort();
await writeFile(
  new URL("SHA256SUMS", out),
  (
    await Promise.all(
      publicFiles.map(
        async (file) =>
          createHash("sha256")
            .update(await readFile(new URL(file, out)))
            .digest("hex") +
          "  " +
          file +
          "\n",
      ),
    )
  ).join(""),
);
console.log(
  `Built static site: ${Object.keys(documents).length} documents, ${data.questions.length} question groups, ${data.resources.length} sources. No backend required.`,
);
