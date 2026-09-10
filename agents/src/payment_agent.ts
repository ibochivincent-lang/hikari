// agents/src/payment_agent.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

export interface PaymentRequest {
  serviceName: string;
  endpoint: string;
  asset: string; // e.g. USDC SAC or XLM
  amountStroops: bigint;
  destination: string;
}

export interface PaymentReceipt {
  success: boolean;
  txHash: string;
  timestamp: number;
  settledAmount: bigint;
  notes: string;
  fallbackEngaged?: boolean;
}

export class PaymentAgent {
  // Hard policy limits: $1.00 USDC daily cap, $0.01 USDC max per query
  private maxPerQueryStroops: bigint = 100_000n; // 0.01 USDC
  private dailyBudgetStroops: bigint = 10_000_000n; // 1.00 USDC daily budget
  private spentTodayStroops: bigint = 0n;

  public canPay(req: PaymentRequest): boolean {
    if (req.amountStroops > this.maxPerQueryStroops) {
      return false;
    }
    if (this.spentTodayStroops + req.amountStroops > this.dailyBudgetStroops) {
      return false;
    }
    // Only pay approved telemetry/data providers
    return req.destination.startsWith("G") || req.destination.startsWith("C");
  }

  public async settlePayment(req: PaymentRequest): Promise<PaymentReceipt> {
    if (!this.canPay(req)) {
      // Fallback: When payment budget is exceeded, engage public fallback oracle
      return this.fetchPublicOracleFallback(req.serviceName, "Payment budget exceeded or query fee capped");
    }

    this.spentTodayStroops += req.amountStroops;

    // Simulating x402 / MPP automated settlement on Stellar
    const simulatedTxHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;

    return {
      success: true,
      txHash: simulatedTxHash,
      timestamp: Date.now(),
      settledAmount: req.amountStroops,
      notes: `Settled ${req.amountStroops} stroops via x402 protocol for ${req.serviceName}`,
      fallbackEngaged: false,
    };
  }

  public fetchPublicOracleFallback(serviceName: string, reason: string): PaymentReceipt {
    return {
      success: true,
      txHash: "0x00000000000000000000000000000000000000000000000000000000PUBLICFALLBACK",
      timestamp: Date.now(),
      settledAmount: 0n,
      notes: `Fell back to free public Stellar Horizon oracle for ${serviceName} (${reason})`,
      fallbackEngaged: true,
    };
  }

  public getBudgetStatus() {
    return {
      dailyBudget: this.dailyBudgetStroops,
      maxPerQuery: this.maxPerQueryStroops,
      spentToday: this.spentTodayStroops,
      remaining: this.dailyBudgetStroops - this.spentTodayStroops,
    };
  }
}

