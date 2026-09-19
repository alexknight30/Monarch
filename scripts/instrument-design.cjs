/* Stable source identities. Idempotent; run again after adding UI components. */
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const excluded = new Set(['svg','path','circle','rect','line','polygon','polyline','ellipse','g','defs','clipPath','linearGradient','stop','mask','symbol','use','html','body','style','script','option']);
// Preflight identities before touching any file. Copy/paste must not silently
// attach one saved design rule to two unrelated source elements.
const usedIds = new Map();
function collect(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) { if (!['design','api'].includes(item.name)) collect(file); continue; }
    if (!file.endsWith('.tsx')) continue;
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/data-design-id="(m-[a-f0-9]{12})"/g)) {
      if (usedIds.has(match[1])) throw new Error(`Duplicate design identity ${match[1]} in ${file} and ${usedIds.get(match[1])}. Remove the copied element's data-design-id/data-design-key and unwrap its DesignCopy before rescanning.`);
      usedIds.set(match[1], file);
    }
  }
}
collect(path.join(root,'src','app')); collect(path.join(root,'src','components'));
let files = 0, nodes = 0;
function walk(dir) {
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir,item.name);
    if (item.isDirectory()) { if (item.name !== 'design' && item.name !== 'api') walk(file); continue; }
    if (!file.endsWith('.tsx')) continue;
    const source = fs.readFileSync(file,'utf8');
    const sf = ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const edits = []; let copy = false;
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sf);
        // Link forwards DOM attributes. Other custom components are instrumented at their DOM roots.
        if ((/^[a-z]/.test(tag) || ['Link','Button','Card','IconButton','PlatedButton'].includes(tag)) && !excluded.has(tag)) {
          const attrs = node.attributes.properties;
          const existing = attrs.find(a => ts.isJsxAttribute(a) && a.name.getText(sf) === 'data-design-id');
          if (!existing) {
            let salt = 0, id;
            do { id = 'm-' + createHash('sha256').update(path.relative(root,file)+':'+node.getStart(sf)+':'+salt++).digest('hex').slice(0,12); } while (usedIds.has(id));
            usedIds.set(id, file);
            let insert = ` data-design-id="${id}"`;
            if (['Button','Card','IconButton','PlatedButton'].includes(tag)) insert += ` data-design-key="${id}"`;
            const key = attrs.find(a=>ts.isJsxAttribute(a) && a.name.getText(sf)==='key');
            if (!['Button','Card','IconButton','PlatedButton'].includes(tag) && key?.initializer && ts.isJsxExpression(key.initializer) && key.initializer.expression && /^(?:(?:[\w$]+)(?:\.[\w$]+)*\.(?:id|slug|code)|id|slug|[\w$]+Id)$/.test(key.initializer.expression.getText(sf))) insert += ` data-design-key={${key.initializer.expression.getText(sf)}}`;
            edits.push({start:node.tagName.end,end:node.tagName.end,text:insert}); nodes++;
            if (ts.isJsxOpeningElement(node) && ts.isJsxElement(node.parent)) {
              const children = node.parent.children;
              if (children.length === 1 && ts.isJsxText(children[0]) && children[0].text.trim()) {
                const child = children[0];
                edits.push({start:child.pos,end:child.end,text:`<DesignCopy id="${id}">${source.slice(child.pos,child.end)}</DesignCopy>`}); copy = true;
              }
            }
          }
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(sf);
    if (!edits.length) continue;
    if (copy && !source.includes('import { DesignCopy } from "@/components/design/runtime"')) {
      const directive = sf.statements.find(s=>ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression) && s.expression.text==='use client');
      edits.push({start:directive?.end || 0,end:directive?.end || 0,text:'\nimport { DesignCopy } from "@/components/design/runtime";\n'});
    }
    let out = source;
    for (const edit of edits.sort((a,b)=>b.start-a.start)) out=out.slice(0,edit.start)+edit.text+out.slice(edit.end);
    fs.writeFileSync(file,out); files++;
  }
}
walk(path.join(root,'src','app')); walk(path.join(root,'src','components'));
console.log(`Design identities: ${nodes} elements in ${files} files.`);
