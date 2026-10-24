const fs=require('node:fs');const assert=require('node:assert/strict');const ts=require('typescript');
const source=fs.readFileSync('web/src/lib/complete-report.ts','utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',code)(mod,mod.exports);
(async()=>{const {completeReport}=mod.exports;let checks=[];
await assert.rejects(()=>completeReport(async({page})=>({state:'live',data:{total_count:2,items:page===1?[{id:'a'}]:[]}})),/incomplete/);checks.push('missing later page fails closed');
await assert.rejects(()=>completeReport(async()=>({state:'live',data:{total_count:2,items:[{id:'a'}]}})),/overlap/);checks.push('overlapping page fails closed');
await assert.rejects(()=>completeReport(async()=>({state:'live',data:{total_count:10001,items:[]}})),/interactive limit/);checks.push('over-limit fails closed');
let calls=0;await assert.rejects(()=>completeReport(async({page})=>{calls++;return{state:'live',data:{total_count:page===1?2:3,items:[{id:page===1?'a':'b'}]}}}),/changed/);assert.equal(calls,4);checks.push('persistent count churn fails after one restart');
fs.writeFileSync('docs/qa/evidence/document-makeover-phase5-2026-10-23/completeness-checks.json',JSON.stringify({passed:checks},null,2));})();
