"""Retain real final-build CSV/manifest bytes from an owned 128-row QA population."""
import csv,hashlib,http.cookiejar,io,json,os,shutil,subprocess,tempfile,time,urllib.request
from pathlib import Path
repo=Path(__file__).resolve().parents[3];root=repo/'docs/qa/evidence/organization-lifecycle-phase3-2026-10-23';folder=Path(tempfile.mkdtemp(prefix='hrms-lifecycle-phase3-export-'));manifest=folder/'workspace.json';seed=('phase3-export-'+str(int(time.time())))[:32]
def command(*args,env=None):return subprocess.check_output([str(repo/'.venv/bin/python'),'backend/manage.py',*args],cwd=repo,env=env or os.environ).decode()
provisioned=False;cleanup={}
try:
 command('manage_playwright_workspace','--seed-ref',seed,'--output-file',str(manifest));provisioned=True;m=json.loads(manifest.read_text());env={**os.environ,'QA_LIFECYCLE_MANIFEST':str(manifest)}
 with (root/'fixtures.jsonl').open('a') as f:f.write(json.dumps({'seedRef':seed,'tenant':m['tenant'],'tempDir':str(folder)})+'\n')
 command('shell','-c',"exec(open('web/tests/organization-lifecycle/phase3-fixtures.py').read())",env=env);context=json.loads(manifest.with_name('lifecycle-phase3-context.json').read_text())
 with (root/'foreign-fixtures.jsonl').open('a') as f:f.write(json.dumps({'id':context['foreign_tenant'],'code':m['tenant']['code']+'-foreign'})+'\n')
 opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));base='http://127.0.0.1:3274'
 request=urllib.request.Request(base+'/api/auth/login',data=json.dumps({'identifier':m['credentials']['hr_admin']['username'],'password':'Password@123'}).encode(),headers={'Content-Type':'application/json'},method='POST')
 with opener.open(request) as response:assert response.status==200
 out=root/'exports';out.mkdir(exist_ok=True);proof=[]
 for key in ['lifecycle-queue','lifecycle-aging']:
  query='?q=QA&sort=employee&as_of='+context['today'];
  with opener.open(base+'/api/hr-admin/reports/'+key+query) as response:
   raw=response.read();headers={k:v for k,v in response.headers.items() if k.lower().startswith("x-hrms-") or k.lower() in ["content-type","content-disposition"]};assert response.status==200;assert int(response.headers['X-HRMS-Source-Row-Count'])==context['expected_count']
  with opener.open(base+'/api/hr-admin/reports/'+key+query+'&format=manifest') as response:metadata_raw=response.read();metadata=json.loads(metadata_raw);assert response.status==200
  rows=list(csv.DictReader(io.StringIO(raw.decode())));checksum=hashlib.sha256(raw).hexdigest();assert len(rows)==context['expected_count']==metadata['row_count'] and len(rows)>100;assert checksum==metadata['csv_checksum_sha256'];assert metadata['filters']['as_of']==context['today']
  (out/(key+'.csv')).write_bytes(raw);(out/(key+'-manifest.json')).write_bytes(metadata_raw);proof.append({'report':key,'row_count':len(rows),'checksum':checksum,'csv_bytes':len(raw),'as_of':context['today'],'headers':headers})
 (out/'verification.json').write_text(json.dumps({'seedRef':seed,'tenant':m['tenant'],'reports':proof},indent=2)+'\n')
 with (root/'inline-browser.txt').open('w') as log:
  subprocess.run([str(repo/'web/node_modules/.bin/playwright'),'test','--config','web/playwright.lifecycle-phase3-inline.config.ts'],cwd=repo,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
finally:
 if provisioned:
  env={**os.environ,'QA_LIFECYCLE_MANIFEST':str(manifest),'QA_LIFECYCLE_CLEANUP':'1'}
  try:command('shell','-c',"exec(open('web/tests/organization-lifecycle/phase3-fixtures.py').read())",env=env)
  finally:
   command('manage_playwright_workspace','--seed-ref',seed,'--cleanup','--output-file',str(manifest));cleanup=json.loads(manifest.read_text());assert cleanup['verified_absent']
 shutil.rmtree(folder);(root/'export-fixture-cleanup.json').write_text(json.dumps({'seedRef':seed,'verified_absent':cleanup.get('verified_absent',False),'temp_directory_absent':not folder.exists()},indent=2)+'\n')
