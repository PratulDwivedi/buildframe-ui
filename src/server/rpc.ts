/**
 * Calls to database functions that return the house envelope `{ is_success, data, message, paging? }`.
 * Takes any client with an `rpc` method (a supabase-js client), so the package does not depend on supabase-js.
 */
type RpcClient = { rpc(fn: string, params?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message: string } | null }> };

export interface RpcEnvelope<T> {
  is_success: boolean;
  data: T;
  message: string;
  status_code?: number;
  paging?: { total_records?: number };
}

/**
 * The data on success, otherwise the error text. A failed envelope is an error, never data. Callers must test `error`, not
 * `data`: a successful call may legitimately return null data.
 */
export async function callRpc<T = unknown>(client: RpcClient, fn: string, params: Record<string, unknown> = {}): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await callRpcEnvelope<T>(client, fn, params);
  return { data, error };
}

/** The same, keeping the message on success too (some save functions say what they did, not only that they did). */
export async function callRpcEnvelope<T = unknown>(client: RpcClient, fn: string, params: Record<string, unknown> = {}): Promise<{ data: T | null; message: string | null; error: string | null }> {
  const { data, error } = await client.rpc(fn, params);
  if (error) return { data: null, message: null, error: error.message };
  const env = data as RpcEnvelope<T> | null;
  if (!env?.is_success) return { data: null, message: null, error: env?.message ?? "Unknown error" };
  return { data: env.data, message: env.message ?? null, error: null };
}

/** A paged read: the rows of one page and the TOTAL of the whole search, from the envelope's paging block. */
export async function callRpcPaged<T = unknown>(client: RpcClient, fn: string, params: Record<string, unknown> = {}): Promise<{ data: T[]; total: number; error: string | null }> {
  const { data, error } = await client.rpc(fn, params);
  if (error) return { data: [], total: 0, error: error.message };
  const env = data as { is_success: boolean; data: T[]; message: string; paging?: { total_records?: number } } | null;
  if (!env?.is_success) return { data: [], total: 0, error: env?.message ?? "Unknown error" };
  return { data: env.data ?? [], total: env.paging?.total_records ?? env.data?.length ?? 0, error: null };
}
