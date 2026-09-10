# Blend Protocol Asset Listing Proposal: hXLM (Hikari Liquid Staked XLM)

**Proposer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Protocol**: Hikari Protocol  
**Asset**: `hXLM` (SEP-41 Yield-Bearing Liquid Staking Token)  
**Contract Address**: `CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH`  
**Underlying Asset**: Native Stellar XLM (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`)  
**Date**: September 2026  

---

## 1. Executive Summary

This proposal requests the onboarding of **`hXLM`** as an accepted collateral asset within the **Blend Lending Market** on Stellar Soroban.

`hXLM` is the liquid staking token of Hikari Protocol. Holding `hXLM` continuously accrues yield compounded from Blend money markets, Phoenix concentrated liquidity fees, and Jito-style atomic MEV backruns. Adding `hXLM` as collateral enables stakers to access leverage, borrow stablecoins (`USDC`, `PYUSD`), and implement looping yield strategies without sacrificing staking rewards.

---

## 2. Token & Protocol Profile

| Property | Value | Notes |
|---|---|---|
| **Asset Name** | Hikari Liquid Staked XLM | Yield-bearing receipt token |
| **Token Symbol** | `hXLM` | Standardized SEP-41 Soroban token |
| **Decimals** | 7 | Matches native XLM stroop precision |
| **Current TVL** | 500,000+ XLM (Testnet) | Expanding through Points Program |
| **Target APY** | 6.94% – 12.40% | Compounded daily into share NAV |
| **Redemption Mechanism** | Dual: Instant (<15% TVL) & FIFO Queue | Preserves liquidity without bad debt |
| **Share Inflation Defense** | Virtual Asset & Share Offsets | ERC-4626 vault inflation immunity |

---

## 3. Proposed Blend Risk Parameters

Based on historical 365-day multi-regime backtests and volatility simulations, we propose the following risk configuration:

| Parameter | Recommended Value | Rationale |
|---|---|---|
| **Collateral Factor (LTV)** | **75%** | Conservative ceiling reflecting XLM correlation ($r > 0.98$). |
| **Liquidation Threshold** | **85%** | 10% buffer between max borrow and liquidation liquidation point. |
| **Liquidation Penalty** | **10%** | Incentivizes rapid liquidator participation while protecting borrowers. |
| **Supply Cap** | **5,000,000 hXLM** | Initial phase cap, expandable via governance vote. |
| **Borrow Cap** | **0 hXLM (Collateral-Only)** | Phase 1 restricts borrowing to prevent shorting attacks on liquid shares. |
| **Reserve Factor** | **15%** | Aligns with Blend standard interest rate model. |

---

## 4. Oracle Pricing Architecture

To ensure manipulation-resistant pricing on Blend, `hXLM` must be valued using an **Exchange-Rate NAV Oracle**, not raw DEX spot prices:

$$\text{Price}(hXLM) = \text{Price}(XLM) \times \frac{A_{total} + 1}{S_{total} + 1000}$$

1. **Primary Feed**:
   - XLM price sourced from the standard Blend Pyth / Band oracles.
   - Exchange rate read directly from the verified Hikari Vault contract `CCR6...KT5` (`total_assets()` / `total_shares()`).
2. **Manipulation Immunity**:
   - Because NAV is calculated from internal vault reserves and verified adapter values, flash loan spot manipulations on Soroswap or Phoenix have zero impact on the liquidation price.
3. **Bunker Mode Protection**:
   - If a market emergency triggers Bunker Mode, the contract applies a deterministic haircut $H_{bps}$. The oracle reflects this adjusted liquidation value immediately.

---

## 5. Risk Analysis & Safety Architecture

### A. Liquidity & De-pegging Risk
- **15% Liquid Reserve Floor**: Hikari maintains at least 15% of all vault assets in unencumbered idle XLM. Liquidators can redeem directly through the vault without waiting for unbonding queues.
- **Secondary Market Pairs**: Dedicated `hXLM/XLM` pools on Soroswap and Phoenix ensure tight 5 bps spreads for emergency market exits.

### B. Smart Contract Risk
- **Formal Invariants**: Share pricing, non-decreasing NAV, and reserve floors verified across 10,000 property-based fuzz test iterations.
- **Audit Package**: Comprehensive audit dossier prepared for Zellic / Trail of Bits review ([`docs/AUDIT_READINESS.md`](file:///C:/Users/User/.gemini/antigravity-ide/scratch/Hikari/docs/AUDIT_READINESS.md)).
- **GateSeal Pause**: Multi-sig emergency containment can freeze allocations for 10,000 ledgers without freezing redemptions.

---

## 6. Integration Roadmap

1. **Stage 1 (Testnet)**: Deploy `hXLM` testnet pool adapter on Blend Testnet market.
2. **Stage 2 (Simulation)**: Verify liquidation bots can liquidate `hXLM` collateral cleanly under simulated 20% XLM drops.
3. **Stage 3 (Mainnet Deployment)**: Enable `hXLM` collateral with initial 5,000,000 cap and co-incentivized yield pools.

---

## 7. Proposer Commitment

Hikari Protocol commits to seeding \$50,000 in initial protocol-owned liquidity for the `hXLM/XLM` market pair to ensure deep liquidator coverage on day one of Blend listing.
