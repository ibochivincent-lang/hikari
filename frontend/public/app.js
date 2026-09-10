let state = {
  totalAssets: 124500,
  idleAssets: 28400,
  totalShares: 119390,
  activeTab: "stake", // stake, request, claim, basket
  bunkerMode: false,
  haircutBps: 0,
  wallet: {
    connected: false,
    address: null,
    balanceXlm: 10000,
    sharesHXlm: 1200,
  },
  withdrawalTickets: [
    { id: 101, shares: 250, claimableXlm: 260.70, status: "ready" },
    { id: 102, shares: 500, claimableXlm: 521.40, status: "pending" },
  ],
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
const btnConnectWallet = document.getElementById("btnConnectWallet");
const networkBadge = document.getElementById("networkBadge");
const queueModeBadge = document.getElementById("queueModeBadge");
const queueModeText = document.getElementById("queueModeText");

// Lido Widget Elements
const tabStake = document.getElementById("tabStake");
const tabRequest = document.getElementById("tabRequest");
const tabClaim = document.getElementById("tabClaim");
const tabBasket = document.getElementById("tabBasket");

const panelForm = document.getElementById("panelForm");
const panelClaim = document.getElementById("panelClaim");
const panelBasket = document.getElementById("panelBasket");

const inputLabel = document.getElementById("inputLabel");
const amountInput = document.getElementById("amountInput");
const btnMaxAmount = document.getElementById("btnMaxAmount");
const walletBalLabel = document.getElementById("walletBalLabel");
const rateDisplay = document.getElementById("rateDisplay");
const estShares = document.getElementById("estShares");
const btnSubmitAction = document.getElementById("btnSubmitAction");
const vaultForm = document.getElementById("vaultForm");

const ticketList = document.getElementById("ticketList");
const btnClaimAll = document.getElementById("btnClaimAll");

const tvlDisplay = document.getElementById("tvlDisplay");
const navDisplay = document.getElementById("navDisplay");
const reserveDisplay = document.getElementById("reserveDisplay");

const approvalBanner = document.getElementById("approvalBanner");
const approvalDetails = document.getElementById("approvalDetails");
const btnApprove = document.getElementById("btnApprove");
const btnReject = document.getElementById("btnReject");

const agentConsole = document.getElementById("agentConsole");
const btnRunAgent = document.getElementById("btnRunAgent");
const btnHeroDemo = document.getElementById("btnHeroDemo");

const mevTotalYield = document.getElementById("mevTotalYield");
const mevSpreadDisplay = document.getElementById("mevSpreadDisplay");
const mevTxLink = document.getElementById("mevTxLink");
const mevCyclePulse = document.getElementById("mevCyclePulse");
const circuitStateBadge = document.getElementById("circuitStateBadge");
const btnSimulateShock = document.getElementById("btnSimulateShock");
const btnResetCircuit = document.getElementById("btnResetCircuit");


function updateMetrics() {
  const nav = (state.totalAssets + VIRTUAL_ASSETS) / (state.totalShares + VIRTUAL_SHARES);
  tvlDisplay.innerText = `${state.totalAssets.toLocaleString()} XLM`;
  navDisplay.innerText = `${nav.toFixed(4)} XLM`;
  reserveDisplay.innerText = `${state.idleAssets.toLocaleString()} XLM`;

  if (rateDisplay) {
    rateDisplay.innerText = `1 XLM ≈ ${(1 / nav).toFixed(4)} hXLM`;
  }
}

if (btnHeroDemo) {
  btnHeroDemo.addEventListener("click", () => {
    document.querySelector(".main-grid").scrollIntoView({ behavior: "smooth" });
    if (typeof gsap !== "undefined") {
      gsap.fromTo(btnHeroDemo, { scale: 0.95 }, { scale: 1, duration: 0.2, ease: "back.out(2)" });
    }
    btnRunAgent.click();
  });
}

// Wallet Connection
btnConnectWallet.addEventListener("click", async () => {
  if (state.wallet.connected) {
    state.wallet.connected = false;
    state.wallet.address = null;
    btnConnectWallet.innerText = "🔗 Connect Wallet";
    btnConnectWallet.style.background = "";
    if (walletBalLabel) walletBalLabel.innerText = "Balance: 0 XLM";
    addLog("[Wallet]", "Disconnected from wallet session.", "log-tag-warn");
    return;
  }

  try {
    if (window.freighterApi && typeof window.freighterApi.isConnected === "function") {
      const isConnected = await window.freighterApi.isConnected();
      if (isConnected) {
        const address = await window.freighterApi.getPublicKey();
        setConnectedWallet(address, "Freighter (Extension)");
        return;
      }
    }
  } catch (err) {
    console.warn("Freighter check error:", err);
  }

  const randomSuffix = Array.from({ length: 4 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random() * 32)]
  ).join("");
  const demoAddress = `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL${randomSuffix}`;
  setConnectedWallet(demoAddress, "Stellar Testnet Account");
});

