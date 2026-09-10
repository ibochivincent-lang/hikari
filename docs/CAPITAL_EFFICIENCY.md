# Hikari Protocol: Capital Efficiency & Liquidity Reserve Optimization

**Author & Maintainer**: `ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>`  
**Last Updated**: September 2026  
**Status**: Institutional Specification  

---

## 1. The Capital Efficiency Dilemma in Liquid Staking

Liquid staking protocols face an inherent tradeoff:
- **Excess Idle Cash**: Holding too much idle capital in reserve dilutes depositor APY because undeployed assets earn zero yield.
- **Deficient Idle Cash**: Holding too little idle capital forces sudden, expensive strategy exits and slippage whenever stakers redeem funds.

Hikari solves this through **Dynamic Reserve Sizing** coupled with **Dual-Mode Withdrawal Routing (Turbo vs. Bunker Mode)**.

---

## 2. Dynamic Liquidity Reserve Formula

The target idle liquid reserve buffer $\beta(t)$ adapts dynamically to 30-day redemption volume, cross-DEX volatility, and queue depth:

$$\beta(t) = \text{clamp}\left(0.15, \; \beta_0 + k_1 \cdot \frac{\text{WithdrawalVelocity}_{24h}}{\text{TVL}} + k_2 \cdot \sigma_{\text{market}}, \; 0.35\right)$$

- **Baseline Floor ($\beta_0$)**: 15.0% (guaranteed minimum liquidity floor).
- **Volatility Surcharge**: Scales up to 35.0% when market volatility spikes ($\sigma_{\text{market}} > 0.08$).
- **Surplus Sweep**: When idle cash exceeds $\beta(t) + 3\%$, the autonomous agent sweeps the excess capital into Blend collateralized lending within the next rebalance cycle.

---

## 3. Turbo vs. Bunker Mode Deterministic Triggers

```
                         [Redemption Request]
                                  │
                   Is Available Reserve >= Request?
                                  │
                 ┌────────────────┴────────────────┐
                 ▼ YES                             ▼ NO
        [Turbo Mode Active]              [Bunker Mode Active]
   • Instant Settlement               • Asynchronous FIFO Queue
   • 0% Haircut                       • Cooldown: 12 Ledgers (~60s)
   • 0 Cooldown                       • Haircut: Pro-Rata Impairment
   • Funds sent immediately           • Claimable when rebalanced
```

### Deterministic Transition Thresholds

| Trigger Metric | Turbo Mode | Bunker Mode | Rationale |
|---|---|---|---|
| **Vault Idle Buffer** | $\ge 15.0\%$ of TVL | $< 15.0\%$ of TVL | Protects remaining stakers from forced pool dumping |
| **Portfolio Drawdown** | $< 10.0\%$ | $\ge 10.0\%$ | Haircut protects vault from depegs or bad debt |
| **Oracle Latency** | $< 60\text{ seconds}$ | $\ge 60\text{ seconds}$ | Stale prices halt instant liquidations |
| **GateSeal Status** | Normal (`false`) | Sealed (`true`) | Emergency freeze engages queue preservation |

---

## 4. Bunker Mode Haircut Formula

$$\text{Haircut Bps} = \min\left(2500, \left\lfloor \frac{\text{Drawdown Bps} \times 10000}{1500} \right\rfloor \right)$$

- **Drawdown $< 15\%$**: $0\text{ bps}$ haircut (Turbo Mode settles full value).
- **Drawdown $= 20\%$**: $1333\text{ bps}$ ($13.33\%$ haircut applies to FIFO redemption ticket).
- **Drawdown $\ge 30\%$**: Maximum ceiling of $2500\text{ bps}$ ($25.00\%$), preserving the vault's solvency baseline.
