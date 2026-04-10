// ── KONSTANTEN ──
const ALPHA = ‘ABCDEFGHIJKLMNOPQRSTUVWXYZ’;

// ── ZUSTAND ──
let mode       = ‘encrypt’; // aktueller Modus: ‘encrypt’ oder ‘decrypt’
let steps      = [];        // berechnete Schritte für die Visualisierung
let activeStep = -1;        // welcher Schritt gerade hervorgehoben ist

// ── MODUS WECHSELN ──
function setMode(m) {
mode = m;
document.getElementById(‘encBtn’).classList.toggle(‘active’, m === ‘encrypt’);
document.getElementById(‘decBtn’).classList.toggle(‘active’, m === ‘decrypt’);
document.getElementById(‘inputLabel’).textContent  = m === ‘encrypt’ ? ‘Klartext’   : ‘Geheimtext’;
document.getElementById(‘outputLabel’).textContent = m === ‘encrypt’ ? ‘Geheimtext’ : ‘Klartext’;
process();
}

// ── HILFSFUNKTIONEN ──

// Nur Großbuchstaben A-Z behalten
function sanitize(str) {
return str.toUpperCase().replace(/[^A-Z]/g, ‘’);
}

// Schlüssel bis zur gewünschten Länge wiederholen
// Beispiel: repeatKey(“AB”, 5) → “ABABA”
function repeatKey(key, len) {
if (!key.length) return ‘’;
let out = ‘’;
while (out.length < len) out += key;
return out.slice(0, len);
}

// ── VIGENÈRE VERSCHLÜSSELN ──
function vigEncrypt(plain, key) {
const p = sanitize(plain);
const k = sanitize(key);
if (!p || !k) return { result: ‘’, steps: [] };

const kr = repeatKey(k, p.length);
let result   = ‘’;
let stepsArr = [];

for (let i = 0; i < p.length; i++) {
const pi = ALPHA.indexOf(p[i]);   // Position Klartextbuchstabe
const ki = ALPHA.indexOf(kr[i]);  // Position Schlüsselbuchstabe
const ci = (pi + ki) % 26;        // Vigenère-Formel

```
result += ALPHA[ci];
stepsArr.push({
  plain:  p[i],
  key:    kr[i],
  cipher: ALPHA[ci],
  pi, ki, ci,
  op: `(${pi}+${ki})%26=${ci}`
});
```

}

return { result, steps: stepsArr };
}

// ── VIGENÈRE ENTSCHLÜSSELN ──
function vigDecrypt(cipher, key) {
const c = sanitize(cipher);
const k = sanitize(key);
if (!c || !k) return { result: ‘’, steps: [] };

const kr = repeatKey(k, c.length);
let result   = ‘’;
let stepsArr = [];

for (let i = 0; i < c.length; i++) {
const ci = ALPHA.indexOf(c[i]);   // Position Geheimtextbuchstabe
const ki = ALPHA.indexOf(kr[i]);  // Position Schlüsselbuchstabe
const pi = (ci - ki + 26) % 26;  // Umgekehrte Vigenère-Formel (+26 verhindert negative Werte)

```
result += ALPHA[pi];
stepsArr.push({
  plain:  ALPHA[pi],
  key:    kr[i],
  cipher: c[i],
  pi, ki, ci,
  op: `(${ci}-${ki}+26)%26=${pi}`
});
```

}

return { result, steps: stepsArr };
}

// ── HAUPTFUNKTION: Eingabe verarbeiten ──
function process() {
const text      = document.getElementById(‘plainInput’).value;
const key       = sanitize(document.getElementById(‘keyInput’).value);
const cleanText = sanitize(text);

// Erweiterter Schlüssel anzeigen
const keyEl = document.getElementById(‘keyExpanded’);
if (key && cleanText) {
const expanded = repeatKey(key, cleanText.length);
keyEl.textContent = expanded.length > 20 ? expanded.slice(0, 20) + ‘…’ : expanded;
} else {
keyEl.textContent = ‘’;
}

// Ver- oder Entschlüsseln
const { result, steps: s } = mode === ‘encrypt’
? vigEncrypt(text, key)
: vigDecrypt(text, key);

steps      = s;
activeStep = steps.length > 0 ? 0 : -1;

// Ergebnis anzeigen
const outEl = document.getElementById(‘outputBox’);
if (result) {
outEl.classList.remove(‘empty’);
outEl.innerHTML = result + ‘<button class="copy-btn" onclick="copyResult()">KOPIEREN</button>’;
} else {
outEl.classList.add(‘empty’);
outEl.innerHTML = ‘Ergebnis erscheint hier…<button class="copy-btn" onclick="copyResult()">KOPIEREN</button>’;
}

renderSteps();

if (activeStep >= 0) {
highlightStep(0);
} else {
document.getElementById(‘explainBox’).innerHTML =
‘Gib einen Text und ein Schlüsselwort ein, um die Visualisierung zu starten.’;
renderTable(-1, -1);
}
}

