import {
  normaliseState,
  normaliseText,
  questionText,
  sessionLabel,
  secondsLeft,
  formatTime,
  validContent,
} from "./study-core.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  book: "M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Zm16 0h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h5V4Z",
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  file: "M14 3H5v18h14V8l-5-5Zm0 0v6h5M8 13h8m-8 4h6",
  layers: "m12 3 10 6-10 6L2 9l10-6Zm-9 12 9 6 9-6M3 12l9 6 9-6",
  pen: "m15 4 5 5L8 21H3v-5L15 4Zm-2 2 5 5",
  chart: "M4 3v18h17M8 16v-4m5 4V7m5 9v-7",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  sun: "M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.book}"/></svg>`;
let data,
  state = normaliseState({}),
  storage = true,
  savedDataInvalid = false,
  storageConflict = false,
  route = "",
  filter = { paper: "all", year: "all", text: "" };
try {
  const saved = localStorage.getItem("study-room-v1");
  if (saved) {
    try {
      state = normaliseState(JSON.parse(saved));
    } catch {
      state = normaliseState({});
      savedDataInvalid = true;
    }
  }
  // Reading storage successfully does not prove that writes are allowed.
  localStorage.setItem("study-room-storage-test", "1");
  localStorage.removeItem("study-room-storage-test");
} catch {
  storage = false;
}
const reviewed = () => state.reviewed;
function storageStatus() {
  const el = $("#storage-banner");
  el.hidden = storage && !savedDataInvalid && !storageConflict;
  el.textContent = storageConflict
    ? "Saved data changed in another tab. To avoid overwriting it, saving here is paused. Export any draft, then reload this tab."
    : savedDataInvalid && storage
      ? "Previously saved browser data was damaged and could not be restored. You can still study and save new work; export important drafts."
      : storage
        ? ""
        : "Browser storage is unavailable or full. Changes are only in this session. Export important drafts before leaving.";
}
const persist = () => {
  try {
    if (storageConflict) throw Error("Another tab changed the data");
    localStorage.setItem("study-room-v1", JSON.stringify(state));
    storage = true;
  } catch {
    storage = false;
  }
  storageStatus();
  for (const el of $$(".storage-status"))
    el.textContent = storage
      ? "Saved on this browser"
      : "Not saved to browser. Export important drafts.";
  return storage;
};
// Never silently overwrite another tab's newer work with this tab's older snapshot.
window.addEventListener("storage", (event) => {
  if (event.key === "study-room-v1" || event.key === null) {
    storageConflict = true;
    storage = false;
    storageStatus();
    for (const el of $$(".storage-status"))
      el.textContent =
        "Saving paused: data changed in another tab. Export, then reload.";
  }
});
const notify = (message) => {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 2600);
};
const doc = (id) =>
  data && Object.hasOwn(data.documents, id) ? data.documents[id] : null;
const core = (id) =>
  doc(id).sections.filter((s) =>
    /Section 3\.[1-4]|Section 4\.[1-3]/.test(s.title),
  );
const topicTitle = (s) =>
  s.title.replace(/^Section \d\.\d\s*[—–-]\s*/, "").replace(/^the /, "");
const href = (id, s) => `#/notes/${id}/${s.id}`;
const isReviewed = (id, s) => reviewed().includes(id + ":" + s.id);
const requiredSections = (id, s) =>
  doc(id).modules?.find((m) => m.sections.includes(s.id))?.sections || [s.id];
const moduleReviewed = (id, s) =>
  requiredSections(id, s).every((section) =>
    reviewed().includes(id + ":" + section),
  );
const progress = (id) => core(id).filter((s) => moduleReviewed(id, s)).length;
const total = () => progress("paper3") + progress("paper4");
const button = (text, url, secondary = false) =>
  `<a class="button ${secondary ? "secondary" : ""}" href="${url}">${text}${icon("arrow")}</a>`;
const sectionHead = (title, sub = "", link = "") =>
  `<div class="section-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>${link}</div>`;
