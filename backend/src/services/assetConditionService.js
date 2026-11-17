const { normalizeDate } = require("../utils/normalize");

function getCurrentAssetConditions(assets = [], reports = []) {
  const activeReports = reports.filter(
    (report) =>
      report.status === "AKTIF" &&
      report.kode_aset &&
      report.tanggal &&
      report.kondisi,
  );

  return assets.map((asset) => {
    const assetDate = normalizeDate(asset.tgl_update);

    const matchedReports = activeReports.filter(
      (report) => report.kode_aset === asset.kode_aset,
    );

    // Urutkan tanggal terbaru terlebih dahulu.
    matchedReports.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    const latestReport = matchedReports[0];

    let kondisi = asset.kondisi;
    let tglKondisi = assetDate;
    let sumberKondisi = "inventaris";

    // Laporan menang jika tanggalnya sama atau lebih baru.
    if (latestReport && (!assetDate || latestReport.tanggal >= assetDate)) {
      kondisi = latestReport.kondisi;
      tglKondisi = latestReport.tanggal;
      sumberKondisi = "laporan";
    }

    return {
      ...asset,
      kondisi,
      tgl_kondisi: tglKondisi,
      sumber_kondisi: sumberKondisi,
    };
  });
}

module.exports = {
  getCurrentAssetConditions,
};
