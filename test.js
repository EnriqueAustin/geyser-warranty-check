// Run with: node test.js
const G = require("./decode.js");
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
const d = s => new Date(s + "T00:00:00");

eq("D is 2025 (Kwikot FAQ)", G.yearFor("D", 6, d("2026-11-10")), 2025);
eq("K is 2008", G.yearFor("K", 11, d("2026-11-10")), 2008);
eq("V is 2017", G.yearFor("V", 3, d("2026-11-10")), 2017);
eq("E Nov 2026 is this month", G.yearFor("E", 11, d("2026-11-10")), 2026);
eq("E Dec in Nov 2026 falls back to 2002", G.yearFor("E", 12, d("2026-11-10")), 2002);
eq("F Jun checked Jan 2027 is 2003 (old site said future)", G.yearFor("F", 6, d("2027-01-15")), 2003);
eq("F Jan checked Jan 2027 is 2027", G.yearFor("F", 1, d("2027-01-15")), 2027);

let r = G.assess("11-k-5", d("2026-11-10"));
eq("11-K-5 out of warranty", [r.ok, r.covered, r.year, r.expiry.toDateString()], [true, false, 2008, d("2013-11-30").toDateString()]);
r = G.assess("6D5", d("2026-11-10"));
eq("6D5 covered to 30 Jun 2030", [r.covered, r.expiry.toDateString()], [true, d("2030-06-30").toDateString()]);
r = G.assess("3-V-5", d("2022-03-31"));
eq("Last day of cover is covered", r.covered, true);
r = G.assess("3-V-5", d("2022-04-01"));
eq("Day after cover is out", [r.covered, r.borderline], [false, true]);
eq("Month 13 rejected", G.assess("13-K-5").ok, false);
eq("O rejected", G.assess("5-O-5").ok, false);
eq("Missing years assumes 5", G.assess("5-D", d("2026-11-10")).years, 5);
eq("Garbage rejected", G.assess("hello").ok, false);

r = G.assess("1-D-5", d("2026-11-10"), d("2025-06-01"));
eq("Install date runs warranty from install", [r.from, r.expiry.toDateString()], ["installation", d("2030-06-01").toDateString()]);
r = G.assess("1-V-5", d("2026-11-10"), d("2018-06-01"));
eq("Install date can still be out of warranty", [r.covered, r.expiry.toDateString()], [false, d("2023-06-01").toDateString()]);
r = G.assess("1-D-5", d("2026-11-10"), d("2027-01-01"));
eq("Future install ignored", [r.from, r.install], ["manufacture", null]);
r = G.assess("6-D-5", d("2026-11-10"), d("2025-01-01"));
eq("Install before manufacture ignored", r.from, "manufacture");

// Kwikot letters to 2030 (from Kwikot's letter list): checked as if it's that year.
[["E", 2026], ["F", 2027], ["G", 2028], ["H", 2029], ["I", 2030]].forEach(([l, y]) => {
  const t = G.assess(`3-${l}-5`, d(`${y}-08-01`));
  eq(`${l} made Mar ${y}, checked Aug ${y}: ${y}, confirmed, covered`, [t.year, t.letterConfirmed, t.covered], [y, true, true]);
});
r = G.assess("6-F-5", d("2026-11-10"));
eq("F before 2027 still means 2003, not confirmed", [r.year, r.letterConfirmed, r.covered], [2003, false, false]);
r = G.assess("12-I-5", d("2030-12-15"));
eq("12-I-5 in Dec 2030 covered to 31 Dec 2035", [r.year, r.expiry.toDateString()], [2030, d("2035-12-31").toDateString()]);
r = G.assess("1-J-5", d("2031-01-10"));
eq("J in Jan 2031 rolls over to 2031", r.year, 2031);

// ---- Ariston / Heat Tech ----
const A = (s, t, i) => G.assessAriston(s, d(t), i ? d(i) : null);
r = A("3680036 Z2 20265 1003658", "2026-11-10");
eq("Ariston day 265 of 2020 (leap year) = 21 Sep", r.made.toDateString(), d("2020-09-21").toDateString());
eq("Ariston example out of warranty, expired 21 Sep 2025", [r.covered, r.expiry.toDateString()], [false, d("2025-09-21").toDateString()]);
r = A("3680036Z2241001003658", "2026-11-10");
eq("No spaces works, day 100 of 2024 = 9 Apr, covered", [r.ok, r.made.toDateString(), r.covered, r.notes.length], [true, d("2024-04-09").toDateString(), true, 0]);
r = A("25032", "2026-11-10");
eq("Middle group alone works, with a note", [r.ok, r.made.toDateString(), r.notes.length], [true, d("2025-02-01").toDateString(), 1]);
eq("Day 366 in a non-leap year rejected", A("3680036 Z2 25366 1003658", "2026-11-10").ok, false);
eq("Day 000 rejected", A("3680036 Z2 25000 1003658", "2026-11-10").ok, false);
eq("Future date rejected", A("3680036 Z2 26350 1003658", "2026-11-10").ok, false);
eq("Garbage rejected", A("hello", "2026-11-10").ok, false);
r = A("3680036 Z2 21032 1003658", "2026-02-01");
eq("Last day of cover is covered", [r.covered, r.expiry.toDateString()], [true, d("2026-02-01").toDateString()]);
r = A("3680036 Z2 20265 1003658", "2026-11-10", "2022-03-01");
eq("Ariston install date with proof", [r.from, r.covered, r.expiry.toDateString()], ["installation", true, d("2027-03-01").toDateString()]);

console.log(fail ? `\n${fail} failed` : "\nAll passed");
process.exit(fail ? 1 : 0);
