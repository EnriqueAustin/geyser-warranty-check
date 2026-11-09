// Page logic. Decoding lives in decode.js.

// Kwikot contact details (from kwikot.com/log-a-service-call and kwikot.com/consumer/faqs).
const KWIKOT = {
  phone: "0861 594 568",
  email: "za_insure@kwikot.com",
  logCallUrl: "https://www.kwikot.com/log-a-service-call",
};

// Reasons Kwikot can refuse a claim. Any ticked = the claim is at risk.
const RISKS = [
  ["sans", "Installation doesn't meet SANS 10254", "No drip tray, tray overflow not piped outside, vacuum breakers missing, or valve overflows not piped separately outside."],
  ["parts", "Non-genuine parts fitted", "After-market element or thermostat, or a remanufactured pressure control valve. Kwikot doesn't cover after-market parts; the shop that sold them does."],
  ["repaired", "Repaired or replaced by someone else during warranty", "Only Kwikot or its authorised agents may work on it under warranty."],
  ["removed", "Geyser already removed", "It must stay in place until Kwikot or its agent has inspected it."],
  ["pressure", "Pressure too high", "No pressure control valve, or one rated higher than the geyser (e.g. 600 kPa valve on a 400 kPa geyser)."],
  ["water", "Poor water quality", "Untreated borehole or corrosive water can be excluded."],
  ["outside", "Lightning, power surge or outside damage", "Generally excluded. That's a home insurance claim."],
  ["proof", "Plate unreadable and no proof", "No legible plate and no tax invoice, CoC or proof of installation with customer details."],
];

const $ = id => document.getElementById(id);
const fmt = d => d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let last = null;

function ticked() {
  return RISKS.filter(([id]) => $("risk-" + id).checked);
}

function render() {
  const out = $("out");
  const r = last;
  ["claimBox", "kwikotBox", "replaceBox"].forEach(id => $(id).hidden = true);
  if (!r) { out.innerHTML = ""; return; }
  if (!r.ok) {
    out.innerHTML = `<div class="verdict err"><p class="big">Check the code</p><p class="action" style="margin:0">${esc(r.error)}</p></div>`;
    return;
  }

  const risks = ticked();
  let cls, big, action;
  if (!r.covered) {
    cls = "bad"; big = "Out of warranty";
    action = "Kwikot won't cover it. We replace it ourselves.";
    if (r.borderline) {
      cls = "warn";
      action = `Expired only ${-r.daysLeft} day${r.daysLeft === -1 ? "" : "s"} ago. Phone Kwikot to confirm before we replace it.`;
    }
  } else if (risks.length) {
    cls = "warn"; big = "Under warranty, claim at risk";
    action = "Kwikot may refuse the claim for the reasons ticked below. Don't remove the geyser. Phone Kwikot and explain before we replace it.";
  } else {
    cls = "ok"; big = "Under warranty";
    action = "Don't replace it. Leave the geyser in place. Kwikot's agent replaces it: log a claim with Kwikot.";
    if (r.daysLeft <= 90) action += ` Cover ends in ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"}, so log it today.`;
  }

  const notes = r.notes.slice();
  if (r.from === "installation") notes.push(`Warranty counted from the install date (${fmt(r.install)}). Kwikot's FAQ uses the manufacture date, so make sure the client has the proof of installation ready.`);
  if (!r.letterConfirmed) notes.push(`Year letter ${r.letter} follows Kwikot's letter sequence. If the geyser clearly doesn't look like a ${r.year} geyser, check the plate again.`);
  risks.forEach(([, t]) => notes.push("Claim risk: " + t));

  out.innerHTML = `
    <div class="verdict ${cls}">
      <p class="big">${esc(big)}</p>
      <p class="action">${esc(action)}</p>
      <dl class="facts">
        <dt>Code</dt><dd>${esc(r.code)}</dd>
        <dt>Made</dt><dd>${esc(r.monthName)} ${r.year}</dd>
        <dt>Age</dt><dd>${esc(r.age)}</dd>
        <dt>Tank warranty</dt><dd>${r.years} years from ${r.from}</dd>
        <dt>${r.covered ? "Covered until" : "Expired on"}</dt><dd>${fmt(r.expiry)}</dd>
      </dl>
      <p class="advice"><b>Advise the client:</b> ${esc(clientAdvice(r))}</p>
      ${notes.length ? `<ul class="notes">${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      ${r.covered ? '<p class="small" style="margin:10px 0 0">Warranty covers the inner tank. Safety valve and drain cock are covered for 2 years.</p>' : ""}
    </div>`;

  $("claimBox").hidden = !r.covered;
  $("kwikotBox").hidden = !r.covered;
  $("replaceBox").hidden = r.covered;
}

// What the plumber tells the client.
function clientAdvice(r) {
  const made = `this geyser was manufactured in ${r.monthName} ${r.year} and is ${r.age} old`;
  const from = r.from === "installation" ? ` from installation on ${fmt(r.install)}` : "";
  if (r.covered) {
    return `${made}. Its ${r.years}-year tank warranty${from} runs until ${fmt(r.expiry)}, so Kwikot covers it. Don't remove the geyser; Kwikot or its agent will inspect and replace it.`;
  }
  return `${made}. Its ${r.years}-year tank warranty${from} ended on ${fmt(r.expiry)}. Kwikot will not cover it, and the geyser needs to be replaced.`;
}

