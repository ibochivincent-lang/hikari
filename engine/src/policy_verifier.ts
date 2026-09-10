import { ActionProposal, ProtocolState, PolicyRules, PolicyEvaluation } from "./types.js";

export class PolicyVerifier {
  private dailySpentStroops: bigint = 0n;
  private lastResetDay: number = 0;

  constructor(private rules: PolicyRules) {
    this.lastResetDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  }

  public evaluateProposal(proposal: ActionProposal, state: ProtocolState): PolicyEvaluation {
    this.checkDailyReset();

    const violations: string[] = [];
    const notes: string[] = [];
    let requiresHumanApproval = false;

    // 1. Check Agent Authorization
    if (!this.rules.allowedAgents.has(proposal.proposerAgent)) {
      violations.push(`Agent '${proposal.proposerAgent}' is not in authorized agents list`);
    }

    // 2. Check Strategy Allowlist
    if (!this.rules.allowedStrategies.has(proposal.targetStrategy)) {
      violations.push(`Target strategy '${proposal.targetStrategy}' is not in allowed strategies list`);
    }

    // 3. Check Per-Transaction Limit
    if (proposal.amountStroops > this.rules.maxTransactionSizeStroops) {
      violations.push(
        `Amount ${proposal.amountStroops} exceeds maximum transaction limit of ${this.rules.maxTransactionSizeStroops}`
      );
    }

    // 4. Check Daily Rolling Cap
    if (this.dailySpentStroops + proposal.amountStroops > this.rules.dailySpendCapStroops) {
      violations.push(
        `Amount would breach daily spend cap of ${this.rules.dailySpendCapStroops}. Current spent: ${this.dailySpentStroops}`
      );
    }

    // 5. Check Slippage Bounds
    if (proposal.maxSlippageBps > this.rules.maxSlippageBps) {
      violations.push(
        `Requested slippage ${proposal.maxSlippageBps} bps exceeds maximum permitted ${this.rules.maxSlippageBps} bps`
      );
    }

    // 6. Check Liquidity Reserve Constraints (for allocations)
    if (proposal.actionType === "ALLOCATE") {
      if (proposal.amountStroops > state.idleAssetsStroops) {
        violations.push(
          `Insufficient idle vault assets. Requested: ${proposal.amountStroops}, Idle available: ${state.idleAssetsStroops}`
        );
      } else {
        const remainingIdle = state.idleAssetsStroops - proposal.amountStroops;
        const totalAssets = state.totalAssetsStroops;
        if (totalAssets > 0n) {
          const reserveRatio = Number(remainingIdle * 100n / totalAssets);
          if (reserveRatio < this.rules.minIdleReservePercentage) {
            violations.push(
              `Allocation would reduce vault idle reserve to ${reserveRatio}%, below minimum ${this.rules.minIdleReservePercentage}%`
            );
          }
        }
      }
    }

    // 7. Human Approval Gate
    if (proposal.amountStroops >= this.rules.humanApprovalThresholdStroops) {
      requiresHumanApproval = true;
      notes.push(
        `Amount ${proposal.amountStroops} exceeds human approval threshold of ${this.rules.humanApprovalThresholdStroops}. Operator signature required.`
      );
    }

    const approved = violations.length === 0;

    if (approved && !requiresHumanApproval) {
      this.dailySpentStroops += proposal.amountStroops;
      notes.push(`Proposal approved automatically for execution.`);
    }

    return {
      approved,
      requiresHumanApproval,
      violations,
      notes,
    };
  }

  public recordManualApproval(amountStroops: bigint): void {
    this.checkDailyReset();
    this.dailySpentStroops += amountStroops;
  }

  public getDailySpent(): bigint {
    this.checkDailyReset();
    return this.dailySpentStroops;
  }

  private checkDailyReset(): void {
    const currentDay = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    if (currentDay > this.lastResetDay) {
      this.dailySpentStroops = 0n;
      this.lastResetDay = currentDay;
    }
  }
}
