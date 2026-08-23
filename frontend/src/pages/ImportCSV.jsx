import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { importTickets } from "../api/tickets";

const FIELD_ALIASES = {
  customer_name: ["customer_name", "name", "customer", "full_name", "client_name"],
  customer_email: ["customer_email", "email", "customer_mail", "mail", "e-mail"],
  subject: ["subject", "title", "issue", "issue_title"],
  description: ["description", "details", "desc", "issue_description", "notes"],
  status: ["status"],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCEPTED_EXT = [".csv", ".xlsx", ".xls"];

function normalizeHeader(h) {
  return String(h ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

// Reads CSV, XLSX, or XLS into an array of row-arrays (same shape regardless of source format).
async function readSheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  // header: 1 -> array-of-arrays instead of array-of-objects, so we control header matching ourselves
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });
  return rows.map((row) => row.map((cell) => String(cell ?? "").trim()));
}

function mapHeaders(headers) {
  const normalized = headers.map(normalizeHeader);
  const mapping = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx !== -1) mapping[field] = idx;
  }
  return mapping;
}

function buildRows(sheetRows) {
  const [headerRow, ...dataRows] = sheetRows;
  const mapping = mapHeaders(headerRow);
  const missingColumns = ["customer_name", "customer_email", "subject", "description"].filter(
    (f) => !(f in mapping)
  );

  const rows = dataRows.map((cells, i) => {
    const get = (field) => (mapping[field] !== undefined ? (cells[mapping[field]] || "").trim() : "");
    const customer_name = get("customer_name");
    const customer_email = get("customer_email");
    const subject = get("subject");
    const description = get("description");
    const status = get("status");

    const issues = [];
    if (!customer_name) issues.push("Missing name");
    if (!customer_email) issues.push("Missing email");
    else if (!EMAIL_RE.test(customer_email)) issues.push("Invalid email");
    if (!subject) issues.push("Missing subject");
    if (!description) issues.push("Missing description");

    return {
      line: i + 2, // +1 for header row, +1 for 1-indexing
      customer_name,
      customer_email,
      subject,
      description,
      status,
      valid: issues.length === 0,
      issues,
    };
  });

  return { mapping, missingColumns, rows };
}

