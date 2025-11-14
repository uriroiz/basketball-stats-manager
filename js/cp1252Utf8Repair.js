/**
 * fixHebrewEncoding.js
 * משחזר טקסטים עבריים שהושחתו בקידוד CP1252 ↔ UTF-8
 * מטפל ב-×, \x90, \x9D, ASCII quotes, ובמקרים כמו "×"×"" ("אוהד") ו-"×™×\x9D" ("ים")
 */

const CP1252_UNICODE_TO_BYTE = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};

function isHexPair(a, b) {
  return /^[0-9A-Fa-f]{2}$/.test(a + b);
}

/** מזהה אם הטקסט כבר עברית תקינה */
function looksLikeCleanHebrew(s) {
  return /[\u0590-\u05FF]/.test(s) && !/[×]/.test(s) && !/\\x[0-9A-Fa-f]{2}/.test(s);
}

/**
 * בניית מערך בתים מתוך מחרוזת מודפסת בקידוד CP1252
 * מטפל בכל מקרה חריג שהופיע בדוגמאות: \x90, \x9D, ×"×"", × ×'×•
 */
function buildBytesFromCp1252PrintedString(input) {
  const bytes = [];
  let i = 0;
  let awaitingSecondByte = false;

  // מאפשר מיפוי חכם לרצפים של גרשיים אחרי ×
  function consumeAsciiQuoteRun() {
    let runLen = 0;
    while (i < input.length && input.charCodeAt(i) === 0x22) {
      runLen++;
      i++;
    }
    // מיפוי לסירוגין: 0x94 (ה) ואז 0x93 (ד)
    return runLen % 2 === 0 ? 0x93 : 0x94;
  }

  while (i < input.length) {
    // \xNN -> בייט
    if (input[i] === "\\" && i + 3 < input.length && input[i + 1] === "x") {
      const h1 = input[i + 2], h2 = input[i + 3];
      if (isHexPair(h1, h2)) {
        const b = parseInt(h1 + h2, 16);
        bytes.push(b);
        awaitingSecondByte = false;
        i += 4;
        continue;
      }
    }

    const code = input.codePointAt(i);

    // × -> 0xD7
    if (code === 0x00D7) {
      bytes.push(0xD7);
      awaitingSecondByte = true;
      i++;
      continue;
    }

    // אם יש תו בקרה (0x80–0x9F) ממשי במחרוזת
    if (code >= 0x80 && code <= 0x9F) {
      bytes.push(code);
      awaitingSecondByte = false;
      i++;
      continue;
    }

    // אחרי D7 - טיפול קונטקסטואלי
    if (awaitingSecondByte) {
      if (code === 0x22) { // "
        const mapped = consumeAsciiQuoteRun();
        bytes.push(mapped);
        awaitingSecondByte = false;
        continue;
      }
      if (code === 0x27) { // '
        bytes.push(0x91);
        awaitingSecondByte = false;
        i++;
        continue;
      }
      if (code === 0x20) { // space -> NBSP
        bytes.push(0xA0);
        awaitingSecondByte = false;
        i++;
        continue;
      }
      const mapped = CP1252_UNICODE_TO_BYTE[code];
      if (mapped !== undefined) {
        bytes.push(mapped);
        awaitingSecondByte = false;
        i++;
        continue;
      }
      if (code >= 0x00A0 && code <= 0x00FF) {
        bytes.push(code & 0xFF);
        awaitingSecondByte = false;
        i++;
        continue;
      }
      bytes.push(0x3F); // fail-safe
      awaitingSecondByte = false;
      i += (code > 0xFFFF ? 2 : 1);
      continue;
    }

    // רגיל
    if (code <= 0x7F) { bytes.push(code); i++; continue; }
    if (code >= 0x00A0 && code <= 0x00FF) { bytes.push(code & 0xFF); i++; continue; }
    const b = CP1252_UNICODE_TO_BYTE[code];
    if (b !== undefined) { bytes.push(b); i++; continue; }

    bytes.push(0x3F);
    i += (code > 0xFFFF ? 2 : 1);
  }

  if (awaitingSecondByte) bytes.push(0x3F);
  return new Uint8Array(bytes);
}

function decodeUtf8(bytes) {
  try { 
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes); 
  }
  catch { 
    return null; 
  }
}

function fixFromCp1252PrintedUtf8(input) {
  const bytes = buildBytesFromCp1252PrintedString(input);
  return decodeUtf8(bytes);
}

function repairHebrewNames(input) {
  if (typeof input !== "string" || !input) return input;
  if (looksLikeCleanHebrew(input)) return input;
  return fixFromCp1252PrintedUtf8(input) ?? input;
}

function deepRepairHebrewNames(obj) {
  if (typeof obj === "string") return repairHebrewNames(obj);
  if (Array.isArray(obj)) return obj.map(deepRepairHebrewNames);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deepRepairHebrewNames(v);
    }
    return out;
  }
  return obj;
}

// Expose functions to global scope
window.looksLikeCleanHebrew = looksLikeCleanHebrew;
window.isHexPair = isHexPair;
window.buildBytesFromCp1252PrintedString = buildBytesFromCp1252PrintedString;
window.decodeUtf8 = decodeUtf8;
window.fixFromCp1252PrintedUtf8 = fixFromCp1252PrintedUtf8;
window.repairHebrewNames = repairHebrewNames;
window.deepRepairHebrewNames = deepRepairHebrewNames;

console.log('CP-1252 to UTF-8 repair utility loaded (final production version)');