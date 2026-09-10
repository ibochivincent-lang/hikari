#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

#[test]
fn test_policy_limits_and_daily_window() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let agent = Address::generate(&env);
    let target = Address::generate(&env);

    let max_tx = 1_000_0000000i128;
    let daily_limit = 2_000_0000000i128;

    let policy_id = env.register(
        PolicyAccount,
        (admin.clone(), vault.clone(), max_tx, daily_limit),
    );
    let client = PolicyAccountClient::new(&env, &policy_id);

    client.set_agent_status(&agent, &true);
    client.set_contract_allowed(&target, &true);

    // 1. Successful spend
    client.verify_and_record_action(&agent, &target, &800_0000000i128);

    // 2. Spending more than max_tx fails
    assert!(client.try_verify_and_record_action(&agent, &target, &1_200_0000000i128).is_err());

    // 3. Second spend within daily limit
    client.verify_and_record_action(&agent, &target, &900_0000000i128);

    // Total spent today is now 1,700 XLM. Spending 500 XLM would exceed 2,000 XLM limit
    assert!(client.try_verify_and_record_action(&agent, &target, &500_0000000i128).is_err());

    // Advance ledger by 1 full day (17,280 ledgers)
    env.ledger().set_sequence_number(env.ledger().sequence() + 17281);

    // Now daily limit has reset! Spending 500 XLM succeeds
    client.verify_and_record_action(&agent, &target, &500_0000000i128);
}
