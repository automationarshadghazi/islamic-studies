// Pure functions shared by the browser and regression tests. No DOM or storage access.
const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
export function normaliseState(raw) {
  const value = record(raw) ? raw : {};
  const state = {
    reviewed: [],
    checks: {},
    drafts: { 3: "", 4: "" },
    timers: {},
  };
  state.reviewed = Array.isArray(value.reviewed)
    ? [
        ...new Set(
          value.reviewed.filter((x) => typeof x === "string" && x.length < 160),
        ),
      ]
    : [];
  if (record(value.checks))
    for (const [key, checked] of Object.entries(value.checks)) {
      if (/^paper[34]-\d+$/.test(key) && typeof checked === "boolean")
        state.checks[key] = checked;
    }
  for (const paper of ["3", "4"]) {
    if (record(value.drafts) && typeof value.drafts[paper] === "string")
      state.drafts[paper] = value.drafts[paper];
    const saved =
      record(value.timers) && record(value.timers[paper])
        ? value.timers[paper]
        : {};
    const remaining = Number.isFinite(saved.remaining)
      ? Math.max(0, Math.min(5400, Math.floor(saved.remaining)))
      : 5400;
    const end =
      Number.isFinite(saved.end) &&
      saved.end > 0 &&
      saved.end <= Date.now() + 5401000
        ? saved.end
        : null;
    state.timers[paper] = { remaining, end };
  }
  state.practicePaper = value.practicePaper === "4" ? "4" : "3";
  if (
    record(value.last) &&
    ["paper3", "paper4"].includes(value.last.paper) &&
    typeof value.last.section === "string"
  ) {
    state.last = { paper: value.last.paper, section: value.last.section };
  }
  return state;
}
export function normaliseText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘'ʿʾ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function sessionLabel(code) {
  return (
    (code.startsWith("s") ? "May / Jun" : "Oct / Nov") + " 20" + code.slice(1)
  );
}
export function questionText(q) {
  return normaliseText(
    [
      ...Object.values(q),
      sessionLabel(q.session),
      ...(q.session.startsWith("s")
        ? ["May", "June", "Summer"]
        : ["October", "November", "Winter"]
      ).map((month) => `${month} 20${q.session.slice(1)}`),
      `Paper ${q.paper} Question ${q.question} Q${q.question}`,
    ].join(" "),
  );
}
export function secondsLeft(timer, now = Date.now()) {
  return timer.end
    ? Math.max(0, Math.min(5400, Math.ceil((timer.end - now) / 1000)))
    : timer.remaining;
}
export function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function validContent(value) {
  if (!record(value) || value.schemaVersion !== 2 || !record(value.documents))
    return false;
  const ids = ["paper3", "paper4", "guide", "practice3", "practice4", "audit"];
  if (
    !ids.every((id) => {
      const d = Object.hasOwn(value.documents, id) && value.documents[id];
      return (
        record(d) &&
        typeof d.file === "string" &&
        /^[A-Za-z0-9_-]+$/.test(d.file) &&
        typeof d.intro === "string" &&
        Array.isArray(d.sections) &&
        d.sections.every(
          (s) =>
            record(s) &&
            typeof s.id === "string" &&
            /^[a-z0-9-]+$/.test(s.id) &&
            typeof s.title === "string" &&
            typeof s.html === "string" &&
            typeof s.text === "string" &&
            Number.isFinite(s.words),
        ) &&
        new Set(d.sections.map((s) => s.id)).size === d.sections.length &&
        Array.isArray(d.checklist) &&
        d.checklist.every((s) => typeof s === "string")
      );
    })
  )
    return false;
  if (
    !["paper3", "paper4"].every((id, index) => {
      const d = value.documents[id],
        sections = new Set(d.sections.map((s) => s.id));
      return (
        Array.isArray(d.modules) &&
        d.modules.length === (index === 0 ? 4 : 3) &&
        d.modules.every(
          (m) =>
            record(m) &&
            sections.has(m.id) &&
            Array.isArray(m.sections) &&
            m.sections.includes(m.id) &&
            m.sections.every((s) => sections.has(s)),
        )
      );
    })
  )
    return false;
  return (
    Array.isArray(value.questions) &&
    value.questions.length === 70 &&
    value.questions.every(
      (q) =>
        record(q) &&
        ["3", "4"].includes(q.paper) &&
        /^[sw][0-9]{2}$/.test(q.session) &&
        [
          "question",
          "tags",
          "ao1_or_essay_summary",
          "ao2_summary",
          "primary_syllabus",
          "source_file",
        ].every((k) => typeof q[k] === "string"),
    ) &&
    Array.isArray(value.resources) &&
    value.resources.length === 51 &&
    value.resources.every(
      (r) =>
        record(r) &&
        typeof r.filename === "string" &&
        typeof r.review_status === "string" &&
        typeof r.url === "string" &&
        r.url.startsWith("https://"),
    )
  );
}
