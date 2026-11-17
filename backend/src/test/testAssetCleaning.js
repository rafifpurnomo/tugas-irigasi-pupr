const path = require("path");

const readCsv = require("../utils/readCsv");
const readGeoJson = require("../utils/readGeoJson");

const { DATA_DIR } = require("../config/dataConfig");

const { cleanCanalFeatures } = require("../services/canalCleaningService");

const { cleanAssets } = require("../services/assetCleaningService");

async function testAssetCleaning() {
  try {
    const [assetRows, canalFeatures] = await Promise.all([
      readCsv(path.join(DATA_DIR, "aset_bangunan.csv")),
      readGeoJson(path.join(DATA_DIR, "saluran.geojson")),
    ]);

    const cleanedCanals = cleanCanalFeatures(canalFeatures);

    const result = cleanAssets(assetRows, cleanedCanals.saluran);

    console.log("=== TEST CLEANING ASET ===");
    console.log("Jumlah awal:", result.jumlah_awal);
    console.log("Jumlah akhir:", result.jumlah_akhir);

    console.log("\nContoh aset:");
    console.dir(result.aset.slice(0, 5), { depth: 4 });

    console.log("\nRingkasan kualitas data:");

    const summary = {};

    for (const item of result.kualitas) {
      summary[item.kategori] = (summary[item.kategori] || 0) + 1;
    }

    console.table(summary);

    console.log("\nJumlah aset dengan geometri:");
    console.log(result.aset.filter((item) => item.geometri).length);

    console.log("\nJumlah aset tanpa geometri:");
    console.log(result.aset.filter((item) => !item.geometri).length);

    console.log("\nJumlah aset jauh dari saluran:");
    console.log(
      result.aset.filter((item) => item.tanda.includes("jauh_dari_saluran"))
        .length,
    );
  } catch (error) {
    console.error("Gagal membersihkan aset:", error);
  }
}

testAssetCleaning();
