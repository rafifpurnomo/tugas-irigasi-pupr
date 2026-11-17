const {
  sequelize,
  aset_bangunan,
  laporan_penelusuran,
  ruas_saluran,
  petak_tersier,
  kualitas_data,
} = require("../database/models");

async function dropTables() {
  try {
    await sequelize.authenticate();
    const existingTables = new Set(await sequelize.getQueryInterface().showAllTables());
    // Hapus hanya tabel milik aplikasi, tidak menghapus database atau tabel lain.
    for (const model of [
      kualitas_data,
      petak_tersier,
      ruas_saluran,
      laporan_penelusuran,
      aset_bangunan,
    ]) {
      if (!existingTables.has(model.getTableName())) {
        console.log(`Tabel ${model.getTableName()} tidak ditemukan; dilewati.`);
        continue;
      }
      await model.drop({ cascade: true });
      console.log(`Tabel ${model.getTableName()} dihapus.`);
    }
  } catch (error) {
    console.error("Gagal menghapus tabel:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

dropTables();
