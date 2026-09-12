# Hikari Protocol: Liquidity Bootstrapping & Staker Loyalty Program (Points System)

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Last Updated**: September 2026  
**Status**: Institutional Specification  

---

## 1. Program Overview & Motivation

Following the successful TVL bootstrap playbooks on Stellar (such as Upshift, Sentora, and Gami), Hikari establishes a non-dilutive, transparent **Hikari Staker Loyalty & Points Program** ("Hikari Shards" / `光 Shards`). 

The program incentivizes early sticky liquidity, penalizes mercenary capital, rewards long-term unbonding patience, and aligns ecosystem partners (Blend pools, Phoenix LPs, and cross-chain CCTP depositors).

---

## 2. Point Generation Mechanics

Points accrue continuously per Stellar ledger according to deposited value, time held, and strategy tier:

$$\text{Points}_{\text{epoch}} = \sum_{t=1}^{T} \left( \text{Deposit}_{\text{XLM}}(t) \times \mu_{\text{tier}} \times \lambda_{\text{time}}(t) \times \theta_{\text{ecosystem}} \right)$$

### 2.1 Strategy Tier Multipliers ($\mu_{\text{tier}}$)

| Vault Strategy Tier | Base Asset | Risk Score | Multiplier ($\mu_{\text{tier}}$) | Description |
|---|---|---|---|---|
| **Conservative Stablecoin** | `USDC` / `PYUSD` | Low (1/10) | **1.0x** | Blend collateralized supply + CCTP yield |
| **Balanced Multi-Strategy** | `hXLM Core` | Medium (4/10) | **1.5x** | Blend + Phoenix CLAMM + Soroswap AMM |
| **Dynamic MEV Alpha** | `hXLM Degen` | High (7/10) | **2.5x** | Concentrated CLAMM + atomic Soroban MEV arbitrage |

### 2.2 Loyalty Time-Multiplier ($\lambda_{\text{time}}$)

To discourage mercenary "deposit-and-dump" behavior, depositors accrue a compounding time multiplier:
- **Days 1–14**: $1.0\text{x}$ base multiplier
- **Days 15–30**: $1.25\text{x}$ loyalty boost
- **Days 31–90**: $1.75\text{x}$ diamond-hands multiplier
- **Days 90+**: $2.5\text{x}$ veteran guardian multiplier

*Note*: Initiating an unbonding request resets the time multiplier to $1.0\text{x}$ upon queue entry.

### 2.3 Ecosystem Partner Boosters ($\theta_{\text{ecosystem}}$)
- **Blend Collateral Utilization**: $+25\%$ points boost if `hXLM` is supplied as collateral on Blend Capital.
- **Soroswap Concentrated LP**: $+50\%$ points boost for `hXLM/USDC` liquidity providers.
- **Cross-Chain CCTP Depositor**: $+20\%$ one-time bonus for bridging native USDC from Arbitrum, Ethereum, or Solana.

---

## 3. Transparency & Sybil Resistance

1. **Biometric Passkey Validation**: Wallets linked to biometric Passkeys receive a verified human bonus (+10%), preventing bot farms from monopolizing rewards.
2. **On-Chain Merkle Snapshot**: Every epoch (7 days), point allocations are snapshotted into an immutable Merkle root posted on Stellar ledger, verifiable by any staker.
3. **Zero Tokenless Dilution**: Points measure protocol contribution and fee rebates; no speculative token promises are made prior to governance ratifications.