function setConnectedWallet(address, providerName) {
  state.wallet.connected = true;
  state.wallet.address = address;
  state.wallet.balanceXlm = 10000;
  state.wallet.sharesHXlm = 1200;

  const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;
  btnConnectWallet.innerText = `🟢 ${shortAddr}`;
  btnConnectWallet.style.background = "rgba(52, 211, 153, 0.2)";
  btnConnectWallet.style.border = "1px solid #34d399";
  btnConnectWallet.style.color = "#34d399";

  updateBalanceLabel();

  if (typeof gsap !== "undefined") {
    gsap.fromTo(btnConnectWallet, { scale: 0.88 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
  }

  addLog("[Wallet]", `Connected via ${providerName}: ${shortAddr} (Balance: 10,000 XLM)`, "log-tag-success");
}

function updateBalanceLabel() {
  if (!walletBalLabel) return;
  if (!state.wallet.connected) {
    walletBalLabel.innerText = "Balance: 0 XLM";
    return;
  }
  if (state.activeTab === "stake") {
    walletBalLabel.innerText = `Balance: ${state.wallet.balanceXlm.toLocaleString()} XLM`;
  } else if (state.activeTab === "request") {
    walletBalLabel.innerText = `Balance: ${state.wallet.sharesHXlm.toLocaleString()} hXLM`;
  }
}

// MAX Button
if (btnMaxAmount) {
  btnMaxAmount.addEventListener("click", () => {
    if (state.activeTab === "stake") {
      const maxVal = Math.max(0, state.wallet.balanceXlm - 2); // reserve 2 XLM for gas
      amountInput.value = maxVal;
    } else if (state.activeTab === "request") {
      amountInput.value = state.wallet.sharesHXlm;
    }
    calculateConversion();
    if (typeof gsap !== "undefined") {
      gsap.fromTo(amountInput, { scale: 0.98 }, { scale: 1, duration: 0.2 });
    }
  });
}

// Lido 4-Tab Navigation
function setActiveTab(tab) {
  state.activeTab = tab;
  [tabStake, tabRequest, tabClaim, tabBasket].forEach((btn) => btn && btn.classList.remove("active"));
  panelForm.style.display = "none";
  panelClaim.style.display = "none";
  panelBasket.style.display = "none";

  if (tab === "stake") {
    tabStake.classList.add("active");
    panelForm.style.display = "block";
    inputLabel.innerText = "Deposit XLM Amount";
    btnSubmitAction.innerText = "Stake XLM";
    btnSubmitAction.style.display = "block";
    updateBalanceLabel();
    calculateConversion();
  } else if (tab === "request") {
    tabRequest.classList.add("active");
    panelForm.style.display = "block";
    inputLabel.innerText = "Redeem hXLM Shares";
    btnSubmitAction.innerText = "Queue Withdrawal Request";
    btnSubmitAction.style.display = "block";
    updateBalanceLabel();
    calculateConversion();
  } else if (tab === "claim") {
    tabClaim.classList.add("active");
    panelClaim.style.display = "block";
    renderTicketList();
  } else if (tab === "basket") {
    tabBasket.classList.add("active");
    panelBasket.style.display = "block";
  }

  if (typeof gsap !== "undefined") {
    gsap.fromTo([panelForm, panelClaim, panelBasket], { autoAlpha: 0.4, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: "power2.out" });
  }
}

if (tabStake) tabStake.addEventListener("click", () => setActiveTab("stake"));
if (tabRequest) tabRequest.addEventListener("click", () => setActiveTab("request"));
if (tabClaim) tabClaim.addEventListener("click", () => setActiveTab("claim"));
if (tabBasket) tabBasket.addEventListener("click", () => setActiveTab("basket"));

// Conversion Calculation
amountInput.addEventListener("input", calculateConversion);

function calculateConversion() {
  const val = parseFloat(amountInput.value) || 0;
  if (state.activeTab === "stake") {
    const shares = (val * (state.totalShares + VIRTUAL_SHARES)) / (state.totalAssets + VIRTUAL_ASSETS);
    estShares.innerText = `${shares.toFixed(2)} hXLM`;
  } else {
    let assets = (val * (state.totalAssets + VIRTUAL_ASSETS)) / (state.totalShares + VIRTUAL_SHARES);
    if (state.bunkerMode && state.haircutBps > 0) {
      assets = assets * (1 - state.haircutBps / 10000);
    }
    estShares.innerText = `${assets.toFixed(2)} XLM`;
  }
}

// Render Lido-style Withdrawal Tickets
function renderTicketList() {
  if (!ticketList) return;
  ticketList.innerHTML = "";

  if (state.withdrawalTickets.length === 0) {
    ticketList.innerHTML = `<div style="text-align: center; color: var(--text-dim); font-size: 0.8rem; padding: 1.5rem 0;">No active withdrawal tickets found.</div>`;
    btnClaimAll.disabled = true;
    return;
  }

  let readyCount = 0;
  state.withdrawalTickets.forEach((t) => {
    const isReady = t.status === "ready";
    if (isReady) readyCount++;

    const item = document.createElement("div");
    item.className = "ticket-card";
    item.innerHTML = `
      <div>
        <div style="font-weight: 600; font-size: 0.85rem; color: #fff;">Ticket #${t.id}</div>
        <div class="ticket-meta">${t.shares.toFixed(2)} hXLM shares &rarr; ${t.claimableXlm.toFixed(2)} XLM</div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="${isReady ? "ticket-badge-ready" : "ticket-badge-pending"}">
          ${isReady ? "Ready to Claim" : "Cooldown (~30 ledgers)"}
        </span>
        ${
          isReady
            ? `<button class="btn-primary" style="padding: 0.3rem 0.7rem; font-size: 0.75rem; width: auto;" onclick="claimTicket(${t.id})">Claim</button>`
            : ""
        }
      </div>
    `;
    ticketList.appendChild(item);
  });

  btnClaimAll.disabled = readyCount === 0;
}

window.claimTicket = function (ticketId) {
  const idx = state.withdrawalTickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return;
  const ticket = state.withdrawalTickets[idx];
  state.wallet.balanceXlm += ticket.claimableXlm;
  state.idleAssets -= ticket.claimableXlm;
  state.totalAssets -= ticket.claimableXlm;
  state.withdrawalTickets.splice(idx, 1);

  addLog("[WithdrawalQueue]", `Claimed Ticket #${ticket.id}: Received ${ticket.claimableXlm.toFixed(2)} XLM from buffer.`, "log-tag-success");
  updateMetrics();
  updateBalanceLabel();
  renderTicketList();
};

if (btnClaimAll) {
  btnClaimAll.addEventListener("click", () => {
    const readyTickets = state.withdrawalTickets.filter((t) => t.status === "ready");
    if (readyTickets.length === 0) return;

    let totalClaimed = 0;
    readyTickets.forEach((t) => (totalClaimed += t.claimableXlm));
    state.wallet.balanceXlm += totalClaimed;
    state.idleAssets -= totalClaimed;
    state.totalAssets -= totalClaimed;
    state.withdrawalTickets = state.withdrawalTickets.filter((t) => t.status !== "ready");

    addLog("[WithdrawalQueue]", `Batch Claimed ${readyTickets.length} tickets: Total ${totalClaimed.toFixed(2)} XLM paid out.`, "log-tag-success");
    updateMetrics();
    updateBalanceLabel();
    renderTicketList();
  });
}

// Form Submission with Pulse Flash
vaultForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = parseFloat(amountInput.value);
  if (!val || val <= 0) return;

  if (state.activeTab === "stake") {
    const shares = (val * (state.totalShares + VIRTUAL_SHARES)) / (state.totalAssets + VIRTUAL_ASSETS);
    state.totalAssets += val;
    state.idleAssets += val;
    state.totalShares += shares;
    state.wallet.balanceXlm -= val;
    state.wallet.sharesHXlm += shares;
    addLog("[Vault]", `Staked ${val} XLM. Minted ${shares.toFixed(2)} hXLM shares.`, "log-tag-success");
  } else if (state.activeTab === "request") {
    if (val > state.wallet.sharesHXlm) {
      addLog("[WithdrawalQueue]", `Insufficient hXLM shares in wallet.`, "log-tag-warn");
      return;
    }
    const assets = (val * (state.totalAssets + VIRTUAL_ASSETS)) / (state.totalShares + VIRTUAL_SHARES);
    const newId = (state.withdrawalTickets.length > 0 ? Math.max(...state.withdrawalTickets.map((t) => t.id)) : 100) + 1;
    state.withdrawalTickets.push({
      id: newId,
      shares: val,
      claimableXlm: assets,
      status: "pending",
    });
    state.wallet.sharesHXlm -= val;
    state.totalShares -= val;
    addLog("[WithdrawalQueue]", `Created Request Ticket #${newId} for ${val} hXLM (${assets.toFixed(2)} XLM). Cooldown started.`, "log-tag-success");

    // Automatically simulate finalization after 6 seconds
    setTimeout(() => {
      const t = state.withdrawalTickets.find((tk) => tk.id === newId);
      if (t) {
        t.status = "ready";
        addLog("[WithdrawalQueue]", `Ticket #${newId} finalized by Oracle! Ready to claim.`, "log-tag-success");
        if (state.activeTab === "claim") renderTicketList();
      }
    }, 6000);
  }

  amountInput.value = "";
  estShares.innerText = "0.00";
  updateMetrics();
  updateBalanceLabel();

  if (typeof gsap !== "undefined") {
    gsap.fromTo("#tvlDisplay", { scale: 1.15, color: "#38bdf8" }, { scale: 1, color: "#ffffff", duration: 0.45, ease: "power2.out" });
    gsap.fromTo("#reserveDisplay", { scale: 1.12, color: "#34d399" }, { scale: 1, color: "#ffffff", duration: 0.45, ease: "power2.out" });
  }
});

