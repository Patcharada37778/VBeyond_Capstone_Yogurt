// Reads the first sheet of an .xlsx file, or a .csv file, into an array of rows (arrays of cell values).
// Runs entirely in the browser; no library needed.

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Minimal zip reader: returns { path: Uint8Array } for the entries we ask for.
async function unzip(buf, wanted) {
  const v = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = {};
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (!wanted(name)) continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const data = new Uint8Array(buf, start, size);
    out[name] = method === 0 ? data : new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  }
  return out;
}

const colIndex = (ref) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

async function parseXlsx(buf) {
  const files = await unzip(buf, (n) => n === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/.test(n));
  const dec = new TextDecoder();
  const xml = (bytes) => new DOMParser().parseFromString(dec.decode(bytes), 'application/xml');
  const shared = files['xl/sharedStrings.xml']
    ? [...xml(files['xl/sharedStrings.xml']).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join(''))
    : [];
  const sheetName = Object.keys(files).filter((n) => n.includes('worksheets')).sort()[0];
  if (!sheetName) return [];
  const rows = [];
  [...xml(files[sheetName]).getElementsByTagName('row')].forEach((r) => {
    const row = [];
    [...r.getElementsByTagName('c')].forEach((c) => {
      const type = c.getAttribute('t');
      const raw = c.getElementsByTagName('v')[0]?.textContent ?? '';
      const val = type === 's' ? shared[Number(raw)] ?? '' : type === 'inlineStr' ? [...c.getElementsByTagName('t')].map((t) => t.textContent).join('') : raw;
      row[colIndex(c.getAttribute('r'))] = val;
    });
    rows.push(Array.from(row, (x) => x ?? ''));
  });
  return rows;
}

/** Returns non-empty rows from the file. Throws if the file can't be read. */
export async function readSheet(file) {
  const rows = /\.csv$/i.test(file.name) ? parseCsv(await file.text()) : await parseXlsx(await file.arrayBuffer());
  return rows.map((r) => r.map((c) => String(c).trim())).filter((r) => r.some(Boolean));
}

/** Excel stores dates as day serials; CSV usually has text dates. */
export function toDate(value) {
  if (/^\d+(\.\d+)?$/.test(value) && Number(value) > 20000) return new Date(Math.round((Number(value) - 25569) * 86400000));
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // DD/MM/YYYY
  const d = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
