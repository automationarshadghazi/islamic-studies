"""Check audit arithmetic, PDF extraction/bounds, links and the AS removal."""
import collections,csv,json,re
from pathlib import Path
import pymupdf
ROOT=Path(__file__).resolve().parents[1]
rows=list(csv.DictReader((ROOT/'data/question_audit.csv').open()))
assert len(rows)==70
assert collections.Counter(r['paper'] for r in rows)=={'3':40,'4':30}
assert sum(2 if r['paper']=='3' else 1 for r in rows)==110
assert len({(r['session'],r['paper'],r['question']) for r in rows})==70
for s in {r['session'] for r in rows}:
 for p,n in [('3',4),('4',3)]:assert len([r for r in rows if r['session']==s and r['paper']==p])==n
manifest=json.loads((ROOT/'sources/resource_manifest.json').read_text())
assert len(manifest)==51 and len({r['filename'] for r in manifest})==51
assert all(not r['local_original'] for r in manifest)
for r in rows:assert r['source_file'] in {i['filename'] for i in manifest}
counts=json.loads((ROOT/'data/topic_counts.json').read_text())
for p in ['3','4']:
 actual=dict(collections.Counter(t for r in rows if r['paper']==p for t in r['tags'].split(';')))
 assert counts['P'+p]==actual
for p in ROOT.rglob('*'):
 if p.is_file() and '.git' not in p.parts:
  assert not re.match(r'Paper[12]',p.name,re.I),p
  assert not p.name.lower().startswith('hanafi '),p
summary=[]
for path in [ROOT/'README.pdf',*sorted((ROOT/'notes').glob('*.pdf'))]:
 doc=pymupdf.open(path)
 assert doc.page_count>0 and doc.get_toc(),path
 text=''.join(page.get_text() for page in doc)
 assert '\ufffd' not in text and '\x00' not in text, f'Missing glyph in {path}'
 assert len(text)>1000,path
 for page in doc:
  for block in page.get_text('dict')['blocks']:
   for line in block.get('lines',[]):
    for span in line['spans']:
     x0,y0,x1,y1=span['bbox']
     assert 25<=x0<x1<=page.rect.width-25, (path,span)
     assert y0>=25 or y0>page.rect.height-35, (path,span)
     assert y1<=page.rect.height-35 or y0>page.rect.height-35, (path,span)
 summary.append(dict(file=str(path.relative_to(ROOT)),pages=doc.page_count,bookmarks=len(doc.get_toc()),links=sum(len(pg.get_links()) for pg in doc)))
# Local Markdown paths, including those inside the start-guide table.
for path in [ROOT/'README.md',*sorted((ROOT/'notes').glob('*.md'))]:
 for link in re.findall(r'\]\(([^)]+)\)',path.read_text()):
  if not link.startswith(('http:','https:','#')):
   target=path.parent/link
   if link.endswith('.zip') and not target.exists():continue # made after checks
   assert target.exists(),(path,link)
report=dict(audit_groups=70,marked_prompts=110,indexed_resources=51,original_pdfs_locally=0,checks='passed: counts, coverage, glyphs, bounds, bookmarks, local links, old-file removal',pdfs=summary)
(ROOT/'data/quality_report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
