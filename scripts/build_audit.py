"""Rebuild the human-coded audit, counts and linked source register."""
import csv,json,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=list(csv.DictReader((ROOT/'data/question_audit.csv').open()))
assert len(rows)==70
assert len({(r['session'],r['paper']) for r in rows})==20
base='https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/'
sessions=['w21','s22','w22','s23','w23','s24','w24','s25','w25','s26']
def label(s):return ('May/June ' if s[0]=='s' else 'October/November ')+'20'+s[1:]
resources=[]
for s in sessions:
 for p in [3,4]:
  for k in ['qp','ms']:
   name=f'9488_{s}_{k}_{p}2.pdf'
   status='question text reviewed; images not independently inspected' if k=='qp' else ('fully reviewed as extracted text' if s=='s26' else 'partially reviewed (chunk 1)' if s=='w25' else 'indexed; content not reviewed')
   resources.append(dict(filename=name,session=s,paper=p,kind=k,url=base+name,review_status=status,local_original=False))
for s in ['w21','s22','w22','s23','w23']:
 name=f'9488_{s}_er.pdf'
 resources.append(dict(filename=name,session=s,paper='shared',kind='er',url=base+name,review_status='indexed; not reviewed',local_original=False))
for name,url,status in [
 ('9488_s24_er.pdf','https://www.cambridgeinternational.org/Images/673285-june-2024-examiner-report.pdf','P3/P4 sections reviewed (chunks 2 and 3)'),
 ('9488_2024_2026_syllabus.pdf','https://www.cambridgeinternational.org/Images/636058-2024-2026-syllabus.pdf','A2 content and assessment sections reviewed')]:
 resources.append(dict(filename=name,session='s24' if '_er' in name else '2024-2026',paper='shared',kind='er' if '_er' in name else 'syllabus',url=url,review_status=status,local_original=False))
for p,qid,mid in [(3,751321,751331),(4,751335,751333)]:
 for k,id_,desc in [('sp',qid,'specimen-paper'),('sm',mid,'specimen-mark-scheme-paper')]:
  resources.append(dict(filename=f'9488_2021_{k}_{p}.pdf',session='specimen',paper=p,kind=k,url=f'https://www.cambridgeinternational.org/Images/{id_}-2021-{desc}-{p}.pdf',review_status='question text reviewed; excluded from frequencies' if k=='sp' else 'linked from official index; not reviewed',local_original=False))
