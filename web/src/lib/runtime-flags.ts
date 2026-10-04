export const API_BASE_URL = process.env.HRMS_API_BASE_URL;
export const BEARER_TOKEN = process.env.HRMS_API_BEARER_TOKEN;
export const DEMO_DATA_ENABLED = process.env.HRMS_ENABLE_DEMO_DATA === "true";
export const PAYROLL_LIVE_RAILS_ENABLED = process.env.HRMS_PAYROLL_LIVE_RAILS_ENABLED === "true";

const PRODUCTION_RUNTIME =
  process.env.HRMS_ENVIRONMENT === "production" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

if (PRODUCTION_RUNTIME && DEMO_DATA_ENABLED) {
  throw new Error("HRMS_ENABLE_DEMO_DATA must be false in production runtime.");
}
