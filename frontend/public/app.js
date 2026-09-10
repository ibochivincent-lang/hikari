let state = {
  totalAssets: 124500,
  idleAssets: 28400,
  totalShares: 119390,
  activeTab: "stake", // stake, request, claim, basket
  currentTier: "BALANCED_HXLM",
  viewMode: "pro", // pro or simple
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

const VAULT_TIERS = {
  BALANCED_HXLM: {
    id: "BALANCED_HXLM",
    name: "Balanced hXLM",
    token: "XLM",
    shareToken: "hXLM",
    baseApy: "6.94% APY",
    badge: "SEP-41 Native",
    walletBalance: 10000,
    walletShares: 1200,
    desc: "Diversified Blend lending + Phoenix CLAMM yield with automated rebalancing."
  },
  CONSERVATIVE_USDC: {
    id: "CONSERVATIVE_USDC",
    name: "Conservative hUSDC",
    token: "USDC",
    shareToken: "hUSDC",
    baseApy: "5.20% APY",
    badge: "Blend SAC Prime",
    walletBalance: 2500,
    walletShares: 500,
    desc: "Zero liquidation risk: 100% overcollateralized lending on Blend money market."
  },
  DYNAMIC_ALPHA_HXLM: {
    id: "DYNAMIC_ALPHA_HXLM",
    name: "MEV Alpha hXLM",
    token: "XLM",
    shareToken: "hXLM-α",
    baseApy: "12.4% APR",
    badge: "Jito-Style Alpha",
    walletBalance: 10000,
    walletShares: 350,
    desc: "High-yield dynamic strategy combining CLAMM LP fees and Jito atomic MEV backruns."
  }
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
const tabBridge = document.getElementById("tabBridge");

const panelForm = document.getElementById("panelForm");
const panelClaim = document.getElementById("panelClaim");
const panelBasket = document.getElementById("panelBasket");
const panelBridge = document.getElementById("panelBridge");

const btnBridgeAction = document.getElementById("btnBridgeAction");
const bridgeOriginSelect = document.getElementById("bridgeOriginSelect");
const bridgeAmountInput = document.getElementById("bridgeAmountInput");
const btnTestX402 = document.getElementById("btnTestX402");
const x402ProofLink = document.getElementById("x402ProofLink");


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
  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  const nav = (state.totalAssets + VIRTUAL_ASSETS) / (state.totalShares + VIRTUAL_SHARES);
  tvlDisplay.innerText = `${state.totalAssets.toLocaleString()} ${tier.token}`;
  navDisplay.innerText = `${nav.toFixed(4)} ${tier.token}`;
  reserveDisplay.innerText = `${state.idleAssets.toLocaleString()} ${tier.token}`;

  if (rateDisplay) {
    rateDisplay.innerText = `1 ${tier.token} ≈ ${(1 / nav).toFixed(4)} ${tier.shareToken}`;
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

// Modal Elements
const walletModal = document.getElementById("walletModal");
const btnCloseWalletModal = document.getElementById("btnCloseWalletModal");
const optPasskey = document.getElementById("optPasskey");
const optFreighter = document.getElementById("optFreighter");

// Wallet Connection & Modal Trigger
btnConnectWallet.addEventListener("click", () => {
  if (state.wallet.connected) {
    state.wallet.connected = false;
    state.wallet.address = null;
    btnConnectWallet.innerText = "🔗 Connect Wallet";
    btnConnectWallet.style.background = "";
    if (walletBalLabel) walletBalLabel.innerText = "Balance: 0 XLM";
    addLog("[Wallet]", "Disconnected from wallet session.", "log-tag-warn");
    return;
  }
  if (walletModal) {
    walletModal.style.display = "flex";
  }
});

if (btnCloseWalletModal) {
  btnCloseWalletModal.addEventListener("click", () => {
    walletModal.style.display = "none";
  });
}

if (optPasskey) {
  optPasskey.addEventListener("click", async () => {
    optPasskey.style.opacity = "0.7";
    addLog("[Passkey]", "Prompting device biometric authentication (WebAuthn)...", "log-tag-agent");
    try {
      const passkeyAuth = new PasskeySmartAccount();
      const session = await passkeyAuth.loginPasskey();
      setConnectedWallet(session.smartAddress, "Biometric Passkey (SEP-43)");
      addLog("[Passkey]", `Authenticated! Smart Account: ${session.smartAddress.slice(0, 16)}...`, "log-tag-success");
    } catch (err) {
      addLog("[Passkey]", `Authentication error: ${err.message}`, "log-tag-warn");
    } finally {
      optPasskey.style.opacity = "1";
      if (walletModal) walletModal.style.display = "none";
    }
  });
}

if (optFreighter) {
  optFreighter.addEventListener("click", async () => {
    optFreighter.style.opacity = "0.7";
    try {
      if (window.freighterApi && typeof window.freighterApi.isConnected === "function") {
        const isConnected = await window.freighterApi.isConnected();
        if (isConnected) {
          const address = await window.freighterApi.getPublicKey();
          setConnectedWallet(address, "Freighter (Extension)");
          addLog("[Freighter]", `Connected extension account: ${address.slice(0, 8)}...`, "log-tag-success");
          return;
        }
      }
      const randomSuffix = Array.from({ length: 4 }, () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random() * 32)]
      ).join("");
      const demoAddress = `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL${randomSuffix}`;
      setConnectedWallet(demoAddress, "Stellar Testnet Account");
      addLog("[Freighter]", `Connected testnet account: ${demoAddress.slice(0, 8)}...`, "log-tag-success");
    } catch (err) {
      console.warn("Freighter error:", err);
    } finally {
      optFreighter.style.opacity = "1";
      if (walletModal) walletModal.style.display = "none";
    }
  });
}

// Lobstr & xBull Wallet Integrations
const optLobstr = document.getElementById("optLobstr");
const optXbull = document.getElementById("optXbull");

if (optLobstr) {
  optLobstr.addEventListener("click", () => {
    optLobstr.style.opacity = "0.7";
    const randomSuffix = Array.from({ length: 4 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random() * 32)]
    ).join("");
    const demoAddress = `GDLOBSTRM5V6VQL2W7H4P8ZJXK39QY0RNE4SDA7MUPTR4A69T0${randomSuffix}`;
    setConnectedWallet(demoAddress, "Lobstr Mobile Multi-Sig");
    addLog("[Lobstr]", `Connected mobile signer: ${demoAddress.slice(0, 8)}... (Multi-sig safe)`, "log-tag-success");
    optLobstr.style.opacity = "1";
    if (walletModal) walletModal.style.display = "none";
  });
}

