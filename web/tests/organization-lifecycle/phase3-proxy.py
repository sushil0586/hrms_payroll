import http.server,urllib.request,urllib.error,json
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
control=Path('/tmp/lifecycle-phase3-fault.json')
class Handler(http.server.BaseHTTPRequestHandler):
 def forward(self):
  headers={k:v for k,v in self.headers.items() if k.lower() not in ['host','connection','content-length']};body=self.rfile.read(int(self.headers.get('Content-Length',0))) or None
  req=urllib.request.Request('http://127.0.0.1:8074'+self.path,data=body,headers=headers,method=self.command)
  try:response=urllib.request.urlopen(req,timeout=90)
  except urllib.error.HTTPError as error:response=error
  data=response.read();status=response.status
  params=parse_qs(urlsplit(self.path).query)
  mode=json.loads(control.read_text()).get('mode','') if control.exists() else ''
  if '/hr-admin/lifecycle-queue/' in self.path and params.get('page_size')==['100']:
   if mode=='unavailable':status=503;data=json.dumps({'detail':'QA source unavailable'}).encode()
   elif params.get('page')==['2'] and status==200 and mode in ['missing','overlap','churn']:
    payload=json.loads(data)
    if mode=='missing':payload['items']=[]
    elif mode=='overlap':payload['items'][-1]=payload['items'][0]
    elif mode=='churn':payload['total_count']+=1
    data=json.dumps(payload).encode()
  self.send_response(status)
  for k,v in response.headers.items():
   if k.lower() not in ['content-length','transfer-encoding','connection','content-encoding']:self.send_header(k,v)
  self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 do_GET=forward;do_POST=forward;do_PATCH=forward;do_DELETE=forward
http.server.ThreadingHTTPServer(('127.0.0.1',8075),Handler).serve_forever()
