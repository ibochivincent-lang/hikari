// Hikari Dashboard Interactive Controller
// Author: ibochivincent-lang

let state = {
  totalAssets: 124500,
  idleAssets: 28400,
  totalShares: 119390,
  activeTab: "deposit", // deposit or withdraw
  pendingProposal: {
    id: "hikari_prop_910",
    strategy: "Soroswap XLM-USDC AMM",
    amount: 25000,
    rationale: "Strategic opportunity: Volatility drop allows high-fee capture in AMM pool.",
  },
};

const VIRTUAL_SHARES = 1000;
const VIRTUAL_ASSETS = 1;

// Elements
const tabDeposit = document.getElementById("tabDeposit");
const tabWithdraw = document.getElementById("tabWithdraw");
const inputLabel = document.getElementById("inputLabel");
const amountInput = document.getElementById("amountInput");
const estShares = document.getElementById("estShares");
const btnSubmitAction = document.getElementById("btnSubmitAction");
const vaultForm = document.getElementById("vaultForm");

const tvlDisplay = document.getElementById("tvlDisplay");
const navDisplay = document.getElementById("navDisplay");
const reserveDisplay = document.getElementById("reserveDisplay");

const approvalBanner = document.getElementById("approvalBanner");
const approvalDetails = document.getElementById("approvalDetails");
const btnApprove = document.getElementById("btnApprove");
const btnReject = document.getElementById("btnReject");

const agentConsole = document.getElementById("agentConsole");
const btnRunAgent = document.getElementById("btnRunAgent");

function updateMetrics() {
  const nav = (state.totalAssets + VIRTUAL_ASSETS) / (state.totalShares + VIRTUAL_SHARES);
  tvlDisplay.innerText = `${state.totalAssets.toLocaleString()} XLM`;
  navDisplay.innerText = `${nav.toFixed(4)} XLM`;
  reserveDisplay.innerText = `${state.idleAssets.toLocaleString()} XLM`;
}

// Tab Switching
tabDeposit.addEventListener("click", () => {
  state.activeTab = "deposit";
  tabDeposit.classList.add("active");
  tabWithdraw.classList.remove("active");
  inputLabel.innerText = "Deposit XLM Amount";
  btnSubmitAction.innerText = "Deposit XLM";
  calculateConversion();
});

tabWithdraw.addEventListener("click", () => {
  state.activeTab = "withdraw";
  tabWithdraw.classList.add("active");
  tabDeposit.classList.remove("active");
  inputLabel.innerText = "Redeem hXLM Shares";
  btnSubmitAction.innerText = "Redeem Shares";
  calculateConversion();
});

// Conversion Calculation
amountInput.addEventListener("input", calculateConversion);

function calculateConversion() {
  const val = parseFloat(amountInput.value) || 0;
  if (state.activeTab === "deposit") {
    // shares = val * (totalShares + 1000) / (totalAssets + 1)
    const shares = (val * (state.totalShares + VIRTUAL_SHARES)) / (state.totalAssets + VIRTUAL_ASSETS);
    estShares.innerText = `${shares.toFixed(2)} hXLM`;
  } else {
    // assets = shares * (totalAssets + 1) / (totalShares + 1000)
    const assets = (val * (state.totalAssets + VIRTUAL_ASSETS)) / (state.totalShares + VIRTUAL_SHARES);
    estShares.innerText = `${assets.toFixed(2)} XLM`;
  }
}

// Form Submission
vaultForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = parseFloat(amountInput.value);
  if (!val || val <= 0) return;

  if (state.activeTab === "deposit") {
    const shares = (val * (state.totalShares + VIRTUAL_SHARES)) / (state.totalAssets + VIRTUAL_ASSETS);
    state.totalAssets += val;
    state.idleAssets += val;
    state.totalShares += shares;
    addLog("[Vault]", `Deposited ${val} XLM. Minted ${shares.toFixed(2)} hXLM shares.`, "log-tag-success");
  } else {
    const assets = (val * (state.totalAssets + VIRTUAL_ASSETS)) / (state.totalShares + VIRTUAL_SHARES);
    if (assets > state.idleAssets) {
      addLog("[WithdrawalQueue]", `Liquid reserve insufficient. Queued request for ${val} shares.`, "log-tag-warn");
      return;
    }
    state.totalAssets -= assets;
    state.idleAssets -= assets;
    state.totalShares -= val;
    addLog("[Vault]", `Redeemed ${val} hXLM shares for ${assets.toFixed(2)} XLM.`, "log-tag-success");
  }

  amountInput.value = "";
  estShares.innerText = "0.00";
  updateMetrics();
});

// Human Approval Flow
btnApprove.addEventListener("click", () => {
  if (state.pendingProposal) {
    addLog(
      "[Operator]",
      `Approved ${state.pendingProposal.id}: Deployed ${state.pendingProposal.amount} XLM to ${state.pendingProposal.strategy}.`,
      "log-tag-success"
    );
    approvalBanner.style.display = "none";
    state.pendingProposal = null;
  }
});

btnReject.addEventListener("click", () => {
  if (state.pendingProposal) {
    addLog(
      "[Operator]",
      `Rejected proposal ${state.pendingProposal.id}. Allocation cancelled.`,
      "log-tag-warn"
    );
    approvalBanner.style.display = "none";
    state.pendingProposal = null;
  }
});

// Real-time Agent Cycle Simulation
btnRunAgent.addEventListener("click", () => {
  btnRunAgent.disabled = true;
  btnRunAgent.innerText = "Processing...";

  setTimeout(() => {
    addLog("[PaymentAgent]", "Triggered x402 payment: 0.001 USDC for fresh market feed.", "log-tag-agent");
  }, 300);

  setTimeout(() => {
    addLog("[MarketAgent]", "Telemetry received: Volatility=24/100, AMM Depth=High.", "log-tag-agent");
  }, 700);

  setTimeout(() => {
    addLog("[YieldAgent]", "Evaluated strategies. Highest score: Phoenix Concentrated XLM.", "log-tag-agent");
  }, 1100);

  setTimeout(() => {
    addLog("[RiskAgent]", "Exposure verified. Safe allocation: 15,000 XLM.", "log-tag-agent");
  }, 1500);

  setTimeout(() => {
    addLog("[PolicyEngine]", "Deterministic check: All 7 invariant rules PASSED.", "log-tag-policy");
    addLog("[AuditChain]", `Committed state hash: ${randomHash()}`, "log-tag-success");
    btnRunAgent.disabled = false;
    btnRunAgent.innerText = "▶ Trigger Cycle";
  }, 1900);
});

function addLog(tag, message, tagClass) {
  const line = document.createElement("div");
  line.className = "log-line";
  const now = new Date();
  const time = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;

  line.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="${tagClass}">${tag}</span>
    <span>${message}</span>
  `;
  agentConsole.appendChild(line);
  agentConsole.scrollTop = agentConsole.scrollHeight;
}

function randomHash() {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// Initial Run
updateMetrics();
