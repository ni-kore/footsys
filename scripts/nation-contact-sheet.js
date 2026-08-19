/**
 * Baut Kontaktbögen aus `assets/nations`.
 *
 * Die Dateien heißen nur nach einer Nummer, ihr Verband steht nirgends. Um sie
 * zuzuordnen, muss man sie ansehen. Dieses Skript legt sie dafür in Rastern
 * ab, jedes Feld mit seiner laufenden Nummer, sodass ein Bogen auf einmal
 * durchgesehen werden kann.
 *
 *   node scripts/nation-contact-sheet.js
 *
 * Die Bögen landen in .cache/nations/ und gehören nicht ins Verzeichnis.
 */

const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'assets/nations');
const outDir = path.join(repoRoot, '.cache/nations');

const COLUMNS = 6;
const ROWS = 5;
const CELL = 150;
const LABEL = 22;
const PER_SHEET = COLUMNS * ROWS;

// Ziffern als 3x5-Raster, damit die laufende Nummer ohne Schriftart auskommt.
const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

function setPixel(sheet, x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= sheet.width || y >= sheet.height) return;
  const i = (sheet.width * y + x) << 2;
  sheet.data[i] = r;
  sheet.data[i + 1] = g;
  sheet.data[i + 2] = b;
  sheet.data[i + 3] = 255;
}

function drawNumber(sheet, value, left, top, scale) {
  const text = String(value);
  let cursor = left;
  for (const char of text) {
    const glyph = DIGITS[char];
    if (!glyph) continue;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        if (glyph[row][col] !== '1') continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            setPixel(sheet, cursor + col * scale + dx, top + row * scale + dy, 255, 255, 255);
          }
        }
      }
    }
    cursor += 4 * scale;
  }
}

/** Zeichnet ein Logo mittig und größtmöglich in sein Feld, auf hellem Grund. */
function drawLogo(sheet, file, left, top) {
  let png;
  try {
    png = PNG.sync.read(fs.readFileSync(file));
  } catch {
    return;
  }

  const scale = Math.min((CELL - 12) / png.width, (CELL - 12) / png.height);
  const width = Math.round(png.width * scale);
  const height = Math.round(png.height * scale);
  const offsetX = left + Math.round((CELL - width) / 2);
  const offsetY = top + Math.round((CELL - height) / 2);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(png.width - 1, Math.floor(x / scale));
      const sy = Math.min(png.height - 1, Math.floor(y / scale));
      const i = (png.width * sy + sx) << 2;
      const alpha = png.data[i + 3] / 255;
      if (alpha === 0) continue;
      // Über weißem Grund zusammenrechnen, sonst verschwinden helle Logos.
      const r = Math.round(png.data[i] * alpha + 245 * (1 - alpha));
      const g = Math.round(png.data[i + 1] * alpha + 245 * (1 - alpha));
      const b = Math.round(png.data[i + 2] * alpha + 245 * (1 - alpha));
      setPixel(sheet, offsetX + x, offsetY + y, r, g, b);
    }
  }
}

const files = fs.readdirSync(sourceDir).filter((f) => f.toLowerCase().endsWith('.png')).sort();
fs.mkdirSync(outDir, { recursive: true });

const index = [];
for (let sheetNo = 0; sheetNo * PER_SHEET < files.length; sheetNo += 1) {
  const batch = files.slice(sheetNo * PER_SHEET, (sheetNo + 1) * PER_SHEET);
  const sheet = new PNG({ width: COLUMNS * CELL, height: ROWS * (CELL + LABEL) });

  for (let i = 0; i < sheet.data.length; i += 4) {
    sheet.data[i] = 245;
    sheet.data[i + 1] = 245;
    sheet.data[i + 2] = 245;
    sheet.data[i + 3] = 255;
  }

  batch.forEach((file, i) => {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    const left = col * CELL;
    const top = row * (CELL + LABEL);

    // Streifen für die Nummer.
    for (let y = top + CELL; y < top + CELL + LABEL; y += 1) {
      for (let x = left; x < left + CELL; x += 1) setPixel(sheet, x, y, 25, 25, 30);
    }
    drawLogo(sheet, path.join(sourceDir, file), left, top);
    drawNumber(sheet, sheetNo * PER_SHEET + i + 1, left + 6, top + CELL + 5, 3);
    index.push({ nr: sheetNo * PER_SHEET + i + 1, file });
  });

  const target = path.join(outDir, 'sheet-' + String(sheetNo + 1).padStart(2, '0') + '.png');
  fs.writeFileSync(target, PNG.sync.write(sheet));
  console.log('geschrieben: ' + path.relative(repoRoot, target) + ' (' + batch.length + ' Logos)');
}

fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(files.length + ' Logos auf ' + Math.ceil(files.length / PER_SHEET) + ' Bögen');
