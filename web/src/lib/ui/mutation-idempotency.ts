type StoredMutation = { key: string; signature: string };

function storageKey(scope: string) {
  return `hrms:mutation:${scope}`;
}

export function mutationIdempotencyKey(scope: string, payload: unknown): string {
  const signature = JSON.stringify(payload);
  const name = storageKey(scope);
  try {
    const existing = JSON.parse(window.sessionStorage.getItem(name) || "null") as StoredMutation | null;
    if (existing?.key && existing.signature === signature) return existing.key;
  } catch {
    // A malformed or unavailable session entry is safely replaced below.
  }
  const key = crypto.randomUUID();
  try {
    window.sessionStorage.setItem(name, JSON.stringify({ key, signature } satisfies StoredMutation));
  } catch {
    // The in-memory key still protects this attempt when storage is unavailable.
  }
  return key;
}

export function clearMutationIdempotencyKey(scope: string) {
  try {
    window.sessionStorage.removeItem(storageKey(scope));
  } catch {
    // Storage cleanup is best effort after a confirmed server response.
  }
}
