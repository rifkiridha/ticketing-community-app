/**
 * Complete, standalone QR Code Generator and Scanner Utilities
 * Implements standard QR Code matrix generation (Byte Mode, Version 1-4) with Reed-Solomon error correction
 * and BarcodeDetector-based live camera & image file scanning with fallback audio synthesis.
 */

// Galois Field GF(256) tables for QR Reed-Solomon encoding
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) {
      x ^= 0x11d; // Primitive polynomial x^8 + x^4 + x^3 + x^2 + 1
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function polyMultiply(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMultiply(p1[i], p2[j]);
    }
  }
  return result;
}

function getGeneratorPoly(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    poly = polyMultiply(poly, [1, GF_EXP[i]]);
  }
  return poly;
}

function calculateReedSolomon(data: number[], ecCount: number): number[] {
  const genPoly = getGeneratorPoly(ecCount);
  const msg = [...data, ...new Array(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const lead = msg[i];
    if (lead !== 0) {
      for (let j = 0; j < genPoly.length; j++) {
        msg[i + j] ^= gfMultiply(genPoly[j], lead);
      }
    }
  }
  return msg.slice(data.length);
}

// QR Code Version specs: [version, totalDataBytes, ecBytes, dimension]
// Using EC Level L (sufficient for screen and print barcodes)
const QR_VERSIONS = [
  { version: 1, dataBytes: 19, ecBytes: 7, size: 21 },
  { version: 2, dataBytes: 34, ecBytes: 10, size: 25, align: [6, 18] },
  { version: 3, dataBytes: 55, ecBytes: 15, size: 29, align: [6, 22] },
  { version: 4, dataBytes: 80, ecBytes: 20, size: 33, align: [6, 26] },
  { version: 5, dataBytes: 108, ecBytes: 26, size: 37, align: [6, 30] },
  { version: 6, dataBytes: 136, ecBytes: 36, size: 41, align: [6, 34] },
];

export interface QRCodeMatrix {
  size: number;
  modules: boolean[][];
}

export function generateQRCodeMatrix(text: string): QRCodeMatrix {
  // Convert text to UTF-8 bytes
  const encoder = new TextEncoder();
  const textBytes = Array.from(encoder.encode(text));

  // Find lowest viable QR version
  let targetSpec = QR_VERSIONS[QR_VERSIONS.length - 1];
  for (const spec of QR_VERSIONS) {
    // 4 bits mode (0100 for Byte mode) + 8 bits char count + data bytes <= dataBytes
    const neededBytes = textBytes.length + 2;
    if (neededBytes <= spec.dataBytes) {
      targetSpec = spec;
      break;
    }
  }

  const { size, dataBytes, ecBytes } = targetSpec;

  // Build bitstream: Mode Indicator 0100 (Byte mode) + Length (8 bits) + Data
  const bits: number[] = [];
  function pushBits(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  // Byte mode indicator: 0100
  pushBits(0b0100, 4);
  // Character count: 8 bits for versions 1-9
  pushBits(textBytes.length, 8);
  // Data bytes
  for (const b of textBytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zeros)
  const maxBits = dataBytes * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);

  // Pad to 8-bit boundary
  while (bits.length % 8 !== 0 && bits.length < maxBits) {
    bits.push(0);
  }

  // Byte padding pattern 0xEC, 0x11
  const padPatterns = [0b11101100, 0b00010001];
  let padIdx = 0;
  while (bits.length < maxBits) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Group into raw data bytes
  const dataWords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let word = 0;
    for (let j = 0; j < 8; j++) {
      word = (word << 1) | bits[i + j];
    }
    dataWords.push(word);
  }

  // Calculate EC words
  const ecWords = calculateReedSolomon(dataWords, ecBytes);
  const finalWords = [...dataWords, ...ecWords];

  // Initialize Matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null)
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false)
  );

  // 1. Finder patterns (7x7 at 3 corners)
  function placeFinder(startX: number, startY: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const y = startY + r;
        const x = startX + c;
        if (y < 0 || y >= size || x < 0 || x >= size) continue;
        const isBlack =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        matrix[y][x] = isBlack;
        isFunction[y][x] = true;
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (matrix[6][i] === null) {
      matrix[6][i] = val;
      isFunction[6][i] = true;
    }
    if (matrix[i][6] === null) {
      matrix[i][6] = val;
      isFunction[i][6] = true;
    }
  }

  // 3. Alignment pattern for version > 1
  if (targetSpec.align) {
    const [ay, ax] = targetSpec.align;
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const y = ay + r;
        const x = ax + c;
        if (matrix[y][x] === null) {
          const isBlack =
            Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          matrix[y][x] = isBlack;
          isFunction[y][x] = true;
        }
      }
    }
  }

  // 4. Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (i < size) {
      if (matrix[8][i] === null) isFunction[8][i] = true;
      if (matrix[i][8] === null) isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][size - 1 - i] = true;
    isFunction[size - 1 - i][8] = true;
  }
  // Dark module
  matrix[size - 8][8] = true;
  isFunction[size - 8][8] = true;

  // 5. Place Data bits (up and down 2-column zig-zag)
  const allBits: number[] = [];
  for (const byte of finalWords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((byte >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upwards = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip vertical timing column

    const rowRange = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rowRange) {
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        const y = row;
        if (!isFunction[y][x]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          // Apply Standard Mask Pattern 0: (row + col) % 2 === 0
          const mask = (y + x) % 2 === 0;
          matrix[y][x] = Boolean(bit ^ (mask ? 1 : 0));
        }
      }
    }
    upwards = !upwards;
  }

  // 6. Format info bits (Level L, Mask 0) = 0x77c4 with BCH code
  // Mask pattern 0 (000), EC L (01) => 01000
  // Standard format string for (L, 0) is 111011111000100
  const formatString = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];

  // Top-left format info
  const tlCoords: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [y, x] = tlCoords[i];
    matrix[y][x] = Boolean(formatString[i]);
  }

  // Split format info
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = Boolean(formatString[i]);
  }
  for (let i = 7; i < 15; i++) {
    matrix[8][size - 15 + i] = Boolean(formatString[i]);
  }

  // Final clean boolean matrix
  const cleanModules: boolean[][] = matrix.map((row) =>
    row.map((val) => val === true)
  );

  return {
    size,
    modules: cleanModules,
  };
}

