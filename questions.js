/*
 * QUESTION SET
 * Each question: { id, tier: 'must'|'more', label, help, type, options,
 *   when(inputs) -> bool (applicability), tightens: "human line shown as
 *   'answering this narrows: ...'" }
 * The wizard walks this list in order, skipping any question whose
 * `when` returns false. Confidence = answered-more / applicable-more.
 */
(function (root) {
  const Q = [];

  // ---------------------------- MUST -------------------------------------
  Q.push({ id: "purpose", tier: "must", label: "What is this loan for?", type: "select",
    options: [["wedding","Wedding"],["medical","Medical"],["education","Education"],["vehicle","Vehicle purchase"],
      ["business","Business / working capital"],["home_improvement","Home improvement"],["debt_consolidation","Paying off other debt"],["other","Something else"]] });

  Q.push({ id: "amountWanted", tier: "must", label: "How much do you want to borrow?", type: "rupee", placeholder: "8,00,000" });

  Q.push({ id: "employmentType", tier: "must", label: "How would you describe your income?", type: "select",
    options: [["salaried","Salaried — I get a payslip"],["self_employed_formal","Self-employed — I file ITR / GST"],["gig_informal","Informal or gig income — mostly cash, no filings"]] });

  Q.push({ id: "netMonthlyIncome", tier: "must", label: "What's your net monthly take-home?", type: "rupee",
    when: (i) => i.employmentType === "salaried", placeholder: "1,10,000" });

  Q.push({ id: "itrAnnualIncome", tier: "must", label: "What does your latest ITR show as annual income? (leave blank if you haven't filed)", type: "rupee",
    when: (i) => i.employmentType === "self_employed_formal", placeholder: "4,20,000", optionalEvenInMust: true });

  Q.push({ id: "selfReportedMonthlyIncome", tier: "must", label: "And roughly what do you actually see in hand most months?", type: "rupee",
    when: (i) => i.employmentType === "self_employed_formal" || i.employmentType === "gig_informal", placeholder: "60,000" });

  Q.push({ id: "existingEMI", tier: "must", label: "What do you pay every month across ALL existing loans (EMIs)? Enter 0 if none.", type: "rupee", placeholder: "14,000" });

  Q.push({ id: "essentialExpenses", tier: "must", label: "Roughly what do essentials (rent, food, utilities, school) cost you a month? Skip if unsure.", type: "rupee", placeholder: "43,000", skippable: true });

  Q.push({ id: "age", tier: "must", label: "Your age", type: "number", placeholder: "29" });

  Q.push({ id: "creditScoreKnown", tier: "must", label: "Do you know your credit score (CIBIL etc.)?", type: "select",
    options: [["yes","Yes, I know it"],["no","No / never checked"],["none","I have no credit history"]] });

  Q.push({ id: "creditScore", tier: "must", label: "What is it?", type: "number", when: (i) => i.creditScoreKnown === "yes", placeholder: "780" });

  Q.push({ id: "bounceLast6Months", tier: "must", label: "Has any EMI, rent, or bill payment bounced or been missed in the last 6 months?", type: "yesno" });

  // ------------------------- ADDITIONAL -----------------------------------
  Q.push({ id: "yearsStable", tier: "more", label: "How many years in this job / this business?", type: "number", placeholder: "5",
    tightens: "Narrows your safe EMI ceiling (stability bonus)." });

  Q.push({ id: "incomeVariabilityPct", tier: "more", label: "How much does your income swing month to month?", type: "select",
    options: [["5","Barely — under 15%"],["25","Some — 15 to 40%"],["50","A lot — over 40%"]],
    parse: (v) => Number(v),
    tightens: "Narrows your safe EMI ceiling and risk tier." });

  Q.push({ id: "emergencyFundMonths", tier: "more", label: "If income stopped today, how many months of expenses do you have saved?", type: "select",
    options: [["0","None"],["0.5","Less than a month"],["2","1 to 3 months"],["4.5","3 to 6 months"],["7","6 months or more"]],
    parse: (v) => Number(v),
    tightens: "Narrows your safe EMI ceiling and the stress test." });

  Q.push({ id: "creditUtilisationPct", tier: "more", label: "Roughly what % of your credit card limit(s) do you usually use?", type: "number",
    when: (i) => i.creditScoreKnown !== "yes", placeholder: "40",
    tightens: "Narrows your risk tier when your score is unknown." });

  Q.push({ id: "hasCollateral", tier: "more", label: "Do you own any unencumbered property or gold you could offer as security?", type: "select",
    options: [["property","Property"],["gold","Gold"],["none","No"]],
    tightens: "Can move you to a cheaper, larger secured loan instead of an unsecured one." });

  Q.push({ id: "existingDebtOutstanding", tier: "more", label: "Total outstanding on your existing loans right now?", type: "rupee",
    when: (i) => i.existingEMI > 0, placeholder: "35,000",
    tightens: "Feeds the debt-trap check and the Negotiation Card." });

  Q.push({ id: "existingDebtRatePct", tier: "more", label: "What interest rate is that existing debt at, if you know it?", type: "number",
    when: (i) => i.existingEMI > 0, placeholder: "30",
    tightens: "Can trigger a 'don't borrow more' verdict if it's high-cost." });

  Q.push({ id: "coApplicantIncome", tier: "more", label: "Any co-applicant (spouse, parent) with income to add to this application?", type: "rupee",
    placeholder: "18,000", skippable: true, tightens: "Widens both amount numbers if answered." });

  Q.push({ id: "upcomingExpenseAmount", tier: "more", label: "Any large expense you know is coming in the next 6 months (school fee, medical, festival)?", type: "rupee",
    placeholder: "0", skippable: true, tightens: "Narrows your safe EMI ceiling downward if there's one coming." });

  Q.push({ id: "upcomingExpenseMonths", tier: "more", label: "How many months away?", type: "number",
    when: (i) => i.upcomingExpenseAmount > 0, placeholder: "3" });

  Q.push({ id: "isProductiveUse", tier: "more", label: "Will this loan directly help you earn more (new stock, a delivery vehicle, a tool of trade)?", type: "yesno",
    when: (i) => ["business","vehicle"].includes(i.purpose) });

  Q.push({ id: "projectedIncrementalIncome", tier: "more", label: "Roughly how much extra income a month could it realistically bring in?", type: "rupee",
    when: (i) => i.isProductiveUse === true, placeholder: "15,000",
    tightens: "Can widen your safe EMI ceiling, if the loan pays for itself." });

  Q.push({ id: "existingOfferRatePct", tier: "more", label: "Has a lender already quoted you a rate? Enter it, or skip.", type: "number",
    placeholder: "14", skippable: true, tightens: "Powers the direct comparison on your Negotiation Card." });

  Q.push({ id: "cityTier", tier: "more", label: "Which best fits where you live?", type: "select",
    options: [["metro","A metro (Bengaluru, Mumbai, Delhi NCR...)"],["tier2","A tier-2 city"],["tier3","A smaller town"]],
    when: (i) => typeof i.essentialExpenses !== "number",
    tightens: "Only asked if you skipped monthly expenses — sets a fairer default than assuming zero." });

  Q.push({ id: "dependents", tier: "more", label: "How many people depend on this income (besides you)?", type: "number",
    when: (i) => typeof i.essentialExpenses !== "number", placeholder: "2" });

  if (typeof module !== "undefined" && module.exports) module.exports = Q;
  else root.QUESTIONS = Q;
})(typeof window !== "undefined" ? window : this);
