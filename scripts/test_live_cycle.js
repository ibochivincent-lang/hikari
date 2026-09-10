// scripts/test_live_cycle.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Live on-chain end-to-end rebalance test on Stellar Testnet

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function runStellarCommand(cmd) {
  try {
    const output = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return output.trim();
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : "";
    const stdout = err.stdout ? err.stdout.toString() : "";
    throw new Error(`Stellar CLI Command Failed: ${cmd}\n${stderr}\n${stdout}`);
  }
}

function parseTxHash(output) {
  const match = output.match(/explorer\/testnet\/tx\/([a-f0-9]{64})/i);
  return match ? match[1] : null;
}

async function runLiveCycle() {
  console.log("================================================================================");
  console.log("🌟 [HIKARI] Live Stellar Testnet End-to-End Rebalance Simulation");
  console.log("Author & Maintainer: ibochivincent-lang");
  console.log("================================================================================\n");

  const configPath = path.join(__dirname, "..", "deployed_contracts.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const { vault, token, blendAdapter } = config.contracts;
  const { admin, agent } = config.identities;

  console.log("Connected Live Contracts:");
  console.log(`  Vault:            ${vault.id}`);
  console.log(`  hXLM Token:       ${token.id}`);
  console.log(`  Blend Adapter:    ${blendAdapter.id}`);
  console.log(`  Admin/Depositor:  ${admin}`);
  console.log(`  Execution Agent:  ${agent}\n`);

  // Step 1: Query initial total assets and shares
  console.log("📊 [1/5] Querying initial Vault state from Testnet RPC...");
  const initAssetsRaw = runStellarCommand(
    `stellar contract invoke --id ${vault.id} --source hikari-admin --network testnet -- total_assets`
  );
  const initAssets = JSON.parse(initAssetsRaw.split("\n").pop().trim());
  const initSharesRaw = runStellarCommand(
    `stellar contract invoke --id ${vault.id} --source hikari-admin --network testnet -- total_shares`
  );
  const initShares = JSON.parse(initSharesRaw.split("\n").pop().trim());
  console.log(`  ✓ Current Vault Assets: ${initAssets} stroops (${(Number(initAssets) / 1e7).toFixed(2)} XLM)`);
  console.log(`  ✓ Current Vault Shares: ${initShares} stroops\n`);

  // Step 2: Deposit 50 XLM (500,000,000 stroops) into Vault
  console.log("📥 [2/5] Depositing 50 XLM into Vault from depositor account...");
  const depositAmount = 500000000n;
  const depositOutput = runStellarCommand(
    `stellar contract invoke --id ${vault.id} --source hikari-admin --network testnet --send=yes -- deposit --from ${admin} --amount ${depositAmount}`
  );
  const depositTx = parseTxHash(depositOutput);
  console.log(`  ✓ Deposit successful!`);
  if (depositTx) {
    console.log(`    Explorer: https://stellar.expert/explorer/testnet/tx/${depositTx}`);
  }

  // Step 3: Verify minted hXLM shares
  console.log("\n🪙 [3/5] Verifying minted hXLM (SEP-41) position token balance...");
  const balanceRaw = runStellarCommand(
    `stellar contract invoke --id ${token.id} --source hikari-admin --network testnet -- balance --id ${admin}`
  );
  const shareBalance = JSON.parse(balanceRaw.split("\n").pop().trim());
  console.log(`  ✓ Depositor hXLM Balance: ${shareBalance} stroops (${(Number(shareBalance) / 1e7).toFixed(2)} hXLM)`);

  // Step 4: Agent-signed allocation into Blend Protocol Adapter
  console.log("\n🤖 [4/5] Agent executing rebalance allocation to Blend Adapter (20 XLM)...");
  const allocAmount = 200000000n;
  const allocOutput = runStellarCommand(
    `stellar contract invoke --id ${vault.id} --source hikari-agent --network testnet --send=yes -- allocate_to_strategy --agent ${agent} --strategy ${blendAdapter.id} --amount ${allocAmount}`
  );
  const allocTx = parseTxHash(allocOutput);
  console.log(`  ✓ Strategy allocation committed!`);
  if (allocTx) {
    console.log(`    Explorer: https://stellar.expert/explorer/testnet/tx/${allocTx}`);
  }

  // Step 5: Query Blend strategy value & deallocate partial liquidity
  console.log("\n📈 [5/5] Auditing Blend Adapter position and testing deallocation...");
  const stratValRaw = runStellarCommand(
    `stellar contract invoke --id ${blendAdapter.id} --source hikari-admin --network testnet -- total_value`
  );
  const stratVal = JSON.parse(stratValRaw.split("\n").pop().trim());
  console.log(`  ✓ Blend Strategy Position: ${stratVal} stroops (${(Number(stratVal) / 1e7).toFixed(2)} XLM)`);

  const deallocAmount = 100000000n; // 10 XLM
  console.log(`  → Deallocating 10 XLM back to Vault idle reserve...`);
  const deallocOutput = runStellarCommand(
    `stellar contract invoke --id ${vault.id} --source hikari-agent --network testnet --send=yes -- deallocate_from_strategy --agent ${agent} --strategy ${blendAdapter.id} --amount ${deallocAmount}`
  );
  const deallocTx = parseTxHash(deallocOutput);
  console.log(`  ✓ Deallocation confirmed!`);
  if (deallocTx) {
    console.log(`    Explorer: https://stellar.expert/explorer/testnet/tx/${deallocTx}`);
  }

  // Final Summary
  console.log("\n================================================================================");
  console.log("🎉 [SUCCESS] All Live On-Chain Rebalance Operations Succeeded on Testnet!");
  console.log("================================================================================");
  console.log("Lifecycle Summary:");
  console.log(`  - Native Deposit:       50 XLM (${depositTx || 'Confirmed'})`);
  console.log(`  - Strategy Allocation:  20 XLM (${allocTx || 'Confirmed'})`);
  console.log(`  - Yield Deallocation:   10 XLM (${deallocTx || 'Confirmed'})`);
  console.log(`  - Live Explorer:        https://stellar.expert/explorer/testnet/contract/${vault.id}`);
  console.log("================================================================================\n");
}

runLiveCycle().catch((err) => {
  console.error("\n❌ Live Cycle Failed:", err.message);
  process.exit(1);
});