function check(scroll) {
  const instVal = $("inst").value;
  last = GeyserCode.assess($("code").value, new Date(), instVal ? new Date(instVal + "T00:00:00") : null);
  RISKS.forEach(([id]) => $("risk-" + id).checked = false);
  render();
  if (scroll !== false && last.ok) $("out").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---- Setup ----
$("checks").innerHTML = RISKS.map(([id, t, d]) =>
  `<label><input type="checkbox" id="risk-${id}"><span><b>${esc(t)}</b><span>${esc(d)}</span></span></label>`).join("");
$("checks").addEventListener("change", render);

$("contactLines").innerHTML = `
  <div class="line"><a href="tel:${KWIKOT.phone.replace(/\s/g, "")}">Call ${esc(KWIKOT.phone)}</a><button type="button" class="secondary copy" data-copy="${esc(KWIKOT.phone)}">Copy</button></div>
  <div class="line"><a href="mailto:${esc(KWIKOT.email)}">${esc(KWIKOT.email)}</a><button type="button" class="secondary copy" data-copy="${esc(KWIKOT.email)}">Copy</button></div>
  <div class="line"><a href="${esc(KWIKOT.logCallUrl)}" target="_blank" rel="noopener">Log a service call online ↗</a></div>`;

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-copy]");
  if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); }
  catch {
    const ta = document.createElement("textarea"); ta.value = b.dataset.copy;
    document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove();
  }
  b.textContent = "Copied";
  setTimeout(() => b.textContent = "Copy", 1500);
});

$("f").addEventListener("submit", e => { e.preventDefault(); $("code").blur(); check(); });
$("inst").addEventListener("change", () => check(false));

// Letter table. Letters Kwikot has confirmed are highlighted.
(function () {
  const today = new Date();
  const cells = [...GeyserCode.LETTERS].map(l => {
    const y = GeyserCode.yearFor(l, 1, today);
    const c = GeyserCode.CONFIRMED[l] ? ' class="now"' : "";
    return `<td class="l"${c}>${l}</td><td${c}>${y}</td>`;
  });
  let rows = "";
  for (let i = 0; i < cells.length; i += 4) rows += `<tr>${cells.slice(i, i + 4).join("")}</tr>`;
  $("tbl").innerHTML = rows;
})();

// Show the example result on first load, like the original site.
check(false);

// Works offline once loaded (only when served over https or localhost).
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
