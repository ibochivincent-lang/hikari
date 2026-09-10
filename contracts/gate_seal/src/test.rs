#![cfg(test)]
use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};

#[test]
fn test_gate_seal_lifecycle_and_auto_unseal() {
    let env = Env::default();
    env.mock_all_auths();

    let committee = Address::generate(&env);
    let vault = Address::generate(&env);
    let queue = Address::generate(&env);
    let seal_duration_ledgers = 100u32;
    let expiry_timestamp = 100_000u64;

    let gate_seal_id = env.register(
        GateSeal,
        (
            committee.clone(),
            vault.clone(),
            queue.clone(),
            seal_duration_ledgers,
            expiry_timestamp,
        ),
    );
    let client = GateSealClient::new(&env, &gate_seal_id);

    // Initial state: not sealed
    assert_eq!(client.is_sealed(), false);
    assert_eq!(client.is_seal_expired(), false);

    // Trigger seal (panic button)
    client.seal();
    assert_eq!(client.is_sealed(), true);
    assert_eq!(client.is_seal_expired(), false);

    // Second seal must fail (one-time use)
    assert!(client.try_seal().is_err());

    // Attempting unseal immediately must fail (cooldown not met)
    assert!(client.try_unseal().is_err());

    // Advance ledgers by 50 (still within seal duration)
    env.ledger().set_sequence_number(env.ledger().sequence() + 50);
    assert_eq!(client.is_seal_expired(), false);
    assert!(client.try_unseal().is_err());

    // Advance ledgers by another 60 (total 110 > 100 duration)
    env.ledger().set_sequence_number(env.ledger().sequence() + 60);
    assert_eq!(client.is_seal_expired(), true);

    // Unseal succeeds
    client.unseal();
    assert_eq!(client.is_sealed(), false);
}
