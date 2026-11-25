import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearanceForm } from "../src/site/AppearanceForm";
import { emptyAppearance, type AppearanceValue } from "../src/site/appearance";

const slots = [{ key: "home", label: "Home banner", hint: "Used when no banner has a picture." }];

function setup(over: Partial<AppearanceValue> = {}, save = vi.fn(async (_v: AppearanceValue) => ({ error: null as string | null }))) {
  render(
    <AppearanceForm
      value={{ ...emptyAppearance(), ...over }}
      name="Acme Realty"
      pictureSlots={slots}
      onSave={save}
      renderImage={(s) => (
        <button type="button" onClick={() => s.onChange(`https://cdn.example/${s.key}.png`)}>
          {`pick ${s.key}`} {s.value ? `(has ${s.value})` : "(empty)"}
        </button>
      )}
    />,
  );
  return save;
}

it("shows every field and a sample, and no save call before the person saves", () => {
  const save = setup({ brand: "#1e40af" });
  expect(screen.getByLabelText("Primary colour")).toHaveValue("#1e40af");
  expect(screen.getByLabelText("Primary in dark mode")).toBeInTheDocument();
  expect(screen.getByLabelText("Accent colour")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "pick logo (empty)" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "pick favicon (empty)" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "pick home (empty)" })).toBeInTheDocument();
  expect(screen.getByText("Acme Realty", { selector: "[data-sample] *" })).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

it("refuses a bad colour on save, says which field, and does not call onSave", async () => {
  const save = setup();
  await userEvent.type(screen.getByLabelText("Primary colour"), "blue");
  await userEvent.click(screen.getByRole("button", { name: "Save appearance" }));
  expect(await screen.findByText(/Use a colour like #1e40af/)).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

it("saves exactly what was entered, including a picked picture and the switches", async () => {
  const save = setup();
  await userEvent.type(screen.getByLabelText("Primary colour"), "#1e40af");
  await userEvent.click(screen.getByRole("button", { name: "pick logo (empty)" }));
  await userEvent.click(screen.getByRole("button", { name: "pick home (empty)" }));
  await userEvent.click(screen.getByLabelText("Show the name beside the logo"));
  await userEvent.click(screen.getByRole("button", { name: "Save appearance" }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0]![0]).toMatchObject({
    brand: "#1e40af",
    logoUrl: "https://cdn.example/logo.png",
    showName: false,
    showToggle: true,
    images: { home: "https://cdn.example/home.png" },
  });
  expect(await screen.findByText(/Saved/)).toBeInTheDocument();
});

it("shows the product's own error and keeps the form", async () => {
  setup({}, vi.fn(async () => ({ error: "You cannot change this" })));
  await userEvent.click(screen.getByRole("button", { name: "Save appearance" }));
  expect(await screen.findByText("You cannot change this")).toBeInTheDocument();
});

it("the sample uses the chosen colour with readable text", async () => {
  setup();
  await userEvent.type(screen.getByLabelText("Primary colour"), "#facc15");
  const btn = screen.getByText("Primary button");
  expect(btn).toHaveStyle({ background: "#facc15", color: "#111111" });
});
