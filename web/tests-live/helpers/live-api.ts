import { expect, request as apiRequest } from "@playwright/test";

import { seededPassword, type SeededPersona } from "./auth";

const backendURL = process.env.PLAYWRIGHT_LIVE_BACKEND_URL ?? "http://127.0.0.1:8010";

const personaIdentifiers: Record<SeededPersona, string> = {
  employee: "riya.sharma",
  manager: "karan.mehta",
  hrAdmin: "nisha.rao",
};

export async function getLiveApiToken(persona: SeededPersona) {
  const context = await apiRequest.newContext();
  const response = await context.post(`${backendURL}/api/v1/auth/login/`, {
    data: {
      identifier: personaIdentifiers[persona],
      password: seededPassword,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { token: string };
  await context.dispose();
  expect(payload.token).toBeTruthy();
  return payload.token;
}

export async function liveApiGet<T>(path: string, token: string) {
  const context = await apiRequest.newContext({
    extraHTTPHeaders: { Authorization: `Token ${token}` },
  });
  const response = await context.get(`${backendURL}/api/v1${path}`);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as T;
  await context.dispose();
  return payload;
}
