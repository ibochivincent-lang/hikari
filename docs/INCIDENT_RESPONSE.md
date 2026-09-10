# Hikari Protocol: Incident Response Plan & Threat Mitigation Runbooks

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Last Updated**: September 2026  
**Status**: Institutional Production Standard  

---

## 1. Incident Severity Matrix

| Severity Level | Definition | Response SLA | Mitigation Actions |
|---|---|---|---|
| **P1 - Critical** | Exploitable vulnerability in vault accounting, solvency risk, or bridge drainage | **Immediate (< 15 mins)** | Trigger GateSeal emergency pause, engage Bunker Mode, alert stakers |
| **P2 - High** | Strategy adapter depeg, bad debt on Blend/Phoenix, oracle failure | **< 1 hour** | Freeze affected strategy via `pause_strategy`, re-route capital into reserve |
| **P3 - Medium** | AI agent hallucination, x402 feed failure, repeated proposal rejections | **< 4 hours** | Deactivate rogue agent via Reputation Manager, fallback to public oracles |
| **P4 - Low** | Telemetry lag, non-critical UI discrepancy, frontend performance dip | **< 24 hours** | Routine patch, log review, and telemetry refresh |

---

## 2. Emergency Pause & GateSeal Runbook

### GateSeal Circuit Breaker Architecture
GateSeal is an emergency one-shot circuit breaker designed to halt capital movement during an unfolding exploit without requiring DAO voting delays.

```
[Oracle Shock / Drawdown > 15%] 
              │
              ▼
[Security Guardian / Multisig Key]
              │
              ▼ Calls: gateseal::seal_now()
┌─────────────────────────────────────────────────────────┐
│ • Vault transitions to PAUSED immediately               │
│ • Strategy capital allocations frozen                   │
│ • Deposits halted                                       │
│ • Withdrawals transition to Bunker Mode with Haircut    │
│ • Auto-Unseal Timer: 120,960 Ledgers (~7 Days)          │
└─────────────────────────────────────────────────────────┘
```

### Triggering GateSeal on Stellar Testnet
```bash
soroban contract invoke \
  --id CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ \
  --source-account guardian_key \
  --network testnet \
  -- seal_now
```

### Unsealing After Investigation
1. Verify contract balances and audit logs.
2. Confirm vulnerability patch or bad debt isolation.
3. Call `unseal()` or allow automatic expiration after 120,960 ledgers:
```bash
soroban contract invoke \
  --id CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ \
  --source-account guardian_key \
  --network testnet \
  -- unseal
```

---

## 3. Agent Layer Containment Runbook

AI agents run in a sandboxed, zero-trust perimeter:
1. **Key Isolation**: AI agents hold no Soroban signing keys and cannot execute transfers.
2. **Deterministic Verification**: Proposals that breach volatility or allocation limits are dropped by `PolicyVerifier` before transaction compilation.
3. **Agent Circuit Breaker**: If an agent submits 3 consecutive invalid proposals, the `ReputationManager` revokes its proposal generation privilege and transfers duty to the heuristic fallback engine.

---

## 4. Post-Mortem & Disclosure Standard

Following any P1 or P2 incident:
1. **Public Notice**: Published on GitHub Discussions, X, and Discord within 2 hours of containment.
2. **Root Cause Analysis (RCA)**: Comprehensive technical breakdown within 72 hours.
3. **Audit Patch**: Independently reviewed by external security researchers.
4. **Compensation / Rebalancing**: Calculation of any haircut adjustments and restitution from protocol reserve funds.
