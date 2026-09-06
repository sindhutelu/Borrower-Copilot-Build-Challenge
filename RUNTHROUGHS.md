# Run-throughs — Priya, Ravi, Anita

These are produced by actually running `test/generate-runthroughs.js` against
the live engine (`rules.js` + `engine.js` + `questions.js`) — not hand-typed —
so they can't drift from what the app itself would show. Regenerate any time
with `node test/generate-runthroughs.js`.

The three profiles below are the ones from the brief, entered as a careful
reading of their paragraph descriptions would answer the app's questions.
Where the brief didn't specify a figure (e.g. Priya's non-rent living costs,
Ravi's exact monthly essentials), a reasonable value was filled in and is
called out — a real user would type their own.

---

## Priya, 29 — Bengaluru · salaried

**Asks:** ₹8,00,000 for wedding

### Questions the app asked this borrower

| # | Question | Answer given |
|---|---|---|
| 1 | What is this loan for? | wedding |
| 2 | How much do you want to borrow? | ₹8,00,000 |
| 3 | How would you describe your income? | salaried |
| 4 | What's your net monthly take-home? | ₹1,10,000 |
| 5 | What do you pay every month across ALL existing loans (EMIs)? Enter 0 if none. | ₹14,000 |
| 6 | Roughly what do essentials (rent, food, utilities, school) cost you a month? Skip if unsure. | ₹44,000 |
| 7 | Your age | 29 |
| 8 | Do you know your credit score (CIBIL etc.)? | yes |
| 9 | What is it? | 780 |
| 10 | Has any EMI, rent, or bill payment bounced or been missed in the last 6 months? | No |
| 11 | How many years in this job / this business? | 5 |
| 12 | How much does your income swing month to month? | 5 |
| 13 | If income stopped today, how many months of expenses do you have saved? | 2 |
| 14 | Do you own any unencumbered property or gold you could offer as security? | _(skipped)_ |
| 15 | Total outstanding on your existing loans right now? | _(skipped)_ |
| 16 | What interest rate is that existing debt at, if you know it? | _(skipped)_ |
| 17 | Any co-applicant (spouse, parent) with income to add to this application? | _(skipped)_ |
| 18 | Any large expense you know is coming in the next 6 months (school fee, medical, festival)? | _(skipped)_ |
| 19 | Has a lender already quoted you a rate? Enter it, or skip. | _(skipped)_ |

*(3 of 9 applicable tightening questions answered → confidence: **Low**)*

### Outputs

- **O1 — Verdict:** You can go ahead
  *(VERDICT-03)* The EMI this request implies fits inside what you can safely carry — see the stress case below before you commit to it.
- **O2 — Amount:** Lender might sanction ₹9,58,000–₹15,20,000; you can safely carry **₹7,01,000–₹11,12,000** — use the safe figure.
- **O3 — Fair rate:** 10.5–13.0% nominal, **12.2–14.7% all-in APR**, on a personal salaried.
  Salaried, personal-purpose: the standard personal-loan band applies.
- **O4 — EMI ceiling:** **₹30,000/month.** A 20% income drop would cut your safe ceiling to about ₹21,200 — 29% below today's ₹30,000. Treat the ceiling as a maximum, not a target, and keep some room under it. A 2-point rate rise buys 3% less loan for the same EMI.

### Negotiation Card

| | |
|---|---|
| Ask for | ₹7,01,000–₹11,12,000 |
| Fair rate | 10.5–13.0% |
| Fair all-in APR | 12.2–14.7% |
| EMI ceiling | ₹30,000/month |

- My fair rate band is 10.5–13.0% (all-in APR 12.2–14.7% including fees) based on my prime risk profile.
- I can safely carry an EMI up to ₹30,000/month — that's what I'm borrowing against, not the higher amount a lender may offer.

---

## Ravi, 42 — Mysuru · self-employed

**Asks:** ₹15,00,000 for business

### Questions the app asked this borrower

