import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

import { SignOutButton } from "../src/shell/SignOutButton";

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});

describe("SignOutButton", () => {
  it("is a button with the default label", () => {
    render(<SignOutButton signOut={async () => {}} to="/app/login" />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("signs out first, and only then goes to the page it was given, then refreshes", async () => {
    const order: string[] = [];
    const signOut = vi.fn(async () => {
      order.push("signOut");
    });
    push.mockImplementation(() => order.push("push"));
    refresh.mockImplementation(() => order.push("refresh"));
    render(<SignOutButton signOut={signOut} to="/admin/login" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/login"));
    expect(order).toEqual(["signOut", "push", "refresh"]);
  });

  it("can send the person somewhere else, such as back to the same invitation link", async () => {
    render(<SignOutButton signOut={async () => {}} to="/app/invite?code=abc" label="Use another account" />);
    await userEvent.click(screen.getByRole("button", { name: "Use another account" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/invite?code=abc"));
  });

  it("is disabled and says so while signing out, so a double click cannot sign out twice", async () => {
    let finish!: () => void;
    const signOut = vi.fn(() => new Promise<void>((r) => (finish = r)));
    render(<SignOutButton signOut={signOut} to="/app/login" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    const busy = screen.getByRole("button", { name: /Signing out/ });
    expect(busy).toBeDisabled();
    await userEvent.click(busy);
    expect(signOut).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("does not navigate when signing out fails, and lets the person try again", async () => {
    const signOut = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined);
    render(<SignOutButton signOut={signOut} to="/app/login" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled());
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/login"));
  });

  it("treats a resolved { error } (how Supabase reports failure) as a failure and does not navigate", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: { message: "network" } });
    render(<SignOutButton signOut={signOut} to="/app/login" />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled());
    expect(push).not.toHaveBeenCalled();
  });

  it("tells the person it failed, in words, and calls onError", async () => {
    const onError = vi.fn();
    const signOut = vi.fn().mockRejectedValue(new Error("network"));
    render(<SignOutButton signOut={signOut} to="/app/login" onError={onError} />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not sign out/i);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("looks like a primary button by default, and takes variant, size and className", () => {
    const { rerender } = render(<SignOutButton signOut={async () => {}} to="/x" />);
    expect(screen.getByRole("button").className).toMatch(/bg-bf-brand/);
    rerender(<SignOutButton signOut={async () => {}} to="/x" variant="ghost" size="sm" className="w-full" />);
    const cls = screen.getByRole("button").className;
    expect(cls).not.toMatch(/bg-bf-brand /);
    expect(cls).toMatch(/w-full/);
  });

  it("can show its own children instead of the label", () => {
    render(
      <SignOutButton signOut={async () => {}} to="/x">
        Log out of this device
      </SignOutButton>,
    );
    expect(screen.getByRole("button", { name: "Log out of this device" })).toBeInTheDocument();
  });

  it("can do a full page load instead of a client navigation, to clear stale server data", async () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, assign } });
    render(<SignOutButton signOut={async () => {}} to="/app/login" fullReload />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/app/login"));
    expect(push).not.toHaveBeenCalled();
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });
});
