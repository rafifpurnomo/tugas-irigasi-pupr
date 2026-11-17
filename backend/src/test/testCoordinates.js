// src/testCoordinates.js

const proj4 = require("proj4");

const {
  normalizeCoordinatePair,
  normalizeLatLon,
} = require("../utils/coordinateUtils");

console.log("=== TEST KOORDINAT ===");

// 1. WGS84 normal
console.log("\nWGS84 normal:");
console.log(normalizeCoordinatePair(110.431368, -7.638081));

// 2. WGS84 tertukar
console.log("\nWGS84 tertukar:");
console.log(normalizeCoordinatePair(-7.638081, 110.431368));

// 3. UTM 49S
const utm = proj4(
  "EPSG:4326",
  "+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs",
  [110.431368, -7.638081],
);

console.log("\nUTM 49S:");
console.log(normalizeCoordinatePair(utm[0], utm[1]));

// 4. Koordinat kosong
console.log("\nKoordinat kosong:");
console.log(normalizeCoordinatePair(null, null));

// 5. Format laporan: lat, lon
console.log("\nKoordinat laporan:");
console.log(normalizeLatLon(-7.638081, 110.431368));
