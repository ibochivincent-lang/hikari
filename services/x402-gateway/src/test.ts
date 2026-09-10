import test from "node:test";
import assert from "node:assert";
import { PaidTelemetryServer, X402Client } from "./index.js";

test("x402 workflow: 402 challenge, payment submission, and data access", async () => {
  const port = 8499;
  const server = new PaidTelemetryServer(port);
  await server.listen();

  try {
    const client = new X402Client();
    const result = await client.fetchPaidData(`http://127.0.0.1:${port}/feed`);

    assert.strictEqual(result.status, "PAID_ACCESS_GRANTED");
    assert.strictEqual(typeof result.paymentProof, "string");
    assert.strictEqual(typeof result.data.volatilityIndex, "number");
  } finally {
    await server.close();
  }
});
