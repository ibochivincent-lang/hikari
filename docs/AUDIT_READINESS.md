# Hikari Protocol: Smart Contract Audit Readiness Package

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Protocol Repository**: [https://github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari)  
**Target Blockchain**: Stellar (Soroban Smart Contracts, Protocol 27)  
**Audit Target Firms**: Zellic, Trail of Bits, OtterSec, Certora  

---

## 1. Executive Summary & Architecture Scope

Hikari is an autonomous, non-custodial liquid-yield and agentic finance protocol natively deployed on Stellar Soroban. It pools user deposits, mints yield-bearing `hXLM` shares (SEP-41 compliant), and dynamically balances capital across approved DeFi strategies (Blend Protocol lending, Phoenix CLAMM, and Soroswap AMM) with deterministic on-chain policy constraints and Jito-style MEV backrun capture.

### Core Smart Contract Scope

| Contract Name | Rust Path | Description | Key Functions |
|---|---|---|---|
| **Hikari Vault** | `contracts/vault/src/lib.rs` | Central capital pool, virtual share accounting, asynchronous withdrawal queue | `deposit`, `request_withdrawal`, `claim_batch`, `rebalance`, `harvest` |
| **hXLM Share Token** | `contracts/token/src/lib.rs` | SEP-41 compliant fungible share token with virtual offsets | `mint`, `burn`, `balance`, `transfer`, `clawback` |
| **Strategy Registry** | `contracts/strategy_registry/src/lib.rs` | Whitelist registry with per-strategy TVL caps and rate-limits | `register_strategy`, `update_cap`, `pause_strategy`, `is_approved` |
| **Policy Account** | `contracts/policy_account/src/lib.rs` | 3-of-5 threshold multisig custom smart account enforcing policy checks | `__check_auth`, `propose_policy`, `execute_policy` |
| **GateSeal Circuit Breaker** | `contracts/gateseal/src/lib.rs` | One-shot emergency panic button with 7-day auto-expiring pause | `seal_now`, `unseal`, `is_sealed` |
| **Blend Adapter** | `contracts/adapter_blend/src/lib.rs` | Integration adapter for Blend collateralized lending pools | `supply`, `withdraw`, `get_apy`, `emergency_exit` |
| **Phoenix CLAMM Adapter** | `contracts/adapter_phoenix/src/lib.rs` | Integration adapter for Phoenix concentrated liquidity pools | `deposit_range`, `collect_fees`, `emergency_exit` |

---

## 2. Invariants & Mathematical Guarantees

Auditors should formally verify the following invariants:

### Invariant 1: Virtual Share Anti-Inflation Protection
$$\text{Shares} = \frac{\text{Assets} \times (\text{TotalShares} + 1000)}{\text{TotalAssets} + 1}$$
- **Proof Goal**: For any arbitrary sequence of deposits, transfers, and direct asset donations, an attacker depositing $1\text{ stroop}$ cannot dilute subsequent depositors or cause share truncation to zero.

### Invariant 2: Conservation of Liquid Reserve Buffer
$$A_{\text{idle}} \ge \beta \cdot A_{\text{total}}, \quad \text{where } \beta \ge 0.15$$
- **Proof Goal**: At least 15% of total protocol capital remains liquid in the vault reserve buffer at all times to satisfy immediate Turbo Mode redemptions without forcing fire-sale liquidations.

### Invariant 3: High-Water Mark Non-Dilutive Fee Accrual
$$\Phi_{\text{perf}} = \gamma \cdot \max(0, \text{NAV}_t - \text{NAV}_{\text{HWM}}) \cdot A_{\text{total}}, \quad \gamma = 0.10$$
- **Proof Goal**: Performance fees are minted strictly when $\text{NAV}_t > \text{NAV}_{\text{HWM}}$. In drawdown cycles, no performance fees can be collected under any condition.

### Invariant 4: Monotonic Equity Preservation in Bunker Mode
$$\text{Haircut Bps} = \min\left(2500, \frac{\text{Drawdown Bps} \times 10000}{1500}\right)$$
- **Proof Goal**: During insolvency or sudden collateral impairment, all claimants receive equitable pro-rata payouts in FIFO order, mathematically eliminating the first-mover advantage of bank runs.

### Invariant 5: GateSeal Timelock & Expiration Boundary
$$\Delta_{\text{seal}} = 120,960 \text{ ledgers} \approx 7 \text{ days}$$
- **Proof Goal**: Once activated, the GateSeal can pause strategy allocations for at most 7 days, after which the contract automatically unseals without requiring human intervention.

---

## 3. Threat Vectors & Attack Surface

1. **First-Depositor Inflation**: Mitigated by virtual shares ($10^3$) and virtual assets ($1$).
2. **LLM Agent Prompt Injection / Hallucination**: AI agents hold zero signing keys; all proposals are validated against the deterministic on-chain Policy Account allowlist before execution.
3. **Flash-Harvest Sandwich Attacks**: Asynchronous withdrawal queue with minimum cooldown ledgers prevents deposit-harvest-withdraw sandwich attacks.
4. **Soroban State Archival**: Automatic TTL extension (`extend_ttl`) is invoked during all deposit, withdrawal, and rebalance operations.
5. **Oracle Latency & Malicious Spreads**: MEV backrunner requires atomic ledger close execution with zero net inventory risk.

---

## 4. Test Suites & Verification Reproduction

```bash
# 1. Rust Cargo Soroban Contract Tests (18 Unit & Integration Tests)
cargo test --workspace

# 2. Automated 10,000-Iteration Randomized Invariant Fuzzing
node scripts/run_fuzz_tests.js

# 3. Multi-Scenario Market Stress Test (365 Epochs)
npm run test:stress

# 4. Off-Chain Policy Engine & Cryptographic Proof Verification
npm run test:engine

# 5. Developer TypeScript SDK Verification
npm run test:sdk
```

---

## 5. Storage Key Layout & Soroban TTL

- `InstanceStorage`: Protocol state, paused flag, HWM NAV, and treasury address.
- `PersistentStorage`: User ticket balances, strategy allocation caps, and policy limits.
- `TemporaryStorage`: Ephemeral oracle quotes and rebalance proposal nonces.
