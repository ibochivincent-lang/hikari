// sdk/src/types.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

export type StellarNetwork = "testnet" | "pubnet" | "custom";

export interface HikariContractsConfig {
  vaultId: string;
  tokenId: string;
  strategyRegistryId: string;
  withdrawalQueueId: string;
  policyAccountId: string;
  gateSealId: string;
  blendAdapterId?: string;
  phoenixAdapterId?: string;
}

export interface SdkConfig {
  network: StellarNetwork;
  rpcUrl: string;
  contracts: HikariContractsConfig;
  networkPassphrase?: string;
}

export interface VaultMetrics {
  totalAssetsStroops: bigint;
  totalSharesStroops: bigint;
  idleAssetsStroops: bigint;
  navPerShare: number; // e.g. 1.0428
  exchangeRateXlmPerHxlm: number;
}

export interface WithdrawalTicketInfo {
  ticketId: bigint;
  userAddress: string;
  sharesBurnedStroops: bigint;
  claimableAssetsStroops: bigint;
  unlockLedger: number;
  claimed: boolean;
  cancelled: boolean;
  status: "READY" | "IN_COOLDOWN" | "CLAIMED" | "CANCELLED";
}

export interface CircuitBreakerState {
  isGateSealed: boolean;
  isBunkerMode: boolean;
  haircutBps: number;
  currentLedger?: number;
}

export interface MevYieldSnapshot {
  totalCapturedStroops: bigint;
  totalVaultBoostStroops: bigint;
  lastSpreadBps: number;
  venues: string;
}
