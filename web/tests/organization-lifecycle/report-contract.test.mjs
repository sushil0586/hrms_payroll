import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectLifecycleReport,selectLifecycleReport,lifecycleDaysSince,lifecycleSlaRisk} from '../../src/lib/lifecycle-report.ts';
const item=(id,extra={})=>({id:String(id),item_type:'probation',employee_name:'QA',employee_code:'QA001',owner_value:'',owner_label:'',status:'pending',attention_rank:0,created_at:'2026-01-01T23:00:00Z',next_due_on:'2026-01-02',document_attention_state:'clear',...extra});
const source=rows=>async page=>({items:rows.slice((page-1)*100,page*100),page,page_size:100,total_count:rows.length,has_next:page*100<rows.length,has_previous:page>1});
test('collects all 214 rows and accepts a genuinely empty population',async()=>{const rows=Array.from({length:214},(_,i)=>item(i));assert.equal((await collectLifecycleReport(source(rows))).length,214);assert.deepEqual(await collectLifecycleReport(source([])),[])});
test('rejects missing, duplicate, overlapping and changing pages',async()=>{
 const rows=Array.from({length:114},(_,i)=>item(i));const load=source(rows);
 for(const mutate of [d=>({...d,items:[]}),d=>({...d,items:[...d.items.slice(1),item(0)]}),d=>({...d,total_count:115}),d=>({...d,page:1}),d=>({...d,has_next:true})])await assert.rejects(()=>collectLifecycleReport(async p=>p===1?load(p):mutate(await load(p))));
 await assert.rejects(()=>collectLifecycleReport(source([item(1),item(1)])));
});
test('bounds counts and validates continuation metadata',async()=>{for(const change of [{total_count:10001},{total_count:-1},{total_count:NaN},{page_size:500},{has_previous:true}])await assert.rejects(()=>collectLifecycleReport(async p=>({...await source([])(p),...change})))});
test('record identity includes lifecycle type',async()=>{assert.equal((await collectLifecycleReport(source([item(1),item(1,{item_type:'exit'})]))).length,2)});
test('search is limited to the same visible evidence fields and sorting has stable ties',()=>{const rows=[item('b',{summary:'needle'}),item('a')];assert.deepEqual(selectLifecycleReport(rows,'lifecycle-queue',{q:'needle'}).map(x=>x.id),['b']);assert.deepEqual(selectLifecycleReport(rows,'lifecycle-queue',{q:'2026-01-02'}),[]);assert.deepEqual(selectLifecycleReport(rows,'lifecycle-queue',{}).map(x=>x.id),['a','b']);assert.equal(selectLifecycleReport(rows,'lifecycle-queue',{status:'completed'}).length,0)});
test('aging predicates share an explicit date and owner/escalation filters',()=>{assert.equal(lifecycleDaysSince('2026-01-01T23:00:00-06:00','2026-01-04'),2);assert.equal(lifecycleDaysSince('invalid','2026-01-04'),0);const row=item(1);assert.equal(lifecycleSlaRisk(row,'2026-01-04'),'High');assert.equal(selectLifecycleReport([row],'lifecycle-aging',{sla_risk:'High',age_bucket:'0-7 days'},'2026-01-04').length,1);assert.equal(selectLifecycleReport([row],'lifecycle-aging',{escalation:'scheduled'},'2026-01-04').length,0)});
