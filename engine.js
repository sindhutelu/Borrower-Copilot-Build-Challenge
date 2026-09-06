/*
 * ENGINE — wires the answer set through Rules to produce O1-O4 and the
 * Negotiation Card. Still no DOM here; app.js owns rendering.
 */
(function (root, factory) {
  const mod = factory(typeof module !== "undefined" ? require("./rules.js") : root.Rules);
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else root.Engine = mod;
})(typeof self !== "undefined" ? self : this, function (Rules) {
  "use strict";
  const { inr, pct, round1000, round100, clamp } = Rules;

  function run(inputs, meta) {
    const notes = [];
    const risk = Rules.riskTier(inputs);
    const income = Rules.classifyIncome(inputs);

    // EXP-01: fill a missing essential-expenses answer with a city-tier
    // default rather than treating the gap as zero outgoings.
    if (typeof inputs.essentialExpenses !== "number") {
      const base = Rules.CONFIG.CITY_EXPENSE_DEFAULT[inputs.cityTier || "tier2"];
      const dep = (inputs.dependents || 0) * Rules.CONFIG.EXPENSE_PER_DEPENDENT;
      inputs.essentialExpenses = base + dep;
      notes.push({ ruleId: "EXP-01", why: `You didn't give a monthly-expense figure, so we assumed ${Rules.inr(base)} for a ${(inputs.cityTier||"tier2").replace("tier","tier ")} household${dep?` plus ${Rules.inr(dep)} for dependents`:""} — a placeholder, not a fact. Answering this directly will narrow every number below.` });
    }

    // INC-05: co-applicant income, counted at a discount, added to both sides
    if (inputs.coApplicantIncome > 0) {
      const add = inputs.coApplicantIncome * Rules.CONFIG.CO_APPLICANT_INCOME_WEIGHT;
      income.lenderIncome += add;
      income.borrowerIncome += add;
      notes.push({ ruleId: "INC-05", why: `A co-applicant's income is counted at ${Rules.pct(Rules.CONFIG.CO_APPLICANT_INCOME_WEIGHT*100,0)} (${Rules.inr(add)}/month added) — discounted because it also carries the household's own claims on it.` });
    }

    inputs._borrowerIncome = income.borrowerIncome;
    inputs._lenderIncome = income.lenderIncome;

    const productInfo = Rules.selectProduct(inputs);
    const LIKELY_TENURE_DEFAULT = Rules.CONFIG.LIKELY_TENURE_MONTHS[productInfo.product] || 36;

    Object.assign(income, Rules.adjustIncomeForSecuredProduct(income, inputs, productInfo.product));
    inputs._lenderIncome = income.lenderIncome;

    const lenderCap = Rules.lenderFOIRCap(inputs, risk, productInfo.product);
    const safeCap = Rules.safeFOIRCap(inputs);

    const existingEMI = inputs.existingEMI || 0;
    const essentialExpenses = inputs.essentialExpenses || 0;
    const savingsBufferAbs = income.borrowerIncome * Rules.CONFIG.MIN_SAVINGS_BUFFER_PCT;

    // Lender-side max EMI: pure FOIR against the income the lender trusts.
    const lenderMaxEMI = Math.max(0, income.lenderIncome * lenderCap.cap - existingEMI);

    // Borrower-side safe EMI: the tighter of (a) safe % of real income and
    // (b) residual income after essentials + existing EMI + mandatory buffer.
    const safePctEMI = Math.max(0, income.borrowerIncome * safeCap.cap - existingEMI);
    const residualEMI = Math.max(0, income.borrowerIncome - essentialExpenses - existingEMI - savingsBufferAbs);
    let safeMaxEMI = Math.min(safePctEMI, residualEMI);

    // FOIR-20: a known near-term large expense eats into the ceiling now,
    // spread conservatively over a year, capped to a sensible window.
    if (inputs.upcomingExpenseAmount > 0 && (inputs.upcomingExpenseMonths || 0) <= Rules.CONFIG.UPCOMING_EXPENSE_WINDOW_MONTHS_CAP) {
      const monthlyHit = inputs.upcomingExpenseAmount / 12;
      safeMaxEMI = Math.max(0, safeMaxEMI - monthlyHit);
      notes.push({ ruleId: "FOIR-20", why: `A known ${Rules.inr(inputs.upcomingExpenseAmount)} expense coming in the next ${inputs.upcomingExpenseMonths} month(s) reduces your safe EMI ceiling by ${Rules.inr(monthlyHit)}/month — it needs to be saved for, not committed to a new EMI.` });
    }

    let productivityNote = null;
    if (inputs.isProductiveUse && inputs.projectedIncrementalIncome > 0 && (inputs.yearsStable >= 1 || inputs.hasCollateral)) {
      const bump = inputs.projectedIncrementalIncome * Rules.CONFIG.PRODUCTIVITY_CREDIT_CAP_PCT;
      safeMaxEMI += bump;
      productivityNote = { ruleId: "FOIR-19", why: `Because this loan funds an income-generating asset with a track record to check against, up to ${pct(Rules.CONFIG.PRODUCTIVITY_CREDIT_CAP_PCT*100,0)} of the extra income it is expected to bring in (${inr(bump)}/month) is added to the safe ceiling.` };
    }

    const rateBandTable = Rules.CONFIG.RATE_BANDS[productInfo.product];
    let rateBand = rateBandTable ? rateBandTable[risk.tier] : null;
    let rateFallback = null;
    if (!rateBand) {
      // e.g. "poor" tier unsecured — no formal band exists; fall back to nearest secured alternative
      rateFallback = { ruleId: "RATE-99", why: "No formal unsecured band exists for this risk tier — a secured route (gold/LAP) is the realistic path, priced separately below." };
      rateBand = Rules.CONFIG.RATE_BANDS.gold_loan[risk.tier] || [18, 26];
    }
    const feePct = Rules.CONFIG.PROCESSING_FEE_PCT[productInfo.product] ?? 0.02;

    // Confidence — how many *applicable* optional questions were answered.
    const conf = Rules.confidenceFactor(meta.answeredOptionalCount, meta.applicableOptionalCount);

    const rateLow = rateBand[0], rateHigh = rateBand[1];
    const aprLow = Rules.apr(round1000(safeMaxEMI > 0 ? Rules.principalFromEMI(safeMaxEMI, rateLow, LIKELY_TENURE_DEFAULT) : inputs.amountWanted), rateLow, LIKELY_TENURE_DEFAULT, feePct);
    const aprHigh = Rules.apr(round1000(safeMaxEMI > 0 ? Rules.principalFromEMI(safeMaxEMI, rateHigh, LIKELY_TENURE_DEFAULT) : inputs.amountWanted), rateHigh, LIKELY_TENURE_DEFAULT, feePct);

    // O2 — amounts, using the confidence band to widen/narrow around the point estimate
    const lenderAmountPoint = Rules.principalFromEMI(lenderMaxEMI, (rateLow + rateHigh) / 2, LIKELY_TENURE_DEFAULT);
    const safeAmountPoint = Rules.principalFromEMI(safeMaxEMI, (rateLow + rateHigh) / 2, LIKELY_TENURE_DEFAULT);
    const w = conf.amountHalfWidth;
    const lenderAmountRange = [round1000(lenderAmountPoint * (1 - w)), round1000(lenderAmountPoint * (1 + w))];
    const safeAmountRange = [round1000(safeAmountPoint * (1 - w)), round1000(safeAmountPoint * (1 + w))];

    // O4 — tenure trade-off table for the safe EMI ceiling
    const tenureOptions = [12, 24, 36, 48, 60];
    const tenureTable = tenureOptions.map((m) => ({
      months: m,
      principalAtSafeEMI: round1000(Rules.principalFromEMI(safeMaxEMI, (rateLow + rateHigh) / 2, m)),
      emiForRequested: Math.round(Rules.emi(inputs.amountWanted, (rateLow + rateHigh) / 2, m)),
      fitsCeiling: Rules.emi(inputs.amountWanted, (rateLow + rateHigh) / 2, m) <= safeMaxEMI * 1.02,
    }));

    const requestedEMIAtLikelyTenure = Rules.emi(inputs.amountWanted, (rateLow + rateHigh) / 2, LIKELY_TENURE_DEFAULT);

    const computed = { safeMaxEMI, lenderMaxEMI, requestedEMIAtLikelyTenure, risk };
    const verdict = Rules.verdict(inputs, computed);
    const stress = Rules.stressTest(inputs, safeMaxEMI, productInfo.product, risk, [rateLow, rateHigh]);

    return {
      risk, income, lenderCap, safeCap, productInfo, rateBand: [rateLow, rateHigh], rateFallback, feePct, notes,
      aprRange: [Math.min(aprLow.annualAPR, aprHigh.annualAPR), Math.max(aprLow.annualAPR, aprHigh.annualAPR)],
      lenderMaxEMI, safeMaxEMI, productivityNote, conf,
      O1: verdict,
      O2: { lenderAmountRange, safeAmountRange, useThisOne: "safe", ruleId: "OUT-02",
            why: "Use the safe amount, not the lender's likely sanction — a lender approving more than you asked doesn't make more of it affordable.",
            flipNote: safeAmountPoint > lenderAmountPoint
              ? { ruleId: "OUT-02b", why: "Unusual, but real here: your safe amount comes out higher than what a lender's own math would show. That's because a lender underwrites to your paperwork income, which understates what you actually earn — exactly the gap this app exists to surface. Don't expect a lender to volunteer the higher number; it's on you to make the case with your bank statements." }
              : null },
      O3: { rateBand: [rateLow, rateHigh], aprRange: [Math.min(aprLow.annualAPR, aprHigh.annualAPR), Math.max(aprLow.annualAPR, aprHigh.annualAPR)],
            product: productInfo.product, feePct, ruleId: "OUT-03" },
      O4: { safeMaxEMI, tenureTable, stress, ruleId: "OUT-04" },
      requestedEMIAtLikelyTenure,
    };
  }

  function negotiationCard(inputs, result) {
    return {
      product: result.productInfo.product,
      verdict: result.O1,
      safeAmount: result.O2.safeAmountRange,
      lenderAmount: result.O2.lenderAmountRange,
      fairRate: result.rateBand,
      allInAPR: result.aprRange,
      emiCeiling: result.safeMaxEMI,
      confidence: result.conf.label,
      talkingPoints: buildTalkingPoints(inputs, result),
    };
  }

  function buildTalkingPoints(inputs, result) {
    const pts = [];
    pts.push(`My fair rate band is ${result.rateBand[0].toFixed(1)}–${result.rateBand[1].toFixed(1)}% (all-in APR ${result.aprRange[0].toFixed(1)}–${result.aprRange[1].toFixed(1)}% including fees) based on my ${result.risk.tier.replace("_"," ")} risk profile.`);
    pts.push(`I can safely carry an EMI up to ${inr(result.safeMaxEMI)}/month — that's what I'm borrowing against, not the higher amount a lender may offer.`);
    if (inputs.existingOfferRatePct) {
      const diff = inputs.existingOfferRatePct - result.rateBand[1];
      pts.push(diff > 0
        ? `The ${inputs.existingOfferRatePct}% I was quoted is ${diff.toFixed(1)} points above my fair band — that's the number to push back on.`
        : `The ${inputs.existingOfferRatePct}% I was quoted is already inside or below my fair band — a reasonable offer.`);
    }
    if (result.productInfo.product !== "personal_salaried" && result.productInfo.product !== "personal_self_employed") {
      pts.push(`I should be offered a ${result.productInfo.product.replace(/_/g," ")}, not a generic unsecured personal loan — ${result.productInfo.why}`);
    }
    return pts;
  }

  return { run, negotiationCard };
});
