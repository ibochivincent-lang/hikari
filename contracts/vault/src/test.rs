#![cfg(test)]
use super::*;
use hikari_mock_strategy::{MockStrategy, MockStrategyClient};
use hikari_policy_account::{PolicyAccount, PolicyAccountClient as PolicyContractClient};
use hikari_strategy_registry::{StrategyRegistry, StrategyRegistryClient as RegistryContractClient};
use hikari_token::{HikariToken, HikariTokenClient};
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env, String, Symbol,
};

struct TestFixture<'a> {
    env: Env,
    admin: Address,
    guardian: Address,
    agent: Address,
    user1: Address,
    user2: Address,
    asset_admin: Address,
    underlying_token: TokenClient<'a>,
    underlying_admin: StellarAssetClient<'a>,
    share_token: HikariTokenClient<'a>,
    vault: HikariVaultClient<'a>,
    vault_address: Address,
    registry: RegistryContractClient<'a>,
    policy: PolicyContractClient<'a>,
    mock_strategy: MockStrategyClient<'a>,
    mock_strategy_address: Address,
}

fn setup_test<'a>(env: &'a Env) -> TestFixture<'a> {
    env.mock_all_auths();

    let admin = Address::generate(env);
    let guardian = Address::generate(env);
    let agent = Address::generate(env);
    let user1 = Address::generate(env);
    let user2 = Address::generate(env);
    let asset_admin = Address::generate(env);

    // Register underlying asset token (simulating SAC / XLM)
    let asset_contract_id = env.register_stellar_asset_contract_v2(asset_admin.clone());
    let underlying_token = TokenClient::new(env, &asset_contract_id.address());
    let underlying_admin = StellarAssetClient::new(env, &asset_contract_id.address());

    // Register share token
    let dummy_vault = Address::generate(env);
    let share_contract_id = env.register(
        HikariToken,
        (
            admin.clone(),
            dummy_vault.clone(),
            String::from_str(env, "Hikari Shares"),
            Symbol::new(env, "hXLM"),
        ),
    );
    let share_token = HikariTokenClient::new(env, &share_contract_id);

    // Register registry
    let dummy_vault2 = Address::generate(env);
    let registry_id = env.register(
        StrategyRegistry,
        (admin.clone(), dummy_vault2.clone(), guardian.clone()),
    );
    let registry = RegistryContractClient::new(env, &registry_id);

    // Register withdrawal queue
    let queue_id = env.register(
        hikari_withdrawal_queue::WithdrawalQueue,
        (admin.clone(), dummy_vault2.clone(), 10u32),
    );

    // Register policy account
    let max_tx = 50_000_0000000i128; // 50,000 XLM
    let daily_limit = 100_000_0000000i128; // 100,000 XLM
    let policy_id = env.register(
        PolicyAccount,
        (admin.clone(), dummy_vault2.clone(), max_tx, daily_limit),
    );
    let policy = PolicyContractClient::new(env, &policy_id);

    // Register main vault
    let vault_id = env.register(
        HikariVault,
        (
            admin.clone(),
            guardian.clone(),
            asset_contract_id.address(),
            share_contract_id.clone(),
            registry_id.clone(),
            queue_id.clone(),
            policy_id.clone(),
        ),
    );
    let vault = HikariVaultClient::new(env, &vault_id);

    // Update vault reference in token, registry, policy
    share_token.set_vault(&vault_id);
    registry.set_vault(&vault_id);

    // Register mock strategy
    let strategy_id = env.register(
        MockStrategy,
        (vault_id.clone(), asset_contract_id.address(), 500u32), // 5% yield rate
    );
    let mock_strategy = MockStrategyClient::new(env, &strategy_id);

    // Authorize strategy in registry
    registry.add_strategy(&strategy_id, &50_000_0000000i128, &1u32);

    // Authorize agent and strategy in policy account
    policy.set_agent_status(&agent, &true);
    policy.set_contract_allowed(&strategy_id, &true);

    // Mint underlying assets to users for testing
    underlying_admin.mint(&user1, &100_000_0000000i128);
    underlying_admin.mint(&user2, &100_000_0000000i128);

    TestFixture {
        env: env.clone(),
        admin,
        guardian,
        agent,
        user1,
        user2,
        asset_admin,
        underlying_token,
        underlying_admin,
        share_token,
        vault,
        vault_address: vault_id,
        registry,
        policy,
        mock_strategy,
        mock_strategy_address: strategy_id,
    }
}

