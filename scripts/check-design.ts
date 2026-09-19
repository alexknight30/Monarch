import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateDesign, compileStyles, designText, targetSelector, type DesignDocument, type DesignRule } from '../src/lib/design/model';
import { readDesign, saveDesign, DesignConflict, designHistory, readDesignSnapshot } from '../src/lib/design/store';

async function main() {
 const root = await fs.mkdtemp(path.join(os.tmpdir(), 'monarch-design-test-'));
 const rule: DesignRule = { id:'test', node:'m-012345abcdef', page:'/courses', breakpoint:'all', state:'normal', style:{color:'#ffffff',width:'42%'} };
 const doc: DesignDocument = {version:1,rules:[rule]};
 try {
  await fs.mkdir(path.join(root,'src/design'),{recursive:true});
  await fs.writeFile(path.join(root,'src/design/overrides.json'),JSON.stringify({version:1,rules:[]}));
  assert.deepEqual(validateDesign(doc),doc);
  assert.match(compileStyles(doc),/html:where\(\[data-design-page="\/courses"\]\)/);
  assert.match(compileStyles(doc),/width:42% !important/);
  for(const value of ['red; color:blue','url(https://example.com/a)','expression(alert(1))','</style><script>','red!important','red\n']) {
   assert.throws(()=>validateDesign({...doc,rules:[{...rule,style:{color:value}}]}));
  }
  assert.throws(()=>validateDesign({...doc,rules:[{...rule,style:{behavior:'x'}}]}));
  assert.throws(()=>validateDesign({...doc,rules:[rule,rule]}));
  assert.throws(()=>validateDesign({...doc,rules:[{...rule,breakpoint:'invalid'}]}));
  assert.throws(()=>validateDesign({...doc,rules:[{...rule,text:'wrong scope',instance:[{node:rule.node,key:'item'}]}]}));
  const shared = {...rule,id:'shared',page:'*',text:'Shared'};
  const specific = {...rule,id:'specific',text:'Page'};
  assert.equal(designText({version:1,rules:[specific,shared]},rule.node,'/courses','Original'),'Page');
  assert.equal(designText({version:1,rules:[specific,shared]},rule.node,'/planner','Original'),'Shared');
  assert.equal(designText({version:1,rules:[]},rule.node,'/planner','Original'),'Original');
  assert.match(compileStyles({...doc,rules:[{...rule,breakpoint:'mobile'}]}),/@media \(width < 640px\)/);
  assert.match(compileStyles({...doc,rules:[{...rule,state:'focus'}]}),/:focus-visible/);
  assert.equal(targetSelector({node:rule.node,instance:[{node:rule.node,key:'stable-id'}]}),'[data-design-id="m-012345abcdef"][data-design-key="stable-id"]');
  const cascade=compileStyles({version:1,rules:[
   {...rule,id:'mobile-first',breakpoint:'mobile',style:{color:'purple'}},
   {...rule,id:'base-last',style:{color:'orange'}},
   {...rule,id:'shared-instance-last',page:'*',instance:[{node:rule.node,key:'item'}],style:{color:'blue'}},
  ]});
  assert.ok(cascade.indexOf('color:blue')<cascade.indexOf('color:orange'),'Page overrides shared instance defaults');
  assert.ok(cascade.indexOf('color:orange')<cascade.indexOf('color:purple'),'Responsive overrides base independent of save order');
  assert.match(cascade,/:where\(\[data-design-id=/,'Target specificity is neutralized, including ancestor scope');
  const initial = await readDesign(root);
  const saved = await saveDesign(doc,initial.revision,root);
  assert.notEqual(saved.revision,initial.revision);
  assert.deepEqual((await readDesign(root)).document,doc);
  await assert.rejects(saveDesign({version:1,rules:[]},initial.revision,root),DesignConflict);
  assert.deepEqual((await readDesign(root)).document,doc);
  const updated = {...doc,rules:[{...rule,style:{color:'purple'}}]};
  const results = await Promise.allSettled([saveDesign(updated,saved.revision,root),saveDesign({version:1,rules:[]},saved.revision,root)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(results.filter(x=>x.status==='rejected').length,1);
  const snapshots = await fs.readdir(path.join(root,'.design-history'));
  assert.equal(snapshots.length,2);
  const listed=await designHistory(root);assert.equal(listed.length,2);
  assert.equal((await readDesignSnapshot(listed[0].id,root)).version,1);
  await assert.rejects(readDesignSnapshot('../src/design/overrides.json',root));
  const stable = await readDesign(root);
  await assert.rejects(saveDesign({...doc,rules:[{...rule,style:{color:'url(bad)'}}]},stable.revision,root));
  assert.equal((await readDesign(root)).revision,stable.revision);
  console.log('PASS design validation, CSS scopes, responsive rules, text precedence, durable saves, concurrent writer rejection, stale revisions, backups, invalid-save rollback');
 } finally { await fs.rm(root,{recursive:true,force:true}); }
}
void main();
