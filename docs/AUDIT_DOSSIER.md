# Hikari Protocol: External Smart Contract Audit Dossier

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Target Auditors**: Zellic, Trail of Bits, OtterSec  
**Repository**: [https://github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari)  
**Language / Platform**: Rust (Soroban SDK v21+) / Stellar Network  
**Audit Scope**: Vault Core, Share Accounting, GateSeal Circuit Breaker, Withdrawal Queue, Strategy Adapters  

---

## 1. System Architecture & Contract Matrix

| Contract | Path | Language | LOC | Core Responsibility |
|---|---|---|---|---|
| **Hikari Vault Core** | `contracts/vault/src/lib.rs` | Rust / Soroban | ~350 | Share minting/burning, dynamic allocation, virtual share protection |
| **hXLM Token (SEP-41)** | `contracts/token/src/lib.rs` | Rust / Soroban | ~220 | Liquid yield-bearing token, transfer/allowance primitives |
| **Withdrawal Queue** | `contracts/queue/src/lib.rs` | Rust / Soroban | ~280 | Asynchronous redemption queue, 50-ledger cooldown, FIFO payouts |
| **GateSeal Breaker** | `contracts/gate_seal/src/lib.rs` | Rust / Soroban | ~180 | 1-time emergency panic freeze (120,960 ledgers), auto-unseal |
| **Blend Adapter** | `contracts/adapters/blend/src/lib.rs` | Rust / Soroban | ~160 | SEP-41 token lending into Blend money market pools |
| **Phoenix Adapter** | `contracts/adapters/phoenix/src/lib.rs` | Rust / Soroban | ~175 | Concentrated liquidity LP management, fee harvesting |

---

## 2. Mathematical Invariant Proofs (Auditor Verification)

### Invariant 1: Virtual Share Anti-Inflation Immunity
- **Formula**:
  $$NAV = \frac{A_{total} + 1}{S_{total} + 1000}$$
- **Threat Mitigated**: The classic ERC-4626 first-depositor inflation exploit where an attacker deposits 1 stroop, donates 100,000 XLM directly to the contract, and rounds down subsequent depositors' shares to 0.
- **Verification Harness**: Run `node scripts/run_fuzz_tests.js`. 10,000 randomized donation scenarios confirm 0 zero-share exploits.

### Invariant 2: Dynamic Liquid Reserve Floor
- **Formula**:
  $$A_{idle} \ge 0.15 \cdot A_{total}$$
- **Property**: At least 15% of all vault assets remain in unencumbered native SAC tokens. Redemptions below this buffer settle instantly without touching external strategy positions.

### Invariant 3: High-Water Mark (HWM) Performance Fee Accrual
- **Formula**:
  $$\Phi_{perf} = \max\left(0,\; \gamma \cdot (NAV - NAV_{HWM}) \cdot A_{total}\right)$$
- **Property**: Performance fees are strictly calculated on net profit above the historical high-water mark. Under drawdowns, fee accrual is exactly 0.

### Invariant 4: Bunker Mode Equity & Bank-Run Defense
- **Formula**:
  $$A_{claimable} = S_{redeemed} \times NAV \times \left(1 - \frac{H_{bps}}{10,000}\right)$$
- **Property**: When drawdown exceeds 10%, the vault enters Bunker Mode. Redemptions switch from instant to a FIFO queue with a shared loss haircut, mathematically preventing early depositors from draining healthy capital.

### Invariant 5: GateSeal Circuit Breaker Bounds
- **Property**: The GateSeal account has strictly bounded pause authority ($\le 120,960$ ledgers, ~7 days). It can only freeze new allocations to strategies; it cannot freeze redemptions or drain user funds.

---

## 3. Threat Model & Out-of-Scope Items

### In-Scope Attack Vectors:
1. Reentrancy between Vault and Adapter contract invocations.
2. Rounding errors in Soroban integer division during large donations or withdrawals.
3. Storage TTL expiration on Soroban persistent data instances.
4. Access control bypasses on `allocate_to_strategy` or `trip_gate_seal`.
5. Oracle stale data handling during extreme market volatility.

### Out-of-Scope Items:
1. Stellar Core validator consensus failures.
2. Compromise of underlying protocol assets outside of Hikari (e.g. smart contract bugs within native Blend or Soroswap).

---

## 4. Auditor Test Reproduction Commands

Auditors can clone and reproduce all verification suites using the following commands:

```bash
# 1. Run Soroban Rust Contract Unit & Integration Tests
cargo test --manifest-path contracts/Cargo.toml --workspace

# 2. Execute 10,000-Iteration Property-Based Invariant Fuzzing
node scripts/run_fuzz_tests.js

# 3. Execute 365-Day 5-Regime Historical Market Backtest
node scripts/run_backtest.js

# 4. Run Policy & Risk Engine Verification Tests
npm run test:engine

# 5. Run Developer TypeScript SDK Tests
npm run test:sdk
```