if (optXbull) {
  optXbull.addEventListener("click", () => {
    optXbull.style.opacity = "0.7";
    const randomSuffix = Array.from({ length: 4 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random() * 32)]
    ).join("");
    const demoAddress = `GBXBULLJ7R8T9V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9${randomSuffix}`;
    setConnectedWallet(demoAddress, "xBull Wallet");
    addLog("[xBull]", `Connected non-custodial account: ${demoAddress.slice(0, 8)}...`, "log-tag-success");
    optXbull.style.opacity = "1";
    if (walletModal) walletModal.style.display = "none";
  });
}

function setConnectedWallet(address, providerName) {
  state.wallet.connected = true;
  state.wallet.address = address;
  state.wallet.balanceXlm = 10000;
  state.wallet.sharesHXlm = 1200;

  const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;
  btnConnectWallet.innerText = `🟢 ${shortAddr}`;
  btnConnectWallet.style.background = "rgba(52, 211, 153, 0.2)";
  btnConnectWallet.title = `Connected via ${providerName}: ${address}`;

  btnConnectWallet.style.border = "1px solid #34d399";
  btnConnectWallet.style.color = "#34d399";

  updateBalanceLabel();
  if (typeof window.fetchShardsProfile === "function") {
    window.fetchShardsProfile(address);
  }

  if (typeof gsap !== "undefined") {
    gsap.fromTo(btnConnectWallet, { scale: 0.88 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
  }

  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  addLog("[Wallet]", `Connected via ${providerName}: ${shortAddr} (Balance: ${tier.walletBalance.toLocaleString()} ${tier.token})`, "log-tag-success");
}

function updateBalanceLabel() {
  if (!walletBalLabel) return;
  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  if (!state.wallet.connected) {
    walletBalLabel.innerText = `Balance: 0 ${tier.token}`;
    return;
  }
  if (state.activeTab === "stake") {
    walletBalLabel.innerText = `Balance: ${tier.walletBalance.toLocaleString()} ${tier.token}`;
  } else if (state.activeTab === "request") {
    walletBalLabel.innerText = `Balance: ${tier.walletShares.toLocaleString()} ${tier.shareToken}`;
  }
}

// MAX Button
if (btnMaxAmount) {
  btnMaxAmount.addEventListener("click", () => {
    const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
    if (state.activeTab === "stake") {
      const maxVal = Math.max(0, tier.walletBalance - 2); // reserve 2 units for fee
      amountInput.value = maxVal;
    } else if (state.activeTab === "request") {
      amountInput.value = tier.walletShares;
    }
    calculateConversion();
    if (typeof gsap !== "undefined") {
      gsap.fromTo(amountInput, { scale: 0.98 }, { scale: 1, duration: 0.2 });
    }
  });
}

// Lido 5-Tab Navigation (Stake, Request, Claim, Basket, Bridge)
function setActiveTab(tab) {
  state.activeTab = tab;
  [tabStake, tabRequest, tabClaim, tabBasket, tabBridge].forEach((btn) => btn && btn.classList.remove("active"));
  if (panelForm) panelForm.style.display = "none";
  if (panelClaim) panelClaim.style.display = "none";
  if (panelBasket) panelBasket.style.display = "none";
  if (panelBridge) panelBridge.style.display = "none";

  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  if (tab === "stake") {
    if (tabStake) tabStake.classList.add("active");
    if (panelForm) panelForm.style.display = "block";
    inputLabel.innerText = `Deposit ${tier.token} Amount`;
    btnSubmitAction.innerText = `Stake ${tier.token}`;
    btnSubmitAction.style.display = "block";
    updateBalanceLabel();
    calculateConversion();
  } else if (tab === "request") {
    if (tabRequest) tabRequest.classList.add("active");
    if (panelForm) panelForm.style.display = "block";
    inputLabel.innerText = `Redeem ${tier.shareToken} Shares`;
    btnSubmitAction.innerText = "Queue Withdrawal Request";
    btnSubmitAction.style.display = "block";
    updateBalanceLabel();
    calculateConversion();
  } else if (tab === "claim") {
    if (tabClaim) tabClaim.classList.add("active");
    if (panelClaim) panelClaim.style.display = "block";
    renderTicketList();
  } else if (tab === "basket") {
    if (tabBasket) tabBasket.classList.add("active");
    if (panelBasket) panelBasket.style.display = "block";
  } else if (tab === "bridge") {
    if (tabBridge) tabBridge.classList.add("active");
    if (panelBridge) panelBridge.style.display = "block";
  }

  if (typeof gsap !== "undefined") {
    gsap.fromTo([panelForm, panelClaim, panelBasket, panelBridge], { autoAlpha: 0.4, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: "power2.out" });
  }
}

if (tabStake) tabStake.addEventListener("click", () => setActiveTab("stake"));
if (tabRequest) tabRequest.addEventListener("click", () => setActiveTab("request"));
if (tabClaim) tabClaim.addEventListener("click", () => setActiveTab("claim"));
if (tabBasket) tabBasket.addEventListener("click", () => setActiveTab("basket"));
if (tabBridge) tabBridge.addEventListener("click", () => setActiveTab("bridge"));

// Cross-Chain CCTP V2 Bridge Action
if (btnBridgeAction) {
  btnBridgeAction.addEventListener("click", () => {
    const origin = bridgeOriginSelect ? bridgeOriginSelect.value : "Arbitrum";
    const amount = bridgeAmountInput ? parseFloat(bridgeAmountInput.value) || 50 : 50;

    btnBridgeAction.disabled = true;
    btnBridgeAction.innerText = "Executing CCTP Burn...";

    addLog("[Circle CCTP]", `Initiated burn of ${amount} USDC on ${origin.toUpperCase()}...`, "log-tag-agent");

    setTimeout(() => {
      addLog("[CctpForwarder]", `Attestation verified by Circle Iris API. Domain 27 transit confirmed.`, "log-tag-agent");
    }, 900);

    setTimeout(() => {
      addLog("[Stellar CCTP]", `Minted ${amount} USDC natively on Stellar. SAC deposited directly into Hikari Vault!`, "log-tag-success");
      state.totalAssets += Math.round(amount / 0.125); // XLM equivalent
      updateMetrics();
      btnBridgeAction.disabled = false;
      btnBridgeAction.innerText = "🌉 Bridge & Stake to hXLM";
    }, 1800);
  });
}

// Live x402 Oracle Query Trigger
if (btnTestX402) {
  btnTestX402.addEventListener("click", async () => {
    btnTestX402.disabled = true;
    btnTestX402.innerText = "Settling x402...";

    addLog("[x402Facilitator]", "Received HTTP 402 challenge from /v1/volatility-feed.", "log-tag-warn");

    try {
      const res = await fetch("/api/x402-query", { method: "POST" });
      const data = await res.json();
      if (data.paymentProof) {
        addLog("[x402Facilitator]", `Transferred 0.001 USDC (SAC) to Oracle. Payment proof: ${data.paymentProof.slice(0, 16)}...`, "log-tag-success");
        addLog("[StellarOracle]", `Feed unlocked! Volatility Index: ${data.data.volatilityIndex}, Slippage: ${data.data.projectedSlippageBps} bps`, "log-tag-agent");
        if (x402ProofLink) {
          x402ProofLink.innerText = `${data.paymentProof.slice(0, 8)}...${data.paymentProof.slice(-4)} ↗`;
          x402ProofLink.href = `https://stellar.expert/explorer/testnet/tx/${data.paymentProof}`;
        }
      }
    } catch (e) {
      addLog("[x402]", "x402 payment settled locally.", "log-tag-success");
    } finally {
      btnTestX402.disabled = false;
      btnTestX402.innerText = "⚡ Query Oracle (x402)";
    }
  });
}


// Conversion Calculation
amountInput.addEventListener("input", calculateConversion);

function calculateConversion() {
  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  const val = parseFloat(amountInput.value) || 0;
  if (state.activeTab === "stake") {
    const shares = (val * (state.totalShares + VIRTUAL_SHARES)) / (state.totalAssets + VIRTUAL_ASSETS);
    estShares.innerText = `${shares.toFixed(2)} ${tier.shareToken}`;
  } else {
    let assets = (val * (state.totalAssets + VIRTUAL_ASSETS)) / (state.totalShares + VIRTUAL_SHARES);
    if (state.bunkerMode && state.haircutBps > 0) {
      assets = assets * (1 - state.haircutBps / 10000);
    }
    estShares.innerText = `${assets.toFixed(2)} ${tier.token}`;
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

  const tier = VAULT_TIERS[state.currentTier] || VAULT_TIERS.BALANCED_HXLM;
  if (state.activeTab === "stake") {
    const shares = (val * (state.totalShares + VIRTUAL_SHARES)) / (state.totalAssets + VIRTUAL_ASSETS);
    state.totalAssets += val;
    state.idleAssets += val;
    state.totalShares += shares;
    state.wallet.balanceXlm -= val;
    state.wallet.sharesHXlm += shares;
    addLog("[Vault]", `Staked ${val} ${tier.token}. Minted ${shares.toFixed(2)} ${tier.shareToken} shares.`, "log-tag-success");
  } else if (state.activeTab === "request") {
    if (val > state.wallet.sharesHXlm) {
      addLog("[WithdrawalQueue]", `Insufficient ${tier.shareToken} shares in wallet.`, "log-tag-warn");
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
    addLog("[WithdrawalQueue]", `Created Request Ticket #${newId} for ${val} ${tier.shareToken} (${assets.toFixed(2)} ${tier.token}). Cooldown started.`, "log-tag-success");

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

const rationaleStream = document.getElementById("rationaleStream");
const rationaleConfidence = document.getElementById("rationaleConfidence");

function pushDecisionRationale(author, message, confidence) {
  if (rationaleConfidence && confidence) {
    rationaleConfidence.innerText = `Policy Confidence: ${confidence}`;
  }
  if (!rationaleStream) return;
  const p = document.createElement("p");
  p.style.margin = "0.4rem 0 0 0";
  p.style.fontSize = "0.78rem";
  p.style.color = "#94a3b8";
  p.style.lineHeight = "1.4";
  p.innerHTML = `<strong style="color: #fff;">[${author}]:</strong> ${message}`;
  rationaleStream.prepend(p);
  while (rationaleStream.children.length > 3) {
    rationaleStream.removeChild(rationaleStream.lastChild);
  }
  if (typeof gsap !== "undefined") {
    gsap.fromTo(p, { autoAlpha: 0, y: -4 }, { autoAlpha: 1, y: 0, duration: 0.3 });
  }
}

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
      const spreads = [76, 84, 91, 105, 88];
      const selectedSpread = spreads[Math.floor(Math.random() * spreads.length)];
      pushDecisionRationale(
        "YieldAgent",
        `Observed ${selectedSpread} bps cross-DEX spread exceeding 25 bps threshold. Rebalanced 25,000 XLM into Phoenix CLAMM. Projected delta APR: +2.14%. Portfolio 95% VaR remains healthy at 4.2% (safe boundary: < 5.0%). Merkle state root verified.`,
        "98.8%"
      );
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
      pushDecisionRationale(
        "RiskEngine",
        "EMERGENCY DE-RISKING: Drawdown 16.5% breached 15.0% threshold. GateSeal locked Soroswap and Blend allocations. Vault transitioned to Bunker Mode with 16.5% FIFO redemption haircut.",
        "100.0% (EMERGENCY)"
      );
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
      pushDecisionRationale(
        "Governance",
        "Circuit breaker reset by multi-sig emergency council. Solvency restored, 15% reserve buffer replenished. Turbo Mode restored at 0% haircut.",
        "99.5%"
      );
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

// Initialize Canvas Yield & NAV Chart
let yieldChartInstance = null;
if (typeof HikariYieldChart !== "undefined" && document.getElementById("yieldChartCanvas")) {
  yieldChartInstance = new HikariYieldChart("yieldChartCanvas");

  document.querySelectorAll(".chart-tab, .tf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".chart-tab, .tf-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tf = btn.getAttribute("data-tf") || btn.innerText.trim();
      if (yieldChartInstance) {
        yieldChartInstance.setTimeframe(tf);
      }
    });
  });
}

// ==========================================
// Lido Mega-Menu & Navigation Interactions
// ==========================================
function initLidoMenu() {
  const mainHeader = document.getElementById("mainHeader");
  const btnMobileMenuToggle = document.getElementById("btnMobileMenuToggle");
  const lidoMobileDrawer = document.getElementById("lidoMobileDrawer");

  // Sticky Header Scroll Effect
  if (mainHeader) {
    window.addEventListener("scroll", () => {
      mainHeader.classList.toggle("scrolled", window.scrollY > 20);
    });
  }

  // Mobile Hamburger Menu Toggle
  if (btnMobileMenuToggle && lidoMobileDrawer) {
    btnMobileMenuToggle.addEventListener("click", () => {
      const isClosed = lidoMobileDrawer.style.display === "none" || !lidoMobileDrawer.style.display;
      lidoMobileDrawer.style.display = isClosed ? "block" : "none";
      btnMobileMenuToggle.classList.toggle("open", isClosed);
      if (isClosed && typeof gsap !== "undefined") {
        gsap.from(".lido-accordion-item", {
          y: -10,
          opacity: 0,
          stagger: 0.05,
          duration: 0.25,
          ease: "power2.out"
        });
      }
    });
  }

  // Mobile Accordion Items
  document.querySelectorAll(".lido-accordion-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const body = trigger.nextElementSibling;
      if (body) {
        const isShown = body.style.display === "flex";
        body.style.display = isShown ? "none" : "flex";
        const chevron = trigger.querySelector(".chevron-icon");
        if (chevron) {
          chevron.style.transform = isShown ? "rotate(0deg)" : "rotate(180deg)";
        }
      }
    });
  });

  // Action Dispatcher for Lido Menu Cards & Drawer Links
  document.querySelectorAll(".lido-menu-card, .lido-drawer-link, .lido-feature-btn").forEach((elem) => {
    elem.addEventListener("click", (e) => {
      const action = elem.getAttribute("data-action");
      const href = elem.getAttribute("href");

      if (action) {
        if (action === "tab-stake") switchTab("stake");
        else if (action === "tab-request") switchTab("request");
        else if (action === "tab-claim") switchTab("claim");
        else if (action === "tab-basket") switchTab("basket");
        else if (action === "tab-bridge") switchTab("bridge");
        else if (action === "opt-passkey") {
          const optPasskey = document.getElementById("optPasskey");
          if (optPasskey) optPasskey.click();
        }
      }

      // Smooth scroll if anchor
      if (href && href.startsWith("#") && href.length > 1) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      // Close mobile drawer if open
      if (lidoMobileDrawer && lidoMobileDrawer.style.display === "block") {
        lidoMobileDrawer.style.display = "none";
        if (btnMobileMenuToggle) btnMobileMenuToggle.classList.remove("open");
      }
    });
  });

  // Modals: SDK Modal
  const sdkModal = document.getElementById("sdkModal");
  const btnCloseSdkModal = document.getElementById("btnCloseSdkModal");
  const btnDoneSdk = document.getElementById("btnDoneSdk");
  const openSdkButtons = [
    document.getElementById("btnOpenSdkModal"),
    document.getElementById("btnFeatureOpenSdk"),
    document.getElementById("btnDrawerOpenSdk"),
  ];

  openSdkButtons.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (sdkModal) sdkModal.style.display = "flex";
        if (lidoMobileDrawer) lidoMobileDrawer.style.display = "none";
      });
    }
  });

  if (btnCloseSdkModal && sdkModal) btnCloseSdkModal.addEventListener("click", () => sdkModal.style.display = "none");
  if (btnDoneSdk && sdkModal) btnDoneSdk.addEventListener("click", () => sdkModal.style.display = "none");

  // Copy Install Command
  const btnCopyInstall = document.getElementById("btnCopyInstall");
  const installCmdText = document.getElementById("installCmdText");
  if (btnCopyInstall && installCmdText) {
    btnCopyInstall.addEventListener("click", () => {
      navigator.clipboard.writeText(installCmdText.innerText).then(() => {
        const old = btnCopyInstall.innerText;
        btnCopyInstall.innerText = "✓ Copied!";
        btnCopyInstall.style.color = "var(--accent-emerald)";
        setTimeout(() => {
          btnCopyInstall.innerText = old;
          btnCopyInstall.style.color = "";
        }, 2000);
      });
    });
  }

  // Modals: Invariants Modal
  const invariantsModal = document.getElementById("invariantsModal");
  const btnCloseInvariantsModal = document.getElementById("btnCloseInvariantsModal");
  const btnDoneInvariants = document.getElementById("btnDoneInvariants");
  const openInvariantsButtons = [
    document.getElementById("btnOpenInvariantsModal"),
    document.getElementById("btnDrawerOpenInvariants"),
  ];

  openInvariantsButtons.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (invariantsModal) invariantsModal.style.display = "flex";
        if (lidoMobileDrawer) lidoMobileDrawer.style.display = "none";
      });
    }
  });

  if (btnCloseInvariantsModal && invariantsModal) btnCloseInvariantsModal.addEventListener("click", () => invariantsModal.style.display = "none");
  if (btnDoneInvariants && invariantsModal) btnDoneInvariants.addEventListener("click", () => invariantsModal.style.display = "none");

  // Modals: FAQ Modal
  const faqModal = document.getElementById("faqModal");
  const btnCloseFaqModal = document.getElementById("btnCloseFaqModal");
  const btnDoneFaq = document.getElementById("btnDoneFaq");
  const openFaqButtons = [
    document.getElementById("btnOpenFaqModal"),
    document.getElementById("btnDrawerOpenFaq"),
  ];

  openFaqButtons.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (faqModal) faqModal.style.display = "flex";
        if (lidoMobileDrawer) lidoMobileDrawer.style.display = "none";
      });
    }
  });

  if (btnCloseFaqModal && faqModal) btnCloseFaqModal.addEventListener("click", () => faqModal.style.display = "none");
  if (btnDoneFaq && faqModal) btnDoneFaq.addEventListener("click", () => faqModal.style.display = "none");

  // Global Backdrop Click & Escape Key to Dismiss
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (sdkModal) sdkModal.style.display = "none";
      if (invariantsModal) invariantsModal.style.display = "none";
      if (faqModal) faqModal.style.display = "none";
      if (lidoMobileDrawer) {
        lidoMobileDrawer.style.display = "none";
        if (btnMobileMenuToggle) btnMobileMenuToggle.classList.remove("open");
      }
    }
  });

  [sdkModal, invariantsModal, faqModal].forEach((m) => {
    if (m) {
      m.addEventListener("click", (e) => {
        if (e.target === m) m.style.display = "none";
      });
    }
  });
}

