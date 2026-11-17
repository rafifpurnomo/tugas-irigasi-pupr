const path = require("path");

const readGeoJson = require("../utils/readGeoJson");
const { DATA_DIR } = require("../config/dataConfig");

const { cleanPlotFeatures } = require("../services/plotCleaningService");

async function testPlotCleaning() {
  try {
    const filePath = path.join(DATA_DIR, "petak_tersier.geojson");
    const features = readGeoJson(filePath);

    const result = cleanPlotFeatures(features);

    console.log("=== TEST PEMBERSIHAN PETAK ===");
    console.log("Jumlah petak awal:", result.jumlah_awal);
    console.log("Jumlah petak akhir:", result.jumlah_akhir);
    console.log("Jumlah duplikat:", result.jumlah_duplikat);

    console.log("\nContoh petak hasil cleaning:");
    console.dir(result.petak[0], { depth: 5 });

    console.log("\nRingkasan kualitas data:");

    const ringkasan = {};

    for (const item of result.kualitas) {
      ringkasan[item.kategori] = (ringkasan[item.kategori] || 0) + 1;
    }

    console.table(ringkasan);

    console.log("\nContoh detail kualitas data:");
    console.dir(result.kualitas.slice(0, 10), { depth: 4 });

    const totalLuas = result.petak.reduce(
      (total, item) => total + item.luas_ha,
      0,
    );

    console.log("\nTotal luas petak (ha):", totalLuas.toFixed(2));
  } catch (error) {
    console.error("Gagal membersihkan petak:", error);
  }
}

testPlotCleaning();