// ── SCHRITT-KACHELN RENDERN ──
function renderSteps() {
const grid = document.getElementById(‘stepsGrid’);
grid.innerHTML = ‘’;

steps.forEach((s, i) => {
const cell = document.createElement(‘div’);
cell.className = ‘step-cell’ + (i === activeStep ? ’ active’ : ‘’);
cell.innerHTML = `<div class="plain">${s.plain}</div> <div class="key">${s.key}</div> <div class="arrow">▼</div> <div class="cipher">${s.cipher}</div>`;
cell.onclick = () => highlightStep(i);
grid.appendChild(cell);
});
}

// ── SCHRITT HERVORHEBEN + TABELLE AKTUALISIEREN ──
function highlightStep(i) {
activeStep = i;

// Aktive Kachel markieren
document.querySelectorAll(’.step-cell’).forEach((el, idx) => {
el.classList.toggle(‘active’, idx === i);
});

const s       = steps[i];
const explain = document.getElementById(‘explainBox’);

// Erklärungstext generieren
if (mode === ‘encrypt’) {
explain.innerHTML = `Buchstabe <span class="hl">${s.plain}</span> (Position <span class="hl">${s.pi}</span>) + Schlüssel <span class="hl2">${s.key}</span> (Position <span class="hl2">${s.ki}</span>) = <span class="hl3">(${s.pi} + ${s.ki}) mod 26 = ${s.ci}</span> → <span class="hl3">${s.cipher}</span>`;
} else {
explain.innerHTML = `Geheimtext <span class="hl">${s.cipher}</span> (Position <span class="hl">${s.ci}</span>) − Schlüssel <span class="hl2">${s.key}</span> (Position <span class="hl2">${s.ki}</span>) = <span class="hl3">(${s.ci} − ${s.ki} + 26) mod 26 = ${s.pi}</span> → <span class="hl3">${s.plain}</span>`;
}

// Tabelle aktualisieren: Zeile = Schlüssel, Spalte = Klartext/Geheimtext
renderTable(s.ki, mode === ‘encrypt’ ? s.pi : s.ci);
}

// ── VIGENÈRE-TABELLE RENDERN ──
function renderTable(rowIdx, colIdx) {
const table = document.getElementById(‘vigTable’);
let html = ‘<tr><td class="header-cell"></td>’;

// Kopfzeile (Spaltenbezeichnungen A-Z)
for (let c = 0; c < 26; c++) {
const cls = c === colIdx ? ’ highlight-col’ : ‘’;
html += `<td class="header-cell${cls}">${ALPHA[c]}</td>`;
}
html += ‘</tr>’;

// Tabellenzeilen
for (let r = 0; r < 26; r++) {
const isRow = r === rowIdx;
html += `<tr><td class="header-cell${isRow ? ' highlight-row' : ''}">${ALPHA[r]}</td>`;

```
for (let c = 0; c < 26; c++) {
  const letter  = ALPHA[(r + c) % 26];
  const isCross = isRow && c === colIdx;
  const isR     = isRow && !isCross;
  const isC     = c === colIdx && !isCross;

  let cls = '';
  if      (isCross) cls = 'highlight-cross';
  else if (isR)     cls = 'highlight-row';
  else if (isC)     cls = 'highlight-col';

  html += `<td class="${cls}">${letter}</td>`;
}
html += '</tr>';
```

}

table.innerHTML = html;
}

// ── ERGEBNIS KOPIEREN ──
function copyResult() {
const text = document.getElementById(‘outputBox’).textContent
.replace(‘KOPIEREN’, ‘’)
.trim();
if (text && text !== ‘Ergebnis erscheint hier…’) {
navigator.clipboard.writeText(text).catch(() => {});
}
}

// ── INITIALISIERUNG: leere Tabelle beim Laden ──
renderTable(-1, -1);
