import test from "node:test";
import assert from "node:assert";
import { RiskEngine, DEFAULT_RISK_THRESHOLDS } from "../risk_engine.js";
import { ProtocolState, RiskMetrics } from "../types.js";

const baseState: ProtocolState = {
  vaultAddress: "CVAULT123",
  totalAssetsStroops: 100_000_0000000n, // 100,000 XLM
  idleAssetsStroops: 20_000_0000000n,
  allocatedAssetsStroops: 80_000_0000000n,
  strategyAllocations: new Map(),
};

test("RiskEngine reports healthy under normal market conditions", () => {
  const engine = new RiskEngine();
  const metrics: RiskMetrics = {
    currentDrawdownBps: 200, // 2%
    portfolioVolatility: 35,
    collateralHealthBps: 13500, // 135%
    oracleFreshnessSeconds: 15,
    isDepegDetected: false,
  };

  const result = engine.evaluateRisk(baseState, metrics);
  assert.strictEqual(result.healthy, true);
  assert.strictEqual(result.triggersGateSeal, false);
  assert.strictEqual(result.triggersBunkerMode, false);
  assert.strictEqual(result.recommendedAction, "NORMAL");
});

test("RiskEngine triggers Bunker Mode when drawdown exceeds 10%", () => {
  const engine = new RiskEngine();
  const metrics: RiskMetrics = {
    currentDrawdownBps: 1200, // 12% drawdown
    portfolioVolatility: 65,
    collateralHealthBps: 12000,
    oracleFreshnessSeconds: 30,
    isDepegDetected: false,
  };

  const result = engine.evaluateRisk(baseState, metrics);
  assert.strictEqual(result.triggersBunkerMode, true);
  assert.strictEqual(result.triggersGateSeal, false);
  assert.strictEqual(result.recommendedAction, "ENGAGE_BUNKER_MODE");
  assert.strictEqual(result.suggestedHaircutBps, 1200);
});

test("RiskEngine triggers GateSeal emergency pause when drawdown exceeds 15%", () => {
  const engine = new RiskEngine();
  const metrics: RiskMetrics = {
    currentDrawdownBps: 1800, // 18% drawdown
    portfolioVolatility: 90,
    collateralHealthBps: 11000,
    oracleFreshnessSeconds: 45,
    isDepegDetected: false,
  };

  const result = engine.evaluateRisk(baseState, metrics);
  assert.strictEqual(result.triggersGateSeal, true);
  assert.strictEqual(result.triggersBunkerMode, true);
  assert.strictEqual(result.recommendedAction, "TRIGGER_GATE_SEAL");
});

test("RiskEngine flags depeg detection and activates Bunker Mode", () => {
  const engine = new RiskEngine();
  const metrics: RiskMetrics = {
    currentDrawdownBps: 100,
    portfolioVolatility: 40,
    collateralHealthBps: 13000,
    oracleFreshnessSeconds: 20,
    isDepegDetected: true,
  };

  const result = engine.evaluateRisk(baseState, metrics);
  assert.strictEqual(result.triggersBunkerMode, true);
  assert.strictEqual(result.healthy, false);
});
