import { describe, expect, it } from "vitest";
import { callRpc, callRpcEnvelope, callRpcPaged } from "./rpc";

const client = (result: unknown) => ({ rpc: async () => result }) as never;
const ok = (data: unknown, extra: object = {}) => client({ data: { is_success: true, data, message: "done", ...extra }, error: null });

describe("callRpc", () => {
  it("unwraps the envelope", async () => {
    expect(await callRpc(ok({ a: 1 }), "fn_x")).toEqual({ data: { a: 1 }, error: null });
  });
  it("turns a database error and a failed envelope into an error, never data", async () => {
    expect(await callRpc(client({ data: null, error: { message: "denied" } }), "fn_x")).toEqual({ data: null, error: "denied" });
    expect(await callRpc(client({ data: { is_success: false, message: "No access" }, error: null }), "fn_x")).toEqual({ data: null, error: "No access" });
    expect(await callRpc(client({ data: null, error: null }), "fn_x")).toEqual({ data: null, error: "Unknown error" });
  });
  it("sends the function name and params", async () => {
    let seen: unknown[] = [];
    await callRpc({ rpc: async (...a: unknown[]) => ((seen = a), { data: { is_success: true, data: 1 }, error: null }) } as never, "fn_y", { p: 1 });
    expect(seen).toEqual(["fn_y", { p: 1 }]);
  });
});

describe("callRpcEnvelope", () => {
  it("keeps the success message", async () => {
    expect(await callRpcEnvelope(ok(1), "fn_x")).toEqual({ data: 1, message: "done", error: null });
  });
  it("reports failures", async () => {
    expect(await callRpcEnvelope(client({ data: { is_success: false, message: "no" }, error: null }), "fn_x")).toEqual({ data: null, message: null, error: "no" });
  });
});

describe("callRpcPaged", () => {
  it("returns the rows and the total from the paging block, falling back to the row count", async () => {
    expect(await callRpcPaged(ok([1, 2], { paging: { total_records: 9 } }), "fn_x")).toEqual({ data: [1, 2], total: 9, error: null });
    expect(await callRpcPaged(ok([1, 2]), "fn_x")).toEqual({ data: [1, 2], total: 2, error: null });
  });
  it("returns an empty page and the error on failure", async () => {
    expect(await callRpcPaged(client({ data: null, error: { message: "x" } }), "fn_x")).toEqual({ data: [], total: 0, error: "x" });
  });
});
