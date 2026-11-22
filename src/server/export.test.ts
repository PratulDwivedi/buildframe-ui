// @vitest-environment node
import { crc32 } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { fileResponse, toCsvFile as toCsv, toXlsxFile as toXlsx } from './export';

const BOM = '﻿';
const csv = (header: string[], body: (string | number | null | undefined)[][]) => toCsv(header, body).toString('utf8');

describe('toCsv', () => {
  it('starts with a UTF-8 byte-order mark and ends each row with CRLF', () => {
    const b = toCsv(['A'], [['x']]);
    expect([...b.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(b.toString('utf8')).toBe(`${BOM}A\r\nx\r\n`);
  });
  it('keeps non-ASCII text intact', () => {
    expect(csv(['Name'], [['Zoë Müller 田中']])).toContain('Zoë Müller 田中');
  });
  it('writes null and undefined as empty cells and numbers as numbers', () => {
    expect(csv(['a', 'b', 'c'], [[null, undefined, 12.5]])).toBe(`${BOM}a,b,c\r\n,,12.5\r\n`);
  });
  it('quotes cells holding a comma, a quote or a line break, and doubles quotes', () => {
    expect(csv(['h'], [['a,b'], ['say "hi"'], ['line1\nline2'], ['cr\rcell']])).toBe(
      `${BOM}h\r\n"a,b"\r\n"say ""hi"""\r\n"line1\nline2"\r\n"cr\rcell"\r\n`);
  });
  it('does not quote a plain cell', () => {
    expect(csv(['h'], [['plain text']])).toBe(`${BOM}h\r\nplain text\r\n`);
  });

  describe('formula safety: text starting with = + - @ tab or CR is prefixed with a quote', () => {
    it.each(['=HYPERLINK("http://x","y")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd', '\rcmd'])('%j', (v) => {
      const out = csv(['h'], [[v]]);
      expect(out.split('\r\n')[1].replace(/^"/, '')).toMatch(/^'/);
    });
    it('also protects a header cell', () => {
      expect(csv(['=bad'], [])).toBe(`${BOM}'=bad\r\n`);
    });
    it('leaves a real negative number alone but protects the same digits as text', () => {
      expect(csv(['h'], [[-5], ['-5']])).toBe(`${BOM}h\r\n-5\r\n'-5\r\n`);
    });
    it('leaves text that merely contains those characters later alone', () => {
      expect(csv(['h'], [['a=b'], ['x+y'], ['me@x.com']])).toBe(`${BOM}h\r\na=b\r\nx+y\r\nme@x.com\r\n`);
    });
    it('quotes and prefixes a formula that also holds a comma', () => {
      expect(csv(['h'], [['=A1,B1']])).toBe(`${BOM}h\r\n"'=A1,B1"\r\n`);
    });
  });
});

/** A small reader for the stored zip toXlsx writes: checks the structure and every CRC. */
function readZip(buf: Buffer) {
  const eocd = buf.length - 22;
  expect(buf.readUInt32LE(eocd)).toBe(0x06054b50);
  const count = buf.readUInt16LE(eocd + 10);
  expect(buf.readUInt16LE(eocd + 8)).toBe(count);
  const cdSize = buf.readUInt32LE(eocd + 12), cdOffset = buf.readUInt32LE(eocd + 16);
  expect(cdOffset + cdSize).toBe(eocd);
  const files: Record<string, string> = {};
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    expect(buf.readUInt32LE(p)).toBe(0x02014b50);
    const crc = buf.readUInt32LE(p + 16), size = buf.readUInt32LE(p + 24), nameLen = buf.readUInt16LE(p + 28), lho = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    expect(buf.readUInt32LE(lho)).toBe(0x04034b50);
    expect(buf.readUInt16LE(lho + 8)).toBe(0); // stored
    const lnLen = buf.readUInt16LE(lho + 26), leLen = buf.readUInt16LE(lho + 28);
    const data = buf.subarray(lho + 30 + lnLen + leLen, lho + 30 + lnLen + leLen + size);
    expect(buf.subarray(lho + 30, lho + 30 + lnLen).toString('utf8')).toBe(name);
    expect(crc32(data)).toBe(crc);
    files[name] = data.toString('utf8');
    p += 46 + nameLen;
  }
  return files;
}

describe('toCsv numbers', () => {
  it('writes NaN and Infinity as empty cells, like the spreadsheet file', () => {
    expect(csv(['a', 'b', 'c'], [[NaN, Infinity, 2]])).toBe(`${BOM}a,b,c\r\n,,2\r\n`);
  });
});

describe('toXlsx', () => {
  it('is a valid stored zip with the six parts a spreadsheet needs, every CRC matching', () => {
    const files = readZip(toXlsx('Sheet', ['A', 'B'], [['x', 1]]));
    expect(Object.keys(files).sort()).toEqual([
      '[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml',
    ]);
  });
  it('writes the header bold, text as inline strings and numbers as numbers', () => {
    const sheet = readZip(toXlsx('S', ['Name', 'Qty'], [['Acme', 3]]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Name</t></is></c>');
    expect(sheet).toContain('<c r="A2" t="inlineStr"><is><t xml:space="preserve">Acme</t></is></c>');
    expect(sheet).toContain('<c r="B2"><v>3</v></c>');
  });
  it('writes null and empty cells as empty cells', () => {
    const sheet = readZip(toXlsx('S', ['a', 'b'], [[null, '']]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="A2"/><c r="B2"/>');
  });
  it('escapes XML characters so a name cannot break the file or inject markup', () => {
    const sheet = readZip(toXlsx('S', ['h'], [['<b>&"\'x</b>']]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('&lt;b&gt;&amp;&quot;&apos;x&lt;/b&gt;');
    expect(sheet).not.toContain('<b>');
  });
  it('drops control characters XML 1.0 forbids, and keeps tab, newline and carriage return', () => {
    const sheet = readZip(toXlsx('S', ['h'], [['a\u0000b\u0008c\u000bd\u001fe\tf\ng']]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('>abcde\tf\ng<');
  });
  it('keeps a formula-looking string as inert text, never as a formula element', () => {
    const sheet = readZip(toXlsx('S', ['h'], [['=1+1']]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<t xml:space="preserve">=1+1</t>');
    expect(sheet).not.toContain('<f>');
  });
  it('names columns past Z (AA, AB) correctly', () => {
    const header = Array.from({ length: 28 }, (_, i) => `h${i}`);
    const sheet = readZip(toXlsx('S', header, []))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('r="Z1"');
    expect(sheet).toContain('r="AA1"');
    expect(sheet).toContain('r="AB1"');
  });
  it('limits a sheet name to 31 characters (as written, before escaping) and escapes it', () => {
    const wb = readZip(toXlsx('A&B' + 'x'.repeat(40), ['h'], []))['xl/workbook.xml'];
    const name = /<sheet name="([^"]*)"/.exec(wb)![1];
    expect(name.replace(/&amp;/g, '&').length).toBe(31);
    expect(name.startsWith('A&amp;B')).toBe(true);
  });
  // Review findings 2 and 3.
  it('cuts the sheet name before escaping, so an entity is never split', () => {
    const wb = readZip(toXlsx('x'.repeat(28) + '&Co', ['h'], []))['xl/workbook.xml'];
    const name = /<sheet name="([^"]*)"/.exec(wb)![1];
    expect(name).toBe('x'.repeat(28) + '&amp;Co');
    expect(name).not.toMatch(/&[a-z]*$/);
  });
  it('removes the characters Excel forbids in a sheet name and falls back when nothing is left', () => {
    const name = (n: string) => /<sheet name="([^"]*)"/.exec(readZip(toXlsx(n, ['h'], []))['xl/workbook.xml'])![1];
    expect(name('Q1: [draft]/final*?\\')).toBe('Q1 draftfinal');
    expect(name('[]:*?/\\')).toBe('Export');
    expect(name('')).toBe('Export');
  });
  it('writes a number that is not finite as an empty cell, never as invalid XML', () => {
    const sheet = readZip(toXlsx('S', ['a', 'b', 'c'], [[NaN, Infinity, -Infinity]]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="A2"/><c r="B2"/><c r="C2"/>');
    expect(sheet).not.toMatch(/NaN|Infinity/);
  });
  it('keeps column widths between 10 and 48', () => {
    const sheet = readZip(toXlsx('S', ['a', 'b'], [['x'.repeat(200), 'y']]))['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<col min="1" max="1" width="48" customWidth="1"/>');
    expect(sheet).toContain('<col min="2" max="2" width="10" customWidth="1"/>');
  });
  it('stores non-ASCII text so the CRC covers the UTF-8 bytes', () => {
    const files = readZip(toXlsx('S', ['h'], [['Zoë 田中']]));
    expect(files['xl/worksheets/sheet1.xml']).toContain('Zoë 田中');
  });
});

describe('fileResponse', () => {
  const header = ['Tenant', 'Code', 'Members', 'Acme'];
  const body = [['Acme Ltd', 'T1', 4, 'yes']];
  // Tenant and Code belong to column "tenant", Members to "members", every other header to "products".
  const ties = { Tenant: 'tenant', Code: 'tenant', Members: 'members', '*': 'products' };
  const raw = async (r: Response) => Buffer.from(await r.arrayBuffer()).toString('utf8'); // Response.text() strips the BOM

  it('sends a CSV with the right type, a dated attachment name and no caching', async () => {
    const r = fileResponse('csv', 'people', header, body);
    expect(r.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(r.headers.get('Cache-Control')).toBe('no-store');
    expect(r.headers.get('Content-Disposition')).toMatch(/^attachment; filename="people-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(await raw(r)).toContain('Acme Ltd');
  });
  it('sends an xlsx with the spreadsheet content type, the sheet name given', async () => {
    const r = fileResponse('xlsx', 'people', header, body, { sheet: 'People' });
    expect(r.headers.get('Content-Type')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(r.headers.get('Content-Disposition')).toMatch(/\.xlsx"$/);
    expect(readZip(Buffer.from(await r.arrayBuffer()))['xl/workbook.xml']).toContain('<sheet name="People"');
  });
  it('names the sheet Export when none is given', async () => {
    const r = fileResponse('xlsx', 'people', header, body);
    expect(readZip(Buffer.from(await r.arrayBuffer()))['xl/workbook.xml']).toContain('<sheet name="Export"');
  });
  it('exports every column when no ?cols= is given', async () => {
    expect(await raw(fileResponse('csv', 'people', header, body, { ties }))).toContain('Tenant,Code,Members,Acme');
  });
  it('keeps only the columns the person can see, in their order', async () => {
    const text = await raw(fileResponse('csv', 'people', header, body, { cols: 'members,tenant', ties }));
    expect(text).toContain('Members,Tenant,Code\r\n4,Acme Ltd,T1');
    expect(text).not.toContain('Acme,');
  });
  it("drops a hidden column's data too, not just its header", async () => {
    expect(await raw(fileResponse('csv', 'people', header, body, { cols: 'tenant', ties }))).toBe(`${BOM}Tenant,Code\r\nAcme Ltd,T1\r\n`);
  });
  it('ignores ?cols= when the screen has no column map', async () => {
    expect(await raw(fileResponse('csv', 'people', header, body, { cols: 'tenant' }))).toContain('Tenant,Code,Members,Acme');
  });
  it('treats an empty ?cols= as every column', async () => {
    expect(await raw(fileResponse('csv', 'people', header, body, { cols: '', ties }))).toContain('Tenant,Code,Members,Acme');
  });
});
