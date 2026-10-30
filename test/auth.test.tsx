import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { authMessage, safeNext, signInErrorText } from "../src/auth/messages";
import { ChangePasswordForm, ForgotPasswordForm, SignInForm, passwordProblem } from "../src/auth/forms";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/login",
  useSearchParams: () => new URLSearchParams(),
}));

describe("safeNext", () => {
  it("keeps a path inside the console", () => {
    expect(safeNext("/admin/orders?x=1", "/admin", "/admin")).toBe("/admin/orders?x=1");
    expect(safeNext("/admin", "/admin", "/x")).toBe("/admin");
  });
  it("refuses other hosts, protocol-relative and look-alike paths", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/administrator", "/shop", "", null]) {
      expect(safeNext(bad, "/admin", "/admin")).toBe("/admin");
    }
  });
});

it("shows only known message codes, never free text", () => {
  expect(authMessage("link_expired")).toMatch(/expired/);
  expect(authMessage("<script>")).toBeNull();
  expect(authMessage("toString")).toBeNull();
});

it("never says whether an address has an account", () => {
  expect(signInErrorText("Invalid login credentials")).toBe("That email and password do not match.");
  expect(signInErrorText("User not found")).toBe("That email and password do not match.");
});

it("checks new passwords", () => {
  expect(passwordProblem("short", "short")).toMatch(/8/);
  expect(passwordProblem("longenough", "different1")).toMatch(/match/);
  expect(passwordProblem("longenough", "longenough")).toBeNull();
});

it("signs in with a password and goes to next", async () => {
  const pw = vi.fn().mockResolvedValue({ ok: true });
  render(<SignInForm password={pw} next="/admin/orders" />);
  await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
  await userEvent.type(screen.getByLabelText("Password"), "secretpass");
  await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));
  expect(pw).toHaveBeenCalledWith("a@b.co", "secretpass");
  expect(replace).toHaveBeenCalledWith("/admin/orders");
});

it("shows the action's message on failure", async () => {
  render(<SignInForm password={async () => ({ ok: false, message: "That email and password do not match." })} />);
  await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
  await userEvent.type(screen.getByLabelText("Password"), "x");
  await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("do not match");
});

it("emails a code, then checks it", async () => {
  const request = vi.fn().mockResolvedValue({ ok: true });
  const verify = vi.fn().mockResolvedValue({ ok: true });
  const onSuccess = vi.fn();
  render(<SignInForm password={async () => ({ ok: true })} code={{ request, verify }} onSuccess={onSuccess} />);
  await userEvent.click(screen.getByRole("button", { name: "Email me a code instead" }));
  await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
  await userEvent.click(screen.getByRole("button", { name: /Email me a code/ }));
  await userEvent.type(await screen.findByLabelText("Six-digit code"), "12a3456");
  await userEvent.click(screen.getByRole("button", { name: /Sign in/ }));
  expect(verify).toHaveBeenCalledWith("a@b.co", "123456");
  expect(onSuccess).toHaveBeenCalled();
});

it("forgot password answers the same whatever the address", async () => {
  render(<ForgotPasswordForm onSubmit={async () => ({ ok: true })} />);
  await userEvent.type(screen.getByLabelText("Email"), "nobody@b.co");
  await userEvent.click(screen.getByRole("button", { name: /Email me a link/ }));
  expect(await screen.findByRole("status")).toHaveTextContent("If that address has an account");
});

it("change password refuses a mismatch before calling the action", async () => {
  const save = vi.fn();
  render(<ChangePasswordForm onSubmit={save} />);
  await userEvent.type(screen.getByLabelText("New password"), "longenough");
  await userEvent.type(screen.getByLabelText("Confirm password"), "different1");
  await userEvent.click(screen.getByRole("button", { name: /Change password/ }));
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("do not match");
});

it("shows a link's error at the top without marking the empty fields invalid", () => {
  render(<SignInForm password={async () => ({ ok: true })} error="No access here." />);
  expect(screen.getByRole("alert")).toHaveTextContent("No access here.");
  expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid", "true");
});
