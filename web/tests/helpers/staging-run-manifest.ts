import { closeSync, existsSync, fsyncSync, openSync, readFileSync, writeSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

const frozenScenarioIds = new Set([
  "STG-E2E-0101",
  "STG-E2E-0102",
  "STG-E2E-0103",
  "STG-E2E-0104",
  "STG-E2E-0105",
  "STG-E2E-0106",
]);

type ResourceOwnership = "created" | "observed" | "unowned";

export type StagingRunResource = {
  resource_type: string;
  resource_id: string;
  tenant_id?: string;
  ownership: ResourceOwnership;
  attributes?: Record<string, string | boolean | null>;
};

type ManifestEvent = {
  schema_version: 1;
  event_id: string;
  event_type: "run_started" | "scenario_started" | "resource_registered" | "scenario_finished" | "cleanup_state";
  recorded_at: string;
  run_id: string;
  scenario_id?: string;
  test_file?: string;
  test_title?: string;
  candidate_git_sha: string;
  deployment: {
    environment_fingerprint: string;
    application_sha: string;
    backend_image_digest: string;
    web_image_digest: string;
  };
  resource?: StagingRunResource;
  result?: "passed" | "failed" | "interrupted";
  cleanup_state?: "not_started" | "planned" | "completed" | "refused";
  evidence_locations?: string[];
};

function required(name: string, fallback = "") {
  const value = process.env[name]?.trim() || fallback;
  if (!value && process.env.STG_TOOLING_REQUIRED === "1") {
    throw new Error(`${name} is required when STG_TOOLING_REQUIRED=1.`);
  }
  return value;
}

function manifestPath() {
  const value = required("STG_RUN_MANIFEST_PATH");
  return value ? path.resolve(value) : "";
}

function runId() {
  return required("STG_RUN_ID", process.env.STG0D_RUN_REF ?? "");
}

function readEvents(target: string): ManifestEvent[] {
  if (!existsSync(target)) return [];
  return readFileSync(target, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as ManifestEvent;
      } catch {
        throw new Error(`Ownership manifest contains an incomplete event at line ${index + 1}.`);
      }
    });
}

function appendEvent(event: Omit<ManifestEvent, "schema_version" | "event_id" | "recorded_at" | "run_id" | "candidate_git_sha" | "deployment">) {
  const target = manifestPath();
  if (!target) return;
  const currentRunId = runId();
  if (!currentRunId) throw new Error("STG_RUN_ID is required when a manifest path is configured.");
  const deployment = {
    environment_fingerprint: required("STG_ENVIRONMENT_FINGERPRINT"),
    application_sha: required("STG_DEPLOYED_APPLICATION_SHA"),
    backend_image_digest: required("STG_BACKEND_IMAGE_DIGEST"),
    web_image_digest: required("STG_WEB_IMAGE_DIGEST"),
  };
  const payload: ManifestEvent = {
    ...event,
    schema_version: 1,
    event_id: crypto.randomUUID(),
    recorded_at: new Date().toISOString(),
    run_id: currentRunId,
    candidate_git_sha: required("STG_CANDIDATE_GIT_SHA"),
    deployment,
  };
  const descriptor = openSync(target, "a", 0o600);
  try {
    writeSync(descriptor, `${JSON.stringify(payload)}\n`, undefined, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

export function validateStagingRunConfiguration() {
  if (process.env.STG_TOOLING_REQUIRED !== "1") return;
  const namespace = required("STG_TENANT_NAMESPACE");
  const recipient = required("STG_SYNTHETIC_ADMIN_EMAIL").toLowerCase();
  required("PLAYWRIGHT_LIVE_PLATFORM_ADMIN_USERNAME");
  required("PLAYWRIGHT_LIVE_PLATFORM_ADMIN_PASSWORD");
  required("STG0D_TENANT_ADMIN_PASSWORD");
  if (!/^pw-qa-stg1-[a-z0-9-]+$/.test(namespace)) throw new Error("STG_TENANT_NAMESPACE is not an approved QA namespace.");
  const approvedDomains = (process.env.STG_APPROVED_SYNTHETIC_EMAIL_DOMAINS ?? "playwright.qa.invalid")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  const recipientDomain = recipient.split("@").at(-1) ?? "";
  if (!approvedDomains.includes(recipientDomain)) {
    throw new Error("Synthetic administrator recipient is outside the approved delivery domains.");
  }
  for (const value of ["STG_SES_DELIVERY_MODE", "STG_SECRET_SOURCE_REF"]) required(value);
  if (process.env.STG_EVIDENCE_API_REQUIRED === "1") {
    required("STG_ENVIRONMENT_FINGERPRINT");
    if (!manifestPath()) throw new Error("STG_RUN_MANIFEST_PATH is required for evidence API collection.");
  }
  const forbidden = (process.env.STG_DISALLOWED_RECIPIENTS ?? "").toLowerCase().split(",").map((item) => item.trim());
  if (forbidden.includes(recipient)) throw new Error("Synthetic administrator recipient is explicitly disallowed.");
}

export function stagingEvidenceApiEnabled() {
  return process.env.STG_EVIDENCE_API_REQUIRED === "1";
}

export function stagingEnvironmentFingerprint() {
  return required("STG_ENVIRONMENT_FINGERPRINT");
}

export function stagingManifestSha256() {
  const target = manifestPath();
  if (!target || !existsSync(target)) throw new Error("The run ownership manifest is unavailable for evidence collection.");
  return createHash("sha256").update(readFileSync(target)).digest("hex");
}

export function beginRun(evidenceLocations: string[] = []) {
  appendEvent({ event_type: "run_started", cleanup_state: "not_started", evidence_locations: evidenceLocations });
}

export function beginScenario(scenarioId: string, testFile: string, testTitle: string) {
  if (!frozenScenarioIds.has(scenarioId)) throw new Error(`Scenario ${scenarioId} is outside the frozen Batch-1 scope.`);
  appendEvent({ event_type: "scenario_started", scenario_id: scenarioId, test_file: testFile, test_title: testTitle });
}

export function registerRunResource(scenarioId: string, resource: StagingRunResource) {
  if (!resource.resource_id || !resource.resource_type) throw new Error("Run resources require an exact type and ID.");
  const target = manifestPath();
  if (target) {
    const collision = readEvents(target).find((event) =>
      event.resource?.resource_type === resource.resource_type &&
      event.resource.resource_id === resource.resource_id,
    );
    if (collision && (collision.run_id !== runId() || collision.resource?.ownership !== resource.ownership)) {
      throw new Error(`Resource ${resource.resource_type}:${resource.resource_id} has conflicting ownership.`);
    }
    if (collision) return;
  }
  appendEvent({ event_type: "resource_registered", scenario_id: scenarioId, resource });
}

export function finishScenario(scenarioId: string, testFile: string, testTitle: string, result: "passed" | "failed" | "interrupted", evidenceLocations: string[] = []) {
  appendEvent({ event_type: "scenario_finished", scenario_id: scenarioId, test_file: testFile, test_title: testTitle, result, evidence_locations: evidenceLocations });
}
