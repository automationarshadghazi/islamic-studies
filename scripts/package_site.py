"""Package a prebuilt static site for upload. No Python is needed to serve it."""
from pathlib import Path
import hashlib
from zipfile import ZipFile, ZIP_DEFLATED
ROOT = Path(__file__).resolve().parents[1]
site = ROOT / 'dist'
for filename in ['index.html', 'app.js', 'study-core.js', 'styles.css', 'content.json', 'favicon.svg', 'SHA256SUMS']:
    if not (site / filename).exists():
        raise SystemExit('Run npm run build first.')
# Verify the build manifest instead of shipping an incomplete or stale upload.
entries = (site / 'SHA256SUMS').read_text().splitlines()
assert len(entries) == 15, 'Rebuild the complete public site first.'
for entry in entries:
    digest, relative = entry.split('  ', 1)
    assert relative in {p.relative_to(site).as_posix() for p in site.rglob('*') if p.is_file()}
    assert hashlib.sha256((site / relative).read_bytes()).hexdigest() == digest
output = ROOT / 'Study_Room_Website_VPS.zip'
with ZipFile(output, 'w', compression=ZIP_DEFLATED) as archive:
    for relative in sorted([entry.split('  ', 1)[1] for entry in entries] + ['SHA256SUMS']):
        archive.write(site / relative, relative)
    archive.write(ROOT / 'DEPLOY.md', 'DEPLOY.md')
    archive.write(ROOT / 'deploy-study-room.sh', 'deploy-study-room.sh')
    archive.write(ROOT / 'WEBSITE_AUDIT.md', 'WEBSITE_AUDIT.md')
with ZipFile(output) as archive:
    assert archive.testzip() is None
    assert 'index.html' in archive.namelist()
    assert not any(name.startswith(('node_modules/', '.git/')) for name in archive.namelist())
    print(f'{output.name}: {len(archive.namelist())} files, {output.stat().st_size:,} bytes')
