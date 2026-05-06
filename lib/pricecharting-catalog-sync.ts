import { inferPriceChartingCategory, normalizePriceKey, type PriceChartingProduct } from "@/lib/pricecharting";

export interface CatalogSyncRow {
  pricecharting_id: string;
  product_name: string;
  console_name: string | null;
  category: string;
  loose_price: number | null;
  cib_price: number | null;
  new_price: number | null;
  graded_price: number | null;
  psa_10_price: number | null;
  box_only_price: number | null;
  manual_only_price: number | null;
  price_fields: Record<string, number>;
  sales_volume: number;
  price_low: number | null;
  price_high: number | null;
  image_url: string | null;
  image_source: string | null;
  upc: string | null;
  asin: string | null;
  epid: string | null;
  release_date: string | null;
  raw_row: Record<string, string>;
  last_synced_at: string;
}

const priceFieldNames = [
  "loose-price",
  "cib-price",
  "new-price",
  "graded-price",
  "manual-only-price",
  "box-only-price",
  "bgs-10-price",
  "condition-17-price",
  "condition-18-price"
];

export function parsePriceChartingCsv(text: string) {
  const rows = parseCsv(text);
  const now = new Date().toISOString();
  const mapped: CatalogSyncRow[] = [];
  const failures: Array<{ row: number; reason: string }> = [];

  rows.forEach((row, index) => {
    try {
      const item = mapCsvRow(row, now);
      if (item) mapped.push(item);
    } catch (error) {
      failures.push({ row: index + 2, reason: error instanceof Error ? error.message : "Could not parse row" });
    }
  });

  return { rows: mapped, failures, rowsSeen: rows.length };
}

function mapCsvRow(row: Record<string, string>, now: string): CatalogSyncRow | null {
  const id = value(row.id) || value(row["pricecharting-id"]) || value(row["product-id"]);
  const productName = value(row["product-name"]) || value(row["product name"]) || value(row.name);
  if (!id || !productName) return null;

  const consoleName = value(row["console-name"]) || value(row["console name"]) || value(row.console);
  const priceFields: Record<string, number> = {};
  for (const [key, raw] of Object.entries(row)) {
    if (!key.endsWith("-price")) continue;
    const cents = parseCents(raw);
    if (Number.isFinite(cents) && cents > 0) priceFields[key] = cents;
  }
  const values = Object.values(priceFields).filter((number) => number > 0);
  const product: PriceChartingProduct = {
    id,
    "product-name": productName,
    "console-name": consoleName || "",
    "sales-volume": parseInteger(row["sales-volume"])
  };

  return {
    pricecharting_id: id,
    product_name: productName,
    console_name: consoleName || null,
    category: inferPriceChartingCategory(product),
    loose_price: priceFields["loose-price"] ?? null,
    cib_price: priceFields["cib-price"] ?? null,
    new_price: priceFields["new-price"] ?? null,
    graded_price: priceFields["graded-price"] ?? null,
    psa_10_price: priceFields["manual-only-price"] ?? null,
    box_only_price: priceFields["box-only-price"] ?? null,
    manual_only_price: priceFields["manual-only-price"] ?? null,
    price_fields: pickKnownPriceFields(priceFields),
    sales_volume: parseInteger(row["sales-volume"]),
    price_low: values.length ? Math.min(...values) : null,
    price_high: values.length ? Math.max(...values) : null,
    image_url: normalizeCsvImage(value(row["image-url"]) || value(row.image)),
    image_source: value(row["image-url"]) || value(row.image) ? "pricecharting" : null,
    upc: value(row.upc),
    asin: value(row.asin),
    epid: value(row.epid),
    release_date: normalizeDate(value(row["release-date"])),
    raw_row: row,
    last_synced_at: now
  };
}

function pickKnownPriceFields(fields: Record<string, number>) {
  const known: Record<string, number> = {};
  for (const field of priceFieldNames) {
    if (fields[field]) known[field] = fields[field];
  }
  for (const [field, value] of Object.entries(fields)) {
    if (!known[field] && field.endsWith("-price")) known[field] = value;
  }
  return known;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headerRow, ...body] = rows.filter((candidate) => candidate.some((cellValue) => cellValue.trim()));
  if (!headerRow) return [];
  const headers = headerRow.map((header) => normalizeHeader(header));
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}

function normalizeHeader(header: string) {
  return normalizePriceKey(header).replace(/-/g, header.includes("-") ? "-" : "-");
}

function parseCents(raw: string) {
  const cleaned = raw?.replace(/[$,]/g, "").trim();
  if (!cleaned) return 0;
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return 0;
  return cleaned.includes(".") ? Math.round(number * 100) : Math.round(number);
}

function parseInteger(raw: string | undefined) {
  const number = Number(raw?.replace(/,/g, "") ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function normalizeCsvImage(raw: string | null) {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/")) return `https://www.pricecharting.com${raw}`;
  return raw;
}

function normalizeDate(raw: string | null) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function value(raw: string | undefined) {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}
