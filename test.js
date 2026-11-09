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

console.log(fail ? `\n${fail} failed` : "\nAll passed");
process.exit(fail ? 1 : 0);
