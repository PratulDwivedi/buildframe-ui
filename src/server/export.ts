import { crc32 } from "node:zlib";
import { csvCell, pickExportColumns } from "../data/list";

/**
 * Spreadsheet export with no dependency. `.xlsx` is a zip of a few XML parts; a
 * "stored" (uncompressed) zip is valid and Excel, Numbers and Sheets all open it,
 * so the only primitive needed is CRC-32, which Node ships.
 */

export type Cell = string | number | null | undefined;

/** RFC 4180, with a UTF-8 BOM so Excel reads non-ASCII names correctly. */
export function toCsvFile(header: string[], body: Cell[][]): Buffer {
  const lines = [header, ...body].map((r) => r.map(csvCell).join(","));
  return Buffer.from("\ufeff" + lines.join("\r\n") + "\r\n", "utf8");
}

const xml = (s: string) =>
  s.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!)
   // XML 1.0 forbids most control characters; drop them rather than corrupt the file.
   .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

const colName = (i: number) => {
  let n = i + 1, s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

/** Excel's rules for a sheet name: at most 31 characters, none of []:*?/\\, not empty. Cut before escaping, never after. */
const sheetName = (name: string) => name.replace(/[\[\]:*?/\\]/g, "").slice(0, 31).trim() || "Export";

export function toXlsxFile(sheet: string, header: string[], body: Cell[][]): Buffer {
  const cell = (v: Cell, r: number, c: number, bold = false) => {
    const ref = `${colName(c)}${r + 1}`;
    const style = bold ? ' s="1"' : "";
    if (v == null || v === "") return `<c r="${ref}"${style}/>`;
    // Spreadsheet formulas are only written by <f>, never by a string value, so
    // inline strings are inert here (unlike CSV).
    if (typeof v === "number" && !Number.isFinite(v)) return `<c r="${ref}"${style}/>`; // NaN or Infinity is not a number in XML
    return typeof v === "number"
      ? `<c r="${ref}"${style}><v>${v}</v></c>`
      : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  };
  const rows = [header, ...body].map((row, r) =>
    `<row r="${r + 1}">${row.map((v, c) => cell(v, r, c, r === 0)).join("")}</row>`).join("");
  const cols = header.map((h, i) => {
    const w = Math.min(48, Math.max(10, ...[h, ...body.map(r => r[i])].map(v => String(v ?? "").length + 2)));
    return `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`;
  }).join("");

  const files: [string, string][] = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName(sheet))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`],
    ["xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${rows}</sheetData></worksheet>`],
  ];
  return zipStored(files);
}

/** A zip with every entry stored (method 0). */
function zipStored(files: [string, string][]): Buffer {
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameB = Buffer.from(name, "utf8"), data = Buffer.from(text, "utf8"), crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);   // UTF-8 names
    lh.writeUInt16LE(0, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0x21, 12);              // stored, 1980-01-01
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nameB.length, 26); lh.writeUInt16LE(0, 28);
    local.push(lh, nameB, data);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt16LE(0, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0x21, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, nameB);
    offset += lh.length + nameB.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}

/**
 * Which table column each export column of one screen belongs to (header text -> table column key). A header left
 * out has no table column (Currency, Code) and is always exported. `"*"` ties every unlisted header to one column,
 * for screens whose headers are data (one column per product). The product owns these maps; the package only applies
 * them.
 */
export type ExportTies = Record<string, string>;

export interface FileOptions {
  /** Worksheet name (xlsx only); cut to Excel's 31 characters. */
  sheet?: string;
  /** The table's `?cols=` (visible columns, in order). With `ties` the export keeps only those columns. */
  cols?: string | null;
  ties?: ExportTies;
}

function followView(header: string[], body: Cell[][], cols: string | null | undefined, ties: ExportTies | undefined) {
  if (!ties || !cols) return { header, body };
  const picked = pickExportColumns(
    header.map((h, i) => ({ header: h, col: ties[h] ?? ties["*"], value: (r: Cell[]) => r[i] })),
    cols,
  );
  return { header: picked.map((c) => c.header), body: body.map((r) => picked.map((c) => c.value(r))) };
}

/** The download response every export route returns. */
export function fileResponse(format: "csv" | "xlsx", baseName: string, fullHeader: string[], fullBody: Cell[][], opts: FileOptions = {}): Response {
  const { header, body } = followView(fullHeader, fullBody, opts.cols, opts.ties);
  const stamp = new Date().toISOString().slice(0, 10);
  const payload = format === "xlsx" ? toXlsxFile(opts.sheet ?? "Export", header, body) : toCsvFile(header, body);
  return new Response(new Uint8Array(payload), {
    headers: {
      "Content-Type": format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}-${stamp}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