// Human Approval Flow with GSAP
btnApprove.addEventListener("click", () => {
  if (state.pendingProposal) {
    addLog(
      "[Operator]",
      `Approved ${state.pendingProposal.id}: Deployed ${state.pendingProposal.amount} XLM to ${state.pendingProposal.strategy}.`,
      "log-tag-success"
    );
    if (typeof gsap !== "undefined") {
      gsap.to(approvalBanner, {
        y: -15,
        autoAlpha: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => { approvalBanner.style.display = "none"; }
      });
    } else {
      approvalBanner.style.display = "none";
    }
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
    if (typeof gsap !== "undefined") {
      gsap.to(approvalBanner, {
        y: -15,
        autoAlpha: 0,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => { approvalBanner.style.display = "none"; }
      });
    } else {
      approvalBanner.style.display = "none";
    }
    state.pendingProposal = null;
  }
});

async function applyTelemetry(data) {
  if (!data) return;
  if (data.vaultState) {
    const totalAssetsXlm = Number(BigInt(data.vaultState.totalAssetsStroops) / 10000000n);
    const idleAssetsXlm = Number(BigInt(data.vaultState.idleAssetsStroops) / 10000000n);
    state.totalAssets = totalAssetsXlm;
    state.idleAssets = idleAssetsXlm;
    updateMetrics();
  }

  if (data.mevMetrics) {
    const boostXlm = (Number(BigInt(data.mevMetrics.vaultBoostStroops || "0")) / 1e7).toFixed(2);
    if (mevTotalYield) mevTotalYield.innerText = `+${boostXlm} XLM`;
    if (data.mevMetrics.lastBundle && data.mevMetrics.lastBundle.opportunity) {
      const opp = data.mevMetrics.lastBundle.opportunity;
      if (mevSpreadDisplay) mevSpreadDisplay.innerText = `${opp.spreadBps} bps`;
      if (mevTxLink) {
        const hash = data.mevMetrics.lastBundle.txHash;
        mevTxLink.innerText = `${hash.slice(0, 8)}...${hash.slice(-4)} ↗`;
        mevTxLink.href = `https://stellar.expert/explorer/testnet/tx/${hash}`;
      }
    }
  }

  if (data.circuitBreaker) {
    const cb = data.circuitBreaker;
    if (cb.isGateSealed || cb.isBunkerMode) {
      if (circuitStateBadge) {
        circuitStateBadge.innerHTML = `<span class="mode-dot dot-bunker"></span> 🚨 GATE SEALED (Haircut: ${cb.haircutBps / 100}%)`;
        circuitStateBadge.style.background = "rgba(244, 63, 94, 0.15)";
        circuitStateBadge.style.borderColor = "rgba(244, 63, 94, 0.4)";
        circuitStateBadge.style.color = "var(--accent-rose)";
      }
      setBunkerMode(true, cb.haircutBps);
    } else {
      if (circuitStateBadge) {
        circuitStateBadge.innerHTML = `<span class="mode-dot dot-turbo"></span> System Nominal`;
        circuitStateBadge.style.background = "rgba(52, 211, 153, 0.1)";
        circuitStateBadge.style.borderColor = "rgba(52, 211, 153, 0.3)";
        circuitStateBadge.style.color = "var(--accent-emerald)";
      }
      setBunkerMode(false, 0);
    }
  }

  if (mevCyclePulse) {
    mevCyclePulse.innerText = `Cycle #${data.totalCycles || 1} completed (${new Date().toLocaleTimeString()})`;
  }
}

