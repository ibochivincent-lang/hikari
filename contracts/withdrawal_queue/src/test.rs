#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env};

#[test]
fn test_withdrawal_queue_lifecycle_and_cooldown() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let user = Address::generate(&env);
    let cooldown_ledgers = 50u32;

    let queue_id = env.register(
        WithdrawalQueue,
        (admin.clone(), vault.clone(), cooldown_ledgers),
    );
    let client = WithdrawalQueueClient::new(&env, &queue_id);

    // Request withdrawal
    let shares = 1_000_0000000i128;
    let req_id = client.request_withdrawal(&user, &shares);
    assert_eq!(req_id, 1);

    let req = client.get_request(&req_id);
    assert_eq!(req.shares, shares);
    assert_eq!(req.finalized, false);

    // Finalize withdrawal with 990 XLM (e.g. after 1% unbonding slippage/fees)
    let claimable_assets = 990_0000000i128;
    client.finalize_withdrawal(&req_id, &claimable_assets);

    let finalized_req = client.get_request(&req_id);
    assert_eq!(finalized_req.finalized, true);
    assert_eq!(finalized_req.claimable_assets, claimable_assets);

    // Attempting to claim before cooldown must fail
    env.ledger().set_sequence_number(env.ledger().sequence() + 10);
    let premature_claim = client.try_claim_withdrawal(&user, &req_id);
    assert!(premature_claim.is_err());

    // Advance ledger past cooldown
    env.ledger().set_sequence_number(env.ledger().sequence() + 45);
    let claimed = client.claim_withdrawal(&user, &req_id);
    assert_eq!(claimed, claimable_assets);

    // Claimed request should be removed
    assert!(client.try_get_request(&req_id).is_err());
}

#[test]
fn test_withdrawal_cancellation_before_finalization() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let user = Address::generate(&env);

    let queue_id = env.register(WithdrawalQueue, (admin, vault, 10u32));
    let client = WithdrawalQueueClient::new(&env, &queue_id);

    let shares = 500_0000000i128;
    let req_id = client.request_withdrawal(&user, &shares);

    // User cancels
    let returned_shares = client.cancel_withdrawal(&user, &req_id);
    assert_eq!(returned_shares, shares);
    assert!(client.try_get_request(&req_id).is_err());
}

#[test]
fn test_bunker_mode_haircut_and_extended_cooldown() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let user = Address::generate(&env);
    let cooldown_ledgers = 20u32;

    let queue_id = env.register(
        WithdrawalQueue,
        (admin.clone(), vault.clone(), cooldown_ledgers),
    );
    let client = WithdrawalQueueClient::new(&env, &queue_id);

    // Initial mode is Turbo
    let (mode, haircut) = client.get_queue_mode();
    assert_eq!(mode, QueueMode::Turbo as u32);
    assert_eq!(haircut, 0);

    let shares = 1_000_0000000i128;
    let req_id = client.request_withdrawal(&user, &shares);
    client.finalize_withdrawal(&req_id, &1_000_0000000i128);

    // Enter Bunker Mode: 10% haircut (1000 bps) and +50 extra cooldown ledgers
    client.enter_bunker_mode(&1000u32, &50u32);
    let (bunker_mode, active_haircut) = client.get_queue_mode();
    assert_eq!(bunker_mode, QueueMode::Bunker as u32);
    assert_eq!(active_haircut, 1000);

    // Advance 30 ledgers (past standard 20, but still within 20+50=70 bunker cooldown)
    env.ledger().set_sequence_number(env.ledger().sequence() + 30);
    assert!(client.try_claim_withdrawal(&user, &req_id).is_err());

    // Advance another 50 ledgers (total > 70)
    env.ledger().set_sequence_number(env.ledger().sequence() + 50);
    let payout = client.claim_withdrawal(&user, &req_id);
    // 1,000 XLM with 10% haircut = 900 XLM
    assert_eq!(payout, 900_0000000i128);

    // Exit Bunker Mode back to Turbo
    client.exit_bunker_mode();
    let (reset_mode, reset_haircut) = client.get_queue_mode();
    assert_eq!(reset_mode, QueueMode::Turbo as u32);
    assert_eq!(reset_haircut, 0);
}

#[test]
fn test_batch_claiming() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let user = Address::generate(&env);

    let queue_id = env.register(WithdrawalQueue, (admin, vault, 5u32));
    let client = WithdrawalQueueClient::new(&env, &queue_id);

    let req1 = client.request_withdrawal(&user, &100_0000000i128);
    let req2 = client.request_withdrawal(&user, &200_0000000i128);

    client.finalize_withdrawal(&req1, &100_0000000i128);
    client.finalize_withdrawal(&req2, &200_0000000i128);

    env.ledger().set_sequence_number(env.ledger().sequence() + 10);

    let mut ids = Vec::new(&env);
    ids.push_back(req1);
    ids.push_back(req2);

    let total = client.claim_batch(&user, &ids);
    assert_eq!(total, 300_0000000i128);
}

