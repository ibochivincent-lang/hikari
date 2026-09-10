#![no_std]
use hikari_interfaces::Error;
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - 10 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    SealingCommittee,
    Vault,
    WithdrawalQueue,
    SealDurationLedgers,
    ExpiryTimestamp,
    IsSealed,
    SealedAtLedger,
}

#[contract]
pub struct GateSeal;

#[contractimpl]
impl GateSeal {
    pub fn __constructor(
        env: Env,
        sealing_committee: Address,
        vault: Address,
        withdrawal_queue: Address,
        seal_duration_ledgers: u32,
        expiry_timestamp: u64,
    ) {
        env.storage().instance().set(&DataKey::SealingCommittee, &sealing_committee);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::WithdrawalQueue, &withdrawal_queue);
        env.storage().instance().set(&DataKey::SealDurationLedgers, &seal_duration_ledgers);
        env.storage().instance().set(&DataKey::ExpiryTimestamp, &expiry_timestamp);
        env.storage().instance().set(&DataKey::IsSealed, &false);
        env.storage().instance().set(&DataKey::SealedAtLedger, &0u32);
    }

    /// Triggers the one-time emergency seal (panic button).
    pub fn seal(env: Env) -> Result<(), Error> {
        let committee: Address = env.storage().instance().get(&DataKey::SealingCommittee).unwrap();
        committee.require_auth();

        Self::extend_ttl(&env);

        let is_already_sealed: bool = env.storage().instance().get(&DataKey::IsSealed).unwrap_or(false);
        if is_already_sealed {
            // A GateSeal is one-time use
            return Err(Error::AlreadyFinalized);
        }

        let expiry: u64 = env.storage().instance().get(&DataKey::ExpiryTimestamp).unwrap();
        if env.ledger().timestamp() > expiry {
            // Seal key has expired
            return Err(Error::InvalidState);
        }

        let current_ledger = env.ledger().sequence();
        env.storage().instance().set(&DataKey::IsSealed, &true);
        env.storage().instance().set(&DataKey::SealedAtLedger, &current_ledger);

        // Pause vault and withdrawal queue through cross-contract call if desired, or recorded state
        Ok(())
    }

    pub fn is_sealed(env: Env) -> bool {
        env.storage().instance().get(&DataKey::IsSealed).unwrap_or(false)
    }

    pub fn is_seal_expired(env: Env) -> bool {
        let is_sealed = Self::is_sealed(env.clone());
        if !is_sealed {
            return false;
        }

        let sealed_at: u32 = env.storage().instance().get(&DataKey::SealedAtLedger).unwrap_or(0);
        let duration: u32 = env.storage().instance().get(&DataKey::SealDurationLedgers).unwrap_or(0);
        env.ledger().sequence() >= sealed_at + duration
    }

    /// Unseals and restores normal operations if seal duration has elapsed.
    pub fn unseal(env: Env) -> Result<(), Error> {
        if !Self::is_sealed(env.clone()) {
            return Err(Error::InvalidState);
        }

        if !Self::is_seal_expired(env.clone()) {
            // Cannot unseal before pause duration has elapsed without full DAO action
            return Err(Error::CooldownNotMet);
        }

        env.storage().instance().set(&DataKey::IsSealed, &false);
        Ok(())
    }

    pub fn get_seal_status(env: Env) -> (bool, u32, u32) {
        let is_sealed = Self::is_sealed(env.clone());
        let sealed_at: u32 = env.storage().instance().get(&DataKey::SealedAtLedger).unwrap_or(0);
        let duration: u32 = env.storage().instance().get(&DataKey::SealDurationLedgers).unwrap_or(0);
        (is_sealed, sealed_at, duration)
    }

    fn extend_ttl(env: &Env) {
        env.storage().instance().extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
}

#[cfg(test)]
mod test;
