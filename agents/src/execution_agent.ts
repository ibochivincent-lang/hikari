import { ActionProposal } from "hikari-engine";
import { RiskAssessment } from "./risk_agent.js";
import { RankedStrategy } from "./yield_agent.js";

export class ExecutionAgent {
  public buildProposal(
    risk: RiskAssessment,
    rankedStrategies: RankedStrategy[]
  ): ActionProposal | null {
    if (!risk.safeToRebalance || risk.maxRecommendedAllocationStroops <= 0n) {
      return null;
    }

    const target = rankedStrategies.find((s) => s.strategyId === risk.targetStrategyId);
    if (!target) return null;

    const proposalId = `hikari_prop_${Date.now()}`;

    return {
      id: proposalId,
      timestamp: Date.now(),
      proposerAgent: "agent_execution_01",
      actionType: "ALLOCATE",
      targetStrategy: target.strategyId,
      amountStroops: risk.maxRecommendedAllocationStroops,
      expectedYieldBps: target.nominalApyBps,
      maxSlippageBps: 30, // 0.30%
      rationale: `Automated rebalance: Deploying capital to ${target.name} (${(target.nominalApyBps / 100).toFixed(2)}% APY).`,
    };
  }
}
