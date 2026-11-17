const { readInitialData } = require("./importService");

const { cleanCanalFeatures } = require("./canalCleaningService");
const { cleanPlotFeatures } = require("./plotCleaningService");
const { cleanAssets } = require("./assetCleaningService");
const { cleanReports } = require("./reportCleaningService");

const { getCurrentAssetConditions } = require("./assetConditionService");

const {
  sequelize,
  aset_bangunan: AsetBangunan,
  laporan_penelusuran: LaporanPenelusuran,
  ruas_saluran: RuasSaluran,
  petak_tersier: PetakTersier,
  kualitas_data: KualitasData,
  import_status: ImportStatus,
} = require("../database/models");

// Menggabungkan log kualitas dari seluruh proses cleaning.
function prepareQualityData(items, defaultSource) {
  return (items || []).map((item) => ({
    sumber_file: item.sumber_file || item.file || defaultSource,
    pengenal_baris:
      item.pengenal_baris ||
      item.kode_aset ||
      item.id_laporan ||
      item.id_ruas ||
      item.kode_petak ||
      null,
    kategori: item.kategori || "masalah_lainnya",
    masalah:
      item.masalah ||
      item.keterangan ||
      item.kategori ||
      "Data perlu diperiksa",
    tindakan:
      item.tindakan || item.aksi || "Data diproses oleh sistem cleaning",
  }));
}

async function initialImport() {
  const existingImport = await ImportStatus.findByPk("initial");

  if (existingImport?.selesai) {
    console.log("Initial import sudah pernah dilakukan. Melewati import.");

    return {
      skipped: true,
      message: "Initial import sudah selesai sebelumnya",
    };
  }
  console.log("==================================");
  console.log("MEMULAI INITIAL DATA IMPORT");
  console.log("==================================");

  // 1. Membaca seluruh file sumber.
  const rawData = await readInitialData();

  // 2. Membersihkan saluran.
  console.log("Cleaning data saluran...");
  const canalResult = cleanCanalFeatures(rawData.saluran);

  // 3. Membersihkan petak tersier.
  console.log("Cleaning data petak...");
  const plotResult = cleanPlotFeatures(rawData.petak);

  // 4. Membersihkan aset menggunakan saluran yang sudah dibersihkan.
  console.log("Cleaning data aset...");
  const assetResult = cleanAssets(rawData.aset, canalResult.saluran);

  // 5. Membersihkan laporan dan mencocokkannya dengan aset.
  console.log("Cleaning data laporan...");
  const reportResult = cleanReports(rawData.laporan, assetResult.aset);

  // 6. Menentukan kondisi terkini aset berdasarkan inventaris
  //    dan laporan aktif.
  console.log("Menghitung kondisi terkini aset...");
  const currentAssets = getCurrentAssetConditions(
    assetResult.aset,
    reportResult.laporan,
  );

  const currentAssetMap = new Map(
    currentAssets.map((asset) => [asset.kode_aset, asset]),
  );

  // Gabungkan kondisi terkini dengan data aset hasil cleaning.
  const finalAssets = assetResult.aset.map((asset) => {
    const current = currentAssetMap.get(asset.kode_aset);

    return {
      ...asset,
      kondisi: current?.kondisi || asset.kondisi,
      tgl_kondisi: current?.tgl_kondisi || asset.tgl_kondisi,
    };
  });

  // 7. Gabungkan seluruh log kualitas data.
  const qualityData = [
    ...prepareQualityData(canalResult.kualitas, "saluran.geojson"),
    ...prepareQualityData(plotResult.kualitas, "petak_tersier.geojson"),
    ...prepareQualityData(assetResult.kualitas, "aset_bangunan.csv"),
    ...prepareQualityData(reportResult.kualitas, "laporan_penelusuran.xlsx"),
  ];

  // 8. Simpan seluruh hasil ke database dalam satu transaction.
  await sequelize.transaction(async (transaction) => {
    console.log("Menyimpan hasil cleaning ke MySQL...");
    console.log("=== CEK MODEL SEQUELIZE ===");

    console.log({
      sequelize: !!sequelize,
      AsetBangunan: !!AsetBangunan,
      LaporanPenelusuran: !!LaporanPenelusuran,
      RuasSaluran: !!RuasSaluran,
      PetakTersier: !!PetakTersier,
      KualitasData: !!KualitasData,
    });

    // Hapus data lama dengan urutan memperhatikan relasi foreign key.
    await LaporanPenelusuran.destroy({
      where: {},
      transaction,
    });

    await AsetBangunan.destroy({
      where: {},
      transaction,
    });

    await RuasSaluran.destroy({
      where: {},
      transaction,
    });

    await PetakTersier.destroy({
      where: {},
      transaction,
    });

    await KualitasData.destroy({
      where: {},
      transaction,
    });

    // Simpan aset.
    if (finalAssets.length > 0) {
      await AsetBangunan.bulkCreate(finalAssets, {
        transaction,
      });
    }

    // Simpan laporan, termasuk laporan batal untuk riwayat.
    if (reportResult.laporan.length > 0) {
      await LaporanPenelusuran.bulkCreate(reportResult.laporan, {
        transaction,
      });
    }

    // Simpan saluran.
    if (canalResult.saluran.length > 0) {
      await RuasSaluran.bulkCreate(canalResult.saluran, { transaction });
    }

    // Simpan petak tersier.
    if (plotResult.petak.length > 0) {
      await PetakTersier.bulkCreate(plotResult.petak, { transaction });
    }

    // Simpan catatan kualitas data.
    if (qualityData.length > 0) {
      await KualitasData.bulkCreate(qualityData, { transaction });
    }

    // Tandai bahwa initial import sudah selesai.
    await ImportStatus.upsert(
      {
        id: "initial",
        selesai: true,
        selesai_pada: new Date(),
      },
      { transaction },
    );
  });

  console.log("==================================");
  console.log("INITIAL IMPORT BERHASIL");
  console.log("==================================");

  console.table({
    aset: finalAssets.length,
    laporan: reportResult.laporan.length,
    saluran: canalResult.saluran.length,
    petak: plotResult.petak.length,
    kualitas_data: qualityData.length,
  });

  return {
    jumlah_aset: finalAssets.length,
    jumlah_laporan: reportResult.laporan.length,
    jumlah_saluran: canalResult.saluran.length,
    jumlah_petak: plotResult.petak.length,
    jumlah_kualitas: qualityData.length,
  };
}

module.exports = { initialImport };
