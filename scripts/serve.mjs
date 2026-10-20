import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
const root=await realpath(fileURLToPath(new URL('../',import.meta.url))),port=Number(process.argv[2]||8182);
const types={'.html':'text/html','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.sysml':'text/plain','.md':'text/plain'};
createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/'||name==='/viewer/'){res.writeHead(302,{Location:'/viewer/index.html'});res.end();return;}let path=await realpath(resolve(root,'.'+name));if(!path.startsWith(root+sep)||path.split(sep).some(x=>x.startsWith('.')))throw Error();if(!(await stat(path)).isFile())throw Error();res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(path));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Architecture viewer: http://127.0.0.1:${port}/`));
