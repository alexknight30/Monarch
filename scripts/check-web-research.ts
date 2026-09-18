import assert from "node:assert/strict";
import {extractWebResearch,researchPublicWeb} from "../src/lib/harness/web-research";
const fixture={status:"completed",output:[{type:"web_search_call"},{type:"message",content:[{type:"output_text",text:"Synthetic research summary.",annotations:[{type:"url_citation",url:"https://example.edu/source",title:"Source"},{type:"url_citation",url:"https://example.edu/source",title:"Source"},{type:"url_citation",url:"javascript:bad",title:"Bad"}]}]}]};
const result=extractWebResearch(fixture);assert.equal(result.results.length,1);assert.equal(result.results[0].url,"https://example.edu/source");assert.equal(result.summary,"Synthetic research summary.");
assert.throws(()=>extractWebResearch({...fixture,status:"incomplete"}),/did not finish/);
assert.throws(()=>extractWebResearch({status:"completed",output:[fixture.output[1]]}),/did not run/);
assert.throws(()=>extractWebResearch({status:"completed",output:[{type:"web_search_call"},{type:"message",content:[{type:"output_text",text:"Invented link https://example.edu",annotations:[]}]}]}),/no verifiable/);
console.log("PASS: source URLs come from provider citations, duplicates/unsafe URLs are removed, incomplete and unsearched responses reject");
if(process.argv.includes("--live")){
  researchPublicWeb("Find NASA's educational explanation of why Earth's seasons occur. Cite its official public page.").then(result=>{
    assert.ok(result.results.some(source=>new URL(source.url).hostname.endsWith("nasa.gov")));assert.ok(result.summary);
    console.log(`PASS: live Grok 4.5 web search returned ${result.results.length} cited sources including NASA`);
  }).catch(error=>{console.error(error);process.exitCode=1;});
}
