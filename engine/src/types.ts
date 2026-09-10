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

export interface RiskMetrics {
  currentDrawdownBps: number;
  portfolioVolatility: number; // 0 - 100
  collateralHealthBps: number; // e.g. 13000 = 130%
  oracleFreshnessSeconds: number;
  isDepegDetected: boolean;
}

export interface CircuitBreakerStatus {
  isSealed: boolean;
  isBunkerMode: boolean;
  haircutBps: number;
  sealExpirationLedger?: number;
  triggerReason?: string;
}

export interface RiskEvaluationResult {
  healthy: boolean;
  triggersGateSeal: boolean;
  triggersBunkerMode: boolean;
  suggestedHaircutBps: number;
  warnings: string[];
  recommendedAction: "NORMAL" | "REDUCE_RISK" | "TRIGGER_GATE_SEAL" | "ENGAGE_BUNKER_MODE";
}

