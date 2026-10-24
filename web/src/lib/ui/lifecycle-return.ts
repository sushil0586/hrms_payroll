export function lifecycleReturnHref(value:string|string[]|undefined,fallback:string) {
 try {const url=new URL(Array.isArray(value)?value[0]:value??fallback,'https://lifecycle.invalid');if(url.origin!=='https://lifecycle.invalid'||![fallback,'/hr-admin/lifecycle','/hr-admin/reports/lifecycle-queue','/hr-admin/reports/lifecycle-aging'].includes(url.pathname))return fallback;return url.pathname+url.search;}catch{return fallback;}
}
