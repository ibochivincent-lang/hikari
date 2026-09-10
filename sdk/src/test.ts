// sdk/src/test.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

import test from "node:test";
import assert from "node:assert";
import { HikariClient } from "./client.js";

test("HikariClient initializes with valid default testnet contracts", () => {
  const client = new HikariClient();
  assert.strictEqual(client.config.network, "testnet");
  assert.strictEqual(client.config.contracts.vaultId, "CCR6NFKICAK4KW2SVKU4UESG5SR6RMYRVUDDO6K7BB6NUWYSMGQS5KT5");
  assert.strictEqual(client.config.contracts.gateSealId, "CAS5XIHKYBCCW7WTYDBGGLQ5P7OSQHEPVIUWCQ2W5ARMYXWUCQSEZYDJ");
});

test("HikariClient calculates NAV correctly with virtual share inflation protection", () => {
  const client = new HikariClient();
  // 100,000 XLM assets, 100,000 hXLM shares
  const nav = client.calculateNav(100_000_0000000n, 100_000_0000000n);
  assert.strictEqual(nav, 1.0);

  // 104,280 XLM assets, 100,000 hXLM shares (+4.28% yield accrued)
  const yieldNav = client.calculateNav(104_280_0000000n, 100_000_0000000n);
  assert.strictEqual(yieldNav, 1.0428);
});

test("previewDeposit and previewRedeem handle standard and Bunker Mode scenarios", () => {
  const client = new HikariClient();
  const totalAssets = 100_000_0000000n;
  const totalShares = 100_000_0000000n;

  // Deposit 1,000 XLM
  const sharesMinted = client.previewDeposit(1_000_0000000n, totalAssets, totalShares);
  assert.ok(sharesMinted >= 1_000_0000000n && sharesMinted <= 1_000_0000010n);

  // Normal redeem (0% haircut)
  const assetsNormal = client.previewRedeem(500_0000000n, totalAssets, totalShares, 0);
  assert.ok(assetsNormal >= 499_9999990n && assetsNormal <= 500_0000000n);

  // Bunker Mode redeem (15% haircut = 1500 bps)
  const assetsBunker = client.previewRedeem(500_0000000n, totalAssets, totalShares, 1500);
  assert.ok(assetsBunker >= 424_9999990n && assetsBunker <= 425_0000000n); // 500 - 15% = 425 XLM
});


test("buildDepositTx and buildClaimBatchTx construct valid invocation payloads", () => {
  const client = new HikariClient();
  const depositPayload = client.buildDepositTx("GABCD123", 250_0000000n);
  assert.strictEqual(depositPayload.functionName, "deposit");
  assert.strictEqual(depositPayload.contractId, client.config.contracts.vaultId);
  assert.strictEqual(depositPayload.args.amount, "2500000000");

  const batchPayload = client.buildClaimBatchTx("GUSER123", [101n, 102n, 103n]);
  assert.strictEqual(batchPayload.functionName, "claim_batch");
  assert.deepStrictEqual(batchPayload.args.ticket_ids, ["101", "102", "103"]);
});

test("parseTicketStatus evaluates cooldown vs ready correctly", () => {
  const client = new HikariClient();
  assert.strictEqual(
    client.parseTicketStatus({ unlockLedger: 500, claimed: false, cancelled: false }, 450),
    "IN_COOLDOWN"
  );
  assert.strictEqual(
    client.parseTicketStatus({ unlockLedger: 500, claimed: false, cancelled: false }, 501),
    "READY"
  );
  assert.strictEqual(
    client.parseTicketStatus({ unlockLedger: 500, claimed: true, cancelled: false }, 600),
    "CLAIMED"
  );
});
