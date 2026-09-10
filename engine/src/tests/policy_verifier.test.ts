import test from "node:test";
import assert from "node:assert";
import { PolicyVerifier } from "../policy_verifier.js";
import { AuditLogger } from "../audit_logger.js";
import { ActionProposal, ProtocolState, PolicyRules } from "../types.js";

const mockRules: PolicyRules = {
  allowedAgents: new Set(["agent_execution_01"]),
  allowedStrategies: new Set(["strat_blend_xlm_01", "strat_soroswap_xlm_usdc_01"]),
  maxTransactionSizeStroops: 10_000_0000000n, // 10,000 XLM
  dailySpendCapStroops: 25_000_0000000n,      // 25,000 XLM
  maxSlippageBps: 50,                         // 0.5% max slippage
  minIdleReservePercentage: 10,               // 10% reserve
  humanApprovalThresholdStroops: 8_000_0000000n, // 8,000 XLM
};

const mockState: ProtocolState = {
  vaultAddress: "CVAULT123",
  totalAssetsStroops: 100_000_0000000n, // 100,000 XLM
  idleAssetsStroops: 30_000_0000000n,   // 30,000 XLM
  allocatedAssetsStroops: 70_000_0000000n,
  strategyAllocations: new Map([["strat_blend_xlm_01", 70_000_0000000n]]),
};

test("PolicyVerifier approves valid proposal within limits", () => {
  const verifier = new PolicyVerifier(mockRules);
  const proposal: ActionProposal = {
    id: "prop_01",
    timestamp: Date.now(),
    proposerAgent: "agent_execution_01",
    actionType: "ALLOCATE",
    targetStrategy: "strat_soroswap_xlm_usdc_01",
    amountStroops: 5_000_0000000n, // 5,000 XLM
    expectedYieldBps: 650,
    maxSlippageBps: 30,
    rationale: "Opportunity in Soroswap XLM-USDC pool with high volume fee APY",
  };

  const evalResult = verifier.evaluateProposal(proposal, mockState);
  assert.strictEqual(evalResult.approved, true);
  assert.strictEqual(evalResult.requiresHumanApproval, false);
  assert.strictEqual(evalResult.violations.length, 0);
  assert.strictEqual(verifier.getDailySpent(), 5_000_0000000n);
});

test("PolicyVerifier flags proposals above human approval threshold", () => {
  const verifier = new PolicyVerifier(mockRules);
  const proposal: ActionProposal = {
    id: "prop_02",
    timestamp: Date.now(),
    proposerAgent: "agent_execution_01",
    actionType: "ALLOCATE",
    targetStrategy: "strat_blend_xlm_01",
    amountStroops: 9_000_0000000n, // 9,000 XLM (above 8,000 threshold)
    expectedYieldBps: 520,
    maxSlippageBps: 25,
    rationale: "Increase allocation to Blend lending market",
  };

  const evalResult = verifier.evaluateProposal(proposal, mockState);
  assert.strictEqual(evalResult.approved, true);
  assert.strictEqual(evalResult.requiresHumanApproval, true);
});

test("PolicyVerifier rejects unauthorized strategy and excessive slippage", () => {
  const verifier = new PolicyVerifier(mockRules);
  const proposal: ActionProposal = {
    id: "prop_03",
    timestamp: Date.now(),
    proposerAgent: "agent_execution_01",
    actionType: "ALLOCATE",
    targetStrategy: "unknown_shady_protocol",
    amountStroops: 1_000_0000000n,
    expectedYieldBps: 2000,
    maxSlippageBps: 150, // 1.5% > 0.5% max
    rationale: "High yield opportunity",
  };

  const evalResult = verifier.evaluateProposal(proposal, mockState);
  assert.strictEqual(evalResult.approved, false);
  assert.strictEqual(evalResult.violations.length >= 2, true);
});

test("AuditLogger maintains verifiable cryptographic chain", () => {
  const logger = new AuditLogger();
  const proposal: ActionProposal = {
    id: "prop_10",
    timestamp: Date.now(),
    proposerAgent: "agent_execution_01",
    actionType: "ALLOCATE",
    targetStrategy: "strat_blend_xlm_01",
    amountStroops: 1_000_0000000n,
    expectedYieldBps: 500,
    maxSlippageBps: 20,
    rationale: "Audit test",
  };

  logger.logDecision(proposal, {
    approved: true,
    requiresHumanApproval: false,
    violations: [],
    notes: ["All good"],
  });

  logger.logDecision(proposal, {
    approved: false,
    requiresHumanApproval: false,
    violations: ["Limit breach"],
    notes: [],
  });

  assert.strictEqual(logger.getEntries().length, 2);
  assert.strictEqual(logger.verifyChainIntegrity(), true);
});
