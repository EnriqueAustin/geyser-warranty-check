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
let example = true; // the result shown before anyone has checked a code

const ICON = {
  ok: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  bad: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 6v8M12 18.5h.01"/></svg>',
  phone: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z"/></svg>',
  mail: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  web: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>',
};
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
    out.innerHTML = `<div class="verdict err"><div class="v-head" style="border-bottom:0"><span class="badge" aria-hidden="true">${ICON.warn}</span><div><p class="big">Check the ${brand === "kwikot" ? "code" : "serial"}</p><p class="action">${esc(r.error)}</p></div></div></div>`;
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

  const notes = r.notes.map(n => ["", n]);
  if (r.from === "installation") notes.push(["", `Warranty counted from the install date (${fmt(r.install)}). ${b.installNote}`]);
  if (!r.letterKnown) notes.push(["", `Year letter ${r.letter} follows Kwikot's letter sequence. If the geyser clearly doesn't look like a ${r.year} geyser, check the plate again.`]);
  risks.forEach(([, t]) => notes.push(["risk", "Claim risk: " + t]));

  const row = (k, v) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;
  out.innerHTML = `
    <div class="verdict ${cls}">
      <div class="v-head">
        <span class="badge" aria-hidden="true">${ICON[cls]}</span>
        <div>
          ${example ? '<span class="chip">Example</span>' : ""}
          <p class="big">${esc(big)}</p>
          <p class="action">${esc(action)}</p>
        </div>
      </div>
      <div class="v-body">
        <dl class="facts">
          ${row("Brand", brand === "kwikot" ? "Kwikot" : "Ariston / Heat Tech")}
          ${row(brand === "kwikot" ? "Code" : "Serial", r.code)}
          ${row("Made", r.madeText)}
          ${row("Age", r.age)}
          ${row(brand === "kwikot" ? "Tank warranty" : "Cylinder warranty", `${r.years} years from ${r.from}`)}
          ${row(r.covered ? "Covered until" : "Expired on", fmt(r.expiry))}
        </dl>
        <p class="advice"><b>Tell the client</b>${esc(clientAdvice(r))}</p>
        ${notes.length ? `<ul class="notes">${notes.map(([c, n]) => `<li${c ? ` class="${c}"` : ""}>${esc(n)}</li>`).join("")}</ul>` : ""}
        ${r.covered ? `<p class="cover">${esc(b.cover)}</p>` : ""}
      </div>
    </div>`;

  $("claimBox").hidden = !r.covered;
  $("kwikotBox").hidden = !r.covered;
  $("replaceBox").hidden = r.covered;
}

// What the plumber tells the client.
function clientAdvice(r) {
  const b = B();
  const made = `This geyser was manufactured ${brand === "kwikot" ? "in" : "on"} ${r.madeText} and is ${r.age} old`;
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
  $("logHead").textContent = `Log the claim with ${brand === "kwikot" ? "Kwikot" : "Ariston"}`;
  $("steps").innerHTML = b.steps.map(s => `<li>${s}</li>`).join("");
  const copyBtn = v => `<button type="button" class="secondary copy" data-copy="${esc(v)}">Copy</button>`;
  $("contactLines").innerHTML = b.contacts.map(c => {
    if (c.phone) return `<div class="line"><span class="ci" aria-hidden="true">${ICON.phone}</span><span class="txt"><a href="tel:${c.phone.replace(/\s/g, "")}">${esc(c.phone)}</a><span class="lbl">${esc(c.label || "Phone")}</span></span>${copyBtn(c.phone)}</div>`;
    if (c.email) return `<div class="line"><span class="ci" aria-hidden="true">${ICON.mail}</span><span class="txt"><a href="mailto:${esc(c.email)}">${esc(c.email).replace("@", "@<wbr>")}</a><span class="lbl">Email</span></span>${copyBtn(c.email)}</div>`;
    return `<div class="line"><span class="ci" aria-hidden="true">${ICON.web}</span><span class="txt"><a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.text)} ↗</a><span class="lbl">Website</span></span></div>`;
  }).join("");
  $("hours").textContent = b.hours;
  $("hours").hidden = !b.hours;
  $("footer").textContent = b.footer;
  try { localStorage.setItem("gwc-brand", brand); } catch {}
  example = true;
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
$("f").addEventListener("submit", e => { e.preventDefault(); $(B().input).blur(); example = false; check(); });
$("inst").addEventListener("change", () => { example = false; check(false); });

// Kwikot letter table: both years each letter stands for. Known years are highlighted,
// years still to come are faded.
(function () {
  const G = GeyserCode, thisYear = new Date().getFullYear();
  const cells = [...G.LETTERS].map((l, i) => {
    const conf = G.KNOWN[l];
    const yrs = [G.BASE + i, G.BASE + i + G.CYCLE].map(y => {
      const cls = [conf && conf.year === y ? "now" : "", y > thisYear ? "future" : ""].filter(Boolean).join(" ");
      return `<span${cls ? ` class="${cls}"` : ""}>${y}</span>`;
    }).join("");
    return `<td class="l">${l}</td><td class="y">${yrs}</td>`;
  });
  let rows = "";
  for (let i = 0; i < cells.length; i += 3) rows += `<tr>${cells.slice(i, i + 3).join("")}</tr>`;
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
