import { toCsv, type ExportColumn } from "./list";

/** Saves text as a file in the browser (a CSV built from rows the page already has). */
export function downloadText(fileName: string, text: string, type = "text/csv;charset=utf-8;") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Builds the CSV from `columns` and `rows` and saves it as `<name>.csv`. */
export function downloadCsv<T, C>(name: string, columns: ExportColumn<T, C>[], rows: T[]) {
  downloadText(`${name}.csv`, toCsv(columns, rows));
}
