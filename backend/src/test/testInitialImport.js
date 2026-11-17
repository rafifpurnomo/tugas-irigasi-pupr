require("dotenv").config();

const { sequelize } = require("../database/models/index");
const { initialImport } = require("../services/initialImportService");

async function testInitialImport() {
  try {
    await sequelize.authenticate();
    console.log("Koneksi database berhasil!");

    await sequelize.sync();

    const result = await initialImport();

    console.log("\n=== HASIL INITIAL IMPORT ===");
    console.table(result);
  } catch (error) {
    console.error("Initial import gagal:", error);
  } finally {
    await sequelize.close();
  }
}

testInitialImport();
