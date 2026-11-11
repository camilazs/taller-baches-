import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeImage } from '../vision.mjs';

test('contrato Gemini compatible transmite foto y esquema al endpoint configurado (sin llamada real)', async()=>{
  const names=['AI_API_KEY','AI_BASE_URL','AI_MODEL'];
  const before=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const analysis={category:'no_concluyente',confidence:'baja',summary:'PRUEBA DE CONTRATO, no detección real.',warnings:[],detections:[]};
  try{
    process.env.AI_API_KEY='contract-test-not-a-real-key';
    process.env.AI_BASE_URL='https://generativelanguage.googleapis.com/v1beta/openai';
    process.env.AI_MODEL='gemini-3.5-flash-lite';
    const result=await analyzeImage(photo,async(url,options)=>{
      assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
      assert.equal(options.redirect,'error');
      const body=JSON.parse(options.body);
      assert.equal(body.model,'gemini-3.5-flash-lite');
      assert.equal(body.messages[1].content[1].image_url.url,photo);
      assert.equal(body.response_format.type,'json_schema');
      return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:JSON.stringify(analysis)}}]})};
    });
    assert.deepEqual(result,analysis);
  }finally{for(const name of names)if(before[name]===undefined)delete process.env[name];else process.env[name]=before[name];}
});
