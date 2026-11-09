# Geyser Warranty Check

Internal tool for our plumbers. Type the code from a Kwikot geyser's serial plate (e.g. `11-K-5`) and it says:

- **Under warranty:** don't replace it. Leave it in place and log a claim with Kwikot (number, email and online link are on the page).
- **Under warranty, claim at risk:** a Kwikot refusal reason was ticked (e.g. non-genuine parts, SANS 10254 problems).
- **Out of warranty:** we replace it ourselves (SANS 10254 checklist shown).

## How the code works (Kwikot's rules)

From kwikot.com/consumer/faqs: first number = month made, letter = year made, last number = tank warranty in years. Cover runs from the manufacture date, to the end of that month N years later. Kwikot confirms "D" = 2025. The rest of the letters follow the same sequence (no O or Q, repeating every 24 years). The tool picks the most recent year that isn't in the future.

## Run it on this PC

```bash
node serve.js
```

Then open http://localhost:5178.

## Put it on the team's phones

Phones can't reach this PC. Host the folder (drag it onto Netlify Drop, or any static host), then each plumber opens the link and taps "Add to Home Screen". Once loaded, it also works with no signal.

When you change any file, bump `VERSION` in `sw.js` so phones pick up the update.

## Files

- `decode.js`: code decoding and warranty rules
- `app.js`: page behaviour, Kwikot contact details, claim-refusal list
- `index.html`: page and styling
- `test.js`: run `node test.js` to check the decoding