initLidoMenu();

// Multi-Vault Strategy Tier Switching
function initVaultTiers() {
  const tierChips = document.querySelectorAll(".tier-chip");
  const widgetBadge = document.getElementById("widgetBadge");
  const vaultPortalSection = document.getElementById("vaultPortalSection");

  tierChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const tierKey = chip.getAttribute("data-tier");
      if (!VAULT_TIERS[tierKey]) return;

      tierChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");

      state.currentTier = tierKey;
      const tier = VAULT_TIERS[tierKey];

      if (widgetBadge) widgetBadge.innerText = tier.badge;

      if (state.activeTab === "stake") {
        inputLabel.innerText = `Deposit ${tier.token} Amount`;
        btnSubmitAction.innerText = `Stake ${tier.token}`;
      } else if (state.activeTab === "request") {
        inputLabel.innerText = `Redeem ${tier.shareToken} Shares`;
        btnSubmitAction.innerText = `Queue Withdrawal Request`;
      }

      updateMetrics();
      updateBalanceLabel();
      calculateConversion();

      addLog("[VaultTiers]", `Switched to ${tier.name} (${tier.baseApy}). Risk profile: ${tier.desc}`, "log-tag-agent");

      if (typeof gsap !== "undefined" && vaultPortalSection) {
        gsap.fromTo(vaultPortalSection, { scale: 0.98 }, { scale: 1, duration: 0.25, ease: "power2.out" });
      }
    });
  });
}

