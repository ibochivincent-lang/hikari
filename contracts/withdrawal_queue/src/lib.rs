#![no_std]
use hikari_interfaces::{Error, WithdrawalRequest};
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Vault,
    CooldownLedgers,
    NextRequestId,
    Request(u64),
}

#[contract]
pub struct WithdrawalQueue;

#[contractimpl]
impl WithdrawalQueue {
    pub fn __constructor(env: Env, admin: Address, vault: Address, cooldown_ledgers: u32) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::CooldownLedgers, &cooldown_ledgers);
        env.storage().instance().set(&DataKey::NextRequestId, &1u64);
    }

    pub fn set_vault(env: Env, new_vault: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Vault, &new_vault);
        Ok(())
    }

    pub fn set_cooldown_ledgers(env: Env, new_cooldown: u32) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::CooldownLedgers, &new_cooldown);
        Ok(())
    }

    pub fn request_withdrawal(env: Env, user: Address, shares: i128) -> Result<u64, Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        if shares <= 0 {
            return Err(Error::ZeroAmount);
        }

        let id: u64 = env.storage().instance().get(&DataKey::NextRequestId).unwrap_or(1);
        env.storage().instance().set(&DataKey::NextRequestId, &(id + 1));

        let req = WithdrawalRequest {
            id,
            user,
            shares,
            request_ledger: env.ledger().sequence(),
            finalized: false,
            claimable_assets: 0,
        };

        let key = DataKey::Request(id);
        env.storage().persistent().set(&key, &req);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(id)
    }

    pub fn finalize_withdrawal(env: Env, request_id: u64, claimable_assets: i128) -> Result<(), Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        let key = DataKey::Request(request_id);
        let mut req: WithdrawalRequest = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::RequestNotFound)?;

        if req.finalized {
            return Err(Error::AlreadyFinalized);
        }

        req.finalized = true;
        req.claimable_assets = claimable_assets;

        env.storage().persistent().set(&key, &req);
        env.storage().persistent().extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        Ok(())
    }

    pub fn claim_withdrawal(env: Env, user: Address, request_id: u64) -> Result<i128, Error> {
        user.require_auth();

        let key = DataKey::Request(request_id);
        let req: WithdrawalRequest = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::RequestNotFound)?;

        if req.user != user {
            return Err(Error::Unauthorized);
        }
        if !req.finalized {
            return Err(Error::InvalidState);
        }

        let cooldown: u32 = env.storage().instance().get(&DataKey::CooldownLedgers).unwrap_or(0);
        if env.ledger().sequence() < req.request_ledger + cooldown {
            return Err(Error::CooldownNotMet);
        }

        let claimable = req.claimable_assets;
        env.storage().persistent().remove(&key);
        Ok(claimable)
    }

    pub fn cancel_withdrawal(env: Env, user: Address, request_id: u64) -> Result<i128, Error> {
        user.require_auth();

        let key = DataKey::Request(request_id);
        let req: WithdrawalRequest = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::RequestNotFound)?;

        if req.user != user {
            return Err(Error::Unauthorized);
        }
        if req.finalized {
            return Err(Error::AlreadyFinalized);
        }

        let shares = req.shares;
        env.storage().persistent().remove(&key);
        Ok(shares)
    }

    pub fn get_request(env: Env, request_id: u64) -> Result<WithdrawalRequest, Error> {
        let key = DataKey::Request(request_id);
        env.storage().persistent().get(&key).ok_or(Error::RequestNotFound)
    }
}

mod test;
