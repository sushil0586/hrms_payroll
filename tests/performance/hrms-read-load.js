import http from "k6/http";
import { check, group, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:8000/api/v1";
const password = __ENV.QA_PASSWORD || "Password@123";
const seed = (__ENV.QA_SEED || "perf-p4").replaceAll("-", "_");
const configuredVus = Number(__ENV.VUS || 1);
const configuredDuration = __ENV.DURATION || "45s";

export const options = {
  scenarios: {
    read_traffic: {
      executor: "constant-vus",
      vus: configuredVus,
      duration: configuredDuration,
      gracefulStop: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
    workflow_duration: ["p(95)<2000"],
    unexpected_auth: ["count==0"],
    server_errors: ["count==0"],
    "http_req_duration{workflow:hr_dashboard}": ["p(95)<2000"],
    "http_req_duration{workflow:employee_directory}": ["p(95)<2000"],
    "http_req_duration{workflow:employee_search}": ["p(95)<2000"],
    "http_req_duration{workflow:attendance_list}": ["p(95)<2000"],
    "http_req_duration{workflow:leave_queue}": ["p(95)<2000"],
    "http_req_duration{workflow:payroll_summary}": ["p(95)<2000"],
    "http_req_duration{workflow:ess_dashboard}": ["p(95)<2000"],
    "http_req_duration{workflow:ess_attendance}": ["p(95)<2000"],
    "http_req_duration{workflow:ess_leave}": ["p(95)<2000"],
    "http_req_duration{workflow:ess_payslips}": ["p(95)<2000"],
    "http_req_duration{workflow:mss_dashboard}": ["p(95)<2000"],
    "http_req_duration{workflow:mss_leave_queue}": ["p(95)<2000"],
    "http_req_duration{workflow:mss_attendance_queue}": ["p(95)<2000"],
    "http_req_duration{workflow:tenant_console}": ["p(95)<2000"],
    "http_req_duration{workflow:tenant_security}": ["p(95)<2000"],
    "http_req_duration{workflow:platform_summary}": ["p(95)<2000"],
    "http_req_duration{workflow:platform_tenants}": ["p(95)<2000"],
  },
  summaryTrendStats: ["avg", "med", "p(90)", "p(95)", "p(99)", "max"],
};

const workflowDuration = new Trend("workflow_duration", true);
const unexpectedAuth = new Counter("unexpected_auth");
const serverErrors = new Counter("server_errors");
const responseOk = new Rate("response_ok");

const personas = {
  hr: `pw_${seed}_hr_admin`,
  ess: `pw_${seed}_employee`,
  mss: `pw_${seed}_manager`,
  tenant: `pw_${seed}_tenant_admin`,
  platform: `pw_${seed}_platform_admin`,
};

function login(identifier) {
  const jar = new http.CookieJar();
  const response = http.post(
    `${baseUrl}/auth/login/`,
    JSON.stringify({ identifier, password }),
    { headers: { "Content-Type": "application/json" }, jar, tags: { workflow: "auth_login" } },
  );
  if (response.status !== 200) {
    console.error(`login failed for ${identifier}: status=${response.status} detail=${response.json("detail") || "unknown"}`);
  }
  check(response, { "login succeeds": (item) => item.status === 200 });
  return response.status === 200 ? response.json("token") : "";
}

export function setup() {
  const tokens = {};
  for (const [role, username] of Object.entries(personas)) {
    tokens[role] = login(username);
  }
  return tokens;
}

function get(token, path, workflow) {
  const startedAt = Date.now();
  const response = http.get(`${baseUrl}${path}`, {
    headers: { Authorization: `Token ${token}` },
    tags: { workflow },
  });
  workflowDuration.add(Date.now() - startedAt, { workflow });
  responseOk.add(response.status === 200, { workflow });
  if (response.status === 401 || response.status === 403) unexpectedAuth.add(1, { workflow });
  if (response.status >= 500) serverErrors.add(1, { workflow });
  check(response, { [`${workflow} returns 200`]: (item) => item.status === 200 });
}

function hrAdmin(token) {
  group("hr-admin", () => {
    get(token, "/hr-admin/dashboard/", "hr_dashboard");
    sleep(0.4);
    get(token, "/hr-admin/employees/?page=1&page_size=50", "employee_directory");
    sleep(0.4);
    get(token, "/hr-admin/employees/?page=1&page_size=25&q=PERF-020", "employee_search");
    sleep(0.4);
    get(token, "/hr-admin/attendance-records/?page=1&page_size=25", "attendance_list");
    sleep(0.4);
    get(token, "/hr-admin/leave-requests/?page=1&page_size=25", "leave_queue");
    sleep(0.4);
    get(token, "/hr-admin/payroll-review-setup/?page=1&page_size=25", "payroll_summary");
  });
}

function ess(token) {
  group("ess", () => {
    get(token, "/me/dashboard/", "ess_dashboard");
    sleep(0.5);
    get(token, "/me/attendance-summary/", "ess_attendance");
    sleep(0.5);
    get(token, "/me/leave-summary/", "ess_leave");
    sleep(0.5);
    get(token, "/me/payroll-payslips/?page=1&page_size=10", "ess_payslips");
  });
}

function mss(token) {
  group("mss", () => {
    get(token, "/manager/team-summary/", "mss_dashboard");
    sleep(0.5);
    get(token, "/manager/leave-requests/pending/?page=1&page_size=25", "mss_leave_queue");
    sleep(0.5);
    get(token, "/manager/attendance-regularizations/pending/?page=1&page_size=25", "mss_attendance_queue");
  });
}

function tenantAdmin(token) {
  group("tenant-admin", () => {
    get(token, "/tenant-admin/console/", "tenant_console");
    sleep(0.6);
    get(token, "/tenant-admin/security-readiness/", "tenant_security");
  });
}

function platformAdmin(token) {
  group("platform-admin", () => {
    get(token, "/platform/summary/", "platform_summary");
    sleep(0.6);
    get(token, "/platform/tenants/?page=1&page_size=25", "platform_tenants");
  });
}

export default function (tokens) {
  const bucket = (__VU - 1) % 10;
  if (bucket < 4) hrAdmin(tokens.hr);
  else if (bucket < 6) ess(tokens.ess);
  else if (bucket < 8) mss(tokens.mss);
  else if (bucket === 8) tenantAdmin(tokens.tenant);
  else platformAdmin(tokens.platform);
  sleep(0.8 + ((__VU % 5) * 0.15));
}
