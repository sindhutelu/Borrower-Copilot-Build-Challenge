(function () {
  "use strict";
  const QUESTIONS = window.QUESTIONS;
  const $ = (sel) => document.querySelector(sel);

  const introEl = $("#intro"), wizardEl = $("#wizard"), resultsEl = $("#results");
  const qcardEl = $("#qcard"), pagenoEl = $("#pageno");
  const btnBack = $("#btnBack"), btnNext = $("#btnNext"), btnSkip = $("#btnSkip"), btnStart = $("#btnStart");

  let raw = {};          // answers exactly as captured in the wizard
  let shownIndices = [];  // QUESTIONS indices actually displayed, in order
  let ptr = -1;

  // ---------------- persona presets (also used for the RUNTHROUGHS doc) --
  const PERSONAS = {
    priya: { purpose: "wedding", amountWanted: 800000, employmentType: "salaried",
      netMonthlyIncome: 110000, existingEMI: 14000, essentialExpenses: 44000,
      age: 29, creditScoreKnown: "yes", creditScore: 780, bounceLast6Months: false,
      yearsStable: 5, incomeVariabilityPct: 5, emergencyFundMonths: 2 },
    ravi: { purpose: "business", amountWanted: 1500000, employmentType: "self_employed_formal",
      itrAnnualIncome: 420000, selfReportedMonthlyIncome: 60000, existingEMI: 0,
      essentialExpenses: 35000, age: 42, creditScoreKnown: "no", bounceLast6Months: false,
      yearsStable: 14, incomeVariabilityPct: 25, hasCollateral: "property",
      isProductiveUse: true, projectedIncrementalIncome: 15000 },
    anita: { purpose: "vehicle", amountWanted: 150000, employmentType: "gig_informal",
      selfReportedMonthlyIncome: 28000, existingEMI: 0, essentialExpenses: 22000,
      age: 35, creditScoreKnown: "no", bounceLast6Months: true,
      yearsStable: 2, incomeVariabilityPct: 50, emergencyFundMonths: 0,
      existingDebtOutstanding: 35000, existingDebtRatePct: 32,
      isProductiveUse: true, projectedIncrementalIncome: 6000 },
  };

  document.querySelectorAll(".persona-pick button").forEach((b) => {
    b.addEventListener("click", () => {
      raw = Object.assign({}, PERSONAS[b.dataset.persona]);
      finishWizard();
    });
  });

  btnStart.addEventListener("click", () => {
    raw = {};
    shownIndices = []; ptr = -1;
    introEl.classList.add("hidden");
    wizardEl.classList.remove("hidden");
    showNext();
  });

  function isApplicable(q) { return !q.when || q.when(raw); }
  function findNextIndex(from) {
    for (let idx = from + 1; idx < QUESTIONS.length; idx++) if (isApplicable(QUESTIONS[idx])) return idx;
    return -1;
  }

  function showNext() {
    const idx = findNextIndex(ptr);
    if (idx === -1) { finishWizard(); return; }
    ptr = idx;
    shownIndices.push(ptr);
    renderQuestion(QUESTIONS[ptr]);
  }

  btnBack.addEventListener("click", () => {
    if (shownIndices.length <= 1) {
      wizardEl.classList.add("hidden");
      introEl.classList.remove("hidden");
      return;
    }
    shownIndices.pop();
    ptr = shownIndices[shownIndices.length - 1];
    renderQuestion(QUESTIONS[ptr]);
  });

  function parseRupee(str) {
    if (str == null || str === "") return undefined;
    const n = Number(String(str).replace(/[^\d.]/g, ""));
    return isNaN(n) ? undefined : n;
  }

  function renderQuestion(q) {
    const mustCount = QUESTIONS.filter((x) => x.tier === "must" && isApplicable(x)).length;
    const moreApplicable = QUESTIONS.filter((x) => x.tier === "more" && isApplicable(x));
    const shownMustSoFar = shownIndices.filter((i) => QUESTIONS[i].tier === "must").length;
    const shownMoreSoFar = shownIndices.filter((i) => QUESTIONS[i].tier === "more").length;
    pagenoEl.innerHTML = q.tier === "must"
      ? `<span>The essentials — page ${shownMustSoFar} of ~${mustCount}</span><span>always asked</span>`
      : `<span>Tightening your numbers — ${shownMoreSoFar} of ~${moreApplicable.length}</span><span>answer what you can</span>`;

    let body = `<div class="qcard">
      <p class="qlabel">${q.label}</p>
      ${q.help ? `<p class="qhelp">${q.help}</p>` : ""}
      ${q.tightens ? `<p class="qtighten">↳ ${q.tightens}</p>` : ""}
      <div id="qinput"></div>
    </div>`;
    qcardEl.innerHTML = body;
    const inputWrap = $("#qinput");
    const existing = raw[q.id];

    if (q.type === "select" || q.type === "yesno") {
      const opts = q.type === "yesno" ? [["true","Yes"],["false","No"]] : q.options;
      const grid = document.createElement("div");
      grid.className = "opt-grid";
      opts.forEach(([val, label]) => {
        const b = document.createElement("button");
        b.textContent = label;
        const currentVal = q.type === "yesno" ? String(existing) : existing;
        if (currentVal === val) b.classList.add("selected");
        b.addEventListener("click", () => {
          raw[q.id] = q.type === "yesno" ? (val === "true") : (q.parse ? q.parse(val) : val);
          showNext();
        });
        grid.appendChild(b);
      });
      inputWrap.appendChild(grid);
      btnNext.classList.add("hidden");
      btnSkip.classList.toggle("hidden", !q.skippable);
    } else if (q.type === "rupee") {
      inputWrap.innerHTML = `<div class="rupee-wrap"><span>₹</span><input type="text" inputmode="numeric" id="freeInput" placeholder="${q.placeholder || ""}" value="${existing != null ? existing : ""}"></div>`;
      btnNext.classList.remove("hidden");
      btnSkip.classList.toggle("hidden", !q.skippable);
      $("#freeInput").focus();
    } else { // number / text
      inputWrap.innerHTML = `<input type="number" id="freeInput" placeholder="${q.placeholder || ""}" value="${existing != null ? existing : ""}">`;
      btnNext.classList.remove("hidden");
      btnSkip.classList.toggle("hidden", !q.skippable);
      $("#freeInput").focus();
    }

    btnNext.onclick = () => {
      const el = $("#freeInput");
      if (!el) return;
      const val = q.type === "rupee" ? parseRupee(el.value) : (el.value === "" ? undefined : Number(el.value));
      if (val === undefined && !q.skippable) { el.style.borderColor = "var(--stamp-red)"; return; }
      if (val !== undefined) raw[q.id] = val;
      showNext();
    };
    btnSkip.onclick = () => { delete raw[q.id]; showNext(); };
  }

  // ---------------------------- finalize + compute -----------------------
  function finalize(r) {
    const i = Object.assign({}, r);
    i.creditScoreKnown = i.creditScoreKnown === "yes";
    if (r.hasCollateral && r.hasCollateral !== "none") { i.collateralType = r.hasCollateral; i.hasCollateral = true; }
    else { i.hasCollateral = false; i.collateralType = undefined; }
    return i;
  }

  function computeMeta(rawAnswers) {
    const applicable = QUESTIONS.filter((q) => q.tier === "more" && (!q.when || q.when(rawAnswers)));
    const answered = applicable.filter((q) => rawAnswers[q.id] !== undefined);
    return { applicableOptionalCount: applicable.length, answeredOptionalCount: answered.length };
  }

  function finishWizard() {
    wizardEl.classList.add("hidden");
    introEl.classList.add("hidden");
    resultsEl.classList.remove("hidden");
    const meta = computeMeta(raw);
    const inputs = finalize(raw);
    const result = Engine.run(inputs, meta);
    renderResults(inputs, result);
    window.scrollTo(0, 0);
  }

  // ------------------------------- rendering ------------------------------
  const inr = Rules.inr, pctf = Rules.pct;

  function whyBox(items, idSeed) {
    const list = items.filter(Boolean);
    if (!list.length) return "";
    const id = "why-" + idSeed;
    return `<p class="why" onclick="document.getElementById('${id}').classList.toggle('hidden')">Why this number →</p>
      <div class="why-body hidden" id="${id}"><ul>${list.map((n) => `<li><span class="flag warn">${n.ruleId}</span> ${n.why}</li>`).join("")}</ul></div>`;
  }

  function renderResults(inputs, r) {
    const verdictClass = r.O1.verdict;
    const stamp = { borrow: "Go ahead", borrow_less: "Borrow less", dont_borrow: "Don't borrow" }[verdictClass];

    const safeCapNotes = r.safeCap.applied;
    const incomeNotes = r.income.notes;
    const workflowNotes = r.notes || [];

    const tenureRows = r.O4.tenureTable.map((t) => `
      <tr class="${t.fitsCeiling ? "fits" : "nofit"}">
        <td>${t.months} mo</td>
        <td>${inr(t.principalAtSafeEMI)}</td>
        <td>${inr(t.emiForRequested)}</td>
        <td>${t.fitsCeiling ? "✓ fits" : "over ceiling"}</td>
      </tr>`).join("");

    resultsEl.innerHTML = `
      <div class="confidence-bar">
        <span class="confidence-dot ${r.conf.label}"></span>
        Confidence: ${r.conf.label} — you answered ${Math.round(r.conf.frac*100)}% of the tightening questions that applied to you. Ranges are widened accordingly.
      </div>

      <div class="stamp-wrap">
        <div class="stamp ${verdictClass}">${stamp}<small>${r.O1.ruleId}</small></div>
      </div>
      <p style="text-align:center; max-width:32rem; margin:0 auto 2rem; color:var(--ink-soft)">${r.O1.why}</p>

      <div class="out-block">
        <h3>Maximum amount <span class="rid">O2 · ${r.O2.ruleId}</span></h3>
        <div class="figpair">
          <div class="fig"><div class="label">Lender might sanction</div><div class="val">${inr(r.O2.lenderAmountRange[0])}–${inr(r.O2.lenderAmountRange[1])}</div></div>
          <div class="fig safe"><div class="label">You can safely carry — use this one</div><div class="val">${inr(r.O2.safeAmountRange[0])}–${inr(r.O2.safeAmountRange[1])}</div></div>
        </div>
        ${whyBox([r.lenderCap, ...safeCapNotes, r.O2, r.O2.flipNote, ...incomeNotes], "o2")}
      </div>

      <div class="out-block">
        <h3>Fair interest rate <span class="rid">O3 · ${r.O3.ruleId}</span></h3>
        <div class="figpair">
          <div class="fig"><div class="label">Expect this rate</div><div class="val">${r.O3.rateBand[0].toFixed(1)}–${r.O3.rateBand[1].toFixed(1)}%</div></div>
          <div class="fig"><div class="label">All-in APR (incl. fees)</div><div class="val">${r.O3.aprRange[0].toFixed(1)}–${r.O3.aprRange[1].toFixed(1)}%</div></div>
        </div>
        <p style="font-size:.85rem;color:var(--ink-soft);margin:0">Product: ${r.productInfo.product.replace(/_/g," ")} · processing fee assumed ${pctf(r.feePct*100)}</p>
        ${whyBox([r.productInfo, r.rateFallback], "o3")}
      </div>

      <div class="out-block">
        <h3>EMI ceiling <span class="rid">O4 · ${r.O4.ruleId}</span></h3>
        <div class="figpair">
          <div class="fig safe"><div class="label">Don't agree to more than</div><div class="val">${inr(r.O4.safeMaxEMI)}/mo</div></div>
        </div>
        <table class="tenure">
          <thead><tr><th>Tenure</th><th>Amount at your ceiling</th><th>EMI for what you asked</th><th></th></tr></thead>
          <tbody>${tenureRows}</tbody>
        </table>
        <p style="font-size:.85rem; margin-top:.8rem"><b>Stress test:</b> ${r.O4.stress.why}</p>
        ${whyBox([...safeCapNotes, r.productivityNote, ...workflowNotes.filter(n=>n.ruleId==="FOIR-20")], "o4")}
      </div>

      <div class="section-title">Negotiation Card</div>
      ${renderNegotiationCard(inputs, r)}

      <div class="footer-actions no-print">
        <button class="btn secondary" id="btnPrint">Print / save Negotiation Card</button>
        <button class="btn ghost" id="btnRestart">Start over</button>
      </div>
    `;

    $("#btnPrint").addEventListener("click", () => window.print());
    $("#btnRestart").addEventListener("click", () => {
      raw = {}; shownIndices = []; ptr = -1;
      resultsEl.classList.add("hidden");
      introEl.classList.remove("hidden");
    });
  }

  function renderNegotiationCard(inputs, r) {
    const card = Engine.negotiationCard(inputs, r);
    return `<div class="negcard">
      <h2>${inputs.purpose ? inputs.purpose.replace(/_/g," ") : "Loan"} — fair terms for this profile</h2>
      <div class="sub">Risk tier: ${r.risk.tier.replace("_"," ")} · Confidence: ${r.conf.label} · Product: ${r.productInfo.product.replace(/_/g," ")}</div>
      <div class="row"><span>Ask for</span><b>${inr(r.O2.safeAmountRange[0])}–${inr(r.O2.safeAmountRange[1])}</b></div>
      <div class="row"><span>Fair rate</span><b>${r.rateBand[0].toFixed(1)}–${r.rateBand[1].toFixed(1)}%</b></div>
      <div class="row"><span>Fair all-in APR</span><b>${r.aprRange[0].toFixed(1)}–${r.aprRange[1].toFixed(1)}%</b></div>
      <div class="row"><span>EMI ceiling</span><b>${inr(r.safeMaxEMI)}/mo</b></div>
      <ul>${card.talkingPoints.map((p) => `<li>${p}</li>`).join("")}</ul>
    </div>`;
  }
})();
