require("dotenv").config();

const { readInitialData } = require("../services/importService");

async function testImport() {
  try {
    const data = await readInitialData();

    console.log("\n=== HASIL PEMBACAAN DATA ===");

    console.log("Jumlah aset:", data.aset.length);
    console.log("Jumlah laporan:", data.laporan.length);
    console.log("Jumlah ruas saluran:", data.saluran.length);
    console.log("Jumlah petak:", data.petak.length);

    console.log("\nContoh data aset:");
    console.log(data.aset[0]);

    console.log("\nContoh data laporan:");
    console.log(data.laporan[0]);

    console.log("\nContoh properti saluran:");
    console.log(data.saluran[0]?.properties);

    console.log("\nContoh properti petak:");
    console.log(data.petak[0]?.properties);
  } catch (error) {
    console.error("Gagal membaca data:", error.message);
  }
}

testImport();
