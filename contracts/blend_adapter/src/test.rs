#![cfg(test)]
use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

#[test]
fn test_blend_adapter_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let asset_admin = Address::generate(&env);
    let vault = Address::generate(&env);
    let blend_pool = Address::generate(&env);

    // Register underlying asset token
    let asset_contract_id = env.register_stellar_asset_contract_v2(asset_admin);
    let underlying_token = TokenClient::new(&env, &asset_contract_id.address());
    let underlying_admin = StellarAssetClient::new(&env, &asset_contract_id.address());

    // Register Blend adapter with 600 bps (6.0% lending APY)
    let adapter_id = env.register(
        BlendAdapter,
        (
            vault.clone(),
            asset_contract_id.address(),
            blend_pool,
            600u32,
        ),
    );
    let adapter = BlendAdapterClient::new(&env, &adapter_id);

    // Vault supplies 100,000 XLM into adapter
    let deposit_amount = 100_000_0000000i128;
    underlying_admin.mint(&adapter_id, &deposit_amount);
    adapter.deposit(&deposit_amount);

    assert_eq!(adapter.total_value(), deposit_amount);

    // Simulate harvest: 6% yield generated on 100,000 XLM = 6,000 XLM
    let harvested = adapter.harvest();
    assert_eq!(harvested, 6_000_0000000i128);
    assert_eq!(adapter.total_value(), 106_000_0000000i128);

    // Mint harvested reward tokens into adapter so transfer succeeds on withdrawal
    underlying_admin.mint(&adapter_id, &harvested);

    // Vault withdraws 20,000 XLM
    let withdrawn = adapter.withdraw(&20_000_0000000i128);
    assert_eq!(withdrawn, 20_000_0000000i128);
    assert_eq!(underlying_token.balance(&vault), 20_000_0000000i128);
    assert_eq!(adapter.total_value(), 86_000_0000000i128);

    // Emergency exit pulls remaining 86,000 XLM back to vault
    let recovered = adapter.emergency_exit();
    assert_eq!(recovered, 86_000_0000000i128);
    assert_eq!(adapter.total_value(), 0);
    assert_eq!(underlying_token.balance(&vault), 106_000_0000000i128);

    // Operations fail after emergency exit (paused)
    assert!(adapter.try_deposit(&10_000_0000000i128).is_err());
}
