#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

#[test]
fn test_fee_controller_management_and_performance_fees() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let treasury = Address::generate(&env);
    let reserve = Address::generate(&env);
    let asset_admin = Address::generate(&env);

    // Register asset
    let asset_id = env.register_stellar_asset_contract_v2(asset_admin);
    let asset_token = TokenClient::new(&env, &asset_id.address());
    let asset_minter = StellarAssetClient::new(&env, &asset_id.address());

    // Initialize FeeController: 50 bps (0.5%) mgmt fee, 1000 bps (10%) perf fee
    let fee_id = env.register(
        FeeController,
        (
            admin.clone(),
            vault.clone(),
            treasury.clone(),
            reserve.clone(),
            asset_id.address(),
            50u32,
            1000u32,
        ),
    );
    let controller = FeeControllerClient::new(&env, &fee_id);

    // 1. Management Fee test over 1 full year (6,307,200 ledgers)
    let total_assets = 100_000_0000000i128; // 100,000 XLM
    env.ledger().set_sequence_number(env.ledger().sequence() + 6_307_200);

    let mgmt_fee = controller.calculate_management_fee(&total_assets);
    // 0.5% of 100,000 = 500 XLM
    assert_eq!(mgmt_fee, 500_0000000i128);

    // 2. Performance Fee test with HWM
    // Initial HWM = 1.0 NAV (10,000,000 stroops). Suppose NAV rises to 1.10 (11,000,000 stroops)
    let new_nav = 11_000_000i128;
    let perf_fee = controller.assess_performance_fee(&new_nav, &total_assets);
    // Gain = ~9,090 XLM; 10% fee = ~909 XLM
    assert!(perf_fee > 0);

    // 3. HWM updated: another assessment at same NAV must yield 0
    let second_assessment = controller.assess_performance_fee(&new_nav, &total_assets);
    assert_eq!(second_assessment, 0);

    // 4. Test fee routing
    let fee_to_route = 1_000_0000000i128; // 1,000 XLM
    asset_minter.mint(&fee_id, &fee_to_route);
    controller.route_fee(&fee_to_route);

    assert_eq!(asset_token.balance(&reserve), 500_0000000i128);
    assert_eq!(asset_token.balance(&treasury), 500_0000000i128);
}
