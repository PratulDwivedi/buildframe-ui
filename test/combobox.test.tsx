import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "../src/combobox/Combobox";
import { MultiCombobox } from "../src/combobox/MultiCombobox";

const options = [
  { value: "in", label: "India" },
  { value: "uk", label: "United Kingdom", search: "britain" },
  { value: "us", label: "United States" },
];

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

it("filters by label and hidden search words, and Enter picks the match, not the clear row", async () => {
  const onChange = vi.fn();
  render(<Combobox aria-label="Country" options={options} value="" onChange={onChange} emptyLabel="Any country" />);
  const box = screen.getByRole("combobox");
  await userEvent.click(box);
  await userEvent.type(box, "brit");
  expect(screen.getAllByRole("option")).toHaveLength(1);
  await userEvent.keyboard("{Enter}");
  expect(onChange).toHaveBeenCalledWith("uk");
});

it("posts through a hidden input when uncontrolled", async () => {
  const { container } = render(<Combobox name="country" options={options} defaultValue="in" aria-label="Country" />);
  expect((container.querySelector('input[type="hidden"]') as HTMLInputElement).value).toBe("in");
  expect(screen.getByRole("combobox")).toHaveValue("India");
});

it("has no clear row when required", async () => {
  render(<Combobox required options={options} value="" onChange={() => {}} aria-label="Country" />);
  await userEvent.click(screen.getByRole("combobox"));
  expect(screen.getAllByRole("option")).toHaveLength(3);
});

it("Escape closes the list and does not reach a panel around it", async () => {
  const outer = vi.fn();
  render(
    <div onKeyDown={(e) => e.key === "Escape" && outer()}>
      <Combobox options={options} value="" onChange={() => {}} aria-label="Country" />
    </div>,
  );
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("listbox")).toBeNull();
  // Stopped at the field, so a SlideOver listening on window does not close too.
  expect(outer).not.toHaveBeenCalled();
});

it("MultiCombobox toggles values and stays open", async () => {
  const onChange = vi.fn();
  render(<MultiCombobox options={options} value={["in"]} onChange={onChange} aria-label="Countries" />);
  await userEvent.click(screen.getByRole("combobox"));
  await userEvent.click(screen.getByText("United States"));
  expect(onChange).toHaveBeenCalledWith(["in", "us"]);
  expect(screen.getByRole("listbox")).toBeInTheDocument();
});