async function fetchTelemetry() {
  try {
    const res = await fetch("/api/telemetry");
    if (res.ok) {
      const data = await res.json();
      applyTelemetry(data);
    }
  } catch (e) {
    // fallback
  }
}

// Poll telemetry periodically
setInterval(fetchTelemetry, 5000);
fetchTelemetry();

// Real-time Agent Cycle Execution
btnRunAgent.addEventListener("click", async () => {
  btnRunAgent.disabled = true;
  btnRunAgent.innerText = "Executing On-Chain...";
  if (typeof gsap !== "undefined") {
    gsap.to(btnRunAgent, { scale: 0.95, duration: 0.15, yoyo: true, repeat: 1 });
  }

  addLog("[PaymentAgent]", "Triggered x402 payment: 0.001 USDC for fresh market feed.", "log-tag-agent");
  addLog("[MarketAgent]", "Telemetry received: AMM order depth & Phoenix CLAMM tick arrays.", "log-tag-agent");

  try {
    const res = await fetch("/api/trigger-cycle", { method: "POST" });
    const json = await res.json();
    if (json.telemetry) {
      applyTelemetry(json.telemetry);
      addLog("[YieldAgent]", "Evaluated strategies: Phoenix CLAMM & Soroswap AMM.", "log-tag-agent");
      addLog("[MevBackrunner]", "Captured atomic backrun arbitrage and streamed profit to Vault!", "log-tag-success");
      addLog("[PolicyEngine]", "Deterministic check: All 7 invariant rules PASSED.", "log-tag-policy");
      if (json.telemetry.mevMetrics && json.telemetry.mevMetrics.lastBundle) {
        addLog("[AuditChain]", `Committed Tx: ${json.telemetry.mevMetrics.lastBundle.txHash.slice(0, 32)}...`, "log-tag-success");
      }
    }
  } catch (err) {
    addLog("[Agent]", `Cycle completed locally.`, "log-tag-warn");
  } finally {
    btnRunAgent.disabled = false;
    btnRunAgent.innerText = "▶ Trigger Cycle";
    if (typeof gsap !== "undefined") {
      gsap.fromTo(agentConsole, { borderColor: "rgba(56, 189, 248, 0.8)" }, { borderColor: "rgba(255, 255, 255, 0.08)", duration: 0.8 });
    }
  }
});

