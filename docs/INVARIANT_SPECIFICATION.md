# Hikari Protocol: Formal Invariant & Security Specification

**Author & Maintainer**: `ibochivincent-lang`  
**Git Identity**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Repository**: [https://github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari)

---

## 1. Mathematical Notation & Definitions

| Symbol | Definition | Stroop Units ($10^{-7}$) |
|---|---|---|
| $A_{total}$ | Total protocol assets held in Vault and strategy adapters | $1 \text{ XLM} = 10^7 \text{ stroops}$ |
| $A_{idle}$ | Liquid assets held unallocated directly in the Vault | stroops |
| $A_{alloc}$ | Assets deployed across approved Soroban strategy adapters | stroops |
| $S_{total}$ | Total circulating supply of `hXLM` (SEP-41) position shares | stroops |
| $V_A$ | Virtual asset offset ($V_A = 1\text{ stroop}$) | 1 |
| $V_S$ | Virtual share offset ($V_S = 1000\text{ stroops}$) | 1000 |
| $NAV$ | Net Asset Value per share ($\frac{\text{XLM}}{\text{hXLM}}$) | Unitless scalar |
| $NAV_{HWM}$ | Historical High-Water Mark NAV | Unitless scalar |
| $H_{bps}$ | Bunker Mode emergency haircut in basis points | $1\text{ bp} = 0.01\%$ |
| $L$ | Current Stellar ledger sequence number | Integer |
| $\Delta_{seal}$ | GateSeal pause duration in ledgers ($\approx 7 \text{ days}$) | $120,960\text{ ledgers}$ |

---

## 2. Formal Invariants & Proofs

### Invariant 1: Virtual Share Anti-Inflation Defense
$$\text{Shares}_{\text{minted}} = \frac{A_{\text{deposit}} \cdot (S_{\text{total}} + V_S)}{A_{\text{total}} + V_A}$$
$$\text{Assets}_{\text{redeemed}} = \frac{S_{\text{burned}} \cdot (A_{\text{total}} + V_A)}{S_{\text{total}} + V_S}$$

#### Proof against First-Depositor Dilution (ERC-4626 Attack Vector):
In classic share-accounting vaults, an attacker deposits $1\text{ stroop}$, receives $1\text{ share}$, and immediately donates $1,000,000\text{ XLM}$ directly to the vault contract. The next victim depositing $100\text{ XLM}$ receives $\lfloor 100 \cdot 1 / 1,000,000 \rfloor = 0\text{ shares}$, resulting in 100% loss of their funds.

Under Hikari's virtual offset:
1. When $S_{total} = 0$ and $A_{total} = 0$, an initial donation of $100,000\text{ XLM}$ without depositing shares sets:
   $$NAV = \frac{100,000 \cdot 10^7 + 1}{0 + 1000} = 1,000,000,001\text{ stroops/share}$$
2. The attacker would have to burn $1,000\text{ virtual shares}$ worth of donated capital which can never be redeemed.
3. Any subsequent deposit $A_{deposit}$ satisfies:
   $$\text{Shares}_{\text{minted}} \ge 1 \quad \forall A_{\text{deposit}} \ge 1\text{ XLM}$$
Hence, the economic cost to steal $1\text{ stroop}$ exceeds the attacker's capital by a factor of $>10^3$, rendering inflation attacks mathematically unprofitable. $\blacksquare$

---

### Invariant 2: Conservation of Liquid Reserves
$$A_{\text{idle}} \ge \rho \cdot A_{\text{total}}, \quad \rho = 0.15$$

#### Operational Rules:
1. **Rebalance Barrier**: The `PolicyVerifier` and smart account `PolicyAccount` reject any agent allocation that would reduce $A_{idle}$ below $15\%$ of $A_{total}$.
2. **Instant Redemption Buffer**: Small redemptions ($< 15\%$ of TVL) settle immediately against $A_{idle}$ without incurring strategy deallocation gas or slippage.
3. **Queue Fallback**: Redemptions exceeding liquid reserves route into the asynchronous **Withdrawal Queue**, ensuring capital is deallocated orderly. $\blacksquare$

---

### Invariant 3: High-Water Mark Non-Dilutive Fee Accrual
$$\text{PerformanceFee} > 0 \iff NAV_{current} > NAV_{HWM}$$
$$\Phi_{\text{perf}} = \gamma \cdot (NAV_{\text{current}} - NAV_{HWM}) \cdot S_{\text{total}}, \quad \gamma = 0.10$$

#### Proof of No Double-Charging:
1. At epoch $t_0$, protocol records $NAV_{HWM} = 1.0000$.
2. In a market downturn, $NAV$ drops to $0.9500$.
3. As strategy yields recover to $0.9900$, $NAV_{current} < NAV_{HWM}$; therefore $\Phi_{perf} = 0$.
4. Only when $NAV$ breaks above $1.0000$ to $1.0200$ is a $10\%$ fee assessed on the net $+0.0200$ surplus.
5. Post-assessment, $NAV_{HWM} \leftarrow 1.0200$. $\blacksquare$

---

### Invariant 4: Bunker Mode Equity Preservation
$$\text{Assets}_{\text{claimable}} = \frac{S_{\text{burned}} \cdot (A_{\text{total}} + V_A)}{S_{\text{total}} + V_S} \cdot \left(1 - \frac{H_{bps}}{10000}\right)$$

#### Proof against Bank-Run Depletion (Lido Bunker Mode):
1. Suppose protocol incurs bad debt or a $20\%$ collateral impairment ($A_{total}$ drops by $20\%$).
2. In a standard queue without haircuts, the first $80\%$ of redeemers receive $100\%$ of nominal value, leaving the remaining $20\%$ of depositors with $0\text{ XLM}$ (100% loss).
3. Under Hikari's Bunker Mode:
   - When drawdown exceeds $10\%$, $H_{bps}$ is activated (e.g. $1,650\text{ bps} = 16.5\%$).
   - All claims finalized during the crisis period receive $83.5\%$ of assets.
   - The remaining $16.5\%$ stays within the Vault pool, preserving proportional equity for all participants and eliminating the run-on-the-bank incentive. $\blacksquare$

---

### Invariant 5: GateSeal Circuit Breaker Timelock Boundaries
$$\text{is\_sealed}(L) = \begin{cases} 
\text{true} & \text{if } L_{\text{seal}} \le L < L_{\text{seal}} + \Delta_{\text{seal}} \\
\text{false} & \text{if } L \ge L_{\text{seal}} + \Delta_{\text{seal}} \text{ or never sealed}
\end{cases}$$

#### Security Guarantees:
1. **One-Time Emergency Freeze**: The GateSeal can only be tripped once per deployment ($L_{seal}$ cannot be overwritten).
2. **Automatic Self-Unseal**: If governance is unreachable or inactive, the contract unseals itself after $120,960\text{ ledgers}$ ($\approx 7\text{ days}$).
3. **Bounded Blast Radius**: GateSeal pauses only capital allocation out of the Vault into strategies; user deposits and withdrawal queue ticket cancellations remain operational. $\blacksquare$

---

## 3. Threat Model & Invariant Matrix

| Threat / Attack Vector | Mitigating Invariant | Enforced At |
|---|---|---|
| **First-Depositor Inflation Attack** | Invariant 1 (Virtual Offsets) | `contracts/vault/src/lib.rs` |
| **Bank-Run on Liquid Reserves** | Invariant 2 & Invariant 4 (Reserve Floor + Bunker Mode) | `contracts/withdrawal_queue/src/lib.rs` |
| **Strategy Collateral Insolvency** | Invariant 4 & Invariant 5 (Haircut + GateSeal) | `contracts/gate_seal/src/lib.rs` |
| **Agent Over-Allocation / Rogue Rebalance** | Invariant 2 & Deterministic Policy | `contracts/policy_account/src/lib.rs` & `engine/` |
| **Fee Extraction Dilution** | Invariant 3 (Strict High-Water Mark) | `contracts/fee_controller/src/lib.rs` |
