const { sequelize } = require("../database/models");

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log("Database tersambung; tabel yang belum ada sudah dibuat.");
  } catch (error) {
    console.error("Gagal menyiapkan tabel database:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

syncDatabase();
