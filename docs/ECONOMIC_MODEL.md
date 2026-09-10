# Hikari Economic & Yield Model

Author: ibochivincent-lang
Project: Hikari (Stellar AI Liquid-Yield & Agentic Finance Protocol)

---

## 1. Non-Staking Yield Philosophy on Stellar

Stellar achieves consensus through the Stellar Consensus Protocol (SCP) and does **not** rely on Proof-of-Stake (PoS). Therefore, XLM cannot be "staked" to secure the network. 

Hikari generates real, auditable yield through capital allocation into:
1. **Collateralized Lending**: Supplying XLM/assets to vetted Soroban money markets (e.g., Blend Protocol) to earn variable borrower interest.
2. **Automated Market Making (AMM)**: Supplying liquidity pairs on Stellar DEX / Soroban AMMs (Soroswap, Phoenix) to capture trading fees.
3. **Real-World Asset (RWA) Treasuries**: Liquid short-term yield instruments tokenized on Stellar.

---

## 2. Vault Share Accounting & NAV

Hikari issues a fungible liquid position token (`hXLM` / `Hikari Shares`) representing a pro-rata claim on all vault-managed assets.

* **Base Units**: All financial calculations are done in Stroops ($1\text{ XLM} = 10{,}000{,}000\text{ stroops}$ / 7 decimal places).
* **Net Asset Value (NAV)**:
  $$\text{NAV per Share} = \frac{\text{Total Controlled Assets}}{\text{Total Shares Issued}}$$
  where:
  $$\text{Total Controlled Assets} = \text{Vault Idle Liquidity} + \sum_{i} \text{Strategy } i \text{ Value}$$

### Deposit Math
$$\text{Shares Minted} = \frac{\text{Amount Deposited} \times (\text{Total Shares} + \text{Virtual Shares})}{\text{Total Controlled Assets} + \text{Virtual Assets}}$$
* Initial Virtual Shares = $1{,}000$
* Initial Virtual Assets = $1$

### Redemption Math
$$\text{Assets Returned} = \frac{\text{Shares Redeemed} \times (\text{Total Controlled Assets} + \text{Virtual Assets})}{\text{Total Shares} + \text{Virtual Shares}}$$

---

## 3. Protocol Fee Structure & Allocations

* **Deposit Fee**: 0%
* **Withdrawal Fee**: 0.1% (allocated 50% to remaining share holders to discourage churn, 50% to Protocol Treasury).
* **Management Fee**: 0.5% annualized (accrued per ledger).
* **Performance Fee**: 10% on generated strategy yield, gated by a High-Water Mark (HWM).
* **x402 / MPP Operating Budget**: 0.05% of vault annual yield capped at a monthly allowance for agent intelligence and oracle subscriptions.

---

## 4. Loss & Bad Debt Handling

If a strategy suffers an adverse event:
1. **First-Loss Capital**: Protocol treasury reserve acts as first-loss buffer up to 20% of treasury size.
2. **Socialized Haircut**: Residual losses proportionally adjust total controlled assets, decreasing the NAV per share transparently without bank-run incentives.
