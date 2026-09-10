// engine/src/audit/rationale_feed.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Transparent Agent Decision Rationale Generator.

export interface DecisionRationale {
  cycleId: string;
  timestamp: number;
  proposer: string;
  strategyTarget: string;
  proposedAction: "REBALANCE" | "HARVEST" | "DE_RISK" | "MEV_BACKRUN";
  amountStroops: string;
  metricsObserved: {
    spreadBps?: number;
    blendApyBps?: number;
    phoenixFeeAprBps?: number;
    portfolioVaRPct?: number;
    currentReservePct?: number;
  };
  mathematicalRationale: string;
  policyConfidenceScore: number; // 0 - 100
}

export class DecisionRationaleLogger {
  private logStream: DecisionRationale[] = [];

  public emitRationale(data: Omit<DecisionRationale, "timestamp">): DecisionRationale {
    const entry: DecisionRationale = {
      ...data,
      timestamp: Date.now(),
    };
    this.logStream.unshift(entry);
    if (this.logStream.length > 50) {
      this.logStream.pop();
    }
    return entry;
  }

  public getRecentRationales(limit: number = 10): DecisionRationale[] {
    return this.logStream.slice(0, limit);
  }

  public static formatExplanation(r: DecisionRationale): string {
    const time = new Date(r.timestamp).toISOString().slice(11, 19);
    return `[${time}] [${r.proposer}] Action: ${r.proposedAction} -> ${r.strategyTarget} | ${r.mathematicalRationale} (Confidence: ${r.policyConfidenceScore}%)`;
  }
}
