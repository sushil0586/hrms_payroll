"""Loopback-only read-failure probe for the UI rollout; successes use real Django."""
import http.client
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

fault = False


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.forward()

    def do_POST(self):
        global fault
        if self.path == '/__qa__/fault':
            fault = bool(json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0)))).get('enabled'))
            self.reply(200, b'{"ok":true}', {'Content-Type': 'application/json'})
            return
        self.forward()

    def do_PATCH(self):
        self.forward()

    def reply(self, status, body, headers):
        self.send_response(status)
        for key, value in headers.items():
            if key.lower() not in ['content-length', 'connection', 'transfer-encoding']:
                self.send_header(key, value)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def forward(self):
        if fault and self.command == 'GET' and not self.path.startswith('/api/v1/auth/'):
            self.reply(503, b'{"detail":"Synthetic read unavailable"}', {'Content-Type': 'application/json'})
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        connection = http.client.HTTPConnection('127.0.0.1', 8062, timeout=30)
        try:
            connection.request(self.command, self.path, body=body, headers={key: value for key, value in self.headers.items() if key.lower() not in ['connection', 'host']})
            response = connection.getresponse()
            self.reply(response.status, response.read(), dict(response.getheaders()))
        finally:
            connection.close()

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8063), Handler).serve_forever()
