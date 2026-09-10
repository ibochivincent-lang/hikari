#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

#[test]
fn test_soroswap_adapter_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let asset_admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let pair = Address::generate(&env);

    let asset_id = env.register_stellar_asset_contract_v2(asset_admin);
    let asset_token = TokenClient::new(&env, &asset_id.address());
    let asset_minter = StellarAssetClient::new(&env, &asset_id.address());

    // Register Soroswap adapter with 780 bps (7.80% fee APR)
    let adapter_id = env.register(
        SoroswapAdapter,
        (
            vault.clone(),
            asset_id.address(),
            pair,
            780u32,
        ),
    );
    let adapter = SoroswapAdapterClient::new(&env, &adapter_id);

    // Deposit 50,000 XLM
    let deposit_amount = 50_000_0000000i128;
    asset_minter.mint(&adapter_id, &deposit_amount);
    adapter.deposit(&deposit_amount);

    assert_eq!(adapter.total_value(), deposit_amount);

    // Harvest trading swap fees: 7.8% on 50,000 = 3,900 XLM
    let fees = adapter.harvest();
    assert_eq!(fees, 3_900_0000000i128);
    assert_eq!(adapter.total_value(), 53_900_0000000i128);

    // Mint fees into adapter for transfer
    asset_minter.mint(&adapter_id, &fees);

    // Withdraw 15,000 XLM
    let withdrawn = adapter.withdraw(&15_000_0000000i128);
    assert_eq!(withdrawn, 15_000_0000000i128);
    assert_eq!(asset_token.balance(&vault), 15_000_0000000i128);
    assert_eq!(adapter.total_value(), 38_900_0000000i128);

    // Emergency exit pulls remaining 38,900 XLM back to vault
    let recovered = adapter.emergency_exit();
    assert_eq!(recovered, 38_900_0000000i128);
    assert_eq!(adapter.total_value(), 0);
    assert_eq!(asset_token.balance(&vault), 53_900_0000000i128);
}
