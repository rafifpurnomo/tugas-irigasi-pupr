const path = require("path");

const readGeoJson = require("./../utils/readGeoJson");
const { DATA_DIR } = require("../config/dataConfig");
const { cleanCanalFeatures } = require("../services/canalCleaningService");

async function testCanalCleaning() {
  try {
    const filePath = path.join(DATA_DIR, "saluran.geojson");
    const features = readGeoJson(filePath);

    const result = cleanCanalFeatures(features);

    console.log("=== TEST PEMBERSIHAN SALURAN ===");
    console.log("Jumlah saluran awal:", result.jumlah_awal);
    console.log("Jumlah saluran akhir:", result.jumlah_akhir);
    console.log("Jumlah ruas duplikat:", result.jumlah_duplikat);

    console.log("\nContoh saluran hasil cleaning:");
    console.dir(result.saluran[0], { depth: 4 });

    console.log("\nContoh kualitas data:");
    console.dir(result.kualitas.slice(0, 5), { depth: 4 });

    console.log("\nTotal panjang seluruh saluran (km):");
    const totalPanjang = result.saluran.reduce(
      (total, saluran) => total + saluran.panjang_km,
      0,
    );

    console.log(totalPanjang.toFixed(2));
  } catch (error) {
    console.error("Gagal membersihkan saluran:", error);
  }
}

testCanalCleaning();
