// Kwikot geyser code decoding. Pure functions, no page code, so it can be tested with Node.
//
// Code format (confirmed on kwikot.com/consumer/faqs): month made, year letter, warranty years.
// Example 11-K-5. Kwikot confirms "D" = 2025. The rest of the letter table (no O or Q,
// repeating every 24 years) is worked out from that and from known plates.

(function (root) {
  const LETTERS = "ABCDEFGHIJKLMNPRSTUVWXYZ"; // no O or Q
  const BASE = 1998; // A = 1998, 2022, 2046 ...
  const CYCLE = LETTERS.length; // 24
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  // Letters confirmed against a real source. Others are calculated.
  // D = 2025 is on Kwikot's FAQ. E to I (2026 to 2030) are from Kwikot's letter list
  // supplied by the office. All match the calculated sequence.
  const CONFIRMED = {
    D: { year: 2025, source: "Kwikot FAQ" },
    E: { year: 2026, source: "Kwikot letter list" },
    F: { year: 2027, source: "Kwikot letter list" },
    G: { year: 2028, source: "Kwikot letter list" },
    H: { year: 2029, source: "Kwikot letter list" },
    I: { year: 2030, source: "Kwikot letter list" },
  };

  // Read what the plumber typed. Accepts 11-K-5, 11K5, 11 k 5, 11/K/5, 3-V.
  function parse(raw) {
    const s = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
    if (!s) return { error: "Type the code from the serial plate, e.g. 11-K-5." };
    const m = s.match(/^(\d{1,2})[-/.]?([A-Z0-9])[-/.]?(\d{1,2})?$/);
    if (!m) return { error: "That doesn't look like a Kwikot code. It's a month number, a letter, then the warranty years, e.g. 11-K-5." };
    const month = +m[1];
    let letter = m[2];
    const years = m[3] ? +m[3] : 5;
    const notes = [];
    if (month < 1 || month > 12) return { error: `"${m[1]}" isn't a month. The first number must be 1 to 12.` };
    if (letter === "0" || letter === "O" || letter === "Q") {
      return { error: `Kwikot doesn't use "${letter}" as a year letter. Look at the plate again: it may be a D, C or G.` };
    }
    if (letter === "1") { letter = "I"; notes.push('Read "1" as the letter I (2006). Check the plate.'); }
    else if (/\d/.test(letter)) return { error: `The middle part must be a letter, not "${letter}".` };
    if (!m[3]) notes.push("No warranty number given, so 5 years was assumed. Check the plate.");
    if (years < 1 || years > 15) return { error: `"${m[3]}" isn't a sensible warranty period. It's normally 5.` };
    return { month, letter, years, notes };
  }

  // Most recent year for this letter whose manufacture month isn't after today.
  function yearFor(letter, month, today) {
    const i = LETTERS.indexOf(letter);
    if (i < 0) return null;
    let y = BASE + i;
    if (new Date(y, month - 1, 1) > today) return null; // never possible from 1998 onward
    while (new Date(y + CYCLE, month - 1, 1) <= today) y += CYCLE;
    return y;
  }

  function monthsBetween(from, to) {
    let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
    if (to.getDate() < from.getDate()) m -= 1;
    return Math.max(0, m);
  }

  function ageText(months) {
    const y = Math.floor(months / 12), r = months % 12;
    const parts = [];
    if (y) parts.push(`${y} year${y === 1 ? "" : "s"}`);
    if (r || !y) parts.push(`${r} month${r === 1 ? "" : "s"}`);
    return parts.join(", ");
  }

  function dayStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

  // Shared: apply an install date, then work out cover, days left and age.
  function finish(base, today, installDate) {
    const { made, years } = base;
    let expiry = base.expiry;
    let from = "manufacture", install = null;
    const notes = base.notes.slice();
    if (installDate) {
      const inst = dayStart(installDate);
      if (inst > today) notes.push("Install date is in the future, so it was ignored.");
      else if (inst < made) notes.push("Install date is before the manufacture date, so it was ignored. Check both.");
      else {
        install = inst;
        expiry = new Date(inst); expiry.setFullYear(inst.getFullYear() + years);
        from = "installation";
      }
    }
    const covered = today <= expiry;
    const daysLeft = Math.round((expiry - today) / 86400000);
    const ageMonths = monthsBetween(made, today);
    return Object.assign({}, base, {
      ok: true, expiry, today, covered, daysLeft, from, install,
      ageMonths, age: ageText(ageMonths), notes,
      borderline: Math.abs(daysLeft) <= 90,
    });
  }

  // ---- Kwikot ----
  // Warranty runs from manufacture, or from the install date when one with proof is given.
  function assess(raw, todayIn, installDate) {
    const today = dayStart(todayIn || new Date());
    const p = parse(raw);
    if (p.error) return { ok: false, error: p.error };

    const year = yearFor(p.letter, p.month, today);
    if (year == null) return { ok: false, error: "That code gives a date in the future. Check the plate again." };

    const notes = p.notes.slice();
    // Older plates can share a letter with a geyser made 24 years earlier.
    const older = year - CYCLE;
    if (older >= BASE) notes.push(`Same letter was also used in ${older}. If this geyser looks over 20 years old, it's from ${older} and well out of warranty.`);

    return finish({
      brand: "kwikot",
      code: `${p.month}-${p.letter}-${p.years}`,
      month: p.month, monthName: MONTHS[p.month - 1], letter: p.letter, year,
      madeText: `${MONTHS[p.month - 1]} ${year}`,
      years: p.years,
      made: new Date(year, p.month - 1, 1),
      // Cover runs to the last day of the manufacture month, N years on.
      expiry: new Date(year + p.years, p.month, 0),
      // Confirmed only when this plate's year is the one the source gives for the letter.
      letterConfirmed: !!CONFIRMED[p.letter] && CONFIRMED[p.letter].year === year,
      notes,
    }, today, installDate);
  }

  // ---- Ariston / Heat Tech ----
  // From Ariston Thermo SA's warranty letter (2 Jan 2021) and the Heat Tech installation sheet:
  // the 21-character serial is product ref (7) + 2 characters + YY DDD (5) + random number (7).
  // Example 3680036 Z2 20265 1003658 = made on day 265 of 2020. Cylinder warranty is 5 years.
  const ARISTON_YEARS = 5;

  function parseAriston(raw) {
    const orig = String(raw || "").trim().toUpperCase();
    if (!orig) return { error: "Type the serial number from the label, e.g. 3680036 Z2 20265 1003658." };
    const s = orig.replace(/[\s\-/.]+/g, "");
    const groups = orig.split(/[\s\-/.]+/).filter(Boolean);
    let date = null, serial = null;
    if (/^\d{7}[A-Z0-9]{2}\d{12}$/.test(s)) { date = s.slice(9, 14); serial = `${s.slice(0, 7)} ${s.slice(7, 9)} ${s.slice(9, 14)} ${s.slice(14)}`; }
    else if (groups.length === 4 && /^\d{5}$/.test(groups[2])) { date = groups[2]; serial = groups.join(" "); }
    else if (/^\d{5}$/.test(s)) { date = s; serial = s; }
    if (!date) return { error: "That doesn't look like an Ariston / Heat Tech serial. It's 21 characters in 4 groups, e.g. 3680036 Z2 20265 1003658. You can also type just the 5-digit middle group (20265)." };
    const year = 2000 + +date.slice(0, 2), day = +date.slice(2);
    const leap = new Date(year, 1, 29).getMonth() === 1;
    if (day < 1 || day > (leap ? 366 : 365)) return { error: `"${date}" doesn't give a real date: the last 3 digits are the day of the year (001 to 365). Check the label.` };
    return { year, day, serial, notes: s.length === 21 ? [] : ["Only part of the serial was typed. Ariston asks for the full 21 characters when you log the call."] };
  }

  function assessAriston(raw, todayIn, installDate) {
    const today = dayStart(todayIn || new Date());
    const p = parseAriston(raw);
    if (p.error) return { ok: false, error: p.error };
    const made = new Date(p.year, 0, p.day);
    if (made > today) return { ok: false, error: "That serial gives a date in the future. Check the label again." };
    const expiry = new Date(made); expiry.setFullYear(made.getFullYear() + ARISTON_YEARS);
    return finish({
      brand: "ariston",
      code: p.serial, year: p.year, dayOfYear: p.day,
      madeText: made.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }),
      years: ARISTON_YEARS, made, expiry, letterConfirmed: true, notes: p.notes,
    }, today, installDate);
  }

  const api = { LETTERS, BASE, CYCLE, MONTHS, CONFIRMED, parse, yearFor, assess, ageText, parseAriston, assessAriston };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GeyserCode = api;
})(this);
