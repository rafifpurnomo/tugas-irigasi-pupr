const {
  normalizeNomenklatur,
  normalizeKondisi,
  normalizeJenis,
  parseDecimal,
  normalizeDate,
} = require("../utils/normalize");

console.log("=== TEST NORMALIZER ===");

console.log("\nNomenklatur:");
["B.KW.1", "BKW 1", "bkw1", "B.KA.1a", "BTS 1"].forEach((value) => {
  console.log(value, "=>", normalizeNomenklatur(value));
});

console.log("\nKondisi:");
["baik", "RR", "Rusak Ringan", "RS", "rusak berat"].forEach((value) => {
  console.log(value, "=>", normalizeKondisi(value));
});

console.log("\nJenis:");
[
  "Bendung",
  "Bangunan Bagi",
  "Bangunan Sadap",
  "Bangunan Bagi-Sadap",
  "Bangunan Pelengkap",
].forEach((value) => {
  console.log(value, "=>", normalizeJenis(value));
});

console.log("\nAngka desimal:");
["38,6", "38.6", "1.250,5"].forEach((value) => {
  console.log(value, "=>", parseDecimal(value));
});

console.log("\nTanggal:");
["2026-09-14", "14/09/2026", "14-09-2026", "31/02/2026"].forEach((value) => {
  console.log(value, "=>", normalizeDate(value));
});
