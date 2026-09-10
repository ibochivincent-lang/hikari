#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::StellarAssetClient;

#[test]
fn test_phoenix_adapter_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let _admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let clamm_pool = Address::generate(&env);

    // Deploy test token for underlying asset
    let token_admin = Address::generate(&env);
    let asset_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
    let asset_address = asset_contract.address();
    let asset_client = StellarAssetClient::new(&env, &asset_address);

    let contract_id = env.register(
        PhoenixAdapter,
        (
            vault.clone(),
            asset_address.clone(),
            clamm_pool.clone(),
            -1000i32,
            1000i32,
            30u32, // 0.30% fee tier
        ),
    );
    let client = PhoenixAdapterClient::new(&env, &contract_id);

    // Initial state check
    assert_eq!(client.total_value(), 0);

    // Deposit 10,000 XLM into concentrated liquidity
    let deposit_amount = 10_000_0000000i128;
    asset_client.mint(&contract_id, &deposit_amount);

    let res = client.deposit(&deposit_amount);
    assert_eq!(res, deposit_amount);
    assert_eq!(client.total_value(), deposit_amount);

    // Accrue trading fees from concentrated pool swaps
    let swap_fees = 250_0000000i128; // 250 XLM
    client.accrue_fees(&swap_fees);
    assert_eq!(client.total_value(), deposit_amount + swap_fees);

    // Recenter active price ticks
    client.recenter_ticks(&-500, &1500);

    // Partial withdrawal (fees + part of principal)
    let withdraw_amount = 2_000_0000000i128;
    let withdrawn = client.withdraw(&withdraw_amount);
    assert_eq!(withdrawn, withdraw_amount);
    assert_eq!(client.total_value(), deposit_amount + swap_fees - withdraw_amount);

    // Emergency exit
    let exit_total = client.emergency_exit();
    assert_eq!(exit_total, deposit_amount + swap_fees - withdraw_amount);
    assert_eq!(client.total_value(), 0);
}