| # | Question | Answer given |
|---|---|---|
| 1 | What is this loan for? | business |
| 2 | How much do you want to borrow? | ₹15,00,000 |
| 3 | How would you describe your income? | self_employed_formal |
| 4 | What does your latest ITR show as annual income? (leave blank if you haven't filed) | ₹4,20,000 |
| 5 | And roughly what do you actually see in hand most months? | ₹60,000 |
| 6 | What do you pay every month across ALL existing loans (EMIs)? Enter 0 if none. | ₹0 |
| 7 | Roughly what do essentials (rent, food, utilities, school) cost you a month? Skip if unsure. | ₹35,000 |
| 8 | Your age | 42 |
| 9 | Do you know your credit score (CIBIL etc.)? | no |
| 10 | Has any EMI, rent, or bill payment bounced or been missed in the last 6 months? | No |
| 11 | How many years in this job / this business? | 14 |
| 12 | How much does your income swing month to month? | 25 |
| 13 | If income stopped today, how many months of expenses do you have saved? | _(skipped)_ |
| 14 | Roughly what % of your credit card limit(s) do you usually use? | _(skipped)_ |
| 15 | Do you own any unencumbered property or gold you could offer as security? | property |
| 16 | Any co-applicant (spouse, parent) with income to add to this application? | _(skipped)_ |
| 17 | Any large expense you know is coming in the next 6 months (school fee, medical, festival)? | _(skipped)_ |
| 18 | Will this loan directly help you earn more (new stock, a delivery vehicle, a tool of trade)? | Yes |
| 19 | Roughly how much extra income a month could it realistically bring in? | ₹15,000 |
| 20 | Has a lender already quoted you a rate? Enter it, or skip. | _(skipped)_ |

*(5 of 10 applicable tightening questions answered → confidence: **Medium**)*

### Outputs

- **O1 — Verdict:** You can go ahead
  *(VERDICT-03)* The EMI this request implies fits inside what you can safely carry — see the stress case below before you commit to it.
- **O2 — Amount:** Lender might sanction ₹10,08,000–₹14,81,000; you can safely carry **₹13,54,000–₹19,89,000** — use the safe figure.
  ⚠️ Unusual, but real here: your safe amount comes out higher than what a lender's own math would show. That's because a lender underwrites to your paperwork income, which understates what you actually earn — exactly the gap this app exists to surface. Don't expect a lender to volunteer the higher number; it's on you to make the case with your bank statements.
- **O3 — Fair rate:** 12.5–14.5% nominal, **12.8–14.8% all-in APR**, on a lap.
  Unencumbered property on hand and a sizeable ask: a loan against property clears at a far lower rate than an unsecured route for the same amount.
- **O4 — EMI ceiling:** **₹23,500/month.** A 20% income drop would cut your safe ceiling to about ₹16,800 — 29% below today's ₹23,500. Treat the ceiling as a maximum, not a target, and keep some room under it. A 2-point rate rise buys 3% less loan for the same EMI.

### Negotiation Card

| | |
|---|---|
| Ask for | ₹13,54,000–₹19,89,000 |
| Fair rate | 12.5–14.5% |
| Fair all-in APR | 12.8–14.8% |
| EMI ceiling | ₹23,500/month |

- My fair rate band is 12.5–14.5% (all-in APR 12.8–14.8% including fees) based on my thin file risk profile.
- I can safely carry an EMI up to ₹23,500/month — that's what I'm borrowing against, not the higher amount a lender may offer.
- I should be offered a lap, not a generic unsecured personal loan — Unencumbered property on hand and a sizeable ask: a loan against property clears at a far lower rate than an unsecured route for the same amount.

---

## Anita, 35 — Hubballi · informal

**Asks:** ₹1,50,000 for vehicle

### Questions the app asked this borrower

| # | Question | Answer given |
|---|---|---|
| 1 | What is this loan for? | vehicle |
| 2 | How much do you want to borrow? | ₹1,50,000 |
| 3 | How would you describe your income? | gig_informal |
| 4 | And roughly what do you actually see in hand most months? | ₹28,000 |
| 5 | What do you pay every month across ALL existing loans (EMIs)? Enter 0 if none. | ₹0 |
| 6 | Roughly what do essentials (rent, food, utilities, school) cost you a month? Skip if unsure. | ₹22,000 |
| 7 | Your age | 35 |
| 8 | Do you know your credit score (CIBIL etc.)? | no |
| 9 | Has any EMI, rent, or bill payment bounced or been missed in the last 6 months? | Yes |
| 10 | How many years in this job / this business? | 2 |
| 11 | How much does your income swing month to month? | 50 |
| 12 | If income stopped today, how many months of expenses do you have saved? | 0 |
| 13 | Roughly what % of your credit card limit(s) do you usually use? | _(skipped)_ |
| 14 | Do you own any unencumbered property or gold you could offer as security? | _(skipped)_ |
| 15 | Any co-applicant (spouse, parent) with income to add to this application? | _(skipped)_ |
| 16 | Any large expense you know is coming in the next 6 months (school fee, medical, festival)? | _(skipped)_ |
| 17 | Will this loan directly help you earn more (new stock, a delivery vehicle, a tool of trade)? | Yes |
| 18 | Roughly how much extra income a month could it realistically bring in? | ₹6,000 |
| 19 | Has a lender already quoted you a rate? Enter it, or skip. | _(skipped)_ |

*(5 of 10 applicable tightening questions answered → confidence: **Medium**)*

### Outputs

- **O1 — Verdict:** Don't borrow right now
  *(VERDICT-01)* You already have a bounced payment and debt above 24% APR outstanding. A new EMI on top makes the existing debt harder to clear, not easier. Clear or consolidate the high-cost debt first — a secured, smaller-ticket loan against a specific asset (not another unsecured line) is the only responsible next step.
- **O2 — Amount:** Lender might sanction ₹1,50,000–₹2,20,000; you can safely carry **₹1,09,000–₹1,60,000** — use the safe figure.
- **O3 — Fair rate:** 18.0–22.0% nominal, **19.3–23.3% all-in APR**, on a two wheeler secured.
  A vehicle purchase should be financed against the vehicle itself — a secured loan, not an unsecured personal loan or an app loan, is the right shape for this.
- **O4 — EMI ceiling:** **₹5,000/month.** A 20% income drop would cut your safe ceiling to about ₹3,360 — 33% below today's ₹5,000. Treat the ceiling as a maximum, not a target, and keep some room under it. A 2-point rate rise buys 3% less loan for the same EMI.

### Negotiation Card

| | |
|---|---|
| Ask for | ₹1,09,000–₹1,60,000 |
| Fair rate | 18.0–22.0% |
| Fair all-in APR | 19.3–23.3% |
| EMI ceiling | ₹5,000/month |

- My fair rate band is 18.0–22.0% (all-in APR 19.3–23.3% including fees) based on my poor risk profile.
- I can safely carry an EMI up to ₹5,000/month — that's what I'm borrowing against, not the higher amount a lender may offer.
- I should be offered a two wheeler secured, not a generic unsecured personal loan — A vehicle purchase should be financed against the vehicle itself — a secured loan, not an unsecured personal loan or an app loan, is the right shape for this.

---

