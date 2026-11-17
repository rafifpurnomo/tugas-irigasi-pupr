// src/testGeometry.js

const {
  findNearestCanal,
  validateAssetLocation,
  calculateCanalLengthKm,
} = require("../services/geometryService");

// Garis saluran contoh di sekitar lokasi aset.
const canals = [
  {
    id_ruas: "TEST-001",
    nama_saluran: "Saluran Pengujian",
    geometry: {
      type: "LineString",
      coordinates: [
        [110.431, -7.638],
        [110.432, -7.638],
      ],
    },
  },
];

// Aset dekat saluran.
const assetNear = {
  kode_aset: "TEST-001",
  lon: 110.431368,
  lat: -7.638081,
  tanda: [],
};

// Aset jauh dari saluran.
const assetFar = {
  kode_aset: "TEST-002",
  lon: 110.431368,
  lat: -7.65,
  tanda: [],
};

console.log("=== TEST GEOMETRY ===");

console.log("\nJarak aset ke saluran:");
console.log(findNearestCanal(assetNear.lon, assetNear.lat, canals));

console.log("\nValidasi aset dekat:");
console.log(validateAssetLocation(assetNear, canals));

console.log("\nValidasi aset jauh:");
console.log(validateAssetLocation(assetFar, canals));

console.log("\nPanjang saluran (km):");
console.log(calculateCanalLengthKm(canals[0].geometry));
