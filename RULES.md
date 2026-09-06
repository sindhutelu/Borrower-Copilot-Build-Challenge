# RULES.md

Every number below lives in a single `CONFIG` object at the top of `rules.js`
under the rule ID shown, and the same ID is surfaced in the app next to the
output it produced ("Why this number →"). Where no official RBI table
exists — RBI's retail-lending norms are principle-based, not numeric — the
source is marked **my judgement**, calibrated against publicly described
bank/NBFC underwriting practice as of the brief date (2 Sep 2026).

## 1. Income classification (INC) — what a lender sees vs. what a borrower has

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| INC-01 | Salaried income | Lender income = borrower income = net monthly take-home | A payslip is directly verifiable — there's nothing to split. | My judgement |
| INC-02 | Self-employed, ITR filed | Lender income = ITR annual ÷ 12. Borrower income = self-reported cash figure. | A lender underwrites to the filed, provable number, not what actually lands in hand. This is the deliberate "trust gap" the app surfaces. | My judgement |
| INC-03 | Self-employed, no ITR | Lender income = self-reported × 0.5 | No paperwork leaves a lender almost nothing to underwrite against; halving is a conservative stand-in, flagged low-confidence. | My judgement |
| INC-03b | Gig/informal, no collateral, unsecured product | Lender income = 0 | Formal lenders generally will not extend unsecured credit with no income proof and nothing to secure it against. | My judgement |
| INC-04 | Gig/informal, but the chosen product is itself secured (e.g. a vehicle loan) | Lender income = self-reported × 0.7 | The asset being financed is the security — mirrors how NBFCs actually finance two-wheelers for gig workers, off bank-statement income rather than a payslip. | My judgement, based on common vehicle-finance practice |
| INC-05 | Co-applicant income supplied | Added to both lender and borrower income at 80% weight | A co-applicant strengthens the case but also carries their own claims on that income. | My judgement |

## 2. Risk tiering (RISK)

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| RISK-01 | Credit-score bands | ≥750 prime · 700–749 near-prime · 650–699 subprime · <650 poor | Standard CIBIL-style bands used across Indian retail lending. | Industry convention |
| RISK-02 | Bounce in the last 6 months | Forces "poor" tier, overriding the score | A live bounce is a stronger, more recent signal of distress than a historical score. | My judgement |
| RISK-03 | Score unknown / no history | Treated as "thin-file" — never an average score, never zero | "Unknown is never zero" is a hard requirement of the brief. | Brief requirement |
| RISK-04 | Card utilisation, only used when the score is unknown | <30% nudges to near-prime; >70% nudges to subprime | A rough proxy signal in place of a score that genuinely isn't known. | My judgement |

## 3. Lender-side affordability caps (FOIR-0x)

FOIR = Fixed Obligation to Income Ratio: the share of monthly income already
committed, or about to be committed, to any EMI.

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| FOIR-01 | Salaried, by risk tier | Prime 50% · Near-prime 45% · Subprime 40% · Thin-file 35% · Poor 0% | Modelled on publicly described retail-bank underwriting bands for a verifiable salary. | My judgement |
| FOIR-02 | Self-employed (ITR), by risk tier | 45% · 40% · 35% · 30% · 0% | Self-employed income carries more uncertainty than a payslip even when filed, so the cap sits a notch below salaried at every tier. | My judgement |
| FOIR-05 | Gig/informal, unsecured | 0% at every tier | No formal, unsecured product exists for this combination in practice — steering to a secured route (FOIR-06) is the honest answer. | My judgement |
| FOIR-06 | Any product that is itself secured (LAP, gold, two-wheeler, home) | Prime/Near-prime 55% · Subprime/Thin-file 50% · Poor 35% | The asset carries the underwriting risk, not the income statement or employment type — even a poor-tier or thin-file borrower still gets a real, non-zero cap. | My judgement |

## 4. Borrower-side safe capacity (FOIR-1x) — independent of what a lender would offer

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| FOIR-10 | Base safe ceiling | 35% of real income across all EMIs | A conservative starting point, before any adjustment. | My judgement |
| FOIR-11 | Stability bonus | +5 points, if 3+ years in the same job/business AND month-to-month income variation < 15% | Real, demonstrated stability earns a wider ceiling. | My judgement |
| FOIR-12 | Emergency-fund bonus | +3 points, if 6+ months of expenses saved | A real shock absorber makes a slightly higher EMI safe. | My judgement |
| FOIR-13 | Variable-income penalty | −5 points, if income swings more than 40% month to month | A fixed EMI against a volatile income needs more headroom, not less. | My judgement |
| FOIR-14 | Recent-bounce penalty | −10 points, if any bounce in the last 6 months | Existing obligations are already a stretch — the ceiling should tighten. | My judgement |
| FOIR-15 | No-buffer penalty | −5 points, if less than 1 month of expenses saved | With no buffer, any income gap goes straight to a missed payment. | My judgement |
| FOIR-16/17 | Floor and ceiling on the adjusted cap | Floor 10% · Ceiling 50% | Adjustments can move the number but never below a bare floor or above the lender's own prime cap. | My judgement |
| FOIR-18 | Mandatory savings buffer | 10% of net income withheld from every affordability calc, on top of essentials | A safe ceiling that leaves zero margin for saving isn't actually safe. | My judgement |
| FOIR-19 | Productivity credit | Up to 30% of the loan's projected incremental monthly income is added to the ceiling — only if the borrower has 1+ year track record or offers collateral | A loan that pays for itself deserves some credit, but only when there's something to check the projection against. | My judgement |
| FOIR-20 | Known near-term large expense (within 6 months) | Ceiling reduced by (expense ÷ 12) per month | A known expense needs to be saved for, not layered under a new EMI. | My judgement |
| EXP-01 | Missing essential-expenses answer | Defaults to a city-tier estimate (Metro ₹25,000 · Tier-2 ₹16,000 · Tier-3 ₹11,000) plus ₹4,000/dependent | Leaving this blank must never look like zero outgoings. Flagged in the UI as an assumption, not a fact. | My judgement |

