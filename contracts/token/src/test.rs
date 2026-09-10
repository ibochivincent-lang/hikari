#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, Env, String, Symbol,
};

#[test]
fn test_token_mint_burn_and_transfers() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let token_id = env.register(
        HikariToken,
        (
            admin.clone(),
            vault.clone(),
            String::from_str(&env, "Hikari Shares"),
            Symbol::new(&env, "hXLM"),
        ),
    );
    let token = HikariTokenClient::new(&env, &token_id);

    // Vault mints 1000 shares to Alice
    token.mint(&alice, &1000_0000000i128);
    assert_eq!(token.balance(&alice), 1000_0000000i128);
    assert_eq!(token.total_supply(), 1000_0000000i128);

    // Alice transfers 400 shares to Bob
    token.transfer(&alice, &bob, &400_0000000i128);
    assert_eq!(token.balance(&alice), 600_0000000i128);
    assert_eq!(token.balance(&bob), 400_0000000i128);

    // Vault burns 100 shares from Bob
    token.burn(&bob, &100_0000000i128);
    assert_eq!(token.balance(&bob), 300_0000000i128);
    assert_eq!(token.total_supply(), 900_0000000i128);
}