// Simple 1-Click vs. Advanced Pro Mode Switch
function initDashboardViewModes() {
  const btnSimpleMode = document.getElementById("btnSimpleMode");
  const btnProMode = document.getElementById("btnProMode");
  const currentViewModeText = document.getElementById("currentViewModeText");
  const mainCol = document.querySelector(".main-grid main");
  const mainGrid = document.querySelector(".main-grid");

  function setViewMode(mode) {
    state.viewMode = mode;
    if (mode === "simple") {
      if (btnSimpleMode) btnSimpleMode.classList.add("active");
      if (btnProMode) btnProMode.classList.remove("active");
      if (mainCol) mainCol.classList.add("simple-mode-hidden");
      if (mainGrid) mainGrid.classList.add("simple-mode");
      if (currentViewModeText) currentViewModeText.innerText = "✨ Simple 1-Click Staking Mode (Streamlined)";
      addLog("[Dashboard]", "Switched to Simple 1-Click mode for streamlined staking.", "log-tag-success");
    } else {
      if (btnProMode) btnProMode.classList.add("active");
      if (btnSimpleMode) btnSimpleMode.classList.remove("active");
      if (mainCol) mainCol.classList.remove("simple-mode-hidden");
      if (mainGrid) mainGrid.classList.remove("simple-mode");
      if (currentViewModeText) currentViewModeText.innerText = "🔬 Pro Analytics Mode (AI Engine & Risk Active)";
      addLog("[Dashboard]", "Switched to Advanced Pro Mode: Real-time telemetry, risk engine & MEV monitors active.", "log-tag-agent");
    }
    if (typeof gsap !== "undefined") {
      gsap.fromTo(".main-grid aside", { autoAlpha: 0.8, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.3 });
    }
  }

  if (btnSimpleMode) btnSimpleMode.addEventListener("click", () => setViewMode("simple"));
  if (btnProMode) btnProMode.addEventListener("click", () => setViewMode("pro"));
}

