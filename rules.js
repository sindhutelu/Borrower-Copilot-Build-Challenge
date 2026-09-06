/*
 * BORROWER COPILOT — RULES ENGINE
 * ---------------------------------
 * Pure functions. No DOM. No side effects. Every threshold lives in
 * CONFIG at the top so a single number can be changed live without
 * touching logic — this is deliberate, for the follow-up session where
 * an assumption gets changed on the spot.
 *
 * Every exported decision carries a `why` string and a `ruleId` that
 * matches the ID in RULES.md, so the UI can show "why" next to every
 * number and a reviewer can trace any output back to a documented rule.
 *
 * Works in the browser (attaches to window.Rules) and in Node (for the
 * test script in /test/rules.test.js).
 */

(function (root, factory) {
  const mod = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else root.Rules = mod;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ======================================================================
  // CONFIG — every tunable number lives here. IDs match RULES.md exactly.
  // ======================================================================
  const CONFIG = {
    // ---- FOIR-xx: Fixed Obligation to Income Ratio caps (LENDER side) ---
    // What a formal lender will typically underwrite to, by employment
    // type and risk tier. Source: RBI retail lending norms are principle-
    // based, not numeric; these bands are our judgement, modelled on
    // publicly described bank/NBFC underwriting practice.
    LENDER_FOIR: {
      salaried:              { prime: 0.50, near_prime: 0.45, subprime: 0.40, thin_file: 0.35, poor: 0.00 },
      self_employed_formal:  { prime: 0.45, near_prime: 0.40, subprime: 0.35, thin_file: 0.30, poor: 0.00 },
      gig_informal:          { prime: 0.00, near_prime: 0.00, subprime: 0.00, thin_file: 0.00, poor: 0.00 }, // FOIR-05
    },
    // A formal lender FOIR cap of 0 for gig/informal means: no *unsecured*
    // formal-lender sanction should be assumed. If collateral exists, the
    // secured-product cap below applies instead (FOIR-06).
    // FOIR-06: when the PRODUCT itself is secured (LAP, gold, two-wheeler
    // financed against the vehicle), the asset carries the underwriting
    // risk, not the income statement or employment type — so this table
    // replaces the employment-based table above for secured products only.
    // A recent bounce / poor tier still lowers it, but never to zero: the
    // point of secured lending is that it survives a thin or messy credit
    // file, which is precisely the borrower this app spends most time on.
    SECURED_LENDER_FOIR: { prime: 0.55, near_prime: 0.55, subprime: 0.50, thin_file: 0.50, poor: 0.35 },
    SECURED_PRODUCTS: ["lap", "gold_loan", "two_wheeler_secured", "home_loan"],

    // ---- TENOR-xx: the tenure a lender would realistically offer per ----
    // product, used to translate "requested amount" into "implied EMI" for
    // the verdict. Comparing a 15-year LAP ask against a 3-year personal-
    // loan EMI schedule is the single most common way this kind of tool
    // gets the verdict wrong, so it is made explicit and per-product.
    LIKELY_TENURE_MONTHS: {
      personal_salaried: 36, personal_self_employed: 36, business_unsecured: 48,
      two_wheeler_secured: 36, gold_loan: 18, lap: 144, home_loan: 216,
    },

    // ---- FOIR-1x: Borrower's SAFE capacity (independent of the lender) --
    SAFE_FOIR_BASE: 0.35,               // FOIR-10: base share of real income safely committable to all EMIs
    SAFE_FOIR_STABILITY_BONUS: 0.05,    // FOIR-11: +5pp if 3+ yrs same job/business AND income variation < 15%
    SAFE_FOIR_EMERGENCY_BONUS: 0.03,    // FOIR-12: +3pp if emergency fund >= 6 months expenses
    SAFE_FOIR_VARIABLE_PENALTY: 0.05,   // FOIR-13: -5pp if variable-income share > 40%
    SAFE_FOIR_BOUNCE_PENALTY: 0.10,     // FOIR-14: -10pp if any EMI/bill bounce in last 6 months
    SAFE_FOIR_NO_BUFFER_PENALTY: 0.05,  // FOIR-15: -5pp if emergency fund < 1 month of expenses
    SAFE_FOIR_FLOOR: 0.10,              // FOIR-16: never computed below this, but see DONT_BORROW triggers — a low floor is a signal, not a green light
    SAFE_FOIR_CEILING: 0.50,            // FOIR-17: never let adjustments push comfort above lender prime cap

    MIN_SAVINGS_BUFFER_PCT: 0.10,       // FOIR-18: minimum share of net income that must remain unencumbered by ANY EMI, on top of essential expenses
    PRODUCTIVITY_CREDIT_CAP_PCT: 0.30,  // FOIR-19: if the loan funds an income-generating asset, at most 30% of the *projected incremental* monthly income can be added to safe EMI capacity, and only when income history is verifiable or collateral exists

    // ---- RATE-xx: nominal annual rate bands by product & risk tier ------
    // Bands are our documented judgement of the Indian market as of the
    // brief date (2 Sep 2026), not a live feed. See RULES.md for sourcing
    // notes. All figures are nominal annual %, reducing balance.
    RATE_BANDS: {
      personal_salaried:      { prime: [10.5, 13.0], near_prime: [13.0, 16.0], subprime: [16.0, 20.0], thin_file: [17.0, 22.0], poor: null },
      personal_self_employed: { prime: [12.5, 15.0], near_prime: [15.0, 18.0], subprime: [18.0, 22.0], thin_file: [19.0, 24.0], poor: null },
      two_wheeler_secured:    { prime: [9.5, 12.0],  near_prime: [12.0, 14.5], subprime: [14.5, 17.0], thin_file: [15.0, 18.0], poor: [18.0, 22.0] },
      gold_loan:               { prime: [8.5, 11.0],  near_prime: [10.0, 13.0], subprime: [12.0, 15.0], thin_file: [12.5, 16.0], poor: [14.0, 18.0] },
      lap:                     { prime: [9.0, 11.0],  near_prime: [10.5, 12.5], subprime: [12.0, 14.0], thin_file: [12.5, 14.5], poor: [13.5, 16.0] },
      business_unsecured:      { prime: [14.0, 17.0], near_prime: [17.0, 20.0], subprime: [20.0, 24.0], thin_file: [21.0, 26.0], poor: null },
      home_loan:               { prime: [8.3, 9.3],   near_prime: [9.3, 9.9],  subprime: [9.9, 10.6], thin_file: [10.2, 10.8], poor: [10.8, 11.5] },
    },
    PROCESSING_FEE_PCT: {
      personal_salaried: 0.020, personal_self_employed: 0.025, two_wheeler_secured: 0.015,
      gold_loan: 0.010, lap: 0.010, business_unsecured: 0.025, home_loan: 0.005,
    },
    FEE_GST_PCT: 0.18, // GST charged on the processing fee itself — folded into APR (RATE-08)
    INFORMAL_APP_LOAN_REFERENCE_APR: 30, // RATE-09: used only to draw the contrast on the Negotiation Card, never recommended

    // ---- RISK-xx: risk tier thresholds ----------------------------------
    SCORE_BANDS: { prime: 750, near_prime: 700, subprime: 650 }, // RISK-01: >=750 prime, 700-749 near_prime, 650-699 subprime, <650 poor
    BOUNCE_FORCES_POOR_TIER: true,     // RISK-02
    UNKNOWN_SCORE_TIER: "thin_file",   // RISK-03: unknown score is modelled as thin-file, not average and not zero

    // ---- STRESS-xx --------------------------------------------------------
    STRESS_INCOME_DROP_PCT: 0.20, // STRESS-01
    STRESS_RATE_RISE_PP: 2.0,     // STRESS-02

    // ---- CONF-xx: confidence widening ------------------------------------
    // Band half-width as a fraction of the point estimate, at 0 optional
    // answers vs all applicable optional answers given. Linearly
    // interpolated in between (CONF-01).
    BAND_WIDTH: { amount: { low_answered: 0.30, high_answered: 0.08 }, rate: { low_answered: 2.5, high_answered: 0.6 } },

    // ---- DEBT-xx: debt-trap / decline triggers ----------------------------
    HIGH_COST_DEBT_APR_THRESHOLD: 24, // DEBT-01: existing debt above this rate is treated as "high-cost" for verdict purposes

    // ---- EXP-xx: essential-expense default when the borrower skips it ---
    // "Unknown is never zero": leaving this blank must never look like zero
    // outgoings, since that would make the app dangerously permissive. A
    // city-tier default with a small per-dependent addition stands in, and
    // this is flagged in the UI as an assumption, not a fact.
    CITY_EXPENSE_DEFAULT: { metro: 25000, tier2: 16000, tier3: 11000 },
    EXPENSE_PER_DEPENDENT: 4000,

    // ---- INC-05: co-applicant income --------------------------------------
    CO_APPLICANT_INCOME_WEIGHT: 0.80, // counted at a discount versus the primary applicant's own income, since it comes with its own claims on the household budget

    // ---- FOIR-20: a known upcoming large expense in the near term --------
    UPCOMING_EXPENSE_WINDOW_MONTHS_CAP: 6, // only near-term expenses (within this window) affect the ceiling — a large expense 3 years out is not this loan's problem

    // ---- RISK-04: utilisation as a proxy signal when the score is unknown
    UTILISATION_LOW_PCT: 30, UTILISATION_HIGH_PCT: 70,
  };

  // ======================================================================
  // Helpers
  // ======================================================================
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round100 = (v) => Math.round(v / 100) * 100;
  const round1000 = (v) => Math.round(v / 1000) * 1000;
  const pct = (v, d = 1) => `${v.toFixed(d)}%`;
  const inr = (v) => "₹" + Math.round(v).toLocaleString("en-IN");

  function riskTier(inputs) {
    if (CONFIG.BOUNCE_FORCES_POOR_TIER && inputs.bounceLast6Months === true) {
      return { tier: "poor", ruleId: "RISK-02", why: "A bounced EMI or bill in the last 6 months is treated as the strongest signal a lender uses — it overrides the credit score." };
    }
    if (inputs.creditScoreKnown === false || inputs.creditScore == null) {
      if (typeof inputs.creditUtilisationPct === "number") {
        if (inputs.creditUtilisationPct <= CONFIG.UTILISATION_LOW_PCT) {
          return { tier: "near_prime", ruleId: "RISK-04", why: `No score on file, but card/credit-line utilisation under ${CONFIG.UTILISATION_LOW_PCT}% is a reasonable proxy for a near-prime borrower, so we use that tier instead of the more conservative default.` };
        }
        if (inputs.creditUtilisationPct >= CONFIG.UTILISATION_HIGH_PCT) {
          return { tier: "subprime", ruleId: "RISK-04", why: `No score on file, but utilisation above ${CONFIG.UTILISATION_HIGH_PCT}% is a real warning sign, so we price this more conservatively than the thin-file default.` };
        }
      }
      return { tier: CONFIG.UNKNOWN_SCORE_TIER, ruleId: "RISK-03", why: "No credit score on file is modelled as thin-file risk, not as a bad score and not as an average one — 'unknown' is never treated as zero." };
    }
    const s = inputs.creditScore;
    const b = CONFIG.SCORE_BANDS;
    if (s >= b.prime) return { tier: "prime", ruleId: "RISK-01", why: `Score ${s} is ${b.prime}+, the prime band.` };
    if (s >= b.near_prime) return { tier: "near_prime", ruleId: "RISK-01", why: `Score ${s} sits in the ${b.near_prime}-${b.prime - 1} near-prime band.` };
    if (s >= b.subprime) return { tier: "subprime", ruleId: "RISK-01", why: `Score ${s} sits in the ${b.subprime}-${b.near_prime - 1} subprime band.` };
    return { tier: "poor", ruleId: "RISK-01", why: `Score ${s} is below ${b.subprime}.` };
  }

  // ---- Income: the split that makes the lender number and the safe -----
  // number genuinely different, not just a fudge factor on the same input.
  function classifyIncome(inputs) {
    const out = { lenderIncome: 0, borrowerIncome: 0, notes: [] };
    if (inputs.employmentType === "salaried") {
      out.lenderIncome = inputs.netMonthlyIncome;
      out.borrowerIncome = inputs.netMonthlyIncome;
      out.notes.push({ ruleId: "INC-01", why: "Salaried, payslip-verifiable income: lender and borrower use the same figure." });
    } else if (inputs.employmentType === "self_employed_formal") {
      const itrMonthly = inputs.itrAnnualIncome ? inputs.itrAnnualIncome / 12 : null;
      const cashMonthly = inputs.selfReportedMonthlyIncome || 0;
      out.lenderIncome = itrMonthly != null ? itrMonthly : cashMonthly * 0.5;
      out.borrowerIncome = cashMonthly || (itrMonthly || 0);
      out.notes.push({
        ruleId: "INC-02",
        why: itrMonthly != null
          ? `A lender underwrites to the ITR-declared income (${inr(itrMonthly)}/month), not the cash you actually see. You should plan around your real cash income (${inr(out.borrowerIncome)}/month) instead — that is the gap this app exists to show.`
          : `No ITR on file, so a lender has almost nothing to underwrite against; we halved your self-reported income as a conservative stand-in and flagged this as low confidence.`,
      });
    } else { // gig_informal
      out.lenderIncome = inputs.hasCollateral ? (inputs.selfReportedMonthlyIncome || 0) * 0.6 : 0;
      out.borrowerIncome = inputs.selfReportedMonthlyIncome || 0;
      out.notes.push({
        ruleId: "INC-03",
        why: inputs.hasCollateral
          ? "No formal income proof, but collateral lets a lender underwrite against the asset rather than the income statement."
          : "No formal income proof and nothing to secure a loan against — formal lenders will not extend unsecured credit here, whatever the true cash income is.",
      });
    }
    return out;
  }

  // INC-04: for a gig/informal borrower whose CHOSEN PRODUCT is itself
  // secured (most commonly a vehicle loan against the vehicle being
  // bought), the lender does not need pre-existing collateral or ITR —
  // the asset being financed is the security. This is exactly how NBFCs
  // actually finance two-wheelers for gig workers in India, on bank-
  // statement underwriting rather than payslips. Called after product
  // selection since the product determines whether this applies.
  function adjustIncomeForSecuredProduct(income, inputs, product) {
    if (inputs.employmentType !== "gig_informal") return income;
    if (!CONFIG.SECURED_PRODUCTS.includes(product)) return income;
    if (income.lenderIncome > 0) return income; // already has a collateral-based figure
    const adjusted = Object.assign({}, income);
    adjusted.lenderIncome = (inputs.selfReportedMonthlyIncome || 0) * 0.7;
    adjusted.notes = income.notes.concat([{
      ruleId: "INC-04",
      why: "The asset being financed (the vehicle itself) is the security here, so a lender can underwrite on bank-statement income rather than needing a payslip or pre-existing collateral — at a discount for being self-reported rather than verified.",
    }]);
    return adjusted;
  }

  function lenderFOIRCap(inputs, risk, product) {
    if (product && CONFIG.SECURED_PRODUCTS.includes(product)) {
      const cap = CONFIG.SECURED_LENDER_FOIR[risk.tier];
      return { cap, ruleId: "FOIR-06", why: `${product.replace(/_/g," ")} is secured by the asset itself, so a ${risk.tier.replace("_"," ")}-tier borrower still gets underwritten to ${pct(cap*100,0)} of income — collateral is doing the work a payslip or credit score would otherwise do.` };
    }
    const table = CONFIG.LENDER_FOIR[inputs.employmentType];
    const cap = table[risk.tier];
    return { cap, ruleId: "FOIR-0" + (inputs.employmentType === "salaried" ? 1 : inputs.employmentType === "self_employed_formal" ? 2 : 5),
      why: cap === 0
        ? "This employment type and risk tier combination is not one formal unsecured lenders extend credit against."
        : `A ${inputs.employmentType.replace(/_/g, " ")} borrower in the ${risk.tier.replace("_"," ")} tier is typically underwritten to ${pct(cap*100,0)} of income committed to all EMIs.` };
  }

  function safeFOIRCap(inputs) {
    // NOTE: bonuses/penalties only fire on an EXPLICITLY answered value.
    // An unanswered optional question must never silently act as either a
    // good answer (bonus) or a bad one (penalty) — see FOIR-1x table in
    // RULES.md ("unknown is never zero").
    const has = (k) => typeof inputs[k] === "number";
    let cap = CONFIG.SAFE_FOIR_BASE;
    const applied = [{ ruleId: "FOIR-10", delta: cap, why: `Base safe ceiling: ${pct(CONFIG.SAFE_FOIR_BASE*100,0)} of real income across all EMIs, leaving room for expenses and savings.` }];
    if (has("yearsStable") && inputs.yearsStable >= 3 && has("incomeVariabilityPct") && inputs.incomeVariabilityPct < 15) {
      cap += CONFIG.SAFE_FOIR_STABILITY_BONUS;
      applied.push({ ruleId: "FOIR-11", delta: CONFIG.SAFE_FOIR_STABILITY_BONUS, why: "3+ years of stable, low-variability income earns a wider ceiling." });
    }
    if (has("emergencyFundMonths") && inputs.emergencyFundMonths >= 6) {
      cap += CONFIG.SAFE_FOIR_EMERGENCY_BONUS;
      applied.push({ ruleId: "FOIR-12", delta: CONFIG.SAFE_FOIR_EMERGENCY_BONUS, why: "6+ months of expenses in savings is a real shock absorber, so a slightly higher EMI is safe." });
    }
    if (has("incomeVariabilityPct") && inputs.incomeVariabilityPct > 40) {
      cap -= CONFIG.SAFE_FOIR_VARIABLE_PENALTY;
      applied.push({ ruleId: "FOIR-13", delta: -CONFIG.SAFE_FOIR_VARIABLE_PENALTY, why: "More than 40% month-to-month income swing means a fixed EMI needs more headroom." });
    }
    if (inputs.bounceLast6Months === true) {
      cap -= CONFIG.SAFE_FOIR_BOUNCE_PENALTY;
      applied.push({ ruleId: "FOIR-14", delta: -CONFIG.SAFE_FOIR_BOUNCE_PENALTY, why: "A recent bounce means current obligations are already a stretch — the safe ceiling tightens, it does not stay flat." });
    }
    if (has("emergencyFundMonths") && inputs.emergencyFundMonths < 1) {
      cap -= CONFIG.SAFE_FOIR_NO_BUFFER_PENALTY;
      applied.push({ ruleId: "FOIR-15", delta: -CONFIG.SAFE_FOIR_NO_BUFFER_PENALTY, why: "Less than a month of buffer means any income gap goes straight to missed payments." });
    }
    cap = clamp(cap, CONFIG.SAFE_FOIR_FLOOR, CONFIG.SAFE_FOIR_CEILING);
    return { cap, applied };
  }

  function emi(principal, annualRatePct, months) {
    const r = annualRatePct / 1200;
    if (r === 0) return principal / months;
    return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  }
  function principalFromEMI(emiAmt, annualRatePct, months) {
    const r = annualRatePct / 1200;
    if (r === 0) return emiAmt * months;
    return (emiAmt * (Math.pow(1 + r, months) - 1)) / (r * Math.pow(1 + r, months));
  }

  // APR via IRR (Newton's method) on the real cash flow: borrower receives
  // (principal - fee - GST on fee) at t0, pays fixed EMI for `months`.
  // This is the RBI-style "all-in cost" — nominal rate alone hides fees.
  function apr(principal, annualRatePct, months, feePct) {
    const fee = principal * feePct;
    const gst = fee * CONFIG.FEE_GST_PCT;
    const netDisbursed = principal - fee - gst;
    const installment = emi(principal, annualRatePct, months);
    let r = annualRatePct / 1200; // monthly rate guess
    for (let i = 0; i < 100; i++) {
      let npv = -netDisbursed, dnpv = 0;
      for (let t = 1; t <= months; t++) {
        npv += installment / Math.pow(1 + r, t);
        dnpv += (-t * installment) / Math.pow(1 + r, t + 1);
      }
      const step = npv / dnpv;
      r -= step;
      if (Math.abs(step) < 1e-9) break;
    }
    return { monthlyIRR: r, annualAPR: r * 12 * 100, fee, gst, netDisbursed };
  }

  function selectProduct(inputs) {
    // PROD-xx: match the loan structure to the purpose and what's on offer,
    // not just default to an unsecured personal loan.
    if (inputs.collateralType === "property" && (inputs.purpose === "business" || inputs.amountWanted >= 800000)) {
      return { product: "lap", ruleId: "PROD-01", why: "Unencumbered property on hand and a sizeable ask: a loan against property clears at a far lower rate than an unsecured route for the same amount." };
    }
    if (inputs.collateralType === "gold") {
      return { product: "gold_loan", ruleId: "PROD-02", why: "Gold on hand secures a fast, cheap loan against the asset rather than the income statement." };
    }
    if (inputs.purpose === "vehicle") {
      return { product: "two_wheeler_secured", ruleId: "PROD-03", why: "A vehicle purchase should be financed against the vehicle itself — a secured loan, not an unsecured personal loan or an app loan, is the right shape for this." };
    }
    if (inputs.purpose === "business") {
      return { product: "business_unsecured", ruleId: "PROD-04", why: "Working-capital / business expansion without collateral sits in the business-loan band, priced above personal loans for the added risk." };
    }
    if (inputs.employmentType === "self_employed_formal" || inputs.employmentType === "gig_informal") {
      return { product: "personal_self_employed", ruleId: "PROD-05", why: "Without a payslip, even a personal-purpose loan is priced in the self-employed band." };
    }
    return { product: "personal_salaried", ruleId: "PROD-06", why: "Salaried, personal-purpose: the standard personal-loan band applies." };
  }

  function confidenceFactor(answeredOptional, applicableOptional) {
    const frac = applicableOptional > 0 ? clamp(answeredOptional / applicableOptional, 0, 1) : 0;
    const label = frac < 0.34 ? "Low" : frac < 0.75 ? "Medium" : "High";
    const amountHalfWidth = CONFIG.BAND_WIDTH.amount.low_answered + frac * (CONFIG.BAND_WIDTH.amount.high_answered - CONFIG.BAND_WIDTH.amount.low_answered);
    const rateHalfWidth = CONFIG.BAND_WIDTH.rate.low_answered + frac * (CONFIG.BAND_WIDTH.rate.high_answered - CONFIG.BAND_WIDTH.rate.low_answered);
    return { label, frac, amountHalfWidth, rateHalfWidth, ruleId: "CONF-01" };
  }

  // Reports the stress case as a number, not a pass/fail flag — a ceiling
  // is, by construction, the most you should commit to *today*; whether it
  // survives a shock is a matter of degree, and a fake binary hides that.
  function stressTest(inputs, safeEMI, product, risk, rateBand) {
    const stressedIncome = inputs._borrowerIncome * (1 - CONFIG.STRESS_INCOME_DROP_PCT);
    const safe = safeFOIRCap(inputs); // structural cap unchanged, only income falls
    const stressedEMI = Math.max(0, stressedIncome * safe.cap - (inputs.existingEMI || 0));
    const shortfallPct = safeEMI > 0 ? clamp(1 - stressedEMI / safeEMI, 0, 1) : 0;

    let rateRiseNote = "";
    if (rateBand) {
      const midRate = (rateBand[0] + rateBand[1]) / 2;
      const principalNow = principalFromEMI(safeEMI, midRate, 36);
      const principalStressedRate = principalFromEMI(safeEMI, midRate + CONFIG.STRESS_RATE_RISE_PP, 36);
      const drop = principalNow > 0 ? (1 - principalStressedRate / principalNow) * 100 : 0;
      rateRiseNote = ` A ${CONFIG.STRESS_RATE_RISE_PP}-point rate rise buys ${drop.toFixed(0)}% less loan for the same EMI.`;
    }

    return {
      ruleId: "STRESS-01/02",
      incomeDropScenario: { stressedIncome, stressedEMI, shortfallPct },
      why: shortfallPct <= 0.02
        ? `Even a ${pct(CONFIG.STRESS_INCOME_DROP_PCT*100,0)} income drop leaves this ceiling almost untouched (safe EMI would still be about ${inr(stressedEMI)}).${rateRiseNote}`
        : `A ${pct(CONFIG.STRESS_INCOME_DROP_PCT*100,0)} income drop would cut your safe ceiling to about ${inr(stressedEMI)} — ${pct(shortfallPct*100,0)} below today's ${inr(safeEMI)}. Treat the ceiling as a maximum, not a target, and keep some room under it.${rateRiseNote}`,
    };
  }

  function verdict(inputs, computed) {
    const { safeMaxEMI, lenderMaxEMI, requestedEMIAtLikelyTenure, risk } = computed;
    const hasHighCostDebt = (inputs.existingDebtRatePct || 0) > CONFIG.HIGH_COST_DEBT_APR_THRESHOLD && (inputs.existingDebtOutstanding || 0) > 0;

    if (inputs.bounceLast6Months && hasHighCostDebt) {
      return {
        verdict: "dont_borrow",
        ruleId: "VERDICT-01",
        headline: "Don't take a new loan yet",
        why: `You already have a bounced payment and debt above ${CONFIG.HIGH_COST_DEBT_APR_THRESHOLD}% APR outstanding. A new EMI on top makes the existing debt harder to clear, not easier. Clear or consolidate the high-cost debt first — a secured, smaller-ticket loan against a specific asset (not another unsecured line) is the only responsible next step.`,
      };
    }
    if (safeMaxEMI <= 0) {
      return {
        verdict: "dont_borrow",
        ruleId: "VERDICT-02",
        headline: "Don't borrow right now",
        why: "After existing EMIs and essential expenses, there is no safe room left for a new EMI at your current income. Borrowing now would mean cutting into essentials.",
      };
    }
    if (requestedEMIAtLikelyTenure <= safeMaxEMI * 1.02) {
      return {
        verdict: "borrow",
        ruleId: "VERDICT-03",
        headline: "You can go ahead",
        why: "The EMI this request implies fits inside what you can safely carry — see the stress case below before you commit to it.",
      };
    }
    return {
      verdict: "borrow_less",
      ruleId: "VERDICT-04",
      headline: "Borrow less than you asked for",
      why: `What you asked for needs a bigger EMI than your safe ceiling allows. Use the safe amount below instead of the full amount, or extend the tenure within reason.`,
    };
  }

  return {
    CONFIG, clamp, round100, round1000, pct, inr,
    riskTier, classifyIncome, adjustIncomeForSecuredProduct, lenderFOIRCap, safeFOIRCap,
    emi, principalFromEMI, apr, selectProduct, confidenceFactor, stressTest, verdict,
  };
});
