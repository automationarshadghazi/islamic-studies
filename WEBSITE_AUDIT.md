# Website and deployment re-audit

**29 October 2026 — Papers 3 and 4, Cambridge Islamic Studies 9488**

This is a record of concrete fixes and checks, not a promise of zero bugs or independently verified scholarship. The parchment/dark-red design and static architecture are retained.

## Findings fixed

| Finding | Correction |
| --- | --- |
| Damaged/nested saved values could break draft rendering or read-position lookup. | Schema-normalised local storage: text drafts, boolean checks, valid paper IDs, bounded timers, string review markers. Damaged JSON has a distinct warning. Valid older review marks/drafts remain usable. |
| Prototype-named paper/route values could invoke inherited object properties. | Own-property document/route lookups and explicit reader paper restrictions; invalid routes render the not-found view. |
| Quota/write failures could leave misleading “saved” messages. | Storage is write-tested; dynamic failures show a persistent warning and update status labels. Work remains available in memory and can be exported. |
| Another tab could overwrite newer work with an older entire saved snapshot. | A cross-tab storage change pauses saving in the stale tab, with instructions to export then reload. It is not collaborative editing or multi-device sync. |
| One shared timer reset on reload and was not isolated by paper. | Per-paper persisted deadlines/remaining time; wall-clock calculations handle background delays, reload and expiry; switching papers pauses the previous timer. Starting an expired timer explicitly creates a new session. |
| Paper 4 topic progress could imply case studies were reviewed when only principles were marked. | Women requires principles + women cases; pluralism requires principles + country cases; leadership requires principles + reformers/recent leader + crossover chapter. Cards show chapter counts; readers link companions. Home suggests the next unreviewed required chapter. Seven topic totals are personal review indicators, not proof of syllabus mastery. |
| Search did not consistently match displayed years, session names, question numbers or accented names. | Indexed aliases include full year, month names and Q-number. Apostrophes/diacritics and underscore-separated tags are normalised. Scope labels say revision notes and 70 question groups; hidden answer guidance is not exposed by global search. |
| Plain-text excerpts retained encoded entities; raw Markdown HTML/URLs were not filtered. | Build-time entity decoding and HTML/URL allowlisting. External reference links retain safe new-tab attributes. JSON schema and audit/resource counts are validated. Malformed CSV records are rejected, not silently dropped. |
| Mobile drawer lacked an explicit close control, focus trapping and reliable short-screen scrolling. | Visible close button, Tab/Shift-Tab loop, Escape/focus restoration, scroll lock, scrollable drawer and focus on main after route navigation. |
| Skip-to-content used a fragment that collided with hash routing; contents links scrolled without moving focus. | Both are handled as in-page focus/scroll actions without replacing the current route. |
| Incomplete/incompatible uploaded JSON could half-render pages; unavailable navigation could be activated while loading. | Complete content-shape validation before rendering, disabled loading controls, clear retry/download fallback and safe menu handling. |
| Preview server lacked deliberate HEAD/method handling. | GET/HEAD only, MIME/size/no-cache headers, real-path containment including symlink escape checks; writes rejected. Production uses Nginx, not this preview server. |
| Previous manual deployment instructions did not fit locally unzipped WinSCP uploads or port 9001. | Complete ready-build installer and matching instructions, public-file checksums, missing-package installation, consent/protected-listener checks, atomic releases, config/link backups and health-check rollback. Existing TLS/subdomain config is not guessed or overwritten. |

## Verified results

