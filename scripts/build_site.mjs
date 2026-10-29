import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {marked} from 'marked';
const root=new URL('../',import.meta.url),out=new URL('dist/',root);
const read=p=>readFile(new URL(p,root),'utf8');
const slug=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const documents={};
for(const [id,file] of Object.entries({paper3:'02_Paper3_Revision_Notes',paper4:'03_Paper4_Revision_Notes',guide:'04_Practice_Papers_and_Answer_Guide',practice3:'05_Paper3_Practice_Paper',practice4:'06_Paper4_Practice_Paper',audit:'01_Past_Paper_Audit_and_Predictions'})){
 const md=await read(`notes/${file}.md`),parts=md.split(/^## /m),sections=[];
 for(const part of parts.slice(1)){
  const at=part.indexOf('\n'),title=part.slice(0,at).replace(/^\d+\.\s*/,''),body=part.slice(at+1);
  const html=marked.parse(body).replace(/<h3>(.*?)<\/h3>/g,(_,t)=>`<h3 id="${slug(plain(t))}">${t}</h3>`).replace(/<a href="(https?:[^\"]+)"/g,'<a target="_blank" rel="noopener noreferrer" href="$1"');
  sections.push({id:slug(title),title,html,text:plain(html),words:plain(html).split(/\s+/).length});
 }
 documents[id]={id,file,sections,intro:marked.parse(parts[0]),checklist:[...md.matchAll(/^- \[ \] (.+)$/gm)].map(m=>m[1])};
}
// CSV with quoted fields: no runtime dependencies or requests to third parties.
function csv(s){const lines=[];let row=[],cell='',quote=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quote&&s[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(c===','&&!quote){row.push(cell);cell='';}else if(c==='\n'&&!quote){row.push(cell.replace(/\r$/,''));lines.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);lines.push(row);}const head=lines.shift();return lines.filter(r=>r.length===head.length).map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]])));}
const data={documents,questions:csv(await read('data/question_audit.csv')),resources:JSON.parse(await read('sources/resource_manifest.json'))};
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await cp(new URL('website/',root),out,{recursive:true});await mkdir(new URL('downloads/',out));
for(const d of Object.values(documents))await cp(new URL(`notes/${d.file}.pdf`,root),new URL(`downloads/${d.file}.pdf`,out));
for(const file of ['data/question_audit.csv','sources/resource_manifest.csv','Paper3_Paper4_Revision_Pack_OctNov2026.zip'])await cp(new URL(file,root),new URL('downloads/'+file.split('/').pop(),out));
await writeFile(new URL('content.json',out),JSON.stringify(data));
console.log(`Built static site: ${Object.keys(documents).length} documents, ${data.questions.length} question groups, ${data.resources.length} sources. No backend required.`);
