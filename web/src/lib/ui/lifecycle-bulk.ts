export async function postLifecycleBulk(url:string,body:{record_ids:string[];[key:string]:unknown}) {
 let response:Response;
 try {response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}catch {throw new Error('Update outcome could not be confirmed. Reload the queue before retrying.');}
 const payload=await response.json().catch(()=>null);
 if(!response.ok) {
  if(response.status>=500)throw new Error('Update outcome could not be confirmed. Reload the queue before retrying.');
  throw new Error(typeof payload?.detail==='string'?payload.detail: Object.values(payload??{}).filter(Array.isArray).flat().join(' ')||'The requested update was rejected.');
 }
 if(!Number.isSafeInteger(payload?.updated_count)||payload.updated_count<0||payload.updated_count>body.record_ids.length)throw new Error('Update outcome could not be confirmed. Reload the queue before retrying.');
 return payload.updated_count as number;
}
/** These queue changes deliberately load a fresh server document and committed query. */
export function lifecycleNavigate(href:string) {window.location.assign(new URL(href,window.location.origin));}
