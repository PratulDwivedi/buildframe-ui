import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm, InviteAcceptButton, InviteNewAccountForm } from "../src";
import { INVITE_CLOSED, inviteDoor } from "../src/core";

const inv = { email: "Asha@Example.com", status: "pending" as const, has_login: false };

describe("inviteDoor: which screen an invitation link shows", () => {
  it("is invalid without an invitation", () => expect(inviteDoor(null, null)).toBe("invalid"));
  it.each(["accepted", "revoked", "expired"] as const)("says %s and offers nothing else", (status) => {
    expect(inviteDoor({ ...inv, status }, "asha@example.com")).toBe(status);
    expect(INVITE_CLOSED[status].title).toBeTruthy();
  });
  it("a new person makes a login", () => expect(inviteDoor(inv, null)).toBe("new"));
  it("someone with an account signs in first", () => expect(inviteDoor({ ...inv, has_login: true }, null)).toBe("sign_in"));
  it("signed in as that address (any case) accepts", () => expect(inviteDoor({ ...inv, has_login: true }, "asha@example.com")).toBe("accept"));
  it("signed in as that address with no account cannot accept: no button that cannot work", () => {
    expect(inviteDoor(inv, "asha@example.com")).toBe("no_account");
  });
  it("signed in as somebody else says so", () => expect(inviteDoor({ ...inv, has_login: true }, "other@example.com")).toBe("wrong_account"));
});

async function fill(name: string, password: string, confirm: string) {
  const user = userEvent.setup();
  if (name) await user.type(screen.getByLabelText("Your name"), name);
  await user.type(screen.getByLabelText("New password"), password);
  await user.type(screen.getByLabelText("Confirm password"), confirm);
  await user.click(screen.getByRole("button", { name: "Join the team" }));
}

describe("InviteNewAccountForm", () => {
  it("shows the address and sends the name and password", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    render(<InviteNewAccountForm email="asha@example.com" onSubmit={onSubmit} onDone={onDone} />);
    expect(screen.getByText("asha@example.com")).toBeInTheDocument();
    await fill("  Asha Rao ", "long enough", "long enough");
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({ fullName: "Asha Rao", password: "long enough" });
  });

  it("refuses passwords that differ, and shows the product's refusal", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ ok: false, message: "That invitation has expired" });
    render(<InviteNewAccountForm email="a@example.com" onSubmit={onSubmit} onDone={() => {}} />);
    await fill("Asha", "long enough", "different one");
    expect(screen.getByText("The two passwords do not match.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.setup().clear(screen.getByLabelText("Confirm password"));
    await userEvent.setup().type(screen.getByLabelText("Confirm password"), "long enough");
    await userEvent.setup().click(screen.getByRole("button", { name: "Join the team" }));
    await waitFor(() => expect(screen.getByText("That invitation has expired")).toBeInTheDocument());
  });
});

describe("InviteAcceptButton", () => {
  it("accepts once and reports a refusal", async () => {
    const onAccept = vi.fn().mockResolvedValue({ ok: false, message: "Your login belongs to another organisation" });
    render(<InviteAcceptButton onAccept={onAccept} onDone={() => {}} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(screen.getByText("Your login belongs to another organisation")).toBeInTheDocument());
    expect(onAccept).toHaveBeenCalledTimes(1);
  });
});

describe("ForgotPasswordForm", () => {
  it("draws what the product adds (a bot check) inside the form", () => {
    render(
      <ForgotPasswordForm onSubmit={vi.fn()}>
        <div data-testid="bot-check" />
      </ForgotPasswordForm>,
    );
    expect(screen.getByTestId("bot-check").closest("form")).not.toBeNull();
  });
});