- **25 browser tests passed**, including the main routes, all 19 revision chapters, malformed saved data/prototype routes, review/checklist reload persistence, companion-chapter progress, persistent per-paper timers and expiry, draft exports/quota errors, cross-tab conflict handling, reset preserving both drafts, search aliases, 320px/mobile layouts, keyboard navigation, skip/contents focus, download signatures, loading/incompatible-data failures and preview methods.
- Automated axe WCAG 2 A/AA checks passed on **8 main pages, all 19 reader chapters and mobile drawer/search/storage-warning states**. This does not replace manual assistive-technology testing or guarantee accessibility for every combination.
- **4 Node unit tests passed** for state validation, search normalisation/session aliases, timer calculations and built-content consistency/sanitisation.
- **13 isolated installer tests passed**: dry-run, missing-package installation without requesting an existing Nginx upgrade, fresh install/repeat update, public-only copying, upload corruption/omitted checksums, invalid arguments/domain input, config-validation rollback, failed-health rollback, missing Nginx include, unknown config refusal, unauthorised listener refusal, protected-process refusal and symlink refusal. The explicit free-port test actually terminates only a socket process created by the test.
- **Bash syntax and ShellCheck passed.** npm audit reported **0 known vulnerabilities** in the installed build/test dependencies at the time of the audit.
- Existing revision-pack QA passed: **70 unique question groups = 40 Paper 3 + 30 Paper 4 = 110 marked prompts**, 20 paper/session combinations, 51 indexed resources, source filename coverage, topic counts, local Markdown links, PDF text/glyph/bounds/bookmark checks and current-tree Paper 1/2 removal.

### Installer test boundary

Installer tests rewrite system paths into temporary directories and simulate Nginx, curl, package managers and service conditions. They exercise control flow, copying, backup/rollback and a real test-owned process stop. **They are not a live Debian/RHEL installation test and do not launch a real Nginx daemon.** Your VPS was not accessed or modified. Public DNS, certificates, custom Nginx layouts, systemd/container supervision and SELinux policy must be verified on your machine. The installer itself runs `nginx -t` and backend health checks before declaring success there.

## Content/logic cross-check

The full Paper 3 and Paper 4 notes were reread for internal consistency; website format, case-study routes, practice instructions, guidance structure, CSV arithmetic, source-status claims and progress groupings were checked against the authored pack. No new unsupported historical “corrections” or exam predictions were invented.

Both papers remain **90 minutes / 50 marks**. Paper 3 selects one Section A and one Section B question, each AO1 10 + AO2 15. Paper 4 selects two of three 25-mark essays, each AO1 10 + AO2 15 within the essay. Selected case studies and the distinctions between teaching, interpretation, history and current law are preserved.

Important existing qualifications remain visible: Ibn al-Haytham worked in Fatimid Egypt; al-Ghazali did not simply ban logic or end science; Djenné's current building is dated 1907; historical coexistence is not modern equal citizenship; French school-symbol and public face-covering laws are distinguished; allegations are not treated as established guilt; optional examples are not labelled compulsory.

### Research limitations retained

- Original Cambridge PDFs are not bundled or locally downloaded. Earlier research read extracted question text from 20 listed papers, not all source figures.
- Only June 2026 mark schemes were fully reviewed as extracted text; November 2025 schemes were partly reviewed. Other listed schemes are indexed, not claimed as fully checked.
- Only the June 2024 examiner report's relevant sections were reviewed. The June 2021 index gap remains unresolved. Variants/specimens are not silently counted as live-paper evidence.
- This follow-up did **not** independently re-fetch and verify every scholarly source or all current 2026 legal changes. Definitions, paraphrases and evaluation need continued teacher/source review. Source links can change.
- Revision priorities are not probabilities, promised questions or permission to omit syllabus areas. Practice papers and model guidance are independent teaching material, not Cambridge documents or guaranteed marks.

## Operational limitations

Browser data is origin/profile-specific and can be cleared, blocked or full. Saving is not a backup service: export important drafts. Timers depend on the device clock and are practice aids, not official exam clocks. Other-tab saving deliberately pauses instead of silently merging conflicting work. Normal web-server access logs may exist; the app does not upload drafts or progress and uses no analytics.

Dependencies, interrupted apps and SELinux policy changes are not automatically undone by release rollback. Old releases/backups are retained rather than deleted automatically. Protected shared listeners require an administrator to remove the exact conflict safely. Existing domain/certificate settings remain your responsibility.