## 5. Interest rate and all-in APR (RATE)

Rate bands are nominal annual, reducing balance, organised by product and
risk tier (full table: `CONFIG.RATE_BANDS` in `rules.js`). They are
documented judgement calibrated to publicly described Indian retail-lending
ranges as of the brief date, **not** a live bureau or lender feed.

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| RATE-08 | All-in APR | Solved as the IRR of the real cash flow: (principal − processing fee − 18% GST on the fee) disbursed today, against the fixed EMI for the chosen tenure | A nominal rate alone hides the fee; matches RBI's all-in-cost disclosure principle. | Reducing-balance IRR is standard finance; the fee/GST treatment is my judgement |
| RATE-09 | Informal / app-loan reference point (~30%+ APR) | Used only for the Negotiation Card's contrast, never recommended | Gives a borrower a concrete number to compare a predatory quote against. | My judgement, based on widely reported app-loan pricing |
| RATE-99 | No formal unsecured band exists (e.g. "poor" tier, unsecured product) | Falls back to the nearest secured band (gold loan) and flags a secured route as the realistic path | Showing a fabricated unsecured rate would be worse than admitting none exists. | My judgement |

## 6. Product selection (PROD)

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| PROD-01 | Unencumbered property + business purpose or a large ask (≥₹8L) | → Loan Against Property | Far lower rate than an unsecured route for the same amount. | My judgement |
| PROD-02 | Gold on hand | → Gold loan | Fast, cheap, secured against the asset. | My judgement |
| PROD-03 | Purpose = vehicle purchase | → Vehicle loan secured against the vehicle | The vehicle being bought is the natural security. | My judgement |
| PROD-04 | Purpose = business, no collateral | → Business loan (unsecured band) | Working-capital risk without an asset is priced above a personal loan. | My judgement |
| PROD-05 | Self-employed or gig, no other match | → Personal loan, self-employed band | Even a personal-purpose loan is priced differently without a payslip. | My judgement |
| PROD-06 | Salaried, personal purpose | → Personal loan, salaried band | The default case. | My judgement |

## 7. Confidence and range-widening (CONF)

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| CONF-01 | Band half-width around the point estimate | Amount: ±30% at 0 tightening questions answered → ±8% if all applicable ones answered. Rate: ±2.5pp → ±0.6pp, same curve. Label: Low <34% answered · Medium <75% · High otherwise. | Confidence must widen with silence and narrow with answers; every additional question genuinely moves a number. | My judgement |

## 8. Stress testing (STRESS)

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| STRESS-01 | Income-drop scenario | Recompute the safe ceiling at 80% of real income; report the resulting ceiling and % shortfall | Reported as a number, not pass/fail — a % ceiling with no existing EMI to anchor it will almost always "fail" a proportional shock by construction, so a binary flag is meaningless. | My judgement — replaced an earlier, less honest binary version |
| STRESS-02 | Rate-rise scenario | +2 percentage points; report how much smaller a loan the same EMI would buy | A rate rise shrinks the loan you can take at a fixed EMI, not just the cost. | My judgement |

## 9. Decline / debt-trap gate and the verdict (DEBT, VERDICT)

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| DEBT-01 | High-cost existing debt | Outstanding balance above 24% APR treated as "high-cost" | Threshold above which restructuring existing debt should take priority. | My judgement |
| VERDICT-01 | Recent bounce AND high-cost debt outstanding | → Don't borrow yet — clear/consolidate existing debt first | A new EMI on top of a debt-trap signal makes the problem worse, not better. | My judgement |
| VERDICT-02 | Safe ceiling computes to ₹0 or below | → Don't borrow right now | No safe room left after essentials and existing EMIs. | My judgement |
| VERDICT-03 | Requested EMI (at the product's realistic tenure) within ~2% of the safe ceiling | → Go ahead | Fits inside what the borrower can safely carry. | My judgement |
| VERDICT-04 | Otherwise | → Borrow less than asked — use the safe amount, or extend tenure within reason | Ask exceeds safe capacity but some borrowing is reasonable. | My judgement |

## 10. Output framing (OUT)

| ID | What it governs | Value | Why | Source |
|---|---|---|---|---|
| OUT-02 | Which O2 amount to use | Always the safe amount, never the lender's likely sanction | A lender approving more doesn't make more of it affordable. | My judgement |
| OUT-02b | When the safe amount is higher than the lender amount | Flagged explicitly with an explanation | Counter-intuitive but real (see Ravi) — worth surfacing, not hiding. | My judgement |

## 11. What this app deliberately does not know (honesty about limits)

- "Never checked my score" and "no credit history at all" are both modelled as the same thin-file tier. A sharper version would treat a genuine first-time borrower slightly more generously.
- Rate bands are a documented, dated judgement call, not a live feed from any bureau or lender.
- RBI's retail-lending guidance is principle-based; it does not publish a numeric FOIR table, so every FOIR cap here is judgement calibrated to described industry practice, not a cited regulation.
- Joint-liability risk beyond a simple income add for a co-applicant is not modelled.
- Per-product tenure defaults are typical, not exhaustive.
- The all-in APR includes processing fee + GST on it, but not other charges (insurance, documentation, stamp duty) some lenders bundle in.
