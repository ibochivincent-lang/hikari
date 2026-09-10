#![no_std]
use hikari_interfaces::{
    Error, LiquidTokenClient, PolicyAccountClient, StrategyAdapterClient, StrategyRegistryClient,
};
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env,
};

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - 10 * DAY_IN_LEDGERS;

const VIRTUAL_SHARES: i128 = 1000;
const VIRTUAL_ASSETS: i128 = 1;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    EmergencyGuardian,
    UnderlyingAsset,
    ShareToken,
    Registry,
    WithdrawalQueue,
    PolicyAccount,
    Paused,
    TotalIdleAssets,
    AllocatedAssets,
}

#[contract]
pub struct HikariVault;

#[contractimpl]
impl HikariVault {
    pub fn __constructor(
        env: Env,
        admin: Address,
        guardian: Address,
        asset: Address,
        share_token: Address,
        registry: Address,
        withdrawal_queue: Address,
        policy_account: Address,
    ) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::EmergencyGuardian, &guardian);
        env.storage().instance().set(&DataKey::UnderlyingAsset, &asset);
        env.storage().instance().set(&DataKey::ShareToken, &share_token);
        env.storage().instance().set(&DataKey::Registry, &registry);
        env.storage().instance().set(&DataKey::WithdrawalQueue, &withdrawal_queue);
        env.storage().instance().set(&DataKey::PolicyAccount, &policy_account);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::TotalIdleAssets, &0i128);
        env.storage().instance().set(&DataKey::AllocatedAssets, &0i128);
    }

    pub fn deposit(env: Env, from: Address, amount: i128) -> Result<i128, Error> {
        from.require_auth();
        Self::check_not_paused(&env)?;

        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        Self::extend_ttl(&env);

        let total_assets = Self::total_assets(env.clone());
        let total_shares = Self::total_shares(env.clone());

        // ERC-4626 style virtual offset math:
        // shares = amount * (total_shares + 1000) / (total_assets + 1)
        let numerator = amount
            .checked_mul(total_shares + VIRTUAL_SHARES)
            .ok_or(Error::MathOverflow)?;
        let denominator = total_assets + VIRTUAL_ASSETS;
        let shares_to_mint = numerator / denominator;

        if shares_to_mint <= 0 {
            return Err(Error::ZeroAmount);
        }

        // Transfer underlying asset to vault
        let asset_addr: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = token::Client::new(&env, &asset_addr);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        // Update idle assets
        let idle: i128 = env.storage().instance().get(&DataKey::TotalIdleAssets).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalIdleAssets, &(idle + amount));

        // Mint shares
        let share_addr: Address = env.storage().instance().get(&DataKey::ShareToken).unwrap();
        let share_client = LiquidTokenClient::new(&env, &share_addr);
        share_client.mint(&from, &shares_to_mint);

        Ok(shares_to_mint)
    }

    pub fn withdraw(env: Env, to: Address, shares: i128) -> Result<i128, Error> {
        to.require_auth();
        Self::check_not_paused(&env)?;

        if shares <= 0 {
            return Err(Error::ZeroAmount);
        }

        Self::extend_ttl(&env);

        let total_assets = Self::total_assets(env.clone());
        let total_shares = Self::total_shares(env.clone());

        let numerator = shares
            .checked_mul(total_assets + VIRTUAL_ASSETS)
            .ok_or(Error::MathOverflow)?;
        let denominator = total_shares + VIRTUAL_SHARES;
        let assets_to_return = numerator / denominator;

        let idle: i128 = env.storage().instance().get(&DataKey::TotalIdleAssets).unwrap_or(0);
        if idle < assets_to_return {
            return Err(Error::InsufficientBalance);
        }

        // Burn shares
        let share_addr: Address = env.storage().instance().get(&DataKey::ShareToken).unwrap();
        let share_client = LiquidTokenClient::new(&env, &share_addr);
        share_client.burn(&to, &shares);

        // Deduct idle and transfer asset
        env.storage().instance().set(&DataKey::TotalIdleAssets, &(idle - assets_to_return));
        let asset_addr: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = token::Client::new(&env, &asset_addr);
        token_client.transfer(&env.current_contract_address(), &to, &assets_to_return);

        Ok(assets_to_return)
    }

    pub fn allocate_to_strategy(
        env: Env,
        agent: Address,
        strategy: Address,
        amount: i128,
    ) -> Result<(), Error> {
        agent.require_auth();
        Self::check_not_paused(&env)?;

        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        let idle: i128 = env.storage().instance().get(&DataKey::TotalIdleAssets).unwrap_or(0);
        if idle < amount {
            return Err(Error::InsufficientBalance);
        }

        // 1. Policy Account verification (on-chain check)
        let policy_addr: Address = env.storage().instance().get(&DataKey::PolicyAccount).unwrap();
        let policy_client = PolicyAccountClient::new(&env, &policy_addr);
        policy_client.verify_and_record_action(&agent, &strategy, &amount);

        // 2. Strategy Registry check & allocation update
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = StrategyRegistryClient::new(&env, &registry_addr);
        registry_client.record_allocation(&strategy, &amount);

        // 3. Transfer underlying to strategy & call strategy.deposit
        let asset_addr: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = token::Client::new(&env, &asset_addr);
        token_client.transfer(&env.current_contract_address(), &strategy, &amount);

        let strategy_client = StrategyAdapterClient::new(&env, &strategy);
        strategy_client.deposit(&amount);

        // Update state
        env.storage().instance().set(&DataKey::TotalIdleAssets, &(idle - amount));
        let allocated: i128 = env.storage().instance().get(&DataKey::AllocatedAssets).unwrap_or(0);
        env.storage().instance().set(&DataKey::AllocatedAssets, &(allocated + amount));

        Self::extend_ttl(&env);
        Ok(())
    }

    pub fn deallocate_from_strategy(
        env: Env,
        agent: Address,
        strategy: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        agent.require_auth();

        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        // Call strategy withdraw (strategy transfers funds back to vault)
        let strategy_client = StrategyAdapterClient::new(&env, &strategy);
        let withdrawn = strategy_client.withdraw(&amount);

        // Update registry
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = StrategyRegistryClient::new(&env, &registry_addr);
        registry_client.record_deallocation(&strategy, &withdrawn);

        // Update state
        let idle: i128 = env.storage().instance().get(&DataKey::TotalIdleAssets).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalIdleAssets, &(idle + withdrawn));

        let allocated: i128 = env.storage().instance().get(&DataKey::AllocatedAssets).unwrap_or(0);
        let new_allocated = if allocated < withdrawn { 0 } else { allocated - withdrawn };
        env.storage().instance().set(&DataKey::AllocatedAssets, &(new_allocated));

        Self::extend_ttl(&env);
        Ok(withdrawn)
    }

    pub fn emergency_exit_strategy(env: Env, caller: Address, strategy: Address) -> Result<i128, Error> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let guardian: Address = env.storage().instance().get(&DataKey::EmergencyGuardian).unwrap();
        if caller != admin && caller != guardian {
            return Err(Error::Unauthorized);
        }

        // Call strategy emergency exit (strategy transfers recovered funds back to vault)
        let strategy_client = StrategyAdapterClient::new(&env, &strategy);
        let recovered = strategy_client.emergency_exit();

        if recovered > 0 {
            let idle: i128 = env.storage().instance().get(&DataKey::TotalIdleAssets).unwrap_or(0);
            env.storage().instance().set(&DataKey::TotalIdleAssets, &(idle + recovered));

            let allocated: i128 = env.storage().instance().get(&DataKey::AllocatedAssets).unwrap_or(0);
            let new_allocated = if allocated < recovered { 0 } else { allocated - recovered };
            env.storage().instance().set(&DataKey::AllocatedAssets, &new_allocated);
        }

        // Revoke in registry
        let registry_addr: Address = env.storage().instance().get(&DataKey::Registry).unwrap();
        let registry_client = StrategyRegistryClient::new(&env, &registry_addr);
        registry_client.revoke_strategy(&caller, &strategy);

        Self::extend_ttl(&env);
        Ok(recovered)
    }

    pub fn pause(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let guardian: Address = env.storage().instance().get(&DataKey::EmergencyGuardian).unwrap();
        if caller != admin && caller != guardian {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Paused, &true);
        Self::extend_ttl(&env);
        Ok(())
    }

    pub fn unpause(env: Env, caller: Address) -> Result<(), Error> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if caller != admin {
            return Err(Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Paused, &false);
        Self::extend_ttl(&env);
        Ok(())
    }

    pub fn total_assets(env: Env) -> i128 {
        let idle: i128 = env.storage().instance().get(&DataKey::TotalIdleAssets).unwrap_or(0);
        let allocated: i128 = env.storage().instance().get(&DataKey::AllocatedAssets).unwrap_or(0);
        idle + allocated
    }

    pub fn total_shares(env: Env) -> i128 {
        let share_addr: Address = env.storage().instance().get(&DataKey::ShareToken).unwrap();
        let token_client = LiquidTokenClient::new(&env, &share_addr);
        token_client.total_supply()
    }

    pub fn convert_to_shares(env: Env, assets: i128) -> i128 {
        let total_assets = Self::total_assets(env.clone());
        let total_shares = Self::total_shares(env);
        (assets * (total_shares + VIRTUAL_SHARES)) / (total_assets + VIRTUAL_ASSETS)
    }

    pub fn convert_to_assets(env: Env, shares: i128) -> i128 {
        let total_assets = Self::total_assets(env.clone());
        let total_shares = Self::total_shares(env);
        (shares * (total_assets + VIRTUAL_ASSETS)) / (total_shares + VIRTUAL_SHARES)
    }

    fn check_not_paused(env: &Env) -> Result<(), Error> {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused {
            Err(Error::Paused)
        } else {
            Ok(())
        }
    }

    fn extend_ttl(env: &Env) {
        env.storage().instance().extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
}

mod test;
