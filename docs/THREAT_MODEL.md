# Hikari Threat Model & Security Specifications

Author: ibochivincent-lang
Project: Hikari (Stellar AI Liquid-Yield & Agentic Finance Protocol)

---

## 1. System Overview & Trust Boundaries

The Hikari protocol manages user deposits and allocates capital across approved DeFi strategies. The system decomposes into distinct trust boundaries:

1. **User Funds & Vault State (High Trust / Critical)**: Guarded by Soroban smart contracts. Keys and fund movements are governed by mathematical share accounting and explicit authentication (`require_auth`).
2. **AI Agents (Zero Trust / Untrusted)**: LLMs and automated heuristic agents are untrusted entities. They cannot hold signing keys to user vaults and cannot initiate fund transfers directly.
3. **Deterministic Policy Engine (Medium-High Trust)**: A deterministic verification boundary evaluating agent proposals against immutable boundaries before transaction construction.
4. **On-chain Policy Account (High Trust)**: Custom smart account enforcing per-transaction caps and destination allowlists on-chain via `__check_auth`.
5. **External Data Sources & Oracles (Low Trust)**: Prices, strategy APYs, and indexer state are treated as potentially malicious or stale.

---

## 2. Threat Vectors & Mitigations

### 2.1 First-Depositor Inflation Attack
* **Threat**: An attacker deposits 1 stroop, receives 1 share, then donates a large balance (e.g. 10,000 XLM) directly to the vault. Subsequent depositors depositing standard amounts get rounded down to 0 shares, forfeiting their capital.
* **Mitigation**: The vault implements virtual shares and virtual assets:
  $$\text{shares\_to\_mint} = \frac{\text{deposit\_amount} \times (\text{total\_shares} + 10^3)}{\text{total\_assets} + 1}$$
  Virtual shares ($10^3$) are mathematically locked at deployment, making inflation manipulation cost-prohibitive.

### 2.2 LLM Hallucination or Prompt Injection
* **Threat**: Malicious input from external market news or sentiment data tricks the LLM into proposing a rebalance to an attacker's address or dumping liquidity into an unvetted pool.
* **Mitigation**:
  - LLMs only emit structured JSON rebalance proposals.
  - The deterministic Policy Engine checks the proposal against an on-chain `StrategyRegistry` allowlist.
  - Any proposal exceeding predefined deviation thresholds or touching unverified contracts is immediately dropped.

### 2.3 Flash-Harvest & Sandwich Exploits
* **Threat**: A trader observes a pending strategy yield harvest, deposits capital right before harvest, and redeems immediately after, stealing yield from long-term depositors.
* **Mitigation**:
  - Withdrawal Queue with an anti-sandwich cooldown period (minimum ledger delay before redemption claims can be finalized).
  - Continuous NAV compounding rather than lumpy unannounced distributions.

### 2.4 Soroban State Archival (TTL Expiration)
* **Threat**: Inactive user balances or strategy records are archived by Soroban rent mechanics, failing contract calls.
* **Mitigation**:
  - Auto-extension of storage TTL on every user deposit, withdrawal, and strategy rebalance (`extend_ttl`).
  - Separation into Instance, Persistent, and Temporary storage keys according to lifecycle requirements.

### 2.5 Rogue or Compromised Strategy Adapter
* **Threat**: An underlying DeFi protocol suffers an exploit or bad debt.
* **Mitigation**:
  - An `EmergencyGuardian` can instantly pause a strategy, prevent new deposits, and call `emergency_exit` to pull capital back into the core vault.
  - Per-strategy TVL caps prevent single-protocol insolvency from draining the entire vault.
