import { PublicAuthFrame } from "@/app/components/public-auth-frame";
import { AccessEntry } from "@/app/login/access-entry";
import { API_BASE_URL, DEMO_DATA_ENABLED } from "@/lib/runtime-flags";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const demoModeWithoutBackend = DEMO_DATA_ENABLED && !API_BASE_URL;
  const params = searchParams ? await searchParams : {};
  const initialMode = params.mode === "request" ? "request" : "signin";

  return <PublicAuthFrame><AccessEntry demoModeWithoutBackend={demoModeWithoutBackend} initialMode={initialMode} /></PublicAuthFrame>;
}
