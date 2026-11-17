require("dotenv").config();

const app = require("./app");

const { sequelize, import_status: ImportStatus } = require("./database/models/index");

const { initialImport } = require("./services/initialImportService");

const { setStatus } = require("./services/startupService");

const PORT = process.env.PORT || 3000;

async function startServer() {
  // 1. Jalankan HTTP server terlebih dahulu
  const server = app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });

  try {
    // 2. Hubungkan database
    console.log("Menghubungkan ke database...");

    await sequelize.authenticate();

    console.log("Koneksi database berhasil!");

    // 3. Sinkronisasi model dengan database
    await sequelize.sync();

    console.log("Database berhasil disinkronisasi!");

    // 4. Periksa status initial import
    console.log("Memeriksa status initial import...");

    const importStatus = await ImportStatus.findByPk("initial");

    // 5. Jalankan initial import jika belum pernah dilakukan
    if (!importStatus || !importStatus.selesai) {
      console.log("Initial import belum dilakukan.");

      await initialImport();
    } else {
      console.log("Initial import sudah selesai. Melewati import.");
    }

    // 6. Ubah status backend menjadi siap
    setStatus("siap");

    console.log("Backend siap menerima request!");
  } catch (error) {
    console.error("Gagal menjalankan startup backend:", error);

    setStatus("memuat");
  }

  return server;
}

startServer();