#[test]
fn test_deposit_and_share_issuance() {
    let env = Env::default();
    let f = setup_test(&env);

    let deposit_amt = 10_000_0000000i128; // 10,000 XLM
    let shares_minted = f.vault.deposit(&f.user1, &deposit_amt);

    assert!(shares_minted > 0);
    assert_eq!(f.share_token.balance(&f.user1), shares_minted);
    assert_eq!(f.vault.total_assets(), deposit_amt);
}

#[test]
fn test_virtual_shares_anti_inflation_defense() {
    let env = Env::default();
    let f = setup_test(&env);

    // User 1 deposits 1 stroop (minimal deposit)
    let u1_deposit = 1i128;
    let u1_shares = f.vault.deposit(&f.user1, &u1_deposit);
    assert!(u1_shares > 0);

    // Attacker donates 10,000 XLM directly to the vault to attempt inflation attack
    let donation = 10_000_0000000i128;
    f.underlying_admin.mint(&f.vault_address, &donation);

    // User 2 deposits 100 XLM
    let u2_deposit = 100_0000000i128;
    let u2_shares = f.vault.deposit(&f.user2, &u2_deposit);

    // Without virtual shares, u2 would have received 0 shares due to integer truncation.
    // With Hikari's virtual offset (1000 virtual shares / 1 virtual asset), u2 receives valid non-zero shares!
    assert!(u2_shares > 0);
    assert!(f.share_token.balance(&f.user2) > 0);
}

#[test]
fn test_withdraw_returns_correct_assets() {
    let env = Env::default();
    let f = setup_test(&env);

    let deposit_amt = 10_000_0000000i128;
    let shares = f.vault.deposit(&f.user1, &deposit_amt);

    let initial_balance = f.underlying_token.balance(&f.user1);
    let assets_returned = f.vault.withdraw(&f.user1, &shares);

    // Assets returned should be approximately equal to deposited amount (modulo virtual offset math)
    assert!(assets_returned > 0);
    assert!(assets_returned <= deposit_amt);
    assert_eq!(f.share_token.balance(&f.user1), 0);
    assert_eq!(f.underlying_token.balance(&f.user1), initial_balance + assets_returned);
}

#[test]
fn test_agent_strategy_allocation_with_policy() {
    let env = Env::default();
    let f = setup_test(&env);

    // Deposit funds into vault
    f.vault.deposit(&f.user1, &20_000_0000000i128);

    // Agent allocates 5,000 XLM to mock strategy
    let alloc_amt = 5_000_0000000i128;
    f.vault.allocate_to_strategy(&f.agent, &f.mock_strategy_address, &alloc_amt);

    // Verify strategy received funds and vault accounting updated
    assert_eq!(f.mock_strategy.total_value(), alloc_amt);
    assert_eq!(f.vault.total_assets(), 20_000_0000000i128);

    // Test deallocation
    let withdrawn = f.vault.deallocate_from_strategy(&f.agent, &f.mock_strategy_address, &2_000_0000000i128);
    assert_eq!(withdrawn, 2_000_0000000i128);
    assert_eq!(f.mock_strategy.total_value(), 3_000_0000000i128);
}

#[test]
#[should_panic]
fn test_policy_rejects_unauthorized_destination() {
    let env = Env::default();
    let f = setup_test(&env);

    f.vault.deposit(&f.user1, &10_000_0000000i128);

    let rogue_contract = Address::generate(&env);
    // Should fail policy verification because rogue_contract is not allowed
    f.vault.allocate_to_strategy(&f.agent, &rogue_contract, &1_000_0000000i128);
}

#[test]
#[should_panic]
fn test_emergency_pause_blocks_deposits() {
    let env = Env::default();
    let f = setup_test(&env);

    // Guardian triggers emergency pause
    f.vault.pause(&f.guardian);

    // Deposit must fail while paused
    f.vault.deposit(&f.user1, &1_000_0000000i128);
}
