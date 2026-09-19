const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monarch-design-scan-'));
try {
  for (const dir of ['src/app','src/components','scripts']) fs.mkdirSync(path.join(root,dir),{recursive:true});
  const script=path.join(root,'scripts/instrument-design.cjs');
  fs.copyFileSync(path.join(__dirname,'instrument-design.cjs'),script);
  const file=path.join(root,'src/app/page.tsx');
  fs.writeFileSync(file, '\"use client\"; export default function Page(){return <section><h1>Hello</h1></section>}');
  const run=()=>spawnSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,NODE_PATH:path.resolve(__dirname,'../node_modules')}});
  let result=run();assert.equal(result.status,0,result.stderr);
  const once=fs.readFileSync(file,'utf8');assert.match(once,/<DesignCopy id=/);
  result=run();assert.equal(result.status,0,result.stderr);assert.equal(fs.readFileSync(file,'utf8'),once,'Second scan must not change files');
  fs.writeFileSync(file,once+'\nexport function Added(){return <p>New copy</p>}');
  result=run();assert.equal(result.status,0,result.stderr);
  const twice=fs.readFileSync(file,'utf8');assert.equal((twice.match(/import \{ DesignCopy \}/g)||[]).length,1,'Adding UI must not duplicate its import');
  const identities=[...twice.matchAll(/data-design-id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(identities).size,identities.length);
  const duplicate=twice+`\nexport function Duplicate(){return <div data-design-id="${identities[0]}"/>}`;
  fs.writeFileSync(file,duplicate);result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/Duplicate design identity/);assert.equal(fs.readFileSync(file,'utf8'),duplicate,'Duplicate preflight must leave source unchanged');
  console.log('PASS source instrumentation: stable rescan, new elements, single import, unique identities, duplicate rejection before writes');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
