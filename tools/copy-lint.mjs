// Flags two-beat antithesis ("not X, but Y", "X, not Y", "X. Not Y."), "No X. No Y." stacks, generic openers
// and aphorism-style fragments in the visible text of every built page (legal pages reported separately).
import fs from "node:fs"; import path from "node:path";
const root = process.argv[2] || "dist";
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f === "index.html") files.push(p); } })(root);
const rules = [
  [/\bnot [^.?!]{1,40}, but\b/i, "not X, but Y"],
  [/\b\w+[^.?!]{0,30}, not [a-z]/i, "X, not Y"],
  [/[.!?] Not [a-z]/i, "X. Not Y."],
  [/\bNo [a-z][^.]{0,25}\. No [a-z]/i, "No X. No Y."],
  [/\brather than\b|\binstead of\b/i, "rather than / instead of"],
  [/\b(in today's|welcome to|we are passionate|look no further|unlock|elevate|supercharge|game-?changer|cutting-edge|seamless)\b/i, "generic opener/buzzword"],
  [/\bisn't just\b|\bmore than just\b|\bit's not about\b/i, "aphorism formula"],
];
let n = 0;
for (const f of files) {
  let html = fs.readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ");
  const text = html.replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i] + " " + (sentences[i + 1] || "").slice(0, 40);
    for (const [re, label] of rules) if (re.test(s)) { n++; console.log(`${path.relative(root, f)} | ${label} | ${sentences[i].slice(0, 160)}`); }
  }
}
console.log(`TOTAL ${n}`);
