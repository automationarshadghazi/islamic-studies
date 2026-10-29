# Islamic Studies 9488 — A Level Papers 3 & 4

## October/November 2026 revision pack

**Start here:** the [past-paper audit and cautious priorities](notes/01_Past_Paper_Audit_and_Predictions.pdf), then the notes for each paper. This is independent revision material, not Cambridge-endorsed or a claim to know the unseen examination.

### Downloads

| Output | PDF | Editable source |
|---|---|---|
| Past-paper audit, topic counts and predictions | [PDF](notes/01_Past_Paper_Audit_and_Predictions.pdf) | [Markdown](notes/01_Past_Paper_Audit_and_Predictions.md) |
| Paper 3: Heritage of Islam — syllabus-mapped notes | [PDF](notes/02_Paper3_Revision_Notes.pdf) | [Markdown](notes/02_Paper3_Revision_Notes.md) |
| Paper 4: Islam in the modern world — syllabus-mapped notes | [PDF](notes/03_Paper4_Revision_Notes.pdf) | [Markdown](notes/03_Paper4_Revision_Notes.md) |
| Two practice papers, all-question plans, worked responses and revision plan | [PDF](notes/04_Practice_Papers_and_Answer_Guide.pdf) | [Markdown](notes/04_Practice_Papers_and_Answer_Guide.md) |
| Standalone Paper 3 practice paper (no answers) | [PDF](notes/05_Paper3_Practice_Paper.pdf) | [Markdown](notes/05_Paper3_Practice_Paper.md) |
| Standalone Paper 4 practice paper (no answers) | [PDF](notes/06_Paper4_Practice_Paper.pdf) | [Markdown](notes/06_Paper4_Practice_Paper.md) |
| This start guide | [PDF](README.pdf) | [Markdown](README.md) |

**One download:** [Papers 3 & 4 revision pack ZIP](Paper3_Paper4_Revision_Pack_OctNov2026.zip). Includes the authored PDFs, editable notes, audit data, source manifests and scripts. **It does not contain the original past-paper PDFs.**

### What the audit actually covers

- **20 live question papers**: components **32 and 42**, ten listed sessions, November 2021 through June 2026.
- **70 question groups / 110 marked prompts**: 40 Paper 3 groups with two parts each; 30 Paper 4 essays.
- Two official specimen question papers checked separately, excluded from frequencies.
- **20 corresponding mark schemes indexed**; June 2026 schemes read fully as extracted text, November 2025 schemes partly read. Other schemes are linked, not represented as reviewed.
- Six examiner reports indexed, with **only the official June 2024 P3/P4 sections reviewed**.
- The **2024–2026 official syllabus** governs content and format. Older papers do not override it.
- No target November 2026 paper, leak or supposed insider material used.

### Important collection limitation

**Original PDF files were not downloaded into this workspace.** Source sites could be read using online text extraction, but direct binary downloads were blocked by the workspace network. The audit is a linked, editorial question summary, not a facsimile archive; source images were not independently inspected. Always open the original Paper 3 figures for source practice.

The discovered index has no May/June 2021 session. Its absence is recorded, not taken as proof that no paper existed. Missing later report links and other variants are not silently filled in. The resource register contains **51 indexed resources** (40 live QP/MS, six reports, four specimen QP/MS, one syllabus), with separate review and local-file statuses.

- [Question-by-question CSV](data/question_audit.csv)
- [Reproducible topic counts](data/topic_counts.json)
- [Original resource links and review status — CSV](sources/resource_manifest.csv)
- [Original resource links and review status — JSON](sources/resource_manifest.json)

To collect the originals on an unrestricted network, download/clone this repository and run:

```sh
python scripts/download_sources.py
```

The downloader rejects HTML redirects and incomplete PDF responses, writes hashes and a per-file result log, and returns a failure status if anything is missing. It needs only Python 3. Originals go to `sources/originals/` (gitignored). A link being indexed is not a claim that it has downloaded successfully.

### What “predictions” means here

Priorities are based on recurring question families, syllabus breadth and the usefulness of transferable evidence. They are **not numerical probabilities**, an “overdue topic” theory, or permission to skip topics. Recent appearances do not eliminate November repeats. Paper 4 can combine themes rather than neatly offer one isolated question per theme.

### Case-study choices

These notes provide one permitted route, not all syllabus alternatives:

- **Paper 3:** Damascus; Ibn al-Haytham with supporting scientific breadth; *Hayy ibn Yaqzan* and *Incoherence*; Sultan Ahmed and Djenné.
- **Paper 4:** Razia and Noor Jahan; Benazir Bhutto; Muslim Spain; Mauritius and France; Abduh and Iqbal; Mahathir. Khadija, Aisha and Fatima are also covered as early role models.

Check these choices against your friends' class notes before revising. Keep a well-prepared alternative and substitute it into the frameworks if their course uses another permitted route. The full topic checklist remains necessary even when examples are optional.

### Recommended order

1. Read the format and cautious priority pages in the audit.
2. Confirm chosen case studies; work through both syllabus checklists.
3. Use the question audit to plan real past-paper answers, viewing the original figures.
4. Sit the two author-written practice papers before opening their answer guidance.
5. Mark AO1 and AO2 separately; correct errors; use the flexible seven-session plan.

No mark, grade or exact exam question is guaranteed. Ask a teacher to calibrate self-marking. Confirm examination dates and component codes with your centre.

### Rebuild and verify

```sh
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/build_audit.py
.venv/bin/python scripts/build_pdfs.py
.venv/bin/python scripts/check_pack.py
.venv/bin/python scripts/package_pack.py
```

Research cut-off: **29 October 2026**. All old Paper 1/2 materials have been removed from the current branch tree at the user's request; this does not rewrite historical Git commits. No pull-request merge is authorised or performed.

## Revision website — The Study Room

A mobile-friendly parchment, dark-red and white study website is included. It offers readable Paper 3/4 notes, search, topic review markers, syllabus checklists, a filtered past-paper explorer, a timed practice room, browser-local drafts, hidden guidance and PDF downloads.

- **Ready-to-host build:** `Study_Room_Website_VPS.zip` (finished static website, not the older revision-content ZIP).
- **Deployment instructions:** [DEPLOY.md](DEPLOY.md).
- **Rebuild:** `npm ci && npm run build` with Node.js 22+; serve the resulting `dist/` folder using Caddy or Nginx.
- **Preview:** `npm start`, then open port 3000.

No database, accounts, analytics or live API is required. Browser-local progress is not exam-readiness scoring. Original-paper/review limitations remain visible throughout the site.
