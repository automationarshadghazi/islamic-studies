import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist'),port=Number(process.env.PORT||3000);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.pdf':'application/pdf','.csv':'text/csv; charset=utf-8','.zip':'application/zip'};
http.createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://preview').pathname);if(p.endsWith('/'))p+='index.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'}).end(data);}catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Not found');}}).listen(port,'0.0.0.0',()=>console.log(`Revision website listening on 0.0.0.0:${port}`));
