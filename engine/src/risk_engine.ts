// engine/src/risk_engine.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Risk engine monitoring portfolio drawdown, volatility spikes, and emergency circuit breakers.

import {
  ProtocolState,
  RiskMetrics,
  CircuitBreakerStatus,
  RiskEvaluationResult,
} from "./types.js";

export interface RiskThresholds {
  maxDrawdownBps: number;        // e.g. 1500 bps (15%) -> triggers GateSeal
  bunkerDrawdownBps: number;     // e.g. 1000 bps (10%) -> triggers Bunker Mode
  minCollateralHealthBps: number;// e.g. 11500 bps (115%)
  maxVolatilityIndex: number;    // e.g. 80 (out of 100)
  maxOracleLagSeconds: number;   // e.g. 300 seconds
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  maxDrawdownBps: 1500,          // 15% drawdown threshold
  bunkerDrawdownBps: 1000,       // 10% drawdown threshold
  minCollateralHealthBps: 11500, // 115% collateral ratio
  maxVolatilityIndex: 80,
  maxOracleLagSeconds: 300,
};

export class RiskEngine {
  private peakValueStroops: bigint = 0n;

  constructor(private thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS) {}

  /**
   * Updates historical high watermark to track real-time portfolio drawdown.
   */
  public updatePeakValue(totalAssetsStroops: bigint): void {
    if (totalAssetsStroops > this.peakValueStroops) {
      this.peakValueStroops = totalAssetsStroops;
    }
  }

  /**
   * Calculates current drawdown in basis points (1 bp = 0.01%).
   */
  public calculateDrawdownBps(currentAssetsStroops: bigint): number {
    if (this.peakValueStroops <= 0n || currentAssetsStroops >= this.peakValueStroops) {
      return 0;
    }
    const diff = this.peakValueStroops - currentAssetsStroops;
    const bps = (diff * 10000n) / this.peakValueStroops;
    return Number(bps);
  }

  /**
   * Evaluates protocol health against market metrics and protocol state.
   */
  public evaluateRisk(
    state: ProtocolState,
    metrics: RiskMetrics
  ): RiskEvaluationResult {
    this.updatePeakValue(state.totalAssetsStroops);
    const calculatedDrawdown = this.calculateDrawdownBps(state.totalAssetsStroops);
    const effectiveDrawdown = Math.max(metrics.currentDrawdownBps, calculatedDrawdown);

    const warnings: string[] = [];
    let triggersGateSeal = false;
    let triggersBunkerMode = false;
    let suggestedHaircutBps = 0;

    // 1. Drawdown evaluation (Lido GateSeal & Bunker Mode patterns)
    if (effectiveDrawdown >= this.thresholds.maxDrawdownBps) {
      triggersGateSeal = true;
      triggersBunkerMode = true;
      suggestedHaircutBps = Math.min(2500, effectiveDrawdown); // up to 25% haircut
      warnings.push(
        `Critical drawdown: ${effectiveDrawdown / 100}% exceeds GateSeal threshold ${this.thresholds.maxDrawdownBps / 100}%`
      );
    } else if (effectiveDrawdown >= this.thresholds.bunkerDrawdownBps) {
      triggersBunkerMode = true;
      suggestedHaircutBps = Math.min(1500, effectiveDrawdown);
      warnings.push(
        `Severe drawdown: ${effectiveDrawdown / 100}% triggers Bunker Mode queue protection`
      );
    }

    // 2. Collateral health evaluation (Blend lending risk)
    if (metrics.collateralHealthBps < this.thresholds.minCollateralHealthBps) {
      warnings.push(
        `Collateral health ratio ${metrics.collateralHealthBps / 100}% is below safety limit ${this.thresholds.minCollateralHealthBps / 100}%`
      );
      if (metrics.collateralHealthBps < 10500) {
        triggersGateSeal = true;
        warnings.push("Imminent liquidation risk detected; triggering GateSeal emergency halt");
      }
    }

    // 3. Oracle freshness evaluation
    if (metrics.oracleFreshnessSeconds > this.thresholds.maxOracleLagSeconds) {
      warnings.push(
        `Oracle feed stale: lag of ${metrics.oracleFreshnessSeconds}s exceeds limit ${this.thresholds.maxOracleLagSeconds}s`
      );
    }

    // 4. Asset depeg detection
    if (metrics.isDepegDetected) {
      triggersBunkerMode = true;
      suggestedHaircutBps = Math.max(suggestedHaircutBps, 1000);
      warnings.push("Asset depeg detected in strategy pools; locking instant redemptions via Bunker Mode");
    }

    // Determine recommended action
    let recommendedAction: RiskEvaluationResult["recommendedAction"] = "NORMAL";
    if (triggersGateSeal) {
      recommendedAction = "TRIGGER_GATE_SEAL";
    } else if (triggersBunkerMode) {
      recommendedAction = "ENGAGE_BUNKER_MODE";
    } else if (metrics.portfolioVolatility > this.thresholds.maxVolatilityIndex || warnings.length > 0) {
      recommendedAction = "REDUCE_RISK";
    }

    return {
      healthy: warnings.length === 0,
      triggersGateSeal,
      triggersBunkerMode,
      suggestedHaircutBps,
      warnings,
      recommendedAction,
    };
  }
}