const label = (text) => `<span class="eyebrow">${text}</span>`;
const featureIcons = ["layers", "sun", "book", "pen"];
function side() {
  const active = route.split("/")[1] || "home";
  const nav = [
    ["home", "home", "Overview"],
    ["paper3", "book", "Paper 3", "Heritage of Islam"],
    ["paper4", "layers", "Paper 4", "Islam in the modern world"],
    ["practice", "pen", "Practice room"],
    ["past-papers", "file", "Past-paper explorer"],
    ["priorities", "chart", "Revision priorities"],
    ["downloads", "download", "Downloads"],
  ];
  $("#sidebar").innerHTML =
    `<button class="icon-btn drawer-close" aria-label="Close navigation">✕</button><a class="brand" href="#/home"><span class="brand-icon">${icon("book")}</span><span>The Study Room<small>ISLAMIC STUDIES</small></span></a><div class="nav-caption">YOUR STUDY SPACE</div><nav>${nav
      .map(([id, i, t, sub]) => {
        const selected =
          active === id || (active === "notes" && route.split("/")[2] === id);
        return `<a class="nav-item ${selected ? "active" : ""}" href="#/${id}" ${selected ? 'aria-current="page"' : ""}>${icon(i)}<span>${t}${sub ? `<small>${sub}</small>` : ""}</span>${id === "paper3" || id === "paper4" ? '<span class="nav-dot"></span>' : ""}</a>`;
      })
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><div class="side-progress"><div><span>A little progress, every day.</span><strong>${total()} / 7</strong></div><div class="track"><span style="width:${(total() / 7) * 100}%"></span></div><small>Core topics marked as reviewed</small></div><a class="source-nav" href="#/sources">${icon("shield")}Sources & study guidance</a><div class="edition"><span class="edition-dot"></span>OCT / NOV 2026 EDITION</div></div>`;
}
function pageHead(kicker, title, desc, extra = "") {
  return `<div class="page-heading"><div>${label(kicker)}<h1>${title}</h1><p>${desc}</p></div>${extra}</div>`;
}
function paperCard(id, num, title, desc) {
  const n = core(id).length,
    p = progress(id);
  return `<a class="paper-card" href="#/${id}"><div class="paper-card-top"><span class="paper-tag">PAPER ${num}</span><span class="card-arrow">${icon("arrow")}</span></div><h3>${title}</h3><p>${desc}</p><div class="paper-meta"><span>${icon("clock")}90 min</span><span>50 marks</span><span>${n} core topics</span></div><div class="paper-progress"><div class="track"><span style="width:${(p / n) * 100}%"></span></div><small>${p} of ${n} topics reviewed</small></div></a>`;
}
function home() {
  const next = core("paper3")
    .map((s) => ({ id: "paper3", s }))
    .concat(core("paper4").map((s) => ({ id: "paper4", s })))
    .flatMap(({ id, s }) =>
      requiredSections(id, s).map((section) => ({
        id,
        s: doc(id).sections.find((x) => x.id === section),
      })),
    )
    .find((x) => !isReviewed(x.id, x.s));
  const last =
    state.last &&
    doc(state.last.paper)?.sections.find((s) => s.id === state.last.section);
  return `<div class="greeting-line">${label("A LEVEL · ISLAMIC STUDIES")}<span class="quiet">Your own pace. A clearer understanding.</span></div><div class="hero-grid"><section class="welcome"><div class="hero-ornament" aria-hidden="true">✦</div><span class="tiny-rule"></span><h1>A quiet place to<br>build your <em>understanding.</em></h1><p>Less searching. More studying. Notes, practice and past-paper insights for<br class="desktop-br"> Papers 3 and 4, thoughtfully organised in one place.</p><div class="hero-actions">${button(last ? "Continue reading" : "Start with Paper 3", last ? href(state.last.paper, last) : "#/paper3")}<a class="text-link" href="#/practice">Visit the practice room ${icon("arrow")}</a></div><div class="welcome-bottom">${icon("book")}Syllabus-mapped notes <span>·</span> Evidence-led revision <span>·</span> No distractions</div></section><section class="edition-card"><div class="edition-top">YOUR REVISION EDITION <span>✦</span></div><h2>October /<br>November <em>2026</em></h2><div class="edition-rule"></div><p>Cambridge International<br>A Level Islamic Studies <strong>9488</strong></p><div class="edition-foot">Papers <b>03 & 04</b><span>Independent study aid</span></div></section></div>
 ${sectionHead("Choose your paper", "Build the foundations, one topic at a time.")}<div class="paper-grid">${paperCard("paper3", 3, "Heritage of Islam", "Explore leadership, scholarship, philosophy and the art of the Islamic world.")}${paperCard("paper4", 4, "Islam in the modern world", "Connect Islamic teachings to women, pluralism and leadership today.")}</div>
 <div class="lower-grid"><section>${sectionHead("Make your next session count", "A simple path from reading to reasoning.")}<div class="session-list"><a href="${next ? href(next.id, next.s) : "#/practice"}"><span class="step-number">01</span><div><strong>${next ? "Read: " + topicTitle(next.s) : "Put your understanding into practice"}</strong><p>${next ? "Your next unreviewed study chapter. Take it at your own pace." : "All core topics marked. Try a timed practice paper next."}</p></div>${icon("arrow")}</a><a href="#/past-papers"><span class="step-number">02</span><div><strong>See how it has been examined</strong><p>Explore questions across 10 past sessions.</p></div>${icon("arrow")}</a><a href="#/practice"><span class="step-number">03</span><div><strong>Write, reflect, improve</strong><p>Try a question before revealing the answer guidance.</p></div>${icon("arrow")}</a></div></section><aside class="study-note"><span class="note-symbol">${icon("pen")}</span>${label("A NOTE ON GOOD REVISION")}<h3>Understanding over<br> guesswork.</h3><p>Revision priorities are a guide to your preparation—not a promise about the exam. Every syllabus area still matters.</p><a class="text-link" href="#/priorities">Read the evidence ${icon("arrow")}</a></aside></div><div class="bottom-strip">${icon("shield")}<div><strong>Clear sources. Honest limits.</strong><span>Original-paper links, selected case studies and research limitations are always available.</span></div><a href="#/sources" aria-label="Read sources and limitations">${icon("arrow")}</a></div>`;
}
function paper(id) {
  const num = id === "paper3" ? 3 : 4,
    title = num === 3 ? "Heritage of Islam" : "Islam in the modern world";
  const cs = core(id);
  return (
    pageHead(
      `PAPER ${num} · YOUR STUDY MAP`,
      title,
      "Start with the core topics. Return to case studies, evidence and your checklist whenever you need them.",
      `<a class="button secondary" href="downloads/${doc(id).file}.pdf" download>${icon("download")}Download notes</a>`,
    ) +
    `<div class="format-banner">${icon("clock")}<strong>90 minutes · 50 marks</strong><span>${num === 3 ? "One question from each section. Each: AO1 10 + AO2 15." : "Two essays from three. Each: AO1 10 + AO2 15."}</span></div><div class="topic-grid">${cs.map((s, i) => `<a class="topic-card" href="${href(id, s)}"><div class="topic-card-top"><span class="topic-index">0${i + 1}</span><span class="review-state ${moduleReviewed(id, s) ? "done" : ""}">${moduleReviewed(id, s) ? icon("check") + "Reviewed" : "CORE TOPIC"}</span></div><h2>${esc(topicTitle(s))}</h2><p>${esc(s.text.slice(0, 155))}…</p><div class="topic-bottom"><span>${requiredSections(id, s).length > 1 ? requiredSections(id, s).filter((x) => reviewed().includes(id + ":" + x)).length + " / " + requiredSections(id, s).length + " chapters reviewed" : Math.max(1, Math.ceil(s.words / 180)) + " min read"}</span>${icon("arrow")}</div></a>`).join("")}</div>${sectionHead("Keep the whole syllabus in view", "The core topics are a starting point, not the whole of your preparation.")}<div class="support-links">${doc(
      id,
    )
      .sections.filter((s) => !cs.includes(s) && !s.title.includes("checklist"))
      .map(
        (s) =>
          `<a href="${href(id, s)}">${icon("file")}<span>${esc(s.title)}</span>${icon("arrow")}</a>`,
      )
      .join(
        "",
      )}</div><section class="checklist-section"><div class="section-head"><div><h2>Your syllabus checklist</h2><p>Tick when you can explain and evaluate—not just recognise the term.</p></div><span class="saved-label storage-status">${storage ? "Saved on this browser" : "Saving unavailable in this browser"}</span></div>${doc(
      id,
    )
      .checklist.map(
        (s, i) =>
          `<label class="checklist-item"><input type="checkbox" data-check="${id}-${i}" ${state.checks?.[id + "-" + i] ? "checked" : ""}><span>${esc(s)}</span></label>`,
      )
      .join("")}</section>`
  );
}
function reader(id, section) {
  const d = ["paper3", "paper4"].includes(id) ? doc(id) : null,
    s = d?.sections.find((s) => s.id === section);
  if (!s) return notFound();
  state.last = { paper: id, section };
  persist();
  const ix = d.sections.indexOf(s),
    heads = [...s.html.matchAll(/<h3 id="([^"]+)">(.*?)<\/h3>/g)];
  return `<a class="back-link" href="#/${id}">← Back to Paper ${id === "paper3" ? 3 : 4}</a><div class="reader-layout"><div><div class="reader-heading">${label("PAPER " + (id === "paper3" ? 3 : 4) + " · REVISION NOTES")}<h1>${esc(s.title)}</h1><div class="reader-meta"><span>${Math.ceil(s.words / 180)} min read</span><span>Selected case-study route</span><button class="review-button ${isReviewed(id, s) ? "done" : ""}" data-review="${id}:${s.id}">${icon("check")}${isReviewed(id, s) ? "Marked as reviewed" : "Mark as reviewed"}</button></div></div>${
    requiredSections(id, s).length > 1
      ? `<div class="notice"><p><strong>Complete this topic with its case studies.</strong> This topic is counted as reviewed only after all these chapters are marked: ${requiredSections(
          id,
          s,
        )
          .filter((x) => x !== s.id)
          .map((x) => {
            const extra = d.sections.find((z) => z.id === x);
            return `<a href="${href(id, extra)}">${esc(extra.title)}</a>`;
          })
          .join(" · ")}.</p></div>`
      : ""
  }<article class="prose">${s.html.replace(/<input[^>]*>/g, '<span aria-hidden="true">□</span>')}</article><div class="reader-navigation">${ix > 0 ? `<a href="${href(id, d.sections[ix - 1])}"><small>← PREVIOUS</small>${esc(d.sections[ix - 1].title)}</a>` : "<span></span>"}${ix < d.sections.length - 1 ? `<a href="${href(id, d.sections[ix + 1])}"><small>NEXT →</small>${esc(d.sections[ix + 1].title)}</a>` : ""}</div></div><aside class="reading-aside"><span class="nav-caption">ON THIS PAGE</span>${heads.map((h) => `<a href="#${h[1]}" data-jump="${h[1]}">${h[2]}</a>`).join("")}<div class="aside-note">${icon("shield")}<strong>Keep context in view</strong><p>Examples are selected from the permitted syllabus choices. Your class may use different case studies.</p><a href="#/sources">Sources & limitations ↗</a></div><button class="button secondary" id="print-note">Print this topic ${icon("file")}</button></aside></div>`;
}
const session = sessionLabel;
function past() {
  return (
    pageHead(
      "THE QUESTION ARCHIVE",
      "Past-paper explorer",
      "Find a question, notice the wording, then practise your reasoning.",
    ) +
    `<div class="archive-summary"><strong>70 question groups</strong><span>20 papers · 10 sessions · Nov 2021 – Jun 2026</span><a href="downloads/question_audit.csv" download>Download audit CSV ↗</a></div><div class="notice">${icon("shield")}<p><strong>Editorial summaries, not original papers.</strong> Always open the original for exact wording and Paper 3 figures. Only components 32 and 42 are covered; missing sessions and review limits are recorded in <a href="#/sources">sources</a>.</p></div><div class="filters"><label>Search questions<input type="search" id="question-search" placeholder="Topic, keyword or syllabus code…" value="${esc(filter.text)}"></label><label>Paper<select id="paper-filter"><option value="all">Both papers</option><option value="3" ${filter.paper === "3" ? "selected" : ""}>Paper 3</option><option value="4" ${filter.paper === "4" ? "selected" : ""}>Paper 4</option></select></label><label>Year<select id="year-filter"><option value="all">All years</option>${["26", "25", "24", "23", "22", "21"].map((y) => `<option value="${y}" ${filter.year === y ? "selected" : ""}>20${y}</option>`).join("")}</select></label><button class="reset-link" id="clear-filters">Reset</button></div><div id="question-results" aria-live="polite"></div>`
  );
}
function questionResults() {
  const rows = data.questions
    .filter(
      (q) =>
        (filter.paper === "all" || q.paper === filter.paper) &&
        (filter.year === "all" || q.session.slice(1) === filter.year) &&
        questionText(q).includes(normaliseText(filter.text)),
    )
    .slice()
    .reverse();
  $("#question-results").innerHTML =
    `<div class="results-count">${rows.length} question ${rows.length === 1 ? "group" : "groups"}</div>${
      rows.length
        ? rows
            .map(
              (q) =>
                `<article class="question-card"><div class="question-header"><span class="paper-tag">PAPER ${q.paper}</span><span>${session(q.session)} · Q${q.question}</span><span class="syllabus-code">${q.primary_syllabus}</span></div><h3>${esc(q.ao1_or_essay_summary)}</h3>${q.paper === "3" ? `<p><strong>(a) AO1 · 10 marks</strong> ${esc(q.ao1_or_essay_summary)}<br><strong>(b) AO2 · 15 marks</strong> ${esc(q.ao2_summary)}</p>${q.stimulus !== "None" ? `<div class="source-caption">Source stimulus: ${esc(q.stimulus)}</div>` : ""}` : "<p>Essay · 25 marks (AO1 10 + AO2 15)</p>"}<div class="question-footer"><div class="tags">${q.tags
                  .split(";")
                  .slice(0, 4)
                  .map((t) => `<span>${esc(t)}</span>`)
                  .join(
                    "",
                  )}</div><a target="_blank" rel="noopener noreferrer" href="https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/${encodeURIComponent(q.source_file)}">Open original ↗</a></div></article>`,
            )
            .join("")
        : `<div class="empty-state">${icon("search")}<h3>No questions found</h3><p>Try a broader term or reset the filters.</p></div>`
    }`;
}
let timerInterval;
const currentPaper = () => (state.practicePaper === "4" ? "4" : "3");
const currentTimer = () => state.timers[currentPaper()];
const timerValue = () => formatTime(secondsLeft(currentTimer()));
function timerUpdate() {
  const t = currentTimer();
  if (t.end && t.end <= Date.now()) {
    t.remaining = 0;
    t.end = null;
    clearInterval(timerInterval);
    persist();
    notify("Your practice session has finished. Time to reflect.");
  }
  if ($("#timer-display")) {
    $("#timer-display").textContent = timerValue();
    $("#timer-toggle").textContent = t.end
      ? "Pause timer"
      : t.remaining === 0
        ? "Start new session"
        : "Start timer";
  }
}
function resumeTick() {
  clearInterval(timerInterval);
  if (currentTimer().end) timerInterval = setInterval(timerUpdate, 250);
  timerUpdate();
}
function practice() {
  const n = state.practicePaper === "4" ? "4" : "3";
  return (
    pageHead(
      "READ. WRITE. REFLECT.",
      "The practice room",
      "A space to turn what you know into an answer that makes a case.",
    ) +
    `<div class="notice">${icon("pen")}<p><strong>Independent author-written practice.</strong> These are not Cambridge papers or predictions. Answer plans and worked responses are guidance, not guaranteed marks.</p></div><div class="practice-toolbar"><div class="segmented" role="group" aria-label="Choose practice paper"><button data-practice="3" class="${n === "3" ? "selected" : ""}" aria-pressed="${n === "3"}">Paper 3</button><button data-practice="4" class="${n === "4" ? "selected" : ""}" aria-pressed="${n === "4"}">Paper 4</button></div><div class="timer" aria-label="Paper ${n} practice timer">${icon("clock")}<span id="timer-display" aria-label="Practice time remaining">${timerValue()}</span><button id="timer-toggle">${currentTimer().end ? "Pause timer" : currentTimer().remaining === 0 ? "Start new session" : "Start timer"}</button><button id="timer-reset" aria-label="Reset timer to 90 minutes">Reset</button></div></div><section class="practice-paper"><div class="practice-paper-header"><div>${label("PAPER " + n + " · 90 MINUTES · 50 MARKS")}<h2>${n === "3" ? "Heritage of Islam" : "Islam in the modern world"}</h2></div><a class="text-link" href="downloads/${doc("practice" + n).file}.pdf" download>${icon("download")}Question paper</a></div><article class="prose">${doc("practice" + n).intro.replace(/<h1>.*?<\/h1>/, "")}</article></section><section class="answer-workspace"><div class="section-head"><div><h2>Your thinking space</h2><p>Plan an argument or draft your answer. Saved on this browser only.</p></div><button class="text-link" id="export-draft">${icon("download")}Export draft</button></div><label class="sr-only" for="draft">Your Paper ${n} draft</label><textarea id="draft" placeholder="My argument…\n\nEvidence and examples…\n\nAn alternative view…\n\nMy judgement…">${esc(state.drafts?.[n] || "")}</textarea><div class="draft-meta"><span id="draft-words">${(state.drafts?.[n] || "").trim().split(/\s+/).filter(Boolean).length} words</span><span id="draft-save" class="storage-status" role="status">${storage ? "Saved locally · Export a copy to keep it safe" : "Browser storage unavailable · Export to keep your draft"}</span></div></section>${sectionHead("Ready to compare?", "Try the question first. Then reveal only the guidance you need.")}<div class="guidance-list">${doc(
      "guide",
    )
      .sections.filter(
        (s) =>
          (n === "3"
            ? /Paper 3 indicative|Paper 3 Q2/.test(s.title)
            : /Paper 4 indicative|Paper 4 Essay/.test(s.title)) ||
          /How to use|Self-assessment|Flexible seven-session|Additional practice/.test(
            s.title,
          ),
      )
      .map(
        (s) =>
          `<details><summary>${icon("book")}<span>${esc(s.title)}</span><span class="plus">+</span></summary><article class="prose">${s.html}</article></details>`,
      )
      .join(
        "",
      )}</div><a class="button secondary" href="downloads/${doc("guide").file}.pdf" download>Download complete answer guide ${icon("download")}</a>`
  );
}
function priorities() {
  const s = doc("audit").sections.find((s) =>
    s.title.startsWith("Cautious November"),
  );
  return (
    pageHead(
      "PREPARATION, NOT PROPHECY",
      "Revision priorities",
      "Use the evidence to organise your time—not to narrow your syllabus.",
    ) +
    `<div class="confidence-grid"><div><span class="confidence-dot high"></span><strong>High confidence</strong><p>Published format and assessment objectives.</p></div><div><span class="confidence-dot medium"></span><strong>Moderate confidence</strong><p>The value of recurring comparison and evaluation skills.</p></div><div><span class="confidence-dot low"></span><strong>Low confidence</strong><p>Any exact future question, topic or wording.</p></div></div><div class="notice">${icon("shield")}<p><strong>No topic is “due”.</strong> Frequency is not probability. Recent appearances do not rule out repeats. There is no validated forecasting model or permission to skip syllabus areas.</p></div><article class="prose priorities-prose">${s ? s.html : ""}</article><div class="bottom-strip">${icon("chart")}<div><strong>Follow the evidence back to the questions.</strong><span>The complete audit explains counting methods, historical context and gaps.</span></div><a href="downloads/${doc("audit").file}.pdf">Read the audit ↗</a></div>`
  );
}
function downloads() {
  const labels = {
    paper3: ["Paper 3 revision notes", "16 pages · Heritage of Islam"],
    paper4: ["Paper 4 revision notes", "19 pages · Islam in the modern world"],
    practice3: ["Paper 3 practice paper", "2 pages · Questions only"],
    practice4: ["Paper 4 practice paper", "1 page · Questions only"],
    guide: [
      "Practice & answer guide",
      "17 pages · Plans, worked responses and revision schedule",
    ],
    audit: [
      "Past-paper audit & priorities",
      "22 pages · Evidence, question summaries and limitations",
    ],
  };
  return (
    pageHead(
      "KEEP A COPY CLOSE",
      "Your revision library",
      "Read online, save for later, or print what you need. No account required.",
    ) +
    `<div class="download-feature"><div>${label("THE WHOLE REVISION PACK")}<h2>Your study room, to go.</h2><p>All revision PDFs, editable Markdown notes, audit data and maintenance scripts.</p><small>About 0.5 MB · ZIP · Does not include original past-paper PDFs</small></div><a class="button" href="downloads/Paper3_Paper4_Revision_Pack_OctNov2026.zip" download>${icon("download")}Download pack</a></div><div class="download-grid">${Object.entries(
      labels,
    )
      .map(
        ([id, [title, sub]]) =>
          `<a class="download-card" href="downloads/${doc(id).file}.pdf" download><span class="pdf-icon">PDF</span><div><h3>${title}</h3><p>${sub}</p></div>${icon("download")}</a>`,
      )
      .join(
        "",
      )}</div>${sectionHead("Data & original sources", "Useful if you want to explore the audit or check a reference.")}<div class="support-links"><a href="downloads/question_audit.csv" download>${icon("chart")}<span>Question audit · CSV</span>${icon("download")}</a><a href="downloads/resource_manifest.csv" download>${icon("file")}<span>Source register · CSV</span>${icon("download")}</a><a href="#/sources">${icon("shield")}<span>Browse original source links & review status</span>${icon("arrow")}</a></div>`
  );
}
function sources() {
  return (
    pageHead(
      "TRUST STARTS WITH CONTEXT",
      "Sources & study guidance",
      "What this study room covers, what it does not, and how to use it well.",
    ) +
    `<div class="source-facts"><div><strong>20</strong><span>live papers read as text</span></div><div><strong>70</strong><span>question groups audited</span></div><div><strong>51</strong><span>indexed resources</span></div><div><strong>29 Oct 2026</strong><span>research cut-off</span></div></div><article class="prose source-prose"><h2>An independent companion, not an authority</h2><p>This material is not endorsed by Cambridge and does not replace your teacher, textbook or the official 2024–2026 syllabus. Predictions are cautious priorities, not knowledge of the unseen examination. No target November 2026 paper or leak was used.</p><h2>Original files and review coverage</h2><p>The original PDFs were <strong>not downloaded</strong> into this website. Question text from 20 listed component 32/42 papers was read online; source images were not independently inspected. Open the original paper for exact wording and figures. The archive contains editorial summaries.</p><p>Twenty corresponding mark schemes are indexed. Only June 2026 schemes were fully reviewed as extracted text; November 2025 schemes were partly read. Only the official June 2024 report's Paper 3/4 sections were reviewed. A listed source is not a claim that every page was checked.</p><p>May/June 2021 was absent from the discovered index; that is an unresolved gap, not proof it did not exist. Other variants are not established. Specimen questions are excluded from live-paper frequencies. The 2024–2026 syllabus takes precedence over older papers.</p><h2>Selected case studies</h2><p><strong>Paper 3:</strong> Damascus; Ibn al-Haytham with supporting scientific breadth; <em>Hayy ibn Yaqzan</em> and <em>Incoherence</em>; Sultan Ahmed and Djenné.</p><p><strong>Paper 4:</strong> Razia and Noor Jahan; Benazir Bhutto; Muslim Spain; Mauritius and France; Abduh and Iqbal; Mahathir. Early role models Khadija, Aisha and Fatima are also included.</p><p>These are permitted choices, not all optional examples or mandatory Cambridge selections. Keep your class's well-studied alternatives and adapt the frameworks. Evaluate differing interpretations fairly; do not generalise about every Muslim or country from one example.</p><h2>Your progress stays in this browser</h2><p>Review marks, checklists and drafts are stored only in this browser. The app has no accounts or analytics and never sends your drafts or progress to a server. Your host may keep normal web-server access logs. Clearing site data or changing devices will not retain them. Export drafts you want to keep, and edit in one tab at a time. If another tab changes saved data, saving here pauses until you reload, so your older snapshot cannot overwrite newer work. A reviewed topic is a personal marker—not proof of exam readiness. Paper 4 topic totals also require the linked case-study chapters, not just the introductory principles. Timers are saved per paper; switching papers pauses the previous timer. An active timer continues across reloads on this browser.</p><button class="button secondary" id="reset-progress">Reset review marks & checklists</button><p class="small">Drafts are not removed by this reset. Uncheck any individual item instead if you prefer.</p></article><details class="source-register"><summary>Browse the 51 indexed original resources <span>+</span></summary><div class="resource-list">${data.resources.map((r) => `<div><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.filename)} ↗</a><p>${esc(r.review_status)}</p></div>`).join("")}</div></details>`
  );
}
function notFound() {
  return `<div class="empty-state"><h1>That page isn’t in the study room.</h1><p>Let’s get you back to something useful.</p>${button("Back to overview", "#/home")}</div>`;
}
function render() {
  if (!data) return;
  const previous = route;
  route = location.hash.slice(1) || "/home";
  if (!route.startsWith("/")) route = "/" + route;
  const [, page, id, section] = route.split("/");
  const views = {
    home,
    paper3: () => paper("paper3"),
    paper4: () => paper("paper4"),
    practice,
    past: past,
    "past-papers": past,
    priorities,
    downloads,
    sources,
    notes: () => reader(id, section),
  };
  $("#main").innerHTML = (
    Object.hasOwn(views, page) ? views[page] : notFound
  )();
  side();
  closeMenu();
  storageStatus();
  if (page === "past-papers" || page === "past") questionResults();
  if (previous !== route) {
    window.scrollTo(0, 0);
    if (previous) $("#main").focus({ preventScroll: true });
  }
  if (page === "practice") resumeTick();
  document.title =
    (page === "home"
      ? "Overview"
      : page === "notes"
        ? doc(id)?.sections.find((s) => s.id === section)?.title || "Notes"
        : {
            paper3: "Paper 3",
            paper4: "Paper 4",
            practice: "Practice room",
            "past-papers": "Past-paper explorer",
            priorities: "Revision priorities",
            downloads: "Downloads",
            sources: "Sources & guidance",
          }[page] || "Study") + " · The Study Room";
}
function closeMenu() {
  const hadFocus = $("#sidebar").contains(document.activeElement);
  $("#sidebar").classList.remove("open");
  document.body.classList.remove("drawer-open");
  $("#veil").hidden = true;
  $("#menu").setAttribute("aria-expanded", "false");
  $("#sidebar").inert = matchMedia("(max-width:760px)").matches;
  if (hadFocus && $("#sidebar").inert) $("#menu").focus();
}
$("#menu").innerHTML = icon("menu");
$("#search-icon").innerHTML = icon("search");
$("#menu").onclick = () => {
  if (!data) return;
  const open = $("#sidebar").classList.toggle("open");
  $("#sidebar").inert = !open;
  $("#veil").hidden = !open;
  $("#menu").setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("drawer-open", open);
  if (open) $("#sidebar .drawer-close").focus();
};
$("#veil").onclick = closeMenu;
function openSearch() {
  if (!data) return;
  $("#search-dialog").showModal();
  $("#global-search").focus();
  searchResults();
}
$("#search-open").onclick = openSearch;
$("#search-close").onclick = () => $("#search-dialog").close();
$("#search-dialog").addEventListener("click", (e) => {
  if (e.target === $("#search-dialog")) $("#search-dialog").close();
});
function searchResults() {
  const q = $("#global-search").value.trim().toLowerCase();
  const nq = normaliseText(q);
  if (!nq) {
    $("#search-results").innerHTML =
      '<p class="search-placeholder">A topic, a case study, a question.<br>Where would you like to start?</p>';
    return;
  }
  let results = [];
  for (const id of ["paper3", "paper4"])
    for (const s of doc(id).sections)
      if (normaliseText(s.title + " " + s.text).includes(nq)) {
        const pos = s.text.toLowerCase().indexOf(q);
        results.push({
          url: href(id, s),
          title: s.title,
          type: "PAPER " + (id === "paper3" ? 3 : 4) + " · NOTES",
          excerpt: s.text.slice(
            Math.max(0, pos - 45),
            Math.max(0, pos - 45) + 150,
          ),
        });
      }
  for (const r of data.questions)
    if (questionText(r).includes(nq))
      results.push({
        url: "#/past-papers",
        title: r.ao1_or_essay_summary,
        type: `PAPER ${r.paper} · ${session(r.session)} · Q${r.question}`,
        excerpt: r.ao2_summary || "Essay · 25 marks",
        query: q,
      });
  const shown = results.slice(0, 14);
  $("#search-results").innerHTML =
    `<div class="results-count">${results.length} results${results.length > 14 ? " · showing first 14" : ""}</div>` +
    (shown.length
      ? shown
          .map(
            (r) =>
              `<a class="search-result" href="${r.url}" ${r.query ? `data-search-query="${esc(r.query)}"` : ""}><small>${r.type}</small><strong>${esc(r.title)}</strong><span>${esc(r.excerpt)}…</span></a>`,
          )
          .join("")
      : '<div class="empty-state"><h3>No matches yet</h3><p>Try a shorter term, such as “science” or “women”.</p></div>');
}
$("#global-search").addEventListener("input", () => {
  searchResults();
});
document.addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if (
    (e.key === "/" && !typing) ||
    ((e.ctrlKey || e.metaKey) && e.key === "k")
  ) {
    e.preventDefault();
    if (!$("#search-dialog").open) openSearch();
  }
  if (e.key === "Escape") {
    $("#search-dialog").close();
    closeMenu();
  }
  if (e.key === "Tab" && $("#sidebar").classList.contains("open")) {
    const items = $$("#sidebar a, #sidebar button");
    const first = items[0],
      last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#reload-site")) location.reload();
  if (e.target.closest(".drawer-close")) closeMenu();
  const a = e.target.closest("a");
  if (a && $("#search-dialog").open) {
    if (a.dataset.searchQuery) {
      filter.text = a.dataset.searchQuery;
      filter.paper = "all";
      filter.year = "all";
    }
    $("#search-dialog").close();
    if (a.getAttribute("href") === location.hash) render();
  }
  if (a?.getAttribute("href") === "#main") {
    e.preventDefault();
    $("#main").focus({ preventScroll: true });
    $("#main").scrollIntoView({ block: "start", behavior: "instant" });
    return;
  }
  const jump = e.target.closest("[data-jump]");
  if (jump) {
    e.preventDefault();
    const target = document.getElementById(jump.dataset.jump);
    if (target) {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
    target?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    return;
  }
  const review = e.target.closest("[data-review]");
  if (review) {
    const key = review.dataset.review;
    state.reviewed = reviewed().includes(key)
      ? reviewed().filter((k) => k !== key)
      : [...reviewed(), key];
    persist();
    const yes = reviewed().includes(key);
    review.classList.toggle("done", yes);
    review.innerHTML =
      icon("check") + (yes ? "Marked as reviewed" : "Mark as reviewed");
    side();
    notify(
      (yes ? "Chapter marked as reviewed" : "Review mark removed") +
        (storage ? "" : " · Not saved to browser"),
    );
  }
  const p = e.target.closest("[data-practice]");
  if (p && p.dataset.practice !== currentPaper()) {
    const t = currentTimer();
    if (t.end) {
      t.remaining = secondsLeft(t);
      t.end = null;
    }
    state.practicePaper = p.dataset.practice;
    persist();
    render();
  }
  if (e.target.closest("#print-note")) window.print();
  if (e.target.closest("#clear-filters")) {
    filter = { text: "", paper: "all", year: "all" };
    render();
  }
  if (e.target.closest("#timer-toggle")) {
    const t = currentTimer();
    if (t.end) {
      t.remaining = secondsLeft(t);
      t.end = null;
    } else {
      if (t.remaining === 0) t.remaining = 5400;
      t.end = Date.now() + t.remaining * 1000;
    }
    persist();
    resumeTick();
  }
  if (e.target.closest("#timer-reset")) {
    state.timers[currentPaper()] = { remaining: 5400, end: null };
    persist();
    resumeTick();
  }
  if (e.target.closest("#export-draft")) {
    const n = state.practicePaper === "4" ? "4" : "3",
      text = state.drafts?.[n] || "";
    if (!text.trim()) {
      notify("Write something in your thinking space first.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `paper-${n}-revision-draft.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (e.target.closest("#reset-progress")) {
    if (
      confirm(
        "Reset your review marks and checklists on this browser? Your drafts will be kept.",
      )
    ) {
      state.reviewed = [];
      state.checks = {};
      persist();
      render();
      notify("Review marks and checklists reset");
    }
  }
});
document.addEventListener("change", (e) => {
  if (e.target.matches("[data-check]")) {
    state.checks = {
      ...state.checks,
      [e.target.dataset.check]: e.target.checked,
    };
    persist();
  }
  if (e.target.id === "paper-filter") {
    filter.paper = e.target.value;
    questionResults();
  }
  if (e.target.id === "year-filter") {
    filter.year = e.target.value;
    questionResults();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "question-search") {
    filter.text = e.target.value;
    questionResults();
  }
  if (e.target.id === "draft") {
    const n = state.practicePaper === "4" ? "4" : "3";
    state.drafts = { ...state.drafts, [n]: e.target.value };
    persist();
    $("#draft-words").textContent =
      e.target.value.trim().split(/\s+/).filter(Boolean).length + " words";
    $("#draft-save").textContent = storage
      ? "Saved on this browser"
      : "Storage unavailable. Export your draft to keep it.";
  }
});
matchMedia("(max-width:760px)").addEventListener("change", closeMenu);
window.addEventListener("hashchange", render);
fetch("content.json")
  .then((r) => {
    if (!r.ok) throw Error("Content unavailable");
    return r.json();
  })
  .then((d) => {
    if (!validContent(d))
      throw Error("The uploaded content is incomplete or incompatible.");
    data = d;
    render();
    $("#menu").disabled = false;
    $("#search-open").disabled = false;
    resumeTick();
  })
  .catch(() => {
    $("#main").innerHTML =
      '<div class="empty-state"><h1>The study room could not load.</h1><p>Please check your connection, or ask the site owner to check the uploaded files, then reload. You can also try the printable-pack download below.</p><button class="button" id="reload-site">Try again</button><p><a href="downloads/Paper3_Paper4_Revision_Pack_OctNov2026.zip">Download the revision pack</a></p></div>';
  });
