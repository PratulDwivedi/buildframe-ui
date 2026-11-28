import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DnsRecords, domainStatus, type DnsRecord } from "../src";

const records: DnsRecord[] = [
  { type: "A", name: "acme.example", value: "192.0.2.1" },
  { type: "TXT", name: "_buildframe.acme.example", value: "dom_1" },
];

describe("domainStatus", () => {
  it("names each state in plain words, with a pill tone", () => {
    expect(domainStatus("pending")).toEqual({ label: "Waiting to be connected", tone: "warn" });
    expect(domainStatus("active")).toEqual({ label: "Live", tone: "ok" });
    expect(domainStatus("failed")).toEqual({ label: "Not connected", tone: "bad" });
    expect(domainStatus("removed")).toEqual({ label: "Removed", tone: "off" });
  });
});

describe("DnsRecords", () => {
  it("lists each record with its type, name and value", () => {
    render(<DnsRecords records={records} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    for (const r of records) {
      expect(screen.getByText(r.name)).toBeInTheDocument();
      expect(screen.getByText(r.value)).toBeInTheDocument();
    }
  });
  it.each([
    ["Copy name of TXT record", "_buildframe.acme.example"],
    ["Copy value of TXT record", "dom_1"],
  ])("%s puts it on the clipboard and says so on that button only", async (name, expected) => {
    const user = userEvent.setup();
    const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<DnsRecords records={records} />);
    await user.click(screen.getByRole("button", { name }));
    expect(write).toHaveBeenCalledWith(expected);
    expect(screen.getAllByRole("button", { name: "Copied" })).toHaveLength(1);
  });
  it("tells two records of one type apart", () => {
    render(<DnsRecords records={[records[0], { ...records[0], value: "192.0.2.2" }]} />);
    expect(screen.getByRole("button", { name: "Copy value of A record 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy value of A record 2" })).toBeInTheDocument();
  });
  it("does not say Copied when the browser refuses", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<DnsRecords records={records} />);
    await user.click(screen.getByRole("button", { name: "Copy value of A record" }));
    expect(screen.queryByRole("button", { name: "Copied" })).not.toBeInTheDocument();
  });
  it("draws nothing without records", () => {
    const { container } = render(<DnsRecords records={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
