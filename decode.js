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
  const CONFIRMED = { D: "Kwikot FAQ" };

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

  // Full assessment. Warranty runs from manufacture, or from the install date
  // when one with proof is given (as on the original site).
  function assess(raw, todayIn, installDate) {
    const today = dayStart(todayIn || new Date());
    const p = parse(raw);
    if (p.error) return { ok: false, error: p.error };

    const year = yearFor(p.letter, p.month, today);
    if (year == null) return { ok: false, error: "That code gives a date in the future. Check the plate again." };

    const made = new Date(year, p.month - 1, 1);
    // From manufacture: cover runs to the last day of the manufacture month, N years on.
    let expiry = new Date(year + p.years, p.month, 0);
    let from = "manufacture", install = null;
    const notes = p.notes.slice();
    if (installDate) {
      const inst = dayStart(installDate);
      if (inst > today) notes.push("Install date is in the future, so it was ignored.");
      else if (inst < made) notes.push("Install date is before the manufacture date, so it was ignored. Check both.");
      else {
        install = inst;
        expiry = new Date(inst); expiry.setFullYear(inst.getFullYear() + p.years);
        from = "installation";
      }
    }
    const covered = today <= expiry;
    const daysLeft = Math.round((expiry - today) / 86400000);
    const ageMonths = monthsBetween(made, today);

    const out = {
      ok: true,
      code: `${p.month}-${p.letter}-${p.years}`,
      month: p.month, monthName: MONTHS[p.month - 1], letter: p.letter, year,
      years: p.years, made, expiry, today, covered, daysLeft, from, install,
      ageMonths, age: ageText(ageMonths),
      letterConfirmed: !!CONFIRMED[p.letter],
      notes,
      borderline: Math.abs(daysLeft) <= 90,
    };

    // Older plates can share a letter with a geyser made 24 years earlier.
    const older = year - CYCLE;
    if (older >= BASE) out.notes.push(`Same letter was also used in ${older}. If this geyser looks over 20 years old, it's from ${older} and well out of warranty.`);
    return out;
  }

  const api = { LETTERS, BASE, MONTHS, CONFIRMED, parse, yearFor, assess, ageText };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GeyserCode = api;
})(this);
