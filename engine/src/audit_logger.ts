import { createHash } from "node:crypto";
import { ActionProposal, AuditLogEntry, PolicyEvaluation } from "./types.js";

export class AuditLogger {
  private chain: AuditLogEntry[] = [];
  private lastHash: string = "0000000000000000000000000000000000000000000000000000000000000000";

  public logDecision(proposal: ActionProposal, evaluation: PolicyEvaluation): AuditLogEntry {
    const sequence = this.chain.length + 1;
    const timestamp = Date.now();

    const payload = JSON.stringify({
      sequence,
      timestamp,
      previousHash: this.lastHash,
      proposalId: proposal.id,
      proposer: proposal.proposerAgent,
      target: proposal.targetStrategy,
      amount: proposal.amountStroops.toString(),
      approved: evaluation.approved,
      requiresHuman: evaluation.requiresHumanApproval,
      violations: evaluation.violations,
    });

    const entryHash = createHash("sha256").update(payload).digest("hex");

    const entry: AuditLogEntry = {
      sequence,
      timestamp,
      previousHash: this.lastHash,
      proposalId: proposal.id,
      evaluation,
      entryHash,
    };

    this.chain.push(entry);
    this.lastHash = entryHash;

    return entry;
  }

  public verifyChainIntegrity(): boolean {
    let currentExpectedPrev = "0000000000000000000000000000000000000000000000000000000000000000";

    for (const entry of this.chain) {
      if (entry.previousHash !== currentExpectedPrev) {
        return false;
      }
      currentExpectedPrev = entry.entryHash;
    }

    return true;
  }

  public getEntries(): ReadonlyArray<AuditLogEntry> {
    return this.chain;
  }
}
