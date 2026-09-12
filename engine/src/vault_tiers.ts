// engine/src/vault_tiers.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Multi-vault strategy definitions and risk-tiered configuration profiles for Hikari Protocol.

export interface VaultTierConfig {
  id: string;
  name: string;
  shareSymbol: string;
  underlyingAsset: string;
  riskTier: "CONSERVATIVE" | "BALANCED" | "DYNAMIC_ALPHA";
  riskScore: number; // 1 to 10 scale
  targetApyRange: [number, number]; // [min%, max%]
  allocationWeights: {
    blendLendingPct: number;
    phoenixClammPct: number;
    soroswapAmmPct: number;
    mevBackrunPct: number;
    liquidReservePct: number;
  };
  policyConstraints: {
    maxDrawdownThresholdBps: number;
    maxSingleRebalancePct: number;
    bunkerTriggerDrawdownBps: number;
    minIdleReservePct: number;
  };
}

export const VAULT_TIERS: Record<string, VaultTierConfig> = {
  // Tier 1: Conservative Stablecoin Vault (Principal preservation focus)
  CONSERVATIVE_USDC: {
    id: "vault_conservative_usdc",
    name: "Conservative Stablecoin Yield Vault",
    shareSymbol: "hUSDC",
    underlyingAsset: "USDC (SEP-41 SAC)",
    riskTier: "CONSERVATIVE",
    riskScore: 1.5,
    targetApyRange: [4.5, 6.2],
    allocationWeights: {
      blendLendingPct: 80,
      phoenixClammPct: 0,
      soroswapAmmPct: 0,
      mevBackrunPct: 0,
      liquidReservePct: 20,
    },
    policyConstraints: {
      maxDrawdownThresholdBps: 300, // 3%
      maxSingleRebalancePct: 15,
      bunkerTriggerDrawdownBps: 500, // 5%
      minIdleReservePct: 20,
    },
  },

  // Tier 2: Balanced Multi-Strategy Vault (The flagship hXLM vault)
  BALANCED_HXLM: {
    id: "vault_balanced_hxlm",
    name: "Balanced Multi-Strategy Core Vault",
    shareSymbol: "hXLM",
    underlyingAsset: "XLM (Native)",
    riskTier: "BALANCED",
    riskScore: 4.5,
    targetApyRange: [6.5, 9.5],
    allocationWeights: {
      blendLendingPct: 40,
      phoenixClammPct: 30,
      soroswapAmmPct: 15,
      mevBackrunPct: 0,
      liquidReservePct: 15,
    },
    policyConstraints: {
      maxDrawdownThresholdBps: 1000, // 10%
      maxSingleRebalancePct: 25,
      bunkerTriggerDrawdownBps: 1500, // 15%
      minIdleReservePct: 15,
    },
  },

  // Tier 3: Dynamic MEV Alpha Vault (High APY with active atomic MEV searcher capture)
  DYNAMIC_ALPHA_HXLM: {
    id: "vault_dynamic_alpha_hxlm",
    name: "Dynamic MEV Alpha High-Yield Vault",
    shareSymbol: "hXLM-α",
    underlyingAsset: "XLM (Native)",
    riskTier: "DYNAMIC_ALPHA",
    riskScore: 7.2,
    targetApyRange: [11.0, 16.5],
    allocationWeights: {
      blendLendingPct: 20,
      phoenixClammPct: 40,
      soroswapAmmPct: 15,
      mevBackrunPct: 15,
      liquidReservePct: 10,
    },
    policyConstraints: {
      maxDrawdownThresholdBps: 1800, // 18%
      maxSingleRebalancePct: 35,
      bunkerTriggerDrawdownBps: 2000, // 20%
      minIdleReservePct: 10,
    },
  },
};
