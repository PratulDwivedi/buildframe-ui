// @vitest-environment node
import { describe, expect, it } from "vitest";
import { provesRecovery, sealRecovery } from "./recovery";

const NOW = 1_800_000_000;
const SECRET = "server-secret";
// What Supabase Auth really records when an emailed reset link's token_hash is redeemed: method "otp" (read 2026-11-27).
const claims = { sub: "user-1", session_id: "sess-1", amr: [{ method: "otp", timestamp: NOW - 60 }] };
const seal = sealRecovery(claims, SECRET, NOW)!;

describe("recovery proof: choosing a new password without the old one", () => {
  it("holds for the session the reset link made, for ten minutes", () => {
    expect(provesRecovery(seal, claims, SECRET, NOW)).toBe(true);
    expect(provesRecovery(seal, claims, SECRET, NOW + 500)).toBe(true);
    expect(provesRecovery(sealRecovery({ ...claims, amr: [{ method: "recovery", timestamp: NOW }] }, SECRET, NOW)!, { ...claims, amr: [{ method: "recovery", timestamp: NOW }] }, SECRET, NOW)).toBe(true);
  });
  it("is refused after ten minutes", () => expect(provesRecovery(seal, claims, SECRET, NOW + 601)).toBe(false));
  it.each([undefined, null, "", "1", "9999999999.abc"])("is refused for a made up cookie %s", (v) => {
    expect(provesRecovery(v, claims, SECRET, NOW)).toBe(false);
  });
  it("is refused for another session, another person, another secret or a stretched expiry", () => {
    expect(provesRecovery(seal, { ...claims, session_id: "sess-2" }, SECRET, NOW)).toBe(false);
    expect(provesRecovery(seal, { ...claims, sub: "user-2" }, SECRET, NOW)).toBe(false);
    expect(provesRecovery(seal, claims, "other", NOW)).toBe(false);
    expect(provesRecovery(`${NOW + 9999}.${seal.split(".")[1]}`, claims, SECRET, NOW)).toBe(false);
  });
  it("is refused for a session signed in any other way, or long ago", () => {
    expect(provesRecovery(seal, { ...claims, amr: [{ method: "password", timestamp: NOW }] }, SECRET, NOW)).toBe(false);
    expect(provesRecovery(seal, { ...claims, amr: [{ method: "otp", timestamp: NOW - 601 }] }, SECRET, NOW)).toBe(false);
    expect(provesRecovery(seal, { ...claims, amr: "otp" }, SECRET, NOW)).toBe(false);
  });
  it("cannot be made without a session, a person or a secret", () => {
    expect(sealRecovery(undefined, SECRET, NOW)).toBeNull();
    expect(sealRecovery({ sub: "u" }, SECRET, NOW)).toBeNull();
    expect(sealRecovery(claims, "", NOW)).toBeNull();
  });
});
