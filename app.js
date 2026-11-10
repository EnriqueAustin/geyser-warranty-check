// Page logic. Decoding lives in decode.js.

// Everything that differs per brand. Sources:
//   Kwikot: kwikot.com/log-a-service-call and kwikot.com/consumer/faqs
//   Ariston / Heat Tech: Ariston Thermo SA warranty letter (2 Jan 2021), Heat Tech warranty
//   procedure and the installation & warranty sheet that ships with the geyser.
const BRANDS = {
  kwikot: {
    name: "Kwikot",
    assess: (v, t, i) => GeyserCode.assess(v, t, i),
    input: "code",
    contacts: [
      { phone: "0861 594 568" },
      { email: "za_insure@kwikot.com" },
      { link: "https://www.kwikot.com/log-a-service-call", text: "Log a service call online" },
    ],
    hours: "",
    risks: [
      ["sans", "Installation doesn't meet SANS 10254", "No drip tray, tray overflow not piped outside, vacuum breakers missing, or valve overflows not piped separately outside."],
      ["parts", "Non-genuine parts fitted", "After-market element or thermostat, or a remanufactured pressure control valve. Kwikot doesn't cover after-market parts; the shop that sold them does."],
      ["repaired", "Repaired or replaced by someone else during warranty", "Only Kwikot or its authorised agents may work on it under warranty."],
      ["removed", "Geyser already removed", "It must stay in place until Kwikot or its agent has inspected it."],
      ["pressure", "Pressure too high", "No pressure control valve, or one rated higher than the geyser (e.g. 600 kPa valve on a 400 kPa geyser)."],
      ["water", "Poor water quality", "Untreated borehole or corrosive water can be excluded."],
      ["outside", "Lightning, power surge or outside damage", "Generally excluded. That's a home insurance claim."],
      ["proof", "Plate unreadable and no proof", "No legible plate and no tax invoice, CoC or proof of installation with customer details."],
    ],
    claimNote: "A replacement geyser keeps the rest of the original warranty; it doesn't start again. On geysers older than a year, electrical parts carry a 2-month warranty.",
    steps: [
      "<b>Leave the geyser in place.</b> Kwikot or its agent must inspect it first.",
      "Isolate power and water and make it safe.",
      "Have the <b>geyser code, serial number and model number</b> from the plate.",
      "If the plate has faded: tax invoice, CoC or installer's proof of installation, plus the client's full details and address. Cash slips without customer details aren't accepted.",
      "Keep the reference number Kwikot gives you. It's the claim number for follow-ups. Turnaround is usually 24 business hours.",
    ],
    cover: "Warranty covers the inner tank. Safety valve and drain cock are covered for 2 years.",
    installNote: "Kwikot's FAQ uses the manufacture date, so make sure the client has the proof of installation ready.",
    footer: "Kwikot code format from kwikot.com/consumer/faqs. Kwikot makes the final call on every claim.",
  },
  ariston: {
    name: "Ariston",
    assess: (v, t, i) => GeyserCode.assessAriston(v, t, i),
    input: "serial",
    contacts: [
      { phone: "087 943 7470", label: "After-sales" },
      { email: "service@heattech.co.za" },
      { phone: "010 745 9911", label: "Call centre" },
      { email: "service.za@aristonthermo.com" },
    ],
    hours: "Mon to Fri 07:30 to 18:00. Weekends and public holidays 07:30 to 15:00.",
    risks: [
      ["sans", "Installation doesn't meet SANS 10254 / 10252-1 / 10142-1", "Plumbing or electrics not to standard, or not installed to Ariston's instructions. Ariston can ask for proof the installation complies before it registers the call."],
      ["pressure", "Wrong or missing valves", "No pressure control valve, one rated above the kPa on the label, or a one-way valve or stopcock between the geyser and the expansion relief valve."],
      ["service", "Not serviced, anode not kept up", "Warranty needs a yearly service, the anode checked yearly and replaced at least every 2 years on municipal water (every year on borehole water)."],
      ["parts", "Non-genuine parts fitted", "Only genuine parts may be used while the cylinder is under warranty."],
      ["repaired", "Someone else tried to fix it", "Any repair by the client or anyone on their behalf cancels the warranty completely."],
      ["removed", "Geyser already removed", "Removing it from the installation voids the warranty. It must stay in place, untampered, for Ariston's agent."],
      ["water", "Hard water or borehole water", "Failures from hard water are excluded. Normal use means a municipal supply."],
      ["plate", "Serial label damaged or tampered with", "Warranty needs the serial label intact."],
      ["burnt", "Element burnt out with no water, or melted terminals", "Excluded. Only matters if the claim is for the element or thermostat."],
    ],
    claimNote: "After a repair or replacement the warranty still runs from the original date; it doesn't start again. Element and thermostat: 1 year. Gaskets and flange lid: 1 year. Safety valve and drain cock: 2 years. Anode: not covered. Getting to the geyser is the client's responsibility; Ariston won't make good ceilings or cupboards.",
    steps: [
      "<b>Leave the geyser in place and untouched.</b> Removing it voids the warranty. Ariston's agent must inspect it.",
      "Isolate power and water and make it safe.",
      "Have ready: the <b>full 21-character serial</b>, date of manufacture, geyser size, proof of purchase or installation date, the client's name, phone and email, the installation address, where it was bought, and what's wrong.",
      "Email is best: it gives a written record. Ariston may ask for photos of the installation.",
      "The client gets an SMS with a reference number and the service centre's details. The service centre should phone within an hour; Ariston aims to attend within 24 hours.",
    ],
    cover: "Warranty covers the inner cylinder. Element and thermostat 1 year, gaskets 1 year, safety valve and drain cock 2 years, anode not covered.",
    installNote: "Ariston counts from the purchase or installation date when there's proof, so make sure the client has it ready.",
    footer: "Ariston serial format and warranty terms from Ariston Thermo SA's warranty letter and the Heat Tech installation sheet. Ariston makes the final call on every claim.",
  },
};

