---
name: hakiru-agent
description: Hakiru Protocol autonomous agent operations toolkit for Soroban yield vaults, telemetry queries, and solvency verification.
---

# Hakiru Protocol Autonomous Agent Operations Toolkit

This skill equips autonomous AI agents with the tools, schemas, and policy constraints necessary to monitor, rebalance, simulate, and verify Hakiru Protocol smart contracts on Stellar / Soroban.

## Lead Architect & Maintainer
`ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`

---

## 1. Core Agent Capabilities

Agents utilizing this skill can perform:
1. **Vault State Telemetry**: Query TVL, Net Asset Value (NAV), dynamic APY, and reserve ratios across `EarnXLM`, `EarnUSD`, and `Earn Multichain` vaults.
2. **Strategy Evaluation & Rebalance Proposal**: Score allocations across Blend Protocol, Phoenix CLAMM, and Soroswap AMM with maximum slippage controls.
3. **Zero-Knowledge Proof of Solvency Verification**: Verify cryptographic Merkle proofs that depositor liabilities match on-chain reserves.
4. **Safety Sentinel & Circuit Breaker Monitoring**: Inspect drawdown levels and emergency pause statuses.
5. **Fee-Sponsored Transaction Assembly**: Construct non-custodial delegated transaction payloads for community micro-deposits.

---

## 2. Standardized JSON-RPC Agent Tool Declarations

```json
[
  {
    "name": "hakiru_get_vault_metrics",
    "description": "Returns live TVL, NAV per share, exchange rates, and APY for a given vault.",
    "parameters": {
      "type": "object",
      "properties": {
        "vault": {
          "type": "string",
          "enum": ["xlm", "usd", "multichain"],
          "description": "Target Hakiru vault identifier"
        }
      },
      "required": ["vault"]
    }
  },
  {
    "name": "hakiru_simulate_rebalance",
    "description": "Simulates a proposed strategy weight shift and computes expected yield vs slippage.",
    "parameters": {
      "type": "object",
      "properties": {
        "vault": { "type": "string" },
        "strategyWeights": {
          "type": "object",
          "properties": {
            "blendBps": { "type": "integer" },
            "phoenixBps": { "type": "integer" },
            "soroswapBps": { "type": "integer" },
            "bufferBps": { "type": "integer" }
          },
          "required": ["blendBps", "phoenixBps", "soroswapBps", "bufferBps"]
        }
      },
      "required": ["vault", "strategyWeights"]
    }
  },
  {
    "name": "hakiru_verify_solvency",
    "description": "Fetches current Merkle root and validates depositor inclusion proof.",
    "parameters": {
      "type": "object",
      "properties": {
        "userAddress": { "type": "string", "description": "Stellar public key" }
      },
      "required": ["userAddress"]
    }
  }
]
```

---

## 3. Policy & Invariant Guardrails

Every action executed by an agent MUST satisfy:
- **Invariant 1 (Solvency)**: Total reserve assets in underlying adapters MUST exceed or equal total outstanding shares converted at current NAV.
- **Invariant 2 (Buffer Floor)**: At least 10% of vault assets MUST remain in the unallocated liquid reserve buffer to honor instant user withdrawals.
- **Invariant 3 (Max Spend & Slippage)**: No single rebalance transaction may exceed 50,000 XLM or experience slippage greater than 0.50% (50 bps).
- **Invariant 4 (GateSeal Isolation)**: If the Safety Sentinel or GateSeal engages, all rebalancing and harvest actions are immediately paused.