(ROOT/'sources/resource_manifest.json').write_text(json.dumps(resources,indent=2)+'\n')
with (ROOT/'sources/resource_manifest.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(resources[0]),lineterminator="\n");w.writeheader();w.writerows(resources)
text=['# Papers 3 and 4 — past-paper audit and November 2026 priorities','',
'Cambridge Islamic Studies 9488 • Research cut-off: 29 October 2026. Independent revision guidance, not Cambridge predictions.','',
'## Read this before the predictions','',
'20 listed live question papers were read as extracted text: components 32 and 42, ten sessions from November 2021 to June 2026. The audit contains 40 Paper 3 question groups (80 separately marked parts) and 30 Paper 4 essays: 110 marked prompts. Two official specimen papers were also checked but are excluded from counts. No target November 2026 paper was sought or used.','',
'**Collection limitation:** original PDF bytes have NOT been downloaded into this repository. Online extraction allowed question reading but does not preserve or reliably describe source images. The CSV/JSON manifests distinguish indexed, partially reviewed and fully reviewed resources. All 20 schemes are linked, but only June 2026 schemes were fully read; November 2025 schemes were partly read. Examiner advice is based on the official June 2024 report, not a claimed review of every report.','',
'May/June 2021 was absent from the discovered index; a direct Paper 3 request redirected to the mirror home page. That does not prove no such paper existed. No other variants or unavailable sessions are silently counted. Older 8053/9013 papers are not treated as 9488 evidence. The 2021–2023 papers belong to an earlier syllabus cycle: they are historical practice evidence, not authority overriding the 2024–2026 syllabus.','',
'## What the exam requires','',
'Paper 3: 90 minutes, 50 marks. Choose one question from Section A and one from Section B. Each has (a) 10 AO1 marks and (b) 15 AO2 marks. Section A(a) requires the figure plus own knowledge. Paper 4: 90 minutes, two essays from three, each 25 marks assessed as AO1 10 and AO2 15. Paper 4 does not divide essays into (a)/(b).','',
'## Counting method','',
'Each CSV row is one 25-mark question, not one sitting or one candidate answer. P3 parts are summarised separately in the row. Tags are human-coded from question wording and are not an official taxonomy. A tag is counted once per question group; multiple tags may overlap. P4 uses women / pluralism / leadership as non-exclusive themes. Counts are descriptions, not probabilities.','',
'## Broad topic coverage','']
for p in [3,4]:
 primary=collections.Counter(r['primary_syllabus'] for r in rows if r['paper']==str(p))
 text += [f'### Paper {p}', '']+[f'- Syllabus {k}: {v} question groups.' for k,v in sorted(primary.items())]+['']
 if p==4:
  for tag in ['women','pluralism','leadership']:
   rr=[r for r in rows if r['paper']=='4' and tag in r['tags'].split(';')]
   text += [f'- {tag.title()} tag (including crossovers): {len(rr)} / 30 essays, across {len(set(r["session"] for r in rr))} / 10 sessions.']
  text+=['Do not add these overlapping counts to obtain a total. In June 2026 both Q1 and Q3 involve other faiths; a neat one-question-per-theme assumption fails.','']
text+=['## Paper 3 recurring question families','']
for section,tags in [('3.1',['religion','architecture','leadership','interfaith']),('3.2',['religion','leadership','science','translation']),('3.3',['reason','natural-signs','significant-work','dawah']),('3.4',['continuity','diversity','texts-versus-buildings','domes'])]:
 for tag in tags:
  rr=[r for r in rows if r['primary_syllabus']==section and tag in r['tags'].split(';')]
  text += [f'- {section}, **{tag}**: {len(rr)}/10 groups; '+', '.join(r['session']+' Q'+r['question'] for r in rr)+'.']
text += ['','Tag boundaries matter: e.g. an art feature might appear without a specific “architecture” tag. Use the complete audit below, not isolated counts.','',
'## Cautious November 2026 forecast: what to rehearse first','',
'**High confidence:** the published format and assessment objectives. **Moderate confidence:** the usefulness of recurring comparison/evaluation skills. **Low confidence:** any exact November topic or wording. There is no validated forecasting model, no numerical likelihood and no reason to regard a topic as “due”. June appearances do not rule out November repeats.','',
'### Paper 3 — first-pass priorities (not exclusions)','',
'1. **Umayyad policy judgement with architecture as evidence.** Practise religious versus political/educational/economic purposes and evaluate Qur’an/Sunnah conformity by individual ruler. Historical anchors: w23 Q1, s24 Q1, w24 Q1, s25 Q1. Refresh interfaith Spain and minarets too: s26 Q1 and w25 Q1 show how the angle changes.','',
'2. **Abbasid openness, science and legacy against dynastic comparison.** Prepare translation → criticism/testing → preservation/transmission, plus religious policy and political power. Anchors: w23 Q2, s24 Q2, s25 Q2, w25 Q2, s26 Q2. Revise one named scientist deeply and supporting medicine breadth so a medical stimulus does not strand you.','',
'3. **Reason, revelation, natural signs and da\'wah.** Prepare two actual works, not biographies alone. The alternation between Greek comparison, natural signs and communicating beliefs is a question-family observation, not a rotation rule: s23/w25 Q3, w23/s25 Q3, w24/s26 Q3.','',
'4. **Meaning of art plus continuity/diversity; buildings versus texts.** Learn two contrasting mosques, gardens/Paradise, calligraphy, geometry and domes. Anchors: w23 Q4 (two mosques), s24/s25 Q4 (change), w25 Q4 (diversity), s26 Q4 (calligraphy/texts). Gardens still need revision despite fewer sampled live occurrences.','',
'### Paper 4 — first-pass priorities (not exclusions)','',
'1. **Justice, consultation, obedience and legitimate criticism.** Combine Qur’anic criteria with the four caliphs, two reformers and a recent leader. Practice democratic mechanisms versus religious principles rather than equating shura with a modern election. Anchors: w22 Q2, s23 Q2, s25 Q1, w25 Q2.','',
'2. **Women’s rights/agency, public leadership and education under real constraints.** Use early, historical and modern women; distinguish Islamic teaching from custom, and eligibility from performance. Anchors: s23 Q1, s24 Q3, w24 Q1, s25 Q2, s26 Q2.','',
'3. **Religious pluralism in practice: majority/minority, law and cooperation.** Prepare two communities, Medina/Umar and the chosen historical case. Define theological disagreement separately from civic equality. Anchors: s23 Q3, s24 Q2, w24 Q3, w25 Q3, s26 Q1/Q3.','',
'4. **Crossovers deliberately.** Women as leaders; leaders protecting non-Muslims; women in minorities; past-to-present comparisons. s23 Q2, w23 Q1/Q3, s24 Q3, s25 Q2 and s26 Q3 are direct warnings against siloed revision.','',
'## Question-by-question audit','',
'These are editorial paraphrases, not a verbatim replacement for the original papers. Always inspect the original source figure. s24 Q1 extraction included an unreliable image description calling al-Aqsa the holiest site; that generated description is not used as exam text or historical evidence. w22 Q2 figure caption could not be recovered.','']
for s in sessions:
 text += [f'### {label(s)} ({s})','']
 for r in [r for r in rows if r['session']==s]:
  u=base+r['source_file']
  text += [f'**Paper {r["paper"]}, Q{r["question"]} — syllabus {r["primary_syllabus"]}**', '']
  if r['paper']=='3':text += [f'- (a), 10 AO1: {r["ao1_or_essay_summary"]}.',f'- (b), 15 AO2: {r["ao2_summary"]}.',f'- Source: {r["stimulus"]}.']
  else:text += [f'- Essay, 25 (AO1 10 + AO2 15): {r["ao1_or_essay_summary"]}.']
  text += [f'- Tags: {r["tags"].replace(";", ", ")}. [Original question paper]({u}).','']
text += ['## Official specimen baseline (not counted)','',
'Paper 3: architectural features and Umayyad Qur’an/Sunnah conformity; Abbasid medicine and education compared with Umayyads; falsafah/revelation; gardens/Paradise and environmental care. Paper 4: significance of two women; respect/equality for other faiths; political leader’s religious commitment. Links are in the manifest.','',
'## Verified examiner/mark-scheme lessons','',
'June 2024 report, P3: distinguish the exact kind of leadership; explicitly interpret the figure; explain scientific methods rather than listing names; compare perspectives in AO2; answer the specified number of features. P4: use relevant contemporary examples and Qur’an/Hadith; answer “which role is greater” rather than merely describing roles; minority-context questions cannot be answered with a majority-country case.','',
'June 2026 schemes: AO1 top level 9–10 requires detailed accurate relevant knowledge and developed understanding. AO2 top level 13–15 requires detailed analysis of the strength/importance of competing views, accurate evidence, coherent argument and a conclusion assessing alternatives. A long list of views without weighing them is insufficient.','',
'**Source criticism matters:** indicative schemes offer creditable arguments, not a flawless history textbook. Do not repeat broad claims that every Abbasid scientist served an Abbasid caliph, or that Islamic art never contained figures. Ibn al-Haytham worked in Fatimid Egypt. Historical evidence should remain precise even where an exam groups intellectual achievements under the Abbasid-era heading.','',
'## Source register and download status','',
'All indexed originals and review statuses are in `sources/resource_manifest.csv` and `.json`. `scripts/download_sources.py` downloads outside this restricted network, checks PDF signatures, detects HTML redirects, records failures and saves SHA-256 hashes. Empty/missing files are not counted as collected. Report links absent from the index are not invented: w25/s26 report requests redirected to the mirror homepage and are not validated resources.','']
for x in resources:
 text += [f'- [{x["filename"]}]({x["url"]}) — {x["review_status"]}; original stored locally: no.']
(ROOT/'notes/01_Past_Paper_Audit_and_Predictions.md').write_text('\n'.join(text)+'\n')
counts={f'P{p}':dict(collections.Counter(t for r in rows if r['paper']==str(p) for t in r['tags'].split(';'))) for p in [3,4]}
(ROOT/'data/topic_counts.json').write_text(json.dumps(counts,indent=2)+'\n')
print('Audit:',len(rows),'groups;',len(resources),'resources')