const $ = id => document.getElementById(id);
const fmt = d => d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let brand = "kwikot";
let last = null;
const B = () => BRANDS[brand];

function ticked() {
  return B().risks.filter(([id]) => $("risk-" + id).checked);
}

function render() {
  const out = $("out");
  const r = last;
  const b = B();
  ["claimBox", "kwikotBox", "replaceBox"].forEach(id => $(id).hidden = true);
  if (!r) { out.innerHTML = ""; return; }
  if (!r.ok) {
    out.innerHTML = `<div class="verdict err"><p class="big">Check the ${brand === "kwikot" ? "code" : "serial"}</p><p class="action" style="margin:0">${esc(r.error)}</p></div>`;
    return;
  }

  const risks = ticked();
  let cls, big, action;
  if (!r.covered) {
    cls = "bad"; big = "Out of warranty";
    action = `${b.name} won't cover it. We replace it ourselves.`;
    if (r.borderline) {
      cls = "warn";
      action = `Expired only ${-r.daysLeft} day${r.daysLeft === -1 ? "" : "s"} ago. Phone ${b.name} to confirm before we replace it.`;
    }
  } else if (risks.length) {
    cls = "warn"; big = "Under warranty, claim at risk";
    action = `${b.name} may refuse the claim for the reasons ticked below. Don't remove the geyser. Phone ${b.name} and explain before we replace it.`;
  } else {
    cls = "ok"; big = "Under warranty";
    action = `Don't replace it. Leave the geyser in place. ${b.name}'s agent replaces it: log a claim with ${b.name}.`;
    if (r.daysLeft <= 90) action += ` Cover ends in ${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"}, so log it today.`;
  }

  const notes = r.notes.slice();
  if (r.from === "installation") notes.push(`Warranty counted from the install date (${fmt(r.install)}). ${b.installNote}`);
  if (!r.letterConfirmed) notes.push(`Year letter ${r.letter} follows Kwikot's letter sequence. If the geyser clearly doesn't look like a ${r.year} geyser, check the plate again.`);
  risks.forEach(([, t]) => notes.push("Claim risk: " + t));

  out.innerHTML = `
    <div class="verdict ${cls}">
      <p class="big">${esc(big)}</p>
      <p class="action">${esc(action)}</p>
      <dl class="facts">
        <dt>Brand</dt><dd>${brand === "kwikot" ? "Kwikot" : "Ariston / Heat Tech"}</dd>
        <dt>${brand === "kwikot" ? "Code" : "Serial"}</dt><dd>${esc(r.code)}</dd>
        <dt>Made</dt><dd>${esc(r.madeText)}</dd>
        <dt>Age</dt><dd>${esc(r.age)}</dd>
        <dt>${brand === "kwikot" ? "Tank" : "Cylinder"} warranty</dt><dd>${r.years} years from ${r.from}</dd>
        <dt>${r.covered ? "Covered until" : "Expired on"}</dt><dd>${fmt(r.expiry)}</dd>
      </dl>
      <p class="advice"><b>Advise the client:</b> ${esc(clientAdvice(r))}</p>
      ${notes.length ? `<ul class="notes">${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      ${r.covered ? `<p class="small" style="margin:10px 0 0">${esc(b.cover)}</p>` : ""}
    </div>`;

  $("claimBox").hidden = !r.covered;
  $("kwikotBox").hidden = !r.covered;
  $("replaceBox").hidden = r.covered;
}

// What the plumber tells the client.
function clientAdvice(r) {
  const b = B();
  const made = `this geyser was manufactured ${brand === "kwikot" ? "in" : "on"} ${r.madeText} and is ${r.age} old`;
  const from = r.from === "installation" ? ` from installation on ${fmt(r.install)}` : "";
  const part = brand === "kwikot" ? "tank" : "cylinder";
  if (r.covered) {
    return `${made}. Its ${r.years}-year ${part} warranty${from} runs until ${fmt(r.expiry)}, so ${b.name} covers it. Don't remove the geyser; ${b.name} or its agent will inspect and replace it.`;
  }
  return `${made}. Its ${r.years}-year ${part} warranty${from} ended on ${fmt(r.expiry)}. ${b.name} will not cover it, and the geyser needs to be replaced.`;
}