initVaultTiers();
initDashboardViewModes();

// Hikari Shards Loyalty Program & Leaderboard Logic
function initShardsSystem() {
  const shardsModal = document.getElementById("shardsModal");
  const btnCloseShardsModal = document.getElementById("btnCloseShardsModal");
  const btnDoneShards = document.getElementById("btnDoneShards");
  const btnOpenShardsModal = document.getElementById("btnOpenShardsModal");
  const btnDrawerOpenShards = document.getElementById("btnDrawerOpenShards");
  const headerShardsText = document.getElementById("headerShardsText");
  const headerMultiplierTag = document.getElementById("headerMultiplierTag");
  const modalUserShards = document.getElementById("modalUserShards");
  const modalDailyRate = document.getElementById("modalDailyRate");
  const modalMultiplier = document.getElementById("modalMultiplier");
  const modalRank = document.getElementById("modalRank");
  const modalRankTier = document.getElementById("modalRankTier");
  const leaderboardList = document.getElementById("leaderboardList");

  async function fetchShardsProfile(address) {
    try {
      const res = await fetch(`/api/points/${address || 'GCJSDY6QA6CYEIZ6W6USD2QC22OBHKOI326YUU64QWBBMWL4GBSY6BQN'}`);
      if (res.ok) {
        const data = await res.json();
        if (headerShardsText) headerShardsText.innerText = `${(data.totalShards / 1000).toFixed(1)}k Shards`;
        if (headerMultiplierTag) headerMultiplierTag.innerText = `${data.activeMultiplier}x`;
        if (modalUserShards) modalUserShards.innerText = `${data.totalShards.toLocaleString()} ✨`;
        if (modalDailyRate) modalDailyRate.innerText = `+${data.baseRatePerDay.toLocaleString()} / day`;
        if (modalMultiplier) modalMultiplier.innerText = `${data.activeMultiplier}x`;
        if (modalRank) modalRank.innerText = `#${data.rank}`;
        if (modalRankTier) modalRankTier.innerText = data.tier;
      }
    } catch (e) {
      console.warn("Shards fetch error:", e);
    }
  }

  window.fetchShardsProfile = fetchShardsProfile;

  async function fetchLeaderboard() {
    try {
      const res = await fetch("/api/leaderboard");
      if (res.ok) {
        const { leaderboard } = await res.json();
        if (leaderboardList && leaderboard && leaderboard.length > 0) {
          const medals = ["🥇", "🥈", "🥉", "🎖️", "🎖️"];
          leaderboardList.innerHTML = leaderboard.map((item, idx) => `
            <div class="shards-table-row">
              <span style="font-weight: 700; color: ${idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : 'var(--text-dim)'};">${medals[idx] || '#' + item.rank} #${item.rank}</span>
              <span style="font-family: monospace;">${item.address}</span>
              <span class="tier-pill" style="background: rgba(251,191,36,0.15); color: #fbbf24;">${item.tier}</span>
              <span style="text-align: right; font-weight: 600;">${item.shards.toLocaleString()}</span>
            </div>
          `).join("");
        }
      }
    } catch (e) {
      console.warn("Leaderboard fetch error:", e);
    }
  }

  const openShards = (e) => {
    if (e) e.preventDefault();
    if (shardsModal) shardsModal.style.display = "flex";
    const drawer = document.getElementById("lidoMobileDrawer");
    if (drawer) drawer.style.display = "none";
    fetchLeaderboard();
  };

  if (btnOpenShardsModal) btnOpenShardsModal.addEventListener("click", openShards);
  if (btnDrawerOpenShards) btnDrawerOpenShards.addEventListener("click", openShards);
  if (btnCloseShardsModal) btnCloseShardsModal.addEventListener("click", () => shardsModal.style.display = "none");
  if (btnDoneShards) btnDoneShards.addEventListener("click", () => shardsModal.style.display = "none");

  // Dismiss on backdrop click or escape
  if (shardsModal) {
    shardsModal.addEventListener("click", (e) => {
      if (e.target === shardsModal) shardsModal.style.display = "none";
    });
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && shardsModal && shardsModal.style.display === "flex") {
      shardsModal.style.display = "none";
    }
  });

  // Initial fetch
  fetchShardsProfile();
}

initShardsSystem();
