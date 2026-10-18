export type JsonMutationResult<T> = {
  ok: boolean;
  payload: T;
  status: number;
};

export async function performJsonMutation<T extends object>(
  input: RequestInfo | URL,
  init: RequestInit,
  networkMessage: string,
): Promise<JsonMutationResult<Partial<T> & { detail?: string }>> {
  try {
    const response = await fetch(input, init);
    const payload = await response.json().catch(() => ({})) as Partial<T> & { detail?: string };
    return { ok: response.ok, payload, status: response.status };
  } catch {
    return {
      ok: false,
      payload: { detail: networkMessage } as Partial<T> & { detail?: string },
      status: 0,
    };
  }
}
