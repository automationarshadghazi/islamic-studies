"""Bundle authored deliverables only. Never bundle Git history or source originals."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
output=ROOT/'Paper3_Paper4_Revision_Pack_OctNov2026.zip'
paths=[ROOT/'README.md',ROOT/'README.pdf',ROOT/'requirements.txt',ROOT/'DEPLOY.md',ROOT/'WEBSITE_AUDIT.md']
for folder in ['notes','data','scripts','sources']:
 paths.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and p.suffix in ['.pdf','.md','.json','.csv','.py'] and 'originals' not in p.parts and '__pycache__' not in p.parts and p.name not in ['download_report.json','package_site.py'])
with ZipFile(output,'w',compression=ZIP_DEFLATED) as z:
 for path in sorted(paths):z.write(path,path.relative_to(ROOT))
with ZipFile(output) as z:
 assert z.testzip() is None
 assert not any('Paper2' in n or 'Paper1' in n for n in z.namelist())
 print(output.name,len(z.namelist()),'files;',output.stat().st_size,'bytes')
