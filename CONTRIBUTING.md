# Contributing to Hikari Protocol

Thank you for your interest in contributing to **Hikari**, the premier AI-orchestrated liquid-yield and agentic finance protocol for Stellar and Soroban.

**Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Repository**: [https://github.com/ibochivincent-lang/hikari](https://github.com/ibochivincent-lang/hikari)  

---

## 1. Development Environment Setup

### Prerequisites
- **Node.js**: `v20.0.0+`
- **Rust & Cargo**: `1.79.0+`
- **Soroban CLI**: `v21.0.0+` with target `wasm32-unknown-unknown`
- **Git**: Configured with valid signing identity

### Setup
```bash
# Clone the repository
git clone https://github.com/ibochivincent-lang/hikari.git
cd hikari

# Install root & workspace dependencies
npm install
npm run install:all
```

---

## 2. Test Suites & Verification

All PRs must pass the complete unified verification suite:

```bash
# 1. Rust Smart Contract Unit & Integration Tests
cargo test --workspace

# 2. 10,000-Iteration Randomized Property-Based Fuzz Testing
node scripts/run_fuzz_tests.js

# 3. 365-Day Market Stress Test Simulation
npm run test:stress

# 4. TypeScript Policy Engine & Cryptographic Proof Verification
npm run test:engine

# 5. Developer SDK Test Suite
npm run test:sdk

# 6. Frontend Lido UI Verification
node scripts/verify_lido_ui.js
```

---

## 3. Pull Request Guidelines

1. **Deterministic Safety First**: Changes touching vault share accounting or reserve ratios must provide mathematical proofs or invariant unit tests.
2. **Commit Message Format**: Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
3. **No Breaking Changes without Deprecation**: Strategy adapters must remain backwards-compatible with `IStrategyAdapter`.
