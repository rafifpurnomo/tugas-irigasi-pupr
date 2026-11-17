const path = require("path");
const readCsv = require("../utils/readCsv");
const readExcel = require("../utils/readExcel");
const readGeoJson = require("../utils/readGeoJson");
const { DATA_DIR } = require("../config/dataConfig");
const { cleanCanalFeatures } = require("../services/canalCleaningService");
const { cleanPlotFeatures } = require("../services/plotCleaningService");
const { cleanAssets } = require("../services/assetCleaningService");
const { cleanReports } = require("../services/reportCleaningService");
const {
  getCurrentAssetConditions,
} = require("../services/assetConditionService");

async function testReportCleaning() {
  try {
    const [assetRows, reportRows, canalFeatures, plotFeatures] =
      await Promise.all([
        readCsv(path.join(DATA_DIR, "aset_bangunan.csv")),
        readExcel(path.join(DATA_DIR, "laporan_penelusuran.xlsx")),
        readGeoJson(path.join(DATA_DIR, "saluran.geojson")),
        readGeoJson(path.join(DATA_DIR, "petak_tersier.geojson")),
      ]);

    // 1. Cleaning saluran dan petak
    const canals = cleanCanalFeatures(canalFeatures);
    const plots = cleanPlotFeatures(plotFeatures);

    // 2. Cleaning aset menggunakan saluran yang sudah dibersihkan
    const assetResult = cleanAssets(assetRows, canals.saluran);
    const assets = assetResult.aset;

    // 3. Cleaning laporan dan pencocokan ke aset
    const reportResult = cleanReports(reportRows, assets);

    // 4. Menentukan kondisi terkini setiap aset
    const currentAssets = getCurrentAssetConditions(
      assets,
      reportResult.laporan,
    );

    console.log("=== TEST CLEANING LAPORAN ===");

    console.log("\nJumlah laporan awal:", reportResult.jumlah_awal);
    console.log("Jumlah laporan akhir:", reportResult.jumlah_akhir);
    console.log("Laporan tanpa aset:", reportResult.jumlah_tanpa_aset);

    console.log("\nContoh laporan hasil cleaning:");
    console.dir(reportResult.laporan.slice(0, 3), { depth: 4 });

    // Ringkasan kualitas laporan
    console.log("\nRingkasan kualitas laporan:");

    const qualitySummary = {};

    for (const item of reportResult.kualitas) {
      qualitySummary[item.kategori] = (qualitySummary[item.kategori] || 0) + 1;
    }

    console.table(qualitySummary);

    // Ringkasan kondisi aset
    console.log("\nRingkasan kondisi aset:");

    const conditionSummary = {};

    for (const asset of currentAssets) {
      conditionSummary[asset.kondisi] =
        (conditionSummary[asset.kondisi] || 0) + 1;
    }

    console.table(conditionSummary);

    console.log("\nContoh kondisi aset terkini:");
    console.dir(currentAssets.slice(0, 5), { depth: 4 });

    console.log(
      "\nJumlah petak yang berhasil dibersihkan:",
      plots.petak.length,
    );

    console.log("Jumlah ruas saluran:", canals.saluran.length);

    console.log("Jumlah aset yang berhasil dibersihkan:", assets.length);

    console.log("Jumlah aset dengan kondisi terkini:", currentAssets.length);
  } catch (error) {
    console.error("Gagal membersihkan laporan:", error);
  }
}

testReportCleaning();
