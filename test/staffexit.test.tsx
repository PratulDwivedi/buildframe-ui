import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

let pending = false;
vi.mock("react-dom", async (orig) => ({ ...(await orig<typeof import("react-dom")>()), useFormStatus: () => ({ pending }) }));

import { StaffExitButton } from "../src/shell/StaffExitButton";

describe("StaffExitButton", () => {
  it("is named 'Exit staff view' at rest, starting with its visible word so voice control works", () => {
    pending = false;
    render(<form><StaffExitButton /></form>);
    const b = screen.getByRole("button", { name: "Exit staff view" });
    expect(b).toHaveTextContent("Exit");
    expect(b).toBeEnabled();
  });

  it("while the action runs: disabled, and its name says what the screen says, not a stale label", () => {
    pending = true;
    render(<form><StaffExitButton /></form>);
    const b = screen.getByRole("button");
    expect(b).toBeDisabled();
    expect(b).toHaveAccessibleName("Exiting\u2026");
  });
});
