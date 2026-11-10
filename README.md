# Geyser Warranty Check

Internal tool for our plumbers. Pick the brand, type what's on the geyser's serial label, and it says:

- **Under warranty:** don't replace it. Leave it in place and log a claim with the manufacturer (numbers, emails and steps are on the page).
- **Under warranty, claim at risk:** one of the manufacturer's refusal reasons was ticked (e.g. non-genuine parts, SANS 10254 problems).
- **Out of warranty:** we replace it ourselves (SANS 10254 checklist shown).

Brands covered: **Kwikot** and **Ariston / Heat Tech**.

## How the codes work

### Kwikot

From kwikot.com/consumer/faqs: the code looks like `11-K-5`. The first number is the month made, the letter is the year made, and the last number is the tank warranty in years. Cover runs from the manufacture date, to the end of that month N years later.

Known letters: D = 2025 (Kwikot FAQ), and E = 2026, F = 2027, G = 2028, H = 2029, I = 2030 (our own records, not published by Kwikot). The other letters follow the same sequence (no O or Q, repeating every 24 years). The tool picks the most recent year that isn't in the future, so it keeps working past 2030 without changes. To add more known letters, add them to `KNOWN` in `decode.js`.

### Ariston / Heat Tech

From Ariston Thermo SA's warranty letter (2 January 2021) and the Heat Tech installation sheet: the label has a 21-character serial, e.g. `3680036 Z2 20265 1003658`. The middle 5 digits are the year and the day of the year. `20265` means day 265 of 2020, which is 21 September 2020.

The cylinder has 5 years' warranty from the manufacture date. It runs from the purchase or installation date instead if the client has proof. Other parts have shorter cover:

- element and thermostat: 1 year
- gaskets: 1 year
- safety valve and drain cock: 2 years
- anode: none

Contacts: after-sales 087 943 7470, service@heattech.co.za. Call centre 010 745 9911, service.za@aristonthermo.com.

## Run it on this PC

Double-click `Start Geyser Check.bat`, or:

```bash
node serve.js
```

Then open http://localhost:5178.

## Put it on the team's phones

The app is hosted on Netlify: **https://wfhgeyserchecker.netlify.app/**

Netlify is linked to this GitHub repo, so every push to `main` updates it. `_headers` sets the headers phones need. Send the link to each plumber:

- **Android:** open the link in Chrome. Tap **Install app** if it shows, or use the ⋮ menu and choose **Install app** or **Add to Home screen**. On Samsung Internet: menu ☰, **Add page to**, **Home screen**.
- **iPhone:** open the link in **Safari**, tap **Share** and choose **Add to Home Screen**.

It then opens from the home screen like any app, full screen, and works with no signal once it has been opened once.

When you change any file, bump `VERSION` in `sw.js` so phones pick up the update. To redraw the PNG icons, run `node make-icons.js`.

## Files

- `decode.js`: code and serial decoding, warranty rules for each brand
- `app.js`: page behaviour, plus each brand's contacts, claim steps and refusal reasons
- `index.html`: page and styling
- `test.js`: run `node test.js` to check the decoding
