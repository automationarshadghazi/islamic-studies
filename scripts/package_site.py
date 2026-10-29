"""Package a prebuilt static site for upload. No Python is needed to serve it."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parents[1]
site = ROOT / 'dist'
for filename in ['index.html', 'app.js', 'styles.css', 'content.json']:
    if not (site / filename).exists():
        raise SystemExit('Run npm run build first.')
output = ROOT / 'Study_Room_Website_VPS.zip'
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
    for file in sorted(site.rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(site))
    archive.write(ROOT / 'DEPLOY.md', 'DEPLOY.md')
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert 'index.html' in archive.namelist()
    assert not any(name.startswith(('node_modules/', '.git/')) for name in archive.namelist())
    print(f'{output.name}: {len(archive.namelist())} files, {output.stat().st_size:,} bytes')