function check(scroll) {
  const instVal = $("inst").value;
  last = B().assess($(B().input).value, new Date(), instVal ? new Date(instVal + "T00:00:00") : null);
  B().risks.forEach(([id]) => $("risk-" + id).checked = false);
  render();
  if (scroll !== false && last.ok) $("out").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Swap everything on the page that depends on the brand.
function setBrand(id) {
  brand = BRANDS[id] ? id : "kwikot";
  const b = B();
  document.querySelectorAll("[data-brand]").forEach(el => el.hidden = el.dataset.brand !== brand);
  document.querySelectorAll("#brandPick button").forEach(btn => btn.setAttribute("aria-pressed", btn.dataset.pick === brand));
  $("checks").innerHTML = b.risks.map(([id, t, d]) =>
    `<label><input type="checkbox" id="risk-${id}"><span><b>${esc(t)}</b><span>${esc(d)}</span></span></label>`).join("");
  $("claimHead").textContent = `Before you call it ${brand === "kwikot" ? "a Kwikot" : "an Ariston"} claim`;
  $("claimLead").textContent = `Tick anything that applies. ${b.name} can refuse the claim for these.`;
  $("claimNote").textContent = b.claimNote;
  $("logHead").textContent = `Log the claim with ${brand === "kwikot" ? "Kwikot" : "Ariston / Heat Tech"}`;
  $("steps").innerHTML = b.steps.map(s => `<li>${s}</li>`).join("");
  $("contactLines").innerHTML = b.contacts.map(c => {
    if (c.phone) return `<div class="line"><a href="tel:${c.phone.replace(/\s/g, "")}">Call ${esc(c.phone)}</a>${c.label ? `<span class="small">${esc(c.label)}</span>` : ""}<button type="button" class="secondary copy" data-copy="${esc(c.phone)}">Copy</button></div>`;
    if (c.email) return `<div class="line"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a><button type="button" class="secondary copy" data-copy="${esc(c.email)}">Copy</button></div>`;
    return `<div class="line"><a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.text)} ↗</a></div>`;
  }).join("") + (b.hours ? `<p class="small" style="margin:8px 0 0">${esc(b.hours)}</p>` : "");
  $("footer").textContent = b.footer;
  try { localStorage.setItem("gwc-brand", brand); } catch {}
  check(false);
}

// ---- Setup ----
$("checks").addEventListener("change", render);

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

$("brandPick").addEventListener("click", e => {
  const btn = e.target.closest("[data-pick]");
  if (btn) setBrand(btn.dataset.pick);
});
$("f").addEventListener("submit", e => { e.preventDefault(); $(B().input).blur(); check(); });
$("inst").addEventListener("change", () => check(false));

// Kwikot letter table. Letters Kwikot has confirmed are highlighted.
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

// Start on the last brand used, with its example result showing.
let saved = null;
try { saved = localStorage.getItem("gwc-brand"); } catch {}
setBrand(saved || "kwikot");

// ---- Install as an app ----
// Android: Chrome may offer an install prompt (shown by our button). Not every browser or
// visit gets one, so Android always gets the menu steps too.
// iPhone: Safari has no prompt, so explain Share > Add to Home Screen.
(function () {
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let hidden = false;
  try { hidden = localStorage.getItem("gwc-install-hidden") === "1"; } catch {}
  if (standalone || hidden) return;

  const box = $("installBox"), btn = $("installBtn");
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  if (ios) {
    $("installText").innerHTML = /CriOS|FxiOS|EdgiOS/.test(ua)
      ? "Open this page in <b>Safari</b>, tap the <b>Share</b> button, then <b>Add to Home Screen</b>."
      : "Tap the <b>Share</b> button (square with an arrow) at the bottom, then <b>Add to Home Screen</b>.";
    box.hidden = false;
  } else if (android) {
    $("installText").innerHTML = /SamsungBrowser/.test(ua)
      ? "Tap the <b>menu</b> (☰) at the bottom, then <b>Add page to</b> › <b>Home screen</b>."
      : "In Chrome, tap the <b>⋮</b> menu (top right), then <b>Install app</b> or <b>Add to Home screen</b>.";
    box.hidden = false;
  }

  let prompt = null;
  addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    prompt = e;
    btn.hidden = false;
    box.hidden = false;
  });
  btn.addEventListener("click", async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => {});
    prompt = null;
    box.hidden = true;
  });
  addEventListener("appinstalled", () => { box.hidden = true; });
  $("installClose").addEventListener("click", () => {
    box.hidden = true;
    try { localStorage.setItem("gwc-install-hidden", "1"); } catch {}
  });
})();

// Works offline once loaded (only when served over https or localhost).
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
