#![no_std]
use hikari_interfaces::Error;
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, Map,
};

const DAY_IN_LEDGERS: u32 = 17280;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Vault,
    AuthorizedAgents, // Map<Address, bool>
    AllowedContracts, // Map<Address, bool>
    MaxTxAmount,
    DailySpendLimit,
    SpentToday,
    LastResetLedger,
}

#[contract]
pub struct PolicyAccount;

#[contractimpl]
impl PolicyAccount {
    pub fn __constructor(
        env: Env,
        admin: Address,
        vault: Address,
        max_tx_amount: i128,
        daily_spend_limit: i128,
    ) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::MaxTxAmount, &max_tx_amount);
        env.storage().instance().set(&DataKey::DailySpendLimit, &daily_spend_limit);
        env.storage().instance().set(&DataKey::SpentToday, &0i128);
        env.storage().instance().set(&DataKey::LastResetLedger, &env.ledger().sequence());

        let agents: Map<Address, bool> = Map::new(&env);
        env.storage().instance().set(&DataKey::AuthorizedAgents, &agents);

        let contracts: Map<Address, bool> = Map::new(&env);
        env.storage().instance().set(&DataKey::AllowedContracts, &contracts);
    }

    pub fn set_agent_status(env: Env, agent: Address, active: bool) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut agents: Map<Address, bool> = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedAgents)
            .unwrap();
        agents.set(agent, active);
        env.storage().instance().set(&DataKey::AuthorizedAgents, &agents);
        Ok(())
    }

    pub fn set_contract_allowed(env: Env, target: Address, allowed: bool) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut contracts: Map<Address, bool> = env
            .storage()
            .instance()
            .get(&DataKey::AllowedContracts)
            .unwrap();
        contracts.set(target, allowed);
        env.storage().instance().set(&DataKey::AllowedContracts, &contracts);
        Ok(())
    }

    pub fn set_limits(env: Env, max_tx: i128, daily_limit: i128) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if max_tx <= 0 || daily_limit <= 0 {
            return Err(Error::ZeroAmount);
        }
        env.storage().instance().set(&DataKey::MaxTxAmount, &max_tx);
        env.storage().instance().set(&DataKey::DailySpendLimit, &daily_limit);
        Ok(())
    }

    pub fn verify_and_record_action(
        env: Env,
        agent: Address,
        target_contract: Address,
        amount: i128,
    ) -> Result<(), Error> {
        agent.require_auth();

        // 1. Check agent authorization
        let agents: Map<Address, bool> = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedAgents)
            .unwrap();
        if !agents.get(agent).unwrap_or(false) {
            return Err(Error::Unauthorized);
        }

        // 2. Check target contract allowlist
        let contracts: Map<Address, bool> = env
            .storage()
            .instance()
            .get(&DataKey::AllowedContracts)
            .unwrap();
        if !contracts.get(target_contract).unwrap_or(false) {
            return Err(Error::UnallowedDestination);
        }

        // 3. Check per-tx limit
        let max_tx: i128 = env.storage().instance().get(&DataKey::MaxTxAmount).unwrap();
        if amount > max_tx {
            return Err(Error::TxLimitExceeded);
        }

        // 4. Check daily rolling limit with ledger reset
        let current_ledger = env.ledger().sequence();
        let last_reset: u32 = env.storage().instance().get(&DataKey::LastResetLedger).unwrap();
        let daily_limit: i128 = env
            .storage()
            .instance()
            .get(&DataKey::DailySpendLimit)
            .unwrap();

        let spent_today: i128 = if current_ledger >= last_reset + DAY_IN_LEDGERS {
            // Reset for new 24h window
            env.storage().instance().set(&DataKey::LastResetLedger, &current_ledger);
            0
        } else {
            env.storage().instance().get(&DataKey::SpentToday).unwrap()
        };

        let new_spent = spent_today.checked_add(amount).ok_or(Error::MathOverflow)?;
        if new_spent > daily_limit {
            return Err(Error::DailyLimitExceeded);
        }

        env.storage().instance().set(&DataKey::SpentToday, &new_spent);
        Ok(())
    }

    pub fn get_spending_status(env: Env) -> (i128, i128, i128) {
        let max_tx: i128 = env.storage().instance().get(&DataKey::MaxTxAmount).unwrap();
        let daily_limit: i128 = env
            .storage()
            .instance()
            .get(&DataKey::DailySpendLimit)
            .unwrap();
        let spent: i128 = env.storage().instance().get(&DataKey::SpentToday).unwrap();
        (max_tx, daily_limit, spent)
    }
}

mod test;
