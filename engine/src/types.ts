export interface ActionProposal {
  id: string;
  timestamp: number;
  proposerAgent: string;
  actionType: "ALLOCATE" | "DEALLOCATE" | "HARVEST" | "EMERGENCY_EXIT";
  targetStrategy: string;
  amountStroops: bigint;
  expectedYieldBps: number;
  maxSlippageBps: number;
  rationale: string;
}

export interface ProtocolState {
  vaultAddress: string;
  totalAssetsStroops: bigint;
  idleAssetsStroops: bigint;
  allocatedAssetsStroops: bigint;
  strategyAllocations: Map<string, bigint>;
}

export interface PolicyRules {
  allowedAgents: Set<string>;
  allowedStrategies: Set<string>;
  maxTransactionSizeStroops: bigint;
  dailySpendCapStroops: bigint;
  maxSlippageBps: number;
  minIdleReservePercentage: number; // e.g. 10%
  humanApprovalThresholdStroops: bigint;
}

export interface PolicyEvaluation {
  approved: boolean;
  requiresHumanApproval: boolean;
  violations: string[];
  notes: string[];
}

export interface AuditLogEntry {
  sequence: number;
  timestamp: number;
  previousHash: string;
  proposalId: string;
  evaluation: PolicyEvaluation;
  entryHash: string;
}
