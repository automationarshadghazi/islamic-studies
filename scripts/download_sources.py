#!/usr/bin/env python3
"""Download indexed public originals; reject redirects to HTML and record failures.

Run from a network allowing Cambridge/PapaCambridge. No third-party dependencies.
Originals and machine-specific download logs are gitignored, not bundled in the pack.
"""
import argparse,hashlib,json,sys,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def valid_pdf(data):
    return data[:1024].lstrip().startswith(b'%PDF-') and b'%%EOF' in data[-4096:]

def download(item,folder,timeout):
    dest=folder/item['filename']
    if dest.exists() and valid_pdf(dest.read_bytes()):
        data=dest.read_bytes();return dict(filename=item['filename'],status='already_present',bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
    error=''
    for attempt in range(2):
        try:
            req=urllib.request.Request(item['url'],headers={'User-Agent':'9488-revision-source-downloader/1.0'})
            with urllib.request.urlopen(req,timeout=timeout) as response:
                data=response.read(25_000_001)
                final=response.url
            if len(data)>25_000_000:raise ValueError('response exceeds 25 MB safety limit')
            if not valid_pdf(data):raise ValueError('not a complete PDF (possibly HTML homepage/error redirect)')
            dest.write_bytes(data)
            return dict(filename=item['filename'],status='downloaded',final_url=final,bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
        except Exception as exc:
            error=f'{type(exc).__name__}: {exc}'
            if attempt==0:time.sleep(.5)
    return dict(filename=item['filename'],status='failed',error=error)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output',type=Path,default=ROOT/'sources/originals')
    p.add_argument('--timeout',type=float,default=20)
    p.add_argument('--limit',type=int,help='Test with the first N resources')
    args=p.parse_args()
    manifest=json.loads((ROOT/'sources/resource_manifest.json').read_text())
    if args.limit is not None:manifest=manifest[:args.limit]
    args.output.mkdir(parents=True,exist_ok=True)
    results=[]
    for item in manifest:
        result=download(item,args.output,args.timeout);results.append(result)
        print(result['status'],item['filename'],flush=True)
    report=args.output.parent/'download_report.json'
    report.write_text(json.dumps(results,indent=2)+'\n')
    failed=sum(x['status']=='failed' for x in results)
    print(f'{len(results)-failed}/{len(results)} complete PDFs; report: {report}')
    return 1 if failed else 0
if __name__=='__main__':sys.exit(main())
