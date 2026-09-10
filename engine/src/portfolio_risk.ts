// engine/src/portfolio_risk.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Portfolio-level Value at Risk (VaR), correlation monitor, and automated de-risking engine.

export interface PortfolioRiskAssessment {
  timestamp: number;
  parametricVaR95Pct: number; // e.g. 4.2%
  parametricVaR99Pct: number; // e.g. 7.8%
  correlationPhoenixSoroswap: number; // -1.0 to 1.0
  aggregateVolatilityAnnualized: number;
  deRiskingRecommendation: "NOMINAL" | "TRIM_AMM" | "FULL_DEFENSIVE_LENDING";
  rationale: string;
}

export class PortfolioRiskManager {
  // Z-scores for normal distribution
  private static readonly Z_95 = 1.645;
  private static readonly Z_99 = 2.326;

  public static evaluatePortfolioRisk(
    volatilityAnnualized: number, // e.g. 0.25 (25%)
    ammAllocationWeight: number,   // e.g. 0.45 (45%)
    correlation: number = 0.65     // observed DEX correlation
  ): PortfolioRiskAssessment {
    // 1-day time horizon
    const timeHorizon = Math.sqrt(1 / 365);
    const effectiveVol = volatilityAnnualized * (0.6 + 0.4 * ammAllocationWeight);

    const vaR95 = Number((effectiveVol * this.Z_95 * timeHorizon * 100).toFixed(2));
    const vaR99 = Number((effectiveVol * this.Z_99 * timeHorizon * 100).toFixed(2));

    let recommendation: "NOMINAL" | "TRIM_AMM" | "FULL_DEFENSIVE_LENDING" = "NOMINAL";
    let rationale = "Portfolio volatility within normal statistical tolerance boundaries.";

    if (vaR99 > 10.0 || (correlation > 0.85 && ammAllocationWeight > 0.35)) {
      recommendation = "FULL_DEFENSIVE_LENDING";
      rationale = `Critical risk detected: 1-Day 99% VaR is ${vaR99}% and DEX correlation is ${correlation}. Re-routing AMM capital into Blend over-collateralized lending.`;
    } else if (vaR95 > 5.0 || ammAllocationWeight > 0.40) {
      recommendation = "TRIM_AMM";
      rationale = `Elevated risk: 1-Day 95% VaR is ${vaR95}%. Trimming AMM LP allocations to expand liquid reserve buffer.`;
    }

    return {
      timestamp: Date.now(),
      parametricVaR95Pct: vaR95,
      parametricVaR99Pct: vaR99,
      correlationPhoenixSoroswap: correlation,
      aggregateVolatilityAnnualized: volatilityAnnualized,
      deRiskingRecommendation: recommendation,
      rationale,
    };
  }
}
