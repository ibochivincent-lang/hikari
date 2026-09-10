// Deploy and initialize Hikari contracts on Stellar Testnet
// Author: ibochivincent-lang

const { Keypair, Horizon, Networks } = require("@stellar/stellar-sdk");
const fs = require("fs");
const path = require("path");

const TESTNET_HORIZON = "https://horizon-testnet.stellar.org";
const TESTNET_RPC = "https://soroban-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";

async function fundAccount(publicKey) {
  console.log(`Funding account ${publicKey} via Friendbot...`);
  const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!res.ok) {
    throw new Error(`Friendbot funding failed: ${res.statusText}`);
  }
  console.log(`✓ Account funded successfully.`);
}

async function main() {
  console.log("==================================================");
  console.log("🌟 [HIKARI] Stellar Testnet Deployment Tool");
  console.log("==================================================");

  // 1. Generate or load deployment identities
  const keysPath = path.join(__dirname, "testnet_keys.json");
  let keys;

  if (fs.existsSync(keysPath)) {
    keys = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
    console.log("Loaded existing testnet keys from testnet_keys.json");
  } else {
    console.log("Generating fresh deployer and agent keypairs...");
    const adminKp = Keypair.random();
    const guardianKp = Keypair.random();
    const agentKp = Keypair.random();

    keys = {
      admin: {
        publicKey: adminKp.publicKey(),
        secret: adminKp.secret(),
      },
      guardian: {
        publicKey: guardianKp.publicKey(),
        secret: guardianKp.secret(),
      },
      agent: {
        publicKey: agentKp.publicKey(),
        secret: agentKp.secret(),
      },
    };

    fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));
    console.log(`Saved keys to ${keysPath}`);

    // Fund admin and agent
    await fundAccount(keys.admin.publicKey);
    await fundAccount(keys.agent.publicKey);
  }

  console.log("\nDeployment Identity:");
  console.log(`  Admin / Deployer: ${keys.admin.publicKey}`);
  console.log(`  Emergency Guardian: ${keys.guardian.publicKey}`);
  console.log(`  Execution Agent: ${keys.agent.publicKey}`);

  console.log("\nCompiled WASM artifacts available in contracts/wasm/:");
  const wasmDir = path.join(__dirname, "..", "contracts", "wasm");
  const wasmFiles = fs.readdirSync(wasmDir).filter((f) => f.endsWith(".wasm"));
  for (const f of wasmFiles) {
    const size = fs.statSync(path.join(wasmDir, f)).size;
    console.log(`  - ${f} (${size} bytes)`);
  }

  console.log("\nReady for live deployment using 'stellar contract deploy' or RPC client.");
}

main().catch(console.error);
