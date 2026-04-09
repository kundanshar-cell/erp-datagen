const fs = require('fs');

function toJSON(data) {
  return JSON.stringify(data, null, 2);
}

function writeJSON(data, filePath) {
  fs.writeFileSync(filePath, toJSON(data), 'utf8');
}

module.exports = { toJSON, writeJSON };
