# Hikari Protocol: Progressive Decentralization & Economic Model Roadmap

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Last Updated**: September 2026  
**Status**: Institutional Specification  

---

## 1. The 3-Phase Progressive Decentralization Framework

Hikari adopts a staged decentralization path to balance early development agility with long-term trustless immutability.

```
┌─────────────────────────┐     ┌──────────────────────────┐     ┌───────────────────────────┐
│   Phase 1: Guardians    │ ──► │  Phase 2: Dual Timelock  │ ──► │ Phase 3: Pure Immutability│
│  (Multisig + Heuristics)│     │  (DAO + hXLM Staker Veto)│     │   (Autonomous Governance) │
└─────────────────────────┘     └──────────────────────────┘     └───────────────────────────┘
```

### Phase 1: Multisig Policy Guardians (Current Phase)
- **Structure**: 3-of-5 threshold `PolicyAccount` smart account on Soroban.
- **Controls**: Deterministic allocation caps, allowlisted strategies, GateSeal panic button.
- **Agent Role**: Autonomous multi-agents submit structured proposals; PolicyVerifier checks immutable limits before compilation.

### Phase 2: Dual-Governance Timelock DAO (Target: Q1 2027)
- **Structure**: On-chain DAO timelock (7 days) for parameter shifts, strategy approvals, and fee changes.
- **Dual Governance Veto**: `hXLM` liquid stakers hold the ultimate veto right over any malicious DAO governance proposal, preventing hostile takeover of vault capital.
- **GateSeal**: Retained as an emergency one-shot circuit breaker with 7-day automatic self-unseal.

### Phase 3: Pure Autonomous Immutability (Target: Q4 2027)
- **Structure**: Factory deployment of immutable vault parameters.
- **Controls**: Removal of admin keys; core share accounting and virtual buffers become completely immutable on Soroban.

---

## 2. Sustainable Fee Economics (Tokenless Model)

Hikari rejects predatory or dilutive token printing. The protocol operates as a sustainable, cash-flow-generating utility:
- **Management Fee**: 0.50% annualized on total assets, accrued continuously.
- **Performance Fee**: 10.0% on pure alpha, subject strictly to a **High-Water Mark (HWM)**.
- **First-Loss Buffer Allocation**: 50% of protocol fees are retained in the vault reserve buffer to subsidize staker safety and absorb tail-risk market events.
- **Protocol Treasury**: 50% of protocol fees are routed to open-source developer grants and validator incentives.
