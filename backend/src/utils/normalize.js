// src/utils/normalizer.js

/**
 * Mengubah nomenklatur menjadi format:
 * B.KW.1
 * B.KW.6A
 *
 * Contoh:
 * B.KW.1  -> B.KW.1
 * BKW 1   -> B.KW.1
 * bkw1    -> B.KW.1
 * B.KA.1a -> B.KA.1A
 * BTS 1   -> B.TS.1
 */
function normalizeNomenklatur(value) {
  if (value === null || value === undefined) return null;

  const cleaned = String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!cleaned) return null;

  // Format umum: satu huruf prefix, kode huruf,
  // nomor, dan kemungkinan suffix huruf.
  const match = cleaned.match(/^([A-Z])([A-Z]+)(\d+)([A-Z]*)$/);

  if (!match) {
    return null;
  }

  const [, prefix, kode, nomor, suffix] = match;

  return `${prefix}.${kode}.${nomor}${suffix}`;
}

/**
 * Menyeragamkan kondisi bangunan dan laporan.
 */
function normalizeKondisi(value) {
  if (value === null || value === undefined) return null;

  const cleaned = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const mapping = {
    baik: "baik",
    b: "baik",

    rr: "rusak_ringan",
    rusak_ringan: "rusak_ringan",
    rusakringan: "rusak_ringan",

    rs: "rusak_sedang",
    rusak_sedang: "rusak_sedang",
    rusaksedang: "rusak_sedang",

    rb: "rusak_berat",
    rusak_berat: "rusak_berat",
    rusakberat: "rusak_berat",
  };

  return mapping[cleaned] || null;
}

/**
 * Menyeragamkan jenis bangunan ke format snake_case.
 */
function normalizeJenis(value) {
  if (value === null || value === undefined) return null;

  const cleaned = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const mapping = {
    bendung: "bendung",
    bangunan_bagi: "bangunan_bagi",
    bangunan_sadap: "bangunan_sadap",
    bangunan_bagi_sadap: "bangunan_bagi_sadap",
    bangunan_pelengkap: "bangunan_pelengkap",

    "bangunan bagi-sadap": "bangunan_bagi_sadap",
  };

  return mapping[cleaned] || null;
}

/**
 * Mengubah angka dengan koma desimal menjadi Number.
 *
 * Contoh:
 * "38,6"   -> 38.6
 * "38.6"   -> 38.6
 * "1.250,5" -> 1250.5
 */
function parseDecimal(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  let cleaned = String(value).trim().replace(/\s/g, "");

  if (!cleaned) return null;

  // Jika terdapat koma, koma dianggap sebagai desimal.
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const result = Number(cleaned);

  return Number.isFinite(result) ? result : null;
}

/**
 * Membuat tanggal dalam format YYYY-MM-DD.
 * Format ambigu dibaca dengan urutan hari-bulan-tahun.
 */
function normalizeDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Jika sudah berupa Date.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
  }

  const input = String(value).trim();

  if (!input) return null;

  // Format YYYY-MM-DD atau YYYY/MM/DD.
  let match = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

  if (match) {
    return formatDateParts(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
    );
  }

  // Format DD-MM-YYYY, DD/MM/YYYY, atau DD.MM.YYYY.
  // Interpretasi hari terlebih dahulu.
  match = input.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);

  if (match) {
    return formatDateParts(
      Number(match[3]),
      Number(match[2]),
      Number(match[1]),
    );
  }

  return null;
}

function formatDateParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));

  // Validasi agar tanggal seperti 31 Februari ditolak.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

module.exports = {
  normalizeNomenklatur,
  normalizeKondisi,
  normalizeJenis,
  parseDecimal,
  normalizeDate,
};
