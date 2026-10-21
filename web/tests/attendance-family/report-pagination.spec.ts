import {test,expect} from '@playwright/test';
import {completeReport} from '../../src/lib/complete-report';
test('complete report follows effective server page sizes beyond 500',async()=>{
 const items=Array.from({length:531},(_,id)=>({id:String(id)}));let calls=0;
 const result=await completeReport(async({page})=>{calls++;return {state:'live',data:{items:items.slice((page-1)*100,page*100),total_count:531}}});expect(result.data.items).toHaveLength(531);expect(calls).toBe(6);
});
test('complete report rejects changed populations, duplicate pages and missing pages',async()=>{
 for(const kind of ['changed','duplicate','empty'])await expect(completeReport(async({page})=>({state:'live',data:{items:page===1?[{id:'a'}]:kind==='empty'?[]:[{id:kind==='duplicate'?'a':'b'}],total_count:page>1&&kind==='changed'?3:2}}))).rejects.toThrow();
});
test('complete report rejects unavailable sources and interactive overflow',async()=>{
 await expect(completeReport(async()=>{throw new Error('Unavailable')})).rejects.toThrow('Unavailable');await expect(completeReport(async()=>({state:'live',data:{items:[],total_count:10001}}))).rejects.toThrow('interactive limit');
});

test('complete report restarts once after transient materialization',async()=>{
 let calls=0;const result=await completeReport(async({page})=>{calls++;return {state:'live',data:{items:page===1?[{id:'a'}]:[{id:'b'},{id:'c'}],total_count:calls===1?2:3}}});expect(result.data.items.map(x=>x.id)).toEqual(['a','b','c']);expect(calls).toBe(4);
});
