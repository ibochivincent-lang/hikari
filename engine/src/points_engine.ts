// engine/src/points_engine.ts
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// "Hikari Shards" Loyalty & TVL Bootstrapping Engine

export interface UserStakingPosition {
  userAddress: string;
  tierId: "CONSERVATIVE_USDC" | "BALANCED_HXLM" | "DYNAMIC_ALPHA_HXLM";
  stakedAmountUsd: number;
  durationDays: number;
  isLpOnDex?: boolean;
  isBlendCollateral?: boolean;
  referredBy?: string;
}

export interface UserPointsProfile {
  userAddress: string;
  totalShards: number;
  baseRatePerDay: number;
  activeMultiplier: number;
  rank: number;
  tier: string;
  badges: string[];
}

export class HikariPointsEngine {
  private static readonly BASE_SHARDS_PER_USD_DAY = 10;

  // Multiplier matrix by vault strategy tier
  private static readonly TIER_MULTIPLIERS: Record<string, number> = {
    CONSERVATIVE_USDC: 1.0,  // Low risk baseline
    BALANCED_HXLM: 1.5,      // Standard liquid staking
    DYNAMIC_ALPHA_HXLM: 2.5, // MEV alpha high incentive
  };

  private users: Map<string, UserPointsProfile> = new Map();

  constructor() {
    this.seedMockLeaderboard();
  }

  /**
   * Calculate daily shards earned by a staker given position metrics
   */
  public calculateDailyShards(pos: UserStakingPosition): { dailyShards: number; multiplier: number } {
    const tierMultiplier = HikariPointsEngine.TIER_MULTIPLIERS[pos.tierId] || 1.0;
    
    // Duration lockup booster
    let durationBoost = 1.0;
    if (pos.durationDays >= 180) durationBoost = 2.0;      // +100%
    else if (pos.durationDays >= 90) durationBoost = 1.5;  // +50%
    else if (pos.durationDays >= 30) durationBoost = 1.2;  // +20%

    // Ecosystem cross-composability booster
    let ecosystemBoost = 1.0;
    if (pos.isLpOnDex) ecosystemBoost += 0.25;
    if (pos.isBlendCollateral) ecosystemBoost += 0.25;

    const totalMultiplier = Number((tierMultiplier * durationBoost * ecosystemBoost).toFixed(2));
    const dailyShards = Math.round(pos.stakedAmountUsd * HikariPointsEngine.BASE_SHARDS_PER_USD_DAY * totalMultiplier);

    return { dailyShards, multiplier: totalMultiplier };
  }

  /**
   * Get or initialize a user's points profile
   */
  public getUserProfile(address: string, stakedAmountUsd: number = 250, tierId: "BALANCED_HXLM" = "BALANCED_HXLM"): UserPointsProfile {
    if (this.users.has(address)) {
      return this.users.get(address)!;
    }

    const { dailyShards, multiplier } = this.calculateDailyShards({
      userAddress: address,
      tierId,
      stakedAmountUsd,
      durationDays: 45,
      isBlendCollateral: true,
    });

    const profile: UserPointsProfile = {
      userAddress: address,
      totalShards: dailyShards * 30, // 30 days accumulated
      baseRatePerDay: dailyShards,
      activeMultiplier: multiplier,
      rank: 42,
      tier: "Luminescent Guardian",
      badges: ["Early Testnet Pioneer", "Blend Integrator", "Passkey Signer"],
    };

    this.users.set(address, profile);
    return profile;
  }

  /**
   * Return top leaderboard rankings
   */
  public getLeaderboard(): { rank: number; address: string; shards: number; tier: string }[] {
    return [
      { rank: 1, address: "GCJSDY6...6BQN", shards: 1420500, tier: "Solar Archon" },
      { rank: 2, address: "GAQZQAB...5L2", shards: 980400, tier: "Solar Archon" },
      { rank: 3, address: "GBBD47I...7DEV", shards: 675200, tier: "Starlight Warden" },
      { rank: 4, address: "GDLOBST...HIKARI", shards: 412000, tier: "Starlight Warden" },
      { rank: 5, address: "GBXBULL...HIKARI", shards: 289400, tier: "Luminescent Guardian" },
    ];
  }

  private seedMockLeaderboard() {
    // Initialized seed profiles
  }
}
