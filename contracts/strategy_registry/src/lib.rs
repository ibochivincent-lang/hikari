#![no_std]
use hikari_interfaces::{Error, StrategyInfo, StrategyStatus};
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - 10 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Vault,
    EmergencyGuardian,
    StrategiesList,
    Strategy(Address),
}

#[contract]
pub struct StrategyRegistry;

#[contractimpl]
impl StrategyRegistry {
    pub fn __constructor(env: Env, admin: Address, vault: Address, guardian: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::EmergencyGuardian, &guardian);
        let list: Vec<Address> = Vec::new(&env);
        env.storage().instance().set(&DataKey::StrategiesList, &list);
    }

    pub fn set_vault(env: Env, new_vault: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Vault, &new_vault);
        Ok(())
    }

    pub fn add_strategy(
        env: Env,
        strategy: Address,
        cap: i128,
        risk_tier: u32,
    ) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if cap <= 0 {
            return Err(Error::ZeroAmount);
        }

        let key = DataKey::Strategy(strategy.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyInitialized);
        }

        let info = StrategyInfo {
            address: strategy.clone(),
            cap,
            allocated: 0,
            risk_tier,
            status: StrategyStatus::Active,
        };

        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

        let mut list: Vec<Address> = env.storage().instance().get(&DataKey::StrategiesList).unwrap();
        list.push_back(strategy);
        env.storage().instance().set(&DataKey::StrategiesList, &list);
        Ok(())
    }

    pub fn update_cap(env: Env, strategy: Address, new_cap: i128) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let key = DataKey::Strategy(strategy.clone());
        let mut info: StrategyInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::StrategyNotFound)?;

        if new_cap < info.allocated {
            return Err(Error::StrategyCapExceeded);
        }

        info.cap = new_cap;
        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    pub fn pause_strategy(env: Env, caller: Address, strategy: Address) -> Result<(), Error> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let guardian: Address = env.storage().instance().get(&DataKey::EmergencyGuardian).unwrap();
        if caller != admin && caller != guardian {
            return Err(Error::Unauthorized);
        }

        let key = DataKey::Strategy(strategy.clone());
        let mut info: StrategyInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::StrategyNotFound)?;

        info.status = StrategyStatus::Paused;
        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    pub fn unpause_strategy(env: Env, strategy: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let key = DataKey::Strategy(strategy.clone());
        let mut info: StrategyInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::StrategyNotFound)?;

        if info.status == StrategyStatus::Revoked {
            return Err(Error::StrategyRevoked);
        }

        info.status = StrategyStatus::Active;
        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    pub fn revoke_strategy(env: Env, caller: Address, strategy: Address) -> Result<(), Error> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        let guardian: Address = env.storage().instance().get(&DataKey::EmergencyGuardian).unwrap();
        if caller != admin && caller != guardian {
            return Err(Error::Unauthorized);
        }

        let key = DataKey::Strategy(strategy.clone());
        let mut info: StrategyInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::StrategyNotFound)?;

        info.status = StrategyStatus::Revoked;
        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    pub fn record_allocation(env: Env, strategy: Address, amount: i128) -> Result<(), Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        let key = DataKey::Strategy(strategy.clone());
        let mut info: StrategyInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::StrategyNotFound)?;

        if info.status != StrategyStatus::Active {
            return Err(Error::Paused);
        }

        let new_allocated = info.allocated.checked_add(amount).ok_or(Error::MathOverflow)?;
        if new_allocated > info.cap {
            return Err(Error::StrategyCapExceeded);
        }

        info.allocated = new_allocated;
        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    pub fn record_deallocation(env: Env, strategy: Address, amount: i128) -> Result<(), Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        let key = DataKey::Strategy(strategy.clone());
        let mut info: StrategyInfo = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::StrategyNotFound)?;

        let new_allocated = if info.allocated < amount { 0 } else { info.allocated - amount };
        info.allocated = new_allocated;
        env.storage().persistent().set(&key, &info);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    pub fn get_strategy(env: Env, strategy: Address) -> Result<StrategyInfo, Error> {
        let key = DataKey::Strategy(strategy);
        env.storage().persistent().get(&key).ok_or(Error::StrategyNotFound)
    }

    pub fn get_all_strategies(env: Env) -> Vec<Address> {
        env.storage().instance().get(&DataKey::StrategiesList).unwrap()
    }
}

mod test;
