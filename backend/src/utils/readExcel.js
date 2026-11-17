
const XLSX = require("xlsx");

function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false,
  });
}

module.exports = readExcel;
