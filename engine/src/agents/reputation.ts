// engine/src/agents/reputation.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Autonomous Agent Reputation, Scorecard & Performance Tracker.

export interface AgentPerformanceRecord {
  agentId: string;
  role: string;
  totalProposalsSubmitted: number;
  proposalsApproved: number;
  proposalsRejected: number;
  cumulativeAlphaGeneratedBps: number;
  averageExecutionSlippageBps: number;
  sharpeRatio: number;
  consecutiveRejections: number;
  status: "ACTIVE" | "DEGRADED" | "SUSPENDED";
  lastCycleTimestamp: number;
}

export class AgentReputationEngine {
  private records: Map<string, AgentPerformanceRecord> = new Map();

  constructor() {
    this.registerAgent("PaymentAgent", "x402 Micropayments & Oracle Settlement");
    this.registerAgent("MarketAgent", "Market Surveillance & Volatility Monitoring");
    this.registerAgent("YieldAgent", "DeFi Yield Strategy Optimization");
    this.registerAgent("MevBackrunner", "Atomic Soroban Cross-DEX Arbitrage");
  }

  public registerAgent(agentId: string, role: string): void {
    this.records.set(agentId, {
      agentId,
      role,
      totalProposalsSubmitted: 0,
      proposalsApproved: 0,
      proposalsRejected: 0,
      cumulativeAlphaGeneratedBps: 0,
      averageExecutionSlippageBps: 1.2,
      sharpeRatio: 2.1,
      consecutiveRejections: 0,
      status: "ACTIVE",
      lastCycleTimestamp: Date.now(),
    });
  }

  public recordProposalOutcome(
    agentId: string,
    approved: boolean,
    alphaBps: number = 0,
    slippageBps: number = 0
  ): AgentPerformanceRecord {
    const record = this.records.get(agentId) || {
      agentId,
      role: "Unknown",
      totalProposalsSubmitted: 0,
      proposalsApproved: 0,
      proposalsRejected: 0,
      cumulativeAlphaGeneratedBps: 0,
      averageExecutionSlippageBps: 0,
      sharpeRatio: 1.0,
      consecutiveRejections: 0,
      status: "ACTIVE",
      lastCycleTimestamp: Date.now(),
    };

    record.totalProposalsSubmitted++;
    record.lastCycleTimestamp = Date.now();

    if (approved) {
      record.proposalsApproved++;
      record.consecutiveRejections = 0;
      record.cumulativeAlphaGeneratedBps += alphaBps;
      record.averageExecutionSlippageBps = (record.averageExecutionSlippageBps + slippageBps) / 2;
      record.status = "ACTIVE";
    } else {
      record.proposalsRejected++;
      record.consecutiveRejections++;

      // Circuit breaker: 3 consecutive rejections transitions agent to DEGRADED
      if (record.consecutiveRejections >= 3 && record.consecutiveRejections < 5) {
        record.status = "DEGRADED";
      } else if (record.consecutiveRejections >= 5) {
        record.status = "SUSPENDED";
      }
    }

    // Dynamic Sharpe estimation
    const approvalRate = record.totalProposalsSubmitted > 0 ? record.proposalsApproved / record.totalProposalsSubmitted : 1.0;
    record.sharpeRatio = Math.max(0.1, Number((approvalRate * 2.5 + record.cumulativeAlphaGeneratedBps / 1000).toFixed(2)));

    this.records.set(agentId, record);
    return record;
  }

  public isAgentEligible(agentId: string): boolean {
    const record = this.records.get(agentId);
    if (!record) return false;
    return record.status !== "SUSPENDED";
  }

  public getScorecard(): AgentPerformanceRecord[] {
    return Array.from(this.records.values());
  }

  public getAgent(agentId: string): AgentPerformanceRecord | undefined {
    return this.records.get(agentId);
  }
}