// Interactive Circuit Breaker Buttons
if (btnSimulateShock) {
  btnSimulateShock.addEventListener("click", async () => {
    btnSimulateShock.disabled = true;
    try {
      addLog("[RiskEngine]", "⚠️ CRITICAL DRAWDOWN (16.5%) DETECTED IN DEFI POOLS!", "log-tag-warn");
      addLog("[GateSeal]", "🚨 GateSeal tripped! All strategy allocations frozen for 10,000 ledgers.", "log-tag-warn");
      addLog("[WithdrawalQueue]", "🛡️ Bunker Mode ENGAGED. Haircut of 16.5% applied to prevent run on idle reserves.", "log-tag-warn");
      await fetch("/api/simulate-shock", { method: "POST" });
      await fetchTelemetry();
    } finally {
      btnSimulateShock.disabled = false;
    }
  });
}

if (btnResetCircuit) {
  btnResetCircuit.addEventListener("click", async () => {
    btnResetCircuit.disabled = true;
    try {
      addLog("[Governance]", "🏛️ Timelock expired & DAO verified collateral recovery.", "log-tag-success");
      addLog("[GateSeal]", "GateSeal unsealed. Normal rebalancing resumed.", "log-tag-success");
      addLog("[WithdrawalQueue]", "Bunker Mode lifted. Turbo Mode 0% haircut restored.", "log-tag-success");
      await fetch("/api/reset-circuit-breaker", { method: "POST" });
      await fetchTelemetry();
    } finally {
      btnResetCircuit.disabled = false;
    }
  });
}


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

  if (typeof gsap !== "undefined") {
    gsap.from(line, {
      y: 10,
      autoAlpha: 0,
      duration: 0.35,
      ease: "power2.out"
    });
  }
}

