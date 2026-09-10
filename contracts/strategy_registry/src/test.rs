#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_strategy_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let guardian = Address::generate(&env);
    let strategy = Address::generate(&env);

    let reg_id = env.register(StrategyRegistry, (admin.clone(), vault.clone(), guardian.clone()));
    let client = StrategyRegistryClient::new(&env, &reg_id);

    // Add strategy with 50,000 cap
    let cap = 50_000_0000000i128;
    client.add_strategy(&strategy, &cap, &1u32);

    let info = client.get_strategy(&strategy);
    assert_eq!(info.cap, cap);
    assert_eq!(info.allocated, 0);

    // Vault records allocation
    client.record_allocation(&strategy, &20_000_0000000i128);
    let info2 = client.get_strategy(&strategy);
    assert_eq!(info2.allocated, 20_000_0000000i128);

    // Exceeding cap must fail
    assert!(client.try_record_allocation(&strategy, &40_000_0000000i128).is_err());

    // Guardian pauses strategy
    client.pause_strategy(&guardian, &strategy);
    let paused_info = client.get_strategy(&strategy);
    assert_eq!(paused_info.status, StrategyStatus::Paused);

    // Further allocations while paused must fail
    assert!(client.try_record_allocation(&strategy, &1_000_0000000i128).is_err());
}
