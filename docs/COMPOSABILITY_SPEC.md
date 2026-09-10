# Hikari Protocol: Composability & Ecosystem Integration Specification

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Last Updated**: September 2026  
**Status**: Institutional Standard  

---

## 1. Overview & Ecosystem Alignment

Hikari is built to be a composable, foundation-level yield primitive for Stellar (Protocol 27). Holding the yield-bearing share token `hXLM` (or `hUSDC`) should not lock capital out of DeFi. Instead, `hXLM` adheres to SEP-41 token standards, enabling seamless integration as:
1. **Collateral on Blend Protocol**: Borrow against yield-bearing `hXLM` without forfeiting staking rewards.
2. **DEX Liquidity on Soroswap & Aquarius**: Deep `hXLM/XLM` and `hXLM/USDC` pools with automated market making.
3. **Cross-Chain Collateral via Circle CCTP V2**: Settle native USDC between EVM, Solana, and Stellar.

---

## 2. Blend Protocol Collateral Listing Specification

### Pool Configuration
- **Token Contract**: `CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH` (`hXLM`)
- **Asset Type**: SEP-41 Yield-Bearing Asset Contract
- **Collateral Factor (LTV)**: 85.0% (conservative 15% safety buffer)
- **Liquidation Threshold**: 90.0%
- **Liquidation Penalty**: 5.0%
- **Oracle Integration**: Direct Soroban contract call to `HikariVault::get_nav_per_share()` ensures the liquidation engine evaluates actual compounding NAV rather than a stale 1:1 parity assumption.

---

## 3. Standardized Soroban Strategy Adapter Interface (`IStrategyAdapter`)

External protocols and developers can build and submit custom strategy adapters to the `StrategyRegistry` by implementing this standardized Rust trait:

```rust
use soroban_sdk::{contractclient, Address, Env};

#[contractclient(name = "StrategyAdapterClient")]
pub trait IStrategyAdapter {
    /// Returns the unique string identifier for the strategy (e.g. "blend_xlm_v1")
    fn strategy_id(env: Env) -> soroban_sdk::String;

    /// Supplies assets into the underlying DeFi venue
    fn supply(env: Env, from: Address, amount: i128) -> i128;

    /// Withdraws assets from the underlying venue back to the vault
    fn withdraw(env: Env, to: Address, amount: i128) -> i128;

    /// Collects accrued yield and routes it to the vault
    fn harvest_yield(env: Env) -> i128;

    /// Returns the live annualized yield in basis points (e.g. 650 = 6.50%)
    fn get_current_apy_bps(env: Env) -> u32;

    /// Returns total assets currently held within this strategy
    fn total_assets(env: Env) -> i128;

    /// Emergency exit: unwinds all positions immediately and sends capital to vault
    fn emergency_exit(env: Env) -> i128;
}
```

---

## 4. Machine Payments Protocol (MPP) & x402 Alignment

Hikari follows the official Stellar `x402` and `MPP` specifications:
- **Challenge Header**: Emits `HTTP 402 Payment Required` with `WWW-Authenticate: Machine-Payments-Protocol`.
- **Payment Verification**: Accepts micropayments denominated in native USDC (SEP-41 SAC) on `stellar:testnet`.
- **Settlement Facilitator**: Validates payment hash before unlocking premium oracle feeds.
