const fs = require('fs');

function toCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function writeCSV(data, filePath) {
  const content = toCSV(data);
  fs.writeFileSync(filePath, content, 'utf8');
}

module.exports = { toCSV, writeCSV };
