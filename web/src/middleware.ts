import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATH_PREFIXES = ["/ess", "/mss", "/hr-admin", "/finance-manager", "/tenant-admin", "/platform-admin", "/support"];
const PUBLIC_APP_URL = process.env.HRMS_PUBLIC_APP_URL;
const DEMO_DATA_ENABLED = process.env.HRMS_ENABLE_DEMO_DATA === "true";
const API_BASE_URL = process.env.HRMS_API_BASE_URL;

function buildLoginUrl(request: NextRequest) {
  if (PUBLIC_APP_URL) {
    return new URL("/login", PUBLIC_APP_URL);
  }

  const loginUrl = request.nextUrl.clone();
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    loginUrl.host = forwardedHost;
  }
  if (forwardedProto) {
    loginUrl.protocol = `${forwardedProto}:`;
  }

  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return loginUrl;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedPath = PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtectedPath || request.cookies.has("hrms_access_token") || (DEMO_DATA_ENABLED && !API_BASE_URL)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(buildLoginUrl(request));
}

export const config = {
  matcher: ["/ess/:path*", "/mss/:path*", "/hr-admin/:path*", "/finance-manager/:path*", "/tenant-admin/:path*", "/platform-admin/:path*", "/support/:path*"],
};
