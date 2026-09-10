#![no_std]
use hikari_interfaces::Error;
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Vault,
    UnderlyingAsset,
    Balance,
    YieldRateBps,
    Paused,
}

#[contract]
pub struct MockStrategy;

#[contractimpl]
impl MockStrategy {
    pub fn __constructor(env: Env, vault: Address, underlying_asset: Address, yield_rate_bps: u32) {
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::UnderlyingAsset, &underlying_asset);
        env.storage().instance().set(&DataKey::Balance, &0i128);
        env.storage().instance().set(&DataKey::YieldRateBps, &yield_rate_bps);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    pub fn deposit(env: Env, amount: i128) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        let is_paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if is_paused {
            return Err(Error::Paused);
        }
        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }

        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        let new_bal = current.checked_add(amount).ok_or(Error::MathOverflow)?;
        env.storage().instance().set(&DataKey::Balance, &new_bal);
        Ok(new_bal)
    }

    pub fn withdraw(env: Env, amount: i128) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        if amount <= 0 {
            return Err(Error::ZeroAmount);
        }
        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        if current < amount {
            return Err(Error::InsufficientBalance);
        }
        let new_bal = current - amount;
        env.storage().instance().set(&DataKey::Balance, &new_bal);

        // Transfer tokens back to vault
        let asset: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = soroban_sdk::token::Client::new(&env, &asset);
        token_client.transfer(&env.current_contract_address(), &vault, &amount);

        Ok(amount)
    }

    pub fn total_value(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    pub fn harvest(env: Env) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        let rate_bps: u32 = env.storage().instance().get(&DataKey::YieldRateBps).unwrap_or(0);
        if current == 0 || rate_bps == 0 {
            return Ok(0);
        }
        let yield_generated = (current * (rate_bps as i128)) / 10000;
        let new_bal = current.checked_add(yield_generated).ok_or(Error::MathOverflow)?;
        env.storage().instance().set(&DataKey::Balance, &new_bal);
        Ok(yield_generated)
    }

    pub fn emergency_exit(env: Env) -> Result<i128, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        let current: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        env.storage().instance().set(&DataKey::Balance, &0i128);
        env.storage().instance().set(&DataKey::Paused, &true);

        if current > 0 {
            let asset: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
            let token_client = soroban_sdk::token::Client::new(&env, &asset);
            token_client.transfer(&env.current_contract_address(), &vault, &current);
        }

        Ok(current)
    }

    pub fn set_yield_rate_bps(env: Env, new_rate_bps: u32) {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();
        env.storage().instance().set(&DataKey::YieldRateBps, &new_rate_bps);
    }
}
