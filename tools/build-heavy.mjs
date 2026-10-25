// 遷移先（重いページ）の巨大ファイルを生成する
//   node tools/build-heavy.mjs
//
// 生成するもの
//   pages/heavy.html             … tools/heavy.template.html に、数十MBの DOM 要素を差し込んだもの
//   pages/heavy/heavy-bundle.js  … 数十MBのデータと、数万個の関数からなる巨大バンドル
//
// - GitHub Pages は gzip で配信するため、中身は圧縮が効かないランダムな文字列にする
// - 乱数の種を固定しているので、何度生成しても同じファイルになる

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// HTML：DOM 要素の数と、1要素あたりのランダム文字数（8,000 x 600 文字 ≒ 5MB）
// Chrome は約 5.5MB を超える HTML を prefetch しきれず、10秒後に PrefetchFailedNetError で捨てる（2026年10月に確認）。
// prefetch の効果を測れるよう、その手前の 5MB にしている
const HTML_ELEMENTS = 8_000;
const HTML_CHARS_PER_ELEMENT = 600;

// JS：データ（64KB の文字列 x 320 ≒ 20MB）と、生成する関数の数（≒ 10MB）
const BUNDLE_DATA_CHUNKS = 320;
const BUNDLE_CHARS_PER_CHUNK = 64 * 1024;
const BUNDLE_FUNCTIONS = 20_000;
const STATEMENTS_PER_FUNCTION = 16;

// 種を固定した疑似乱数（mulberry32）
let seed = 20261026;
function random() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function randomString(length) {
  let s = "";
  for (let i = 0; i < length; i++) s += BASE64URL[(random() * 64) | 0];
  return s;
}

const randomInt = (max) => (random() * max) | 0;

function buildHtml() {
  const template = fs.readFileSync(path.join(ROOT, "tools/heavy.template.html"), "utf8");
  const elements = [];
  for (let i = 0; i < HTML_ELEMENTS; i++) {
    elements.push(`<i data-v="${randomString(HTML_CHARS_PER_ELEMENT)}"></i>`);
  }
  const payload = [
    `<!-- 自動生成（tools/build-heavy.mjs）：HTML を重くするための ${HTML_ELEMENTS.toLocaleString()} 個の要素 -->`,
    `<div class="payload" hidden>`,
    elements.join("\n"),
    `</div>`,
  ].join("\n");
  return template.replace("<!-- HEAVY_HTML_PAYLOAD -->", payload);
}

function buildBundle() {
  const lines = ["// 自動生成（tools/build-heavy.mjs）：JS を重くするための巨大バンドル", "const HEAVY_DATA = ["];
  for (let i = 0; i < BUNDLE_DATA_CHUNKS; i++) {
    lines.push(`"${randomString(BUNDLE_CHARS_PER_CHUNK)}",`);
  }
  lines.push("];");

  // 中身の違う関数を大量に作る（すべて heavy.js から呼ばれ、パース・コンパイル・実行される）
  const names = [];
  for (let i = 0; i < BUNDLE_FUNCTIONS; i++) {
    const name = `m${i}`;
    names.push(name);
    const body = [];
    for (let j = 0; j < STATEMENTS_PER_FUNCTION; j++) {
      const a = randomInt(0x7fffffff);
      const b = randomInt(0x7fffffff);
      body.push(`x = (Math.imul(x ^ ${a}, ${b | 1}) + ${randomInt(1000)}) | 0;`);
    }
    lines.push(`function ${name}(x) { ${body.join(" ")} return x; }`);
  }
  lines.push(`const HEAVY_MODULES = [${names.join(",")}];`);
  return lines.join("\n");
}

function write(relativePath, content) {
  const file = path.join(ROOT, relativePath);
  fs.writeFileSync(file, content);
  console.log(`${relativePath}: ${(fs.statSync(file).size / 1024 / 1024).toFixed(1)} MB`);
}

write("pages/heavy.html", buildHtml());
write("pages/heavy/heavy-bundle.js", buildBundle());
