import { execFile } from 'node:child_process';
import { createApp } from '../server.mjs';

const port=Number(process.env.PORT||3102);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT debe estar entre 1024 y 65535.');
const url=`http://127.0.0.1:${port}`;
function openBrowser(){
  console.log(`Vía Clara lista: ${url}`);
  if(process.platform==='win32')execFile('cmd.exe',['/d','/c','start','',url],{windowsHide:true},error=>{if(error)console.log('Abre la dirección anterior en tu navegador.');});
}
let existing=false;
try{const response=await fetch(url+'/api/config',{signal:AbortSignal.timeout(2000)});const config=await response.json();existing=response.ok&&typeof config.configured==='boolean';}catch{}
if(existing){console.log('El servidor del proyecto ya estaba iniciado.');openBrowser();}
else{
  const server=createApp();
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'El puerto está ocupado por otro proceso. Revisa PORT en .env.local.':'No se pudo iniciar el servidor: '+error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>{openBrowser();console.log('Mantén esta ventana abierta durante la presentación.');});
}
