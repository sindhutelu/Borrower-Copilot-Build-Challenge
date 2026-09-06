# Walkthrough

## What it does, in one pass

Open the app, pick or skip the adaptive question set (9-12 must-answer
questions, up to another 10 that tighten specific numbers), and land on a
results screen with a stamped verdict, the two amounts, the rate/APR band,
the EMI ceiling with a tenure trade-off table and a stress case, and a
printable Negotiation Card with talking points. Three preset buttons on the
intro screen load Priya, Ravi, and Anita directly for a fast demo, matching
RUNTHROUGHS.md exactly.

## One thing worth calling out during the demo

Load Ravi and look at the O2 block. The safe amount is *higher* than the
lender amount — the opposite of the usual direction — and the app calls
this out explicitly rather than silently picking the smaller of the two.
That flip isn't a special case in the code; it falls straight out of the
two amounts being computed from genuinely different income figures (see
"the core design idea" in RULES.md's income section), and it's the
clearest demonstration that the two numbers are doing different work, not
just one number with a discount applied.

## What changed under testing (and why that matters here)

The first version of the stress test reported a pass/fail flag. Testing all
three personas showed it failed every single time, for a structural reason:
a percentage-of-income safe ceiling shrinks by exactly the income-drop
percentage when there's no existing EMI to anchor it, so a tolerance band
tighter than the drop itself is unwinnable by construction — the flag was
truthful but useless. It now reports the actual stress-adjusted ceiling and
the shortfall percentage, and adds an independent rate-rise scenario
(STRESS-02). This is exactly the kind of thing the follow-up session is
designed to probe, and it's a rule worth defending on the spot rather than
discovering live.

## What I'd build next

- **A Hindi/Kannada toggle.** Two of the three personas this brief cares about most are not native English speakers of the kind who'd default to an English-only app — a bigger gap than any additional rate band.
- **A sharper first-time-borrower path.** "Never checked my score" and "no credit history at all" are currently modelled identically; a genuine first-timer with clean bank statements probably deserves a slightly better tier than someone who simply hasn't looked.
- **A visible "as of" date on the rate bands**, since they're documented judgement, not a live feed, and that gap only grows with time.
- **Joint-liability modelling** for a co-applicant, beyond the simple income add currently in INC-05.
- **A user-adjustable tenure slider** on the results screen, instead of a single per-product default, so a borrower can see their own EMI move in real time.

## What I'd cut, if the timebox got tighter

- **Home-loan and gold-loan rate bands** — included for completeness, but none of the three personas needs them; a smaller, tighter product set would have been defensible.
- **The productivity-credit feature (FOIR-19).** Genuinely interesting — let a loan that pays for itself earn a bit more room — but it's also the single most speculative number in the whole engine, resting on a self-reported income projection with only a soft gate (track record or collateral) behind it. Kept it because Ravi and Anita's asks are both explicitly productive-use and cutting it would have understated what they can safely take on, but it's the rule I'd expect to be challenged first.
- **The utilisation-based risk proxy (RISK-04)** — a reasonable idea, thinly justified, and only relevant when the score is already unknown; a bureau-lite product could ship without it.
