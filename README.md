# Hikari (光) - Stellar AI Liquid-Yield & Agentic Finance Protocol

Hikari is an autonomous, agentic liquid-yield protocol architected natively for the Stellar network and Soroban smart contracts.

---

## 🌟 Core Architecture

1. **Soroban Vault & Liquid Position Token**
   - Single-asset & multi-strategy yield vault with ERC-4626 style virtual share/asset offset to prevent first-depositor inflation attacks.
   - SEP-41 compliant liquid position token representing fungible shares of the vault.
   - Storage TTL auto-extension to safeguard against ledger archival.
   - Dynamic emergency pause, revocation, and protocol fee mechanics.

2. **Deterministic Risk & Policy Engine**
   - Independent verification layer enforcing transactional, daily, and monthly spend caps.
   - Strict contract and destination address allowlists.
   - Maximum slippage, minimum liquidity reserve requirements, and human approval gates.

3. **Multi-Agent Orchestration Layer**
   - **Market Agent**: Monitors DEX/lending pools, spreads, and liquidity.
   - **Yield Agent**: Evaluates, scores, and ranks approved yield strategies.
   - **Risk Agent**: Computes drawdown, exposure metrics, and vault health.
   - **Execution Agent**: Builds structured Soroban transaction proposals.
   - **Payment Agent**: Manages micropayment budgets for auxiliary data.

4. **x402 / MPP Machine Payments**
   - Built-in HTTP 402 and Machine Payments Protocol (MPP) integration.
   - Facilitates fee-sponsored, automated payments for machine telemetry and premium data feeds using Stellar testnet USDC.

5. **Web Interface & Governance Dashboard**
   - Next.js and TypeScript frontend providing real-time NAV tracking, strategy performance metrics, and human-in-the-loop rebalance approval.

---

## 📂 Repository Structure

```
Hikari/
├── contracts/             # Soroban Smart Contracts (Rust)
│   ├── Cargo.toml
│   ├── interfaces/        # Shared contract traits & error types
│   ├── vault/             # Main Vault & Share accounting
│   ├── token/             # SEP-41 Liquid Position Token
│   ├── strategy_registry/ # Strategy allowlists & risk limits
│   ├── withdrawal_queue/  # Asynchronous withdrawal queue
│   ├── policy_account/    # On-chain smart account authorization
│   └── mock_strategy/     # Mock yield adapter for testing
├── engine/                # Deterministic Policy & Risk Engine (TypeScript)
├── agents/                # Autonomous AI Agent Orchestration Pipeline
├── services/              # x402 / MPP Telemetry & Paid Services
├── frontend/              # Interactive Web Dashboard
└── docs/                  # Threat model, economic model, runbooks
```

---

## 🌐 Live Stellar Testnet Deployments

| Contract | Address / ID | Explorer |
|---|---|---|
| **Hikari Vault** | `CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5` | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5) |
| **hXLM Share Token (SEP-41)** | `CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH` | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CA36LWOMIDPXFMVTQR6TODLSAO6QFNSYK6UBP5CS5MWGC2UHIDT23QLH) |
| **Strategy Registry** | `CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ` | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CB7EOUYL5V22KCUK27LACLMDYDQMBCJMNQUWSALEGBEZXEK4LH76VZFQ) |
| **Withdrawal Queue** | `CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ` | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CBTICEQ2OQ5KTCCWPYT4Q3SROZORZCJBSHR2J4RSGI5TESKWEW34TOXQ) |
| **Policy Account** | `CAPXDOMRO7U6XGOSNWKP6YBY7GMBRH7FPTYWTAW6CRGPMYIZHIJDO3UP` | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CAPXDOMRO7U6XGOSNWKP6YBY7GMBRH7FPTYWTAW6CRGPMYIZHIJDO3UP) |
| **Blend Protocol Adapter** | `CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL` | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CDLG3GFOQ6WFVTFXQCW3ZSJMMMXIEQVEGZKMERS4ITBDZOHKXPRB5EAL) |
| **Phoenix CLAMM Adapter** | `CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5` | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CAD345D2TCMIQEHSVVJMXOKMNGVVLW6YS7VBFSYXCRPALCOCDNA6O6L5) |
| **Native XLM SAC** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | [Stellar.Expert](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |

---

## 🚀 Getting Started

### Prerequisites
- **Rust**: $\ge$ 1.84 with `wasm32v1-none` target
- **Stellar CLI**: $\ge$ 27.0
- **Node.js**: $\ge$ 20.0
- **npm**: $\ge$ 10.0

### Smart Contract Testing
```bash
cd contracts
cargo test
```

### Policy Engine Testing
```bash
cd engine
npm test
```

---

## 👤 Author & Maintainer

- **Author**: ibochivincent-lang
- **Email**: ibochivincent-lang@users.noreply.github.com
- **Repository**: https://github.com/ibochivincent-lang/hikari.git
