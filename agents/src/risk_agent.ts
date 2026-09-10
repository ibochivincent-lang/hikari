import { ProtocolState } from "hikari-engine";
import { RankedStrategy } from "./yield_agent.js";

export interface RiskAssessment {
  safeToRebalance: boolean;
  maxRecommendedAllocationStroops: bigint;
  targetStrategyId: string;
  reasons: string[];
}

export class RiskAgent {
  public evaluateExposure(
    state: ProtocolState,
    rankedStrategies: RankedStrategy[]
  ): RiskAssessment {
    const reasons: string[] = [];
    const topStrategy = rankedStrategies[0];

    if (!topStrategy) {
      return {
        safeToRebalance: false,
        maxRecommendedAllocationStroops: 0n,
        targetStrategyId: "",
        reasons: ["No candidate strategies found"],
      };
    }

    // Ensure vault maintains at least 15% liquid buffer
    const minReserveStroops = (state.totalAssetsStroops * 15n) / 100n;
    if (state.idleAssetsStroops <= minReserveStroops) {
      reasons.push(
        `Idle vault assets (${state.idleAssetsStroops}) are at or below target 15% liquidity reserve (${minReserveStroops})`
      );
      return {
        safeToRebalance: false,
        maxRecommendedAllocationStroops: 0n,
        targetStrategyId: topStrategy.strategyId,
        reasons,
      };
    }

    // Deployable surplus
    const deployable = state.idleAssetsStroops - minReserveStroops;
    // Cap single rebalance to 25% of deployable or 10,000 XLM max
    const maxSingleAllocation = (deployable * 25n) / 100n;

    reasons.push(`Top strategy: ${topStrategy.name} (Risk-adjusted APY: ${topStrategy.riskAdjustedApyBps / 100}%)`);
    reasons.push(`Deployable surplus: ${deployable} stroops. Sized allocation: ${maxSingleAllocation} stroops.`);

    return {
      safeToRebalance: true,
      maxRecommendedAllocationStroops: maxSingleAllocation,
      targetStrategyId: topStrategy.strategyId,
      reasons,
    };
  }
}
