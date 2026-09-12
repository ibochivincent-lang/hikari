#![no_std]
use hikari_interfaces::{Error, WithdrawalRequest};
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Vec};

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum QueueMode {
    Turbo = 1,
    Bunker = 2,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Vault,
    CooldownLedgers,
    NextRequestId,
    Mode,
    HaircutBps,
    BunkerExtraCooldown,
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
        env.storage().instance().set(&DataKey::Mode, &(QueueMode::Turbo as u32));
        env.storage().instance().set(&DataKey::HaircutBps, &0u32);
        env.storage().instance().set(&DataKey::BunkerExtraCooldown, &0u32);
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

    // Emergency Bunker Mode control
    pub fn enter_bunker_mode(env: Env, haircut_bps: u32, extra_cooldown: u32) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if haircut_bps > 5000 {
            // Maximum allowable emergency haircut is 50%
            return Err(Error::InvalidState);
        }

        env.storage().instance().set(&DataKey::Mode, &(QueueMode::Bunker as u32));
        env.storage().instance().set(&DataKey::HaircutBps, &haircut_bps);
        env.storage().instance().set(&DataKey::BunkerExtraCooldown, &extra_cooldown);
        Ok(())
    }

    pub fn exit_bunker_mode(env: Env) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().instance().set(&DataKey::Mode, &(QueueMode::Turbo as u32));
        env.storage().instance().set(&DataKey::HaircutBps, &0u32);
        env.storage().instance().set(&DataKey::BunkerExtraCooldown, &0u32);
        Ok(())
    }

    pub fn get_queue_mode(env: Env) -> (u32, u32) {
        let mode: u32 = env.storage().instance().get(&DataKey::Mode).unwrap_or(QueueMode::Turbo as u32);
        let haircut: u32 = env.storage().instance().get(&DataKey::HaircutBps).unwrap_or(0);
        (mode, haircut)
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
        Self::internal_claim(&env, &user, request_id)
    }

    // Native FIFO Batch Claiming
    pub fn claim_batch(env: Env, user: Address, request_ids: Vec<u64>) -> Result<i128, Error> {
        user.require_auth();
        let mut total_payout: i128 = 0;

        for i in 0..request_ids.len() {
            let req_id = request_ids.get(i).unwrap();
            let payout = Self::internal_claim(&env, &user, req_id)?;
            total_payout = total_payout.checked_add(payout).ok_or(Error::MathOverflow)?;
        }

        Ok(total_payout)
    }

    fn internal_claim(env: &Env, user: &Address, request_id: u64) -> Result<i128, Error> {
        let key = DataKey::Request(request_id);
        let req: WithdrawalRequest = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::RequestNotFound)?;

        if req.user != *user {
            return Err(Error::Unauthorized);
        }
        if !req.finalized {
            return Err(Error::InvalidState);
        }

        let cooldown: u32 = env.storage().instance().get(&DataKey::CooldownLedgers).unwrap_or(0);
        let mode: u32 = env.storage().instance().get(&DataKey::Mode).unwrap_or(QueueMode::Turbo as u32);
        let extra_cooldown: u32 = if mode == QueueMode::Bunker as u32 {
            env.storage().instance().get(&DataKey::BunkerExtraCooldown).unwrap_or(0)
        } else {
            0
        };

        if env.ledger().sequence() < req.request_ledger + cooldown + extra_cooldown {
            return Err(Error::CooldownNotMet);
        }

        let raw_claimable = req.claimable_assets;
        let payout = if mode == QueueMode::Bunker as u32 {
            let haircut_bps: u32 = env.storage().instance().get(&DataKey::HaircutBps).unwrap_or(0);
            (raw_claimable * (10000 - haircut_bps as i128)) / 10000
        } else {
            raw_claimable
        };

        env.storage().persistent().remove(&key);
        Ok(payout)
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

#[cfg(test)]
mod test;
