// engine/src/cryptographic_verifier.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Cryptographic state verification and Merkle tree generation for deterministic policy decisions.

import { createHash } from "node:crypto";
import { ActionProposal, AuditLogEntry } from "./types.js";

export interface StateProof {
  proposalId: string;
  commitmentHash: string;
  merkleRoot: string;
  proofPath: string[];
  leafIndex: number;
  timestamp: number;
}

export class CryptographicVerifier {
  public static hash(data: string): string {
    return createHash("sha256").update(data).digest("hex");
  }

  public static computeProposalCommitment(proposal: ActionProposal): string {
    const raw = `${proposal.id}:${proposal.proposerAgent}:${proposal.targetStrategy}:${proposal.amountStroops}:${proposal.expectedYieldBps}:${proposal.maxSlippageBps}:${proposal.timestamp}`;
    return this.hash(raw);
  }

  public static buildMerkleTree(entries: AuditLogEntry[]): { root: string; leaves: string[] } {
    if (entries.length === 0) {
      return { root: this.hash("EMPTY_TREE"), leaves: [] };
    }

    let currentLevel = entries.map((e) => e.entryHash);
    const leaves = [...currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(this.hash(left + right));
      }
      currentLevel = nextLevel;
    }

    return { root: currentLevel[0], leaves };
  }

  public static generateProof(leaves: string[], targetIndex: number): string[] {
    const proof: string[] = [];
    if (targetIndex < 0 || targetIndex >= leaves.length) return proof;

    let currentLevel = [...leaves];
    let index = targetIndex;

    while (currentLevel.length > 1) {
      const isEven = index % 2 === 0;
      const pairIndex = isEven ? index + 1 : index - 1;

      if (pairIndex < currentLevel.length) {
        proof.push(currentLevel[pairIndex]);
      } else {
        proof.push(currentLevel[index]);
      }

      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        nextLevel.push(this.hash(left + right));
      }

      currentLevel = nextLevel;
      index = Math.floor(index / 2);
    }

    return proof;
  }

  public static verifyProof(leaf: string, proof: string[], root: string, leafIndex: number): boolean {
    let currentHash = leaf;
    let index = leafIndex;

    for (const sibling of proof) {
      const isEven = index % 2 === 0;
      currentHash = isEven ? this.hash(currentHash + sibling) : this.hash(sibling + currentHash);
      index = Math.floor(index / 2);
    }

    return currentHash === root;
  }
}