function fileExtension(name) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export default function ImportCSV() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState(null);
  const [parsed, setParsed] = useState(null); // { mapping, missingColumns, rows }
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = useCallback(async (file) => {
    setParseError(null);
    setResult(null);
    setParsed(null);
    if (!file) return;

    const ext = fileExtension(file.name);
    if (!ACCEPTED_EXT.includes(ext)) {
      setParseError("Please upload a .csv, .xlsx, or .xls file.");
      return;
    }

    setFileName(file.name);
    setReading(true);
    try {
      const sheetRows = await readSheet(file);
      if (sheetRows.length < 2) {
        setParseError("That file doesn't have any data rows to import.");
        return;
      }
      const built = buildRows(sheetRows);
      if (built.missingColumns.length > 0) {
        setParseError(
          `Couldn't find a column for: ${built.missingColumns.join(", ")}. Expected headers like name, email, subject, description.`
        );
        return;
      }
      setParsed(built);
    } catch {
      setParseError("Couldn't read that file. Make sure it's a valid CSV or Excel file.");
    } finally {
      setReading(false);
    }
  }, []);

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function clearFile() {
    setFileName(null);
    setParsed(null);
    setParseError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleImport() {
    if (!parsed) return;
    const validRows = parsed.rows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setImporting(true);
    setParseError(null);
    try {
      const payload = validRows.map((r) => ({
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        subject: r.subject,
        description: r.description,
        status: r.status || undefined,
      }));
      const res = await importTickets(payload);
      setResult(res);
    } catch {
      setParseError("Import failed. Is the backend running?");
    } finally {
      setImporting(false);
    }
  }

  const validCount = parsed ? parsed.rows.filter((r) => r.valid).length : 0;
  const invalidCount = parsed ? parsed.rows.length - validCount : 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-ink mb-2">Import tickets from a file</h1>
      <p className="text-sm text-slate mb-6">
        Upload a CSV or Excel file to merge into your existing tickets. Rows need a name, email, subject, and description.
      </p>

      {result ? (
        <div className="bg-white border border-line rounded-lg p-8 text-center">
          <p className="font-display text-lg font-semibold text-ink mb-2">Import complete</p>
          <p className="text-sm text-slate mb-1">
            {result.created_count} ticket{result.created_count === 1 ? "" : "s"} added
            {result.skipped_count > 0 && `, ${result.skipped_count} skipped as duplicates`}
            {result.error_count > 0 && `, ${result.error_count} failed`}
          </p>
          {result.errors.length > 0 && (
            <div className="text-left mt-4 max-w-md mx-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate mb-2">Row errors</p>
              <ul className="text-xs text-red-600 space-y-1">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={() => navigate("/")}
              className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-dark transition-colors"
            >
              View tickets
            </button>
            <button
              onClick={clearFile}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate hover:bg-canvas transition-colors"
            >
              Import another file
            </button>
          </div>
        </div>
      ) : (
        <>
          {!fileName ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`bg-white border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                dragActive ? "border-accent bg-accent/5" : "border-line hover:border-slate"
              }`}
            >
              <p className="text-sm font-medium text-ink mb-1">Drop a CSV or Excel file here, or click to browse</p>
              <p className="text-xs text-slate">.csv, .xlsx, .xls · columns: customer_name, customer_email, subject, description, status (optional)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="bg-white border border-line rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{fileName}</p>
                {reading && <p className="text-xs text-slate mt-0.5">Reading file...</p>}
                {parsed && (
                  <p className="text-xs text-slate mt-0.5">
                    {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} found
                    {invalidCount > 0 && ` · ${invalidCount} need attention`}
                  </p>
                )}
              </div>
              <button onClick={clearFile} className="text-red-600 text-xs font-medium hover:underline">
                Remove
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-slate uppercase tracking-wide">or import from</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="bg-white border border-line rounded-md px-4 py-3 text-sm font-medium text-slate flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
            >
              Google Drive
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="bg-white border border-line rounded-md px-4 py-3 text-sm font-medium text-slate flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
            >
              OneDrive
            </button>
          </div>

          {parseError && <p className="text-red-600 text-sm mb-4">{parseError}</p>}

          {parsed && (
            <div className="bg-white border border-line rounded-lg overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">Preview</p>
                <p className="text-xs text-slate">
                  <span className="text-ink font-medium">{validCount}</span> ready to import
                  {invalidCount > 0 && <span className="text-red-600 font-medium"> · {invalidCount} will be skipped</span>}
                </p>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate uppercase tracking-wide">
                  <tr>
                    <th className="w-1 p-0"></th>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Subject</th>
                    <th className="px-4 py-2 font-medium">Issue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {parsed.rows.slice(0, 8).map((r) => (
                    <tr key={r.line} className={!r.valid ? "bg-red-50/40" : ""}>
                      <td className={`w-1 p-0 ${r.valid ? "bg-emerald-500" : "bg-red-500"}`}></td>
                      <td className="px-4 py-2 text-ink">{r.customer_name || "—"}</td>
                      <td className="px-4 py-2 text-ink">{r.customer_email || "—"}</td>
                      <td className="px-4 py-2 text-ink">{r.subject || "—"}</td>
                      <td className="px-4 py-2 text-red-600 text-xs">{r.issues.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 8 && (
                <p className="px-4 py-2 text-xs text-slate border-t border-line">
                  + {parsed.rows.length - 8} more row{parsed.rows.length - 8 === 1 ? "" : "s"}
                </p>
              )}
            </div>
          )}

          {parsed && (
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-accent-dark disabled:opacity-50 transition-colors"
              >
                {importing ? "Importing..." : `Import ${validCount} ticket${validCount === 1 ? "" : "s"}`}
              </button>
              <button
                onClick={clearFile}
                disabled={importing}
                className="px-4 py-2 rounded-md text-sm font-medium text-slate hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}