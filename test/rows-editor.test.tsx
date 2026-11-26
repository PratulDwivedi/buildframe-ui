import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RowsEditor, type RowColumn } from "../src/primitives/RowsEditor";

afterEach(cleanup);

const columns: RowColumn[] = [
  { key: "place", label: "Place", maxLength: 80 },
  { key: "note", label: "Note", multiline: true, placeholder: "Optional" },
];
const two = [
  { place: "Station", note: "" },
  { place: "School", note: "Near" },
];

function Harness({ start = two, onChange = () => {}, ...rest }: Partial<React.ComponentProps<typeof RowsEditor>> & { start?: Record<string, string>[] }) {
  const [rows, setRows] = React.useState(start);
  return (
    <RowsEditor
      columns={columns}
      max={3}
      noun="place"
      {...rest}
      rows={rows}
      onChange={(r) => {
        setRows(r);
        onChange(r);
      }}
    />
  );
}

describe("RowsEditor", () => {
  it("names every input by its column and row, and uses a textarea when multiline", () => {
    render(<Harness />);
    expect((screen.getByLabelText("Place, row 2") as HTMLInputElement).value).toBe("School");
    expect(screen.getByLabelText("Place, row 1").getAttribute("maxlength")).toBe("80");
    expect(screen.getByLabelText("Note, row 1").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Note, row 1").getAttribute("placeholder")).toBe("Optional");
  });

  it("changes one cell only", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Note, row 1"), "x");
    expect(onChange).toHaveBeenLastCalledWith([{ place: "Station", note: "x" }, two[1]]);
  });

  it("adds an empty row with every column, up to max", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} addLabel="Add a place" />);
    await userEvent.click(screen.getByRole("button", { name: "Add a place" }));
    expect(onChange).toHaveBeenLastCalledWith([...two, { place: "", note: "" }]);
    expect((screen.getByRole("button", { name: "Add a place" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("moves and removes rows; the ends cannot move past", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
    expect(button("Move place 1 up").disabled).toBe(true);
    expect(button("Move place 2 down").disabled).toBe(true);
    await userEvent.click(button("Move place 2 up"));
    expect(onChange).toHaveBeenLastCalledWith([two[1], two[0]]);
    await userEvent.click(button("Remove place 1"));
    expect(onChange).toHaveBeenLastCalledWith([two[0]]);
  });

  it("shows an error on its own field", () => {
    render(<Harness errors={{ "1:place": "Write the place" }} />);
    expect(screen.getByText("Write the place")).toBeTruthy();
    expect(screen.getByLabelText("Place, row 2").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByLabelText("Place, row 1").getAttribute("aria-invalid")).toBeNull();
  });

  it("says when there are no rows", () => {
    render(<Harness start={[]} emptyText="No places yet." />);
    expect(screen.getByText("No places yet.")).toBeTruthy();
  });

  it("only shows the values when disabled", () => {
    render(<Harness disabled />);
    expect((screen.getByLabelText("Place, row 1") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("never submits the form around it", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Harness />
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove place 1" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("draws a column with options as the searchable dropdown, and a new row starts on its initial value", async () => {
    Element.prototype.scrollIntoView = () => {};
    const onChange = vi.fn();
    const withChoice: RowColumn[] = [
      { key: "name", label: "Name" },
      { key: "unit", label: "Charged", initial: "fixed", options: [{ value: "fixed", label: "Fixed amount" }, { value: "percent", label: "Percent" }] },
    ];
    render(<Harness columns={withChoice} start={[{ name: "Parking", unit: "fixed" }]} onChange={onChange} />);
    const box = screen.getByRole("combobox", { name: "Charged, row 1" }) as HTMLInputElement;
    expect(box.value).toBe("Fixed amount");
    await userEvent.click(box);
    await userEvent.click(screen.getByRole("option", { name: "Percent" }));
    expect(onChange).toHaveBeenLastCalledWith([{ name: "Parking", unit: "percent" }]);
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(onChange).toHaveBeenLastCalledWith([
      { name: "Parking", unit: "percent" },
      { name: "", unit: "fixed" },
    ]);
  });
});
