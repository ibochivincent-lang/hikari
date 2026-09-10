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
}

export class PaymentAgent {
  private dailyBudgetStroops: bigint = 50_0000000n; // 50 USDC or XLM daily budget for paid data
  private spentTodayStroops: bigint = 0n;

  public canPay(req: PaymentRequest): boolean {
    if (this.spentTodayStroops + req.amountStroops > this.dailyBudgetStroops) {
      return false;
    }
    // Only pay approved telemetry/data providers
    return req.destination.startsWith("G") || req.destination.startsWith("C");
  }

  public async settlePayment(req: PaymentRequest): Promise<PaymentReceipt> {
    if (!this.canPay(req)) {
      throw new Error(`Payment exceeds daily machine agent budget or destination unapproved`);
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
    };
  }

  public getBudgetStatus() {
    return {
      dailyBudget: this.dailyBudgetStroops,
      spentToday: this.spentTodayStroops,
      remaining: this.dailyBudgetStroops - this.spentTodayStroops,
    };
  }
}
