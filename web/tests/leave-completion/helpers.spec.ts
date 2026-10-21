import {test,expect} from '@playwright/test';
import {resolveEmployeeCodes} from '@/lib/ui/use-latest-employee-code-resolution';
import {normalizeLeaveHistoryFilters} from '@/lib/ui/leave-history-filters';
import {existingLeaveAssignmentPairs} from '@/lib/ui/leave-import-lookup';

test('date normalization rejects impossible dates and reversed ranges without silently dropping filters',()=>{
 expect(normalizeLeaveHistoryFilters({date_from:'2026-02-30'}).errors).toHaveLength(1);
 expect(normalizeLeaveHistoryFilters({q:'all',leave_type:'all'})).toEqual({filters:{q:'all',leave_type:'all'},errors:[]});
 expect(normalizeLeaveHistoryFilters({month:'0000-01'}).errors).toHaveLength(1);
 expect(normalizeLeaveHistoryFilters({date_from:'2026-10-22',date_to:'2026-10-21'}).errors).toHaveLength(1);
 expect(normalizeLeaveHistoryFilters({month:'2024-02',day:'2024-02-29',q:[' needle ','ignored']})).toEqual({filters:{month:'2024-02',day:'2024-02-29',q:'needle'},errors:[]});
});
test('exact resolver normalizes and deduplicates codes and never uses prefix or first fuzzy match',async()=>{
 const original=global.fetch;const urls:string[]=[];
 try{global.fetch=async input=>{urls.push(String(input));return Response.json({items:[{id:'target',name:'Unrelated name',employee_code:'MATCH'}],total_count:1});};
 const rows=await resolveEmployeeCodes([' MATCH ','match'],new AbortController().signal);expect(rows.get('match')?.id).toBe('target');expect(urls).toHaveLength(1);expect(urls[0]).toContain('employee_code=match');expect(urls[0]).not.toContain('q=');
 global.fetch=async()=>Response.json({items:[{id:'wrong',name:'MATCH',employee_code:'MATCH-1'}],total_count:1});
 await expect(resolveEmployeeCodes(['MATCH'],new AbortController().signal)).rejects.toThrow('unexpected result');
 }finally{global.fetch=original;}
});
test('exact resolver blocks ambiguous results and read failures instead of returning guessed identities',async()=>{
 const original=global.fetch;
 try{global.fetch=async()=>Response.json({items:[{id:'a',employee_code:'MATCH'},{id:'b',employee_code:'match'}],total_count:2});
 await expect(resolveEmployeeCodes(['match'],new AbortController().signal)).rejects.toThrow('ambiguous');
 global.fetch=async()=>Response.json({detail:'unavailable'},{status:503});await expect(resolveEmployeeCodes(['match'],new AbortController().signal)).rejects.toThrow('Employee lookup failed');
 }finally{global.fetch=original;}
});
test('lookup concurrency is bounded and oversized batches fail before network requests',async()=>{
 const original=global.fetch;let active=0,maximum=0,calls=0;
 try{global.fetch=async()=>{calls++;active++;maximum=Math.max(maximum,active);await Promise.resolve();active--;return Response.json({items:[],total_count:0});};
 const result=await resolveEmployeeCodes(Array.from({length:25},(_,i)=>`CODE-${i}`),new AbortController().signal);expect(result.size).toBe(0);expect(maximum).toBeLessThanOrEqual(6);expect(calls).toBe(25);
 await expect(resolveEmployeeCodes(Array.from({length:251},(_,i)=>`CODE-${i}`),new AbortController().signal)).rejects.toThrow('at most 250');expect(calls).toBe(25);
 }finally{global.fetch=original;}
});
test('assignment pair checks are exact deduplicated reads with no mutations',async()=>{
 const original=global.fetch;const calls:Array<{url:string;method:string|undefined}>=[];
 try{global.fetch=async(input,options)=>{calls.push({url:String(input),method:options?.method});return Response.json({total_count:1});};
 const pairs=await existingLeaveAssignmentPairs([{employeeId:'a',policyId:'b'},{employeeId:'a',policyId:'b'}],new AbortController().signal);expect([...pairs]).toEqual(['a|b']);expect(calls).toEqual([{url:'/api/hr-admin/leave-policy-assignments?employee_id=a&leave_policy_id=b&page_size=1',method:undefined}]);
 }finally{global.fetch=original;}
});
test('unavailable assignment lookup never claims there are no existing assignments',async()=>{
 const original=global.fetch;
 try{global.fetch=async()=>Response.json({detail:'unavailable'},{status:503});await expect(existingLeaveAssignmentPairs([{employeeId:'a',policyId:'b'}],new AbortController().signal)).rejects.toThrow('could not be checked');}
 finally{global.fetch=original;}
});

test('audit HTTP transport and incomplete replies remain unconfirmed without automatic POST retries',async()=>{
 const {recordImportBatchAudit}=await import('@/lib/import-batch-audit');
 const original=global.fetch;const input={import_type:'synthetic',status:'previewed' as const,source_hash:'synthetic',row_count:1};let calls=0;
 try{global.fetch=async()=>{calls++;throw new TypeError('Network request interrupted');};expect(await recordImportBatchAudit(input)).toBeNull();expect(calls).toBe(1);
 global.fetch=async()=>Response.json({detail:'unavailable'},{status:503});expect(await recordImportBatchAudit(input)).toBeNull();
 global.fetch=async()=>Response.json({});expect(await recordImportBatchAudit(input)).toBeNull();
 global.fetch=async()=>new Response('not-json');expect(await recordImportBatchAudit(input)).toBeNull();
 global.fetch=async()=>Response.json({id:'confirmed-id',...input});expect((await recordImportBatchAudit(input))?.id).toBe('confirmed-id');
 }finally{global.fetch=original;}
});

test('assignment decisions come from the backend preview with dates and priority, not identity alone',async()=>{
 const {previewLeaveAssignmentRows}=await import('@/lib/ui/leave-import-lookup');const original=global.fetch;const payloads:unknown[]=[];
 const row={leave_policy_id:'policy',employee_id:'employee',priority:777,is_active:true,effective_from:'2026-10-21',effective_to:null,legal_entity_id:null,branch_id:null,department_id:null,grade_id:null,employment_type_id:null};
 try{global.fetch=async(_,options)=>{payloads.push(JSON.parse(String(options?.body)));return Response.json({has_blocking_conflict:false,summary:'Backend permits this dated scope'});};
 expect(await previewLeaveAssignmentRows([row],new AbortController().signal)).toEqual([{blocked:false,message:'Backend permits this dated scope'}]);expect(payloads).toEqual([row]);
 global.fetch=async()=>Response.json({has_blocking_conflict:true,summary:'Backend rejects ambiguity'});expect((await previewLeaveAssignmentRows([row],new AbortController().signal))[0].blocked).toBe(true);
 global.fetch=async()=>Response.json({detail:'Unavailable'},{status:503});await expect(previewLeaveAssignmentRows([row],new AbortController().signal)).rejects.toThrow('could not be checked');
 }finally{global.fetch=original;}
});