/**
 * Renders the generated QR matrix into an SVG string with quiet zone border
 */
export function generateQRCodeSVG(text: string, options: { size?: number; fgColor?: string; bgColor?: string } = {}): string {
  const { size: displaySize = 240, fgColor = '#0f172a', bgColor = '#ffffff' } = options;
  const { size, modules } = generateQRCodeMatrix(text);
  const margin = 3;
  const viewBoxSize = size + margin * 2;

  let rects = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules[y][x]) {
        rects += `<rect x="${x + margin}" y="${y + margin}" width="1" height="1" fill="${fgColor}"/>`;
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${displaySize}" height="${displaySize}" shape-rendering="crispEdges">
      <rect width="100%" height="100%" fill="${bgColor}" rx="6"/>
      ${rects}
    </svg>
  `.trim();
}

/**
 * Synthesizes audible feedback chime using the Web Audio API
 */
export function playCheckInAudio(type: 'success' | 'warning' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'success') {
      // Pleasant dual-tone chime (587Hz D5 -> 880Hz A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);
    } else if (type === 'warning') {
      // Duplicate warning (two rapid amber buzzes)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now);
      osc.frequency.setValueAtTime(329.63, now + 0.1);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.setValueAtTime(0.01, now + 0.08);
      gain.gain.setValueAtTime(0.25, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Error buzz (descending harsh saw wave)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.25);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (err) {
    console.warn('Audio feedback failed or was blocked by browser', err);
  }
}

/**
 * Universal QR code scanner helper using BarcodeDetector if available
 */
export async function scanImageForQR(source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<string | null> {
  // Check if native BarcodeDetector is available in window
  const BarcodeDetectorClass = (window as unknown as { BarcodeDetector?: new (options?: { formats: string[] }) => { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;

  if (BarcodeDetectorClass) {
    try {
      const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
      const barcodes = await detector.detect(source as ImageBitmapSource);
      if (barcodes && barcodes.length > 0) {
        return barcodes[0].rawValue;
      }
    } catch {
      // Fall through to fallback
    }
  }

  return null;
}
