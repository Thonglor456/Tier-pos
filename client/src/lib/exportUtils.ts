/**
 * Export utility for Tier Coffee POS
 * Converts data to CSV and triggers browser download
 */

/** Escape a CSV cell value */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in quotes if contains comma, newline, or quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert array of objects to CSV string */
export function toCSV(rows: Record<string, string | number | null | undefined>[], headers: { key: string; label: string }[]): string {
  const headerRow = headers.map((h) => escapeCell(h.label)).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCell(row[h.key])).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}

/** Trigger browser download of a text file */
export function downloadFile(content: string, filename: string, mimeType = "text/csv;charset=utf-8;") {
  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Format a date for use in filenames */
export function formatDateForFilename(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
