// scripts/verify_points_engine.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Verification test for the "Hikari Shards" points engine

const { HikariPointsEngine } = require("../engine/dist/points_engine.js");

function runVerification() {
  console.log("================================================================================");
  console.log("✨ [HIKARI] Verifying Points & Shards TVL Bootstrapping Engine");
  console.log("Author & Maintainer: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>");
  console.log("================================================================================\n");

  const engine = new HikariPointsEngine();

  // Test 1: Conservative USDC position (Baseline)
  const posUsdc = {
    userAddress: "GCJSDY6QA6CYEIZ6W6USD2QC22OBHKOI326YUU64QWBBMWL4GBSY6BQN",
    tierId: "CONSERVATIVE_USDC",
    stakedAmountUsd: 1000,
    durationDays: 10,
  };
  const resUsdc = engine.calculateDailyShards(posUsdc);
  console.log("1. Conservative USDC Position ($1,000, 10 days):");
  console.log(`   Multiplier: ${resUsdc.multiplier}x (Expected: 1.0x)`);
  console.log(`   Daily Shards: ${resUsdc.dailyShards} (Expected: 10,000)`);
  if (resUsdc.multiplier !== 1.0 || resUsdc.dailyShards !== 10000) {
    throw new Error("Conservative USDC calculation failed!");
  }

  // Test 2: Balanced hXLM position with 90-day lockup & Blend collateral booster
  const posBalanced = {
    userAddress: "GAQZQABZADRIHXJSNS75OLEKNE65ZFU273PBSA6H23IHILQVFK3VQ5L2",
    tierId: "BALANCED_HXLM",
    stakedAmountUsd: 2000,
    durationDays: 95,
    isBlendCollateral: true,
  };
  const resBalanced = engine.calculateDailyShards(posBalanced);
  console.log("\n2. Balanced hXLM Position ($2,000, 95d lockup, Blend booster):");
  console.log(`   Multiplier: ${resBalanced.multiplier}x (Tier: 1.5x, Duration: 1.5x, Blend: 1.25x -> 2.81x)`);
  console.log(`   Daily Shards: ${resBalanced.dailyShards}`);
  if (resBalanced.multiplier <= 2.5) {
    throw new Error("Balanced boosted multiplier calculation failed!");
  }

  // Test 3: MEV Alpha position with full DEX LP & Blend boost (Maximum incentive)
  const posAlpha = {
    userAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLL7DEV",
    tierId: "DYNAMIC_ALPHA_HXLM",
    stakedAmountUsd: 5000,
    durationDays: 185,
    isLpOnDex: true,
    isBlendCollateral: true,
  };
  const resAlpha = engine.calculateDailyShards(posAlpha);
  console.log("\n3. Dynamic MEV Alpha Position ($5,000, 185d lockup, Multi-ecosystem):");
  console.log(`   Multiplier: ${resAlpha.multiplier}x (Tier: 2.5x, Duration: 2.0x, Ecosystem: 1.5x -> 7.5x)`);
  console.log(`   Daily Shards: ${resAlpha.dailyShards.toLocaleString()}`);
  if (resAlpha.multiplier < 7.0) {
    throw new Error("MEV Alpha maximum boost failed!");
  }

  // Test 4: Leaderboard retrieval
  const leaderboard = engine.getLeaderboard();
  console.log("\n4. Protocol Shard Leaderboard Sample:");
  console.table(leaderboard);

  console.log("\n================================================================================");
  console.log("🎉 ALL POINTS & INCENTIVE MULTIPLIER TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================\n");
}

runVerification();
