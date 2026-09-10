import { MarketData } from "./market_agent.js";

export interface RankedStrategy {
  strategyId: string;
  name: string;
  nominalApyBps: number;
  riskAdjustedApyBps: number;
  score: number;
  recommendedAction: "ALLOCATE" | "MAINTAIN" | "DEALLOCATE";
}

export class YieldAgent {
  public rankStrategies(market: MarketData): RankedStrategy[] {
    const strategies = [
      {
        strategyId: "strat_blend_xlm_01",
        name: "Blend Protocol XLM Lending",
        nominalApyBps: market.blendSupplyApyBps,
        riskPenaltyBps: 40, // Lending pool risk factor
      },
      {
        strategyId: "strat_soroswap_xlm_usdc_01",
        name: "Soroswap XLM-USDC AMM Pool",
        nominalApyBps: market.soroswapFeeApyBps,
        riskPenaltyBps: 180, // Impermanent loss risk factor adjusted by volatility
      },
      {
        strategyId: "strat_phoenix_xlm_usdc_01",
        name: "Phoenix XLM-USDC Concentrated Liquidity",
        nominalApyBps: market.phoenixFeeApyBps,
        riskPenaltyBps: 120,
      },
    ];

    return strategies
      .map((s) => {
        const riskAdjusted = Math.max(0, s.nominalApyBps - s.riskPenaltyBps);
        const score = riskAdjusted / 100;
        return {
          strategyId: s.strategyId,
          name: s.name,
          nominalApyBps: s.nominalApyBps,
          riskAdjustedApyBps: riskAdjusted,
          score,
          recommendedAction: score > 5.0 ? ("ALLOCATE" as const) : ("MAINTAIN" as const),
        };
      })
      .sort((a, b) => b.score - a.score);
  }
}