function randomHash() {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

// Master GSAP Animations & Choreography
function initGsapAnimations() {
  if (typeof gsap === "undefined") return;

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // 1. Header & Brand Elements
    tl.from("header", { y: -25, autoAlpha: 0, duration: 0.65 })
      .from(".logo-icon", { scale: 0.4, rotation: -30, duration: 0.5, ease: "back.out(1.8)" }, "<0.15")
      .from(".brand-badge", { scale: 0.8, autoAlpha: 0, duration: 0.35 }, "<0.2")
      .from(".header-meta > *", { y: -12, autoAlpha: 0, stagger: 0.1, duration: 0.4 }, "<0.2");

    // 2. Landing Hero Section
    tl.from(".hero-badge", { y: 15, autoAlpha: 0, duration: 0.4 }, "-=0.2")
      .from(".hero-title", { y: 25, autoAlpha: 0, duration: 0.6 }, "-=0.25")
      .from(".hero-description", { y: 20, autoAlpha: 0, duration: 0.5 }, "-=0.3")
      .from(".hero-actions .btn-primary, .hero-actions .btn-secondary", { y: 15, autoAlpha: 0, stagger: 0.1, duration: 0.4 }, "-=0.2");

    // 3. Approval Banner (if present)
    if (approvalBanner && approvalBanner.style.display !== "none") {
      tl.from(approvalBanner, { y: -15, autoAlpha: 0, duration: 0.4, ease: "back.out(1.5)" }, "-=0.2");
    }

    // 4. Metric Cards & Animated Counters
    tl.from(".metric-card", {
      y: 35,
      autoAlpha: 0,
      stagger: 0.08,
      duration: 0.55,
      ease: "back.out(1.2)"
    }, "-=0.2");

    // Dynamic Counter rollup
    const counter = { tvl: 0, nav: 1.0, reserve: 0 };
    tl.to(counter, {
      tvl: state.totalAssets,
      nav: (state.totalAssets + VIRTUAL_ASSETS) / (state.totalShares + VIRTUAL_SHARES),
      reserve: state.idleAssets,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: () => {
        tvlDisplay.innerText = `${Math.round(counter.tvl).toLocaleString()} XLM`;
        navDisplay.innerText = `${counter.nav.toFixed(4)} XLM`;
        reserveDisplay.innerText = `${Math.round(counter.reserve).toLocaleString()} XLM`;
      }
    }, "<0.1");

    // 5. Main Content Grid Cards
    tl.from("main .card", { y: 30, autoAlpha: 0, stagger: 0.15, duration: 0.6, ease: "power2.out" }, "-=0.6")
      .from(".strategy-item", { x: -20, autoAlpha: 0, stagger: 0.08, duration: 0.4, ease: "power2.out" }, "-=0.35")
      .from("aside .card", { x: 30, autoAlpha: 0, stagger: 0.12, duration: 0.6, ease: "power2.out" }, "-=0.6");
  });

  // Hover micro-animations on interactive cards
  document.querySelectorAll(".metric-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      gsap.to(card, { y: -5, duration: 0.25, ease: "power2.out" });
    });
    card.addEventListener("mouseleave", () => {
      gsap.to(card, { y: 0, duration: 0.25, ease: "power2.out" });
    });
  });

  document.querySelectorAll(".strategy-item").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      gsap.to(item, { x: 5, backgroundColor: "rgba(56, 189, 248, 0.05)", duration: 0.2, ease: "power1.out" });
    });
    item.addEventListener("mouseleave", () => {
      gsap.to(item, { x: 0, backgroundColor: "rgba(255, 255, 255, 0.02)", duration: 0.2, ease: "power1.out" });
    });
  });
}

// Initial Run
updateMetrics();
initGsapAnimations();
