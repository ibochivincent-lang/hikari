#![no_std]
use hikari_interfaces::Error;
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

const DAY_IN_LEDGERS: u32 = 17280;
const YEAR_IN_LEDGERS: u32 = 365 * DAY_IN_LEDGERS; // ~6,307,200 ledgers
const BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = BUMP_AMOUNT - 10 * DAY_IN_LEDGERS;

const INITIAL_HWM: i128 = 10_000_000; // 1.0 NAV in stroops

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Vault,
    Treasury,
    FirstLossReserve,
    UnderlyingAsset,
    ManagementFeeBps,
    PerformanceFeeBps,
    HighWaterMark,
    LastAccrualLedger,
}

#[contract]
pub struct FeeController;

#[contractimpl]
impl FeeController {
    pub fn __constructor(
        env: Env,
        admin: Address,
        vault: Address,
        treasury: Address,
        reserve: Address,
        asset: Address,
        management_bps: u32,
        performance_bps: u32,
    ) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::FirstLossReserve, &reserve);
        env.storage().instance().set(&DataKey::UnderlyingAsset, &asset);
        env.storage().instance().set(&DataKey::ManagementFeeBps, &management_bps);
        env.storage().instance().set(&DataKey::PerformanceFeeBps, &performance_bps);
        env.storage().instance().set(&DataKey::HighWaterMark, &INITIAL_HWM);
        env.storage().instance().set(&DataKey::LastAccrualLedger, &env.ledger().sequence());
    }

    pub fn calculate_management_fee(env: Env, total_assets: i128) -> i128 {
        let last_ledger: u32 = env.storage().instance().get(&DataKey::LastAccrualLedger).unwrap();
        let current_ledger = env.ledger().sequence();
        if current_ledger <= last_ledger || total_assets <= 0 {
            return 0;
        }

        let elapsed = (current_ledger - last_ledger) as i128;
        let bps: u32 = env.storage().instance().get(&DataKey::ManagementFeeBps).unwrap();
        if bps == 0 {
            return 0;
        }

        // fee = total_assets * bps / 10000 * elapsed / YEAR_IN_LEDGERS
        let numerator = total_assets * (bps as i128) * elapsed;
        let denominator = 10000 * (YEAR_IN_LEDGERS as i128);
        numerator / denominator
    }

    pub fn assess_performance_fee(env: Env, current_nav: i128, total_assets: i128) -> i128 {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        Self::extend_ttl(&env);

        let hwm: i128 = env.storage().instance().get(&DataKey::HighWaterMark).unwrap_or(INITIAL_HWM);
        if current_nav <= hwm || total_assets <= 0 {
            return 0;
        }

        let perf_bps: u32 = env.storage().instance().get(&DataKey::PerformanceFeeBps).unwrap();
        if perf_bps == 0 {
            return 0;
        }

        let gain_per_unit = current_nav - hwm;
        // Total gain = total_assets * gain_per_unit / current_nav
        let total_gain = (total_assets * gain_per_unit) / current_nav;
        let fee = (total_gain * (perf_bps as i128)) / 10000;

        // Update High Water Mark
        env.storage().instance().set(&DataKey::HighWaterMark, &current_nav);
        fee
    }

    pub fn route_fee(env: Env, fee_amount: i128) -> Result<(), Error> {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();

        if fee_amount <= 0 {
            return Ok(());
        }

        Self::extend_ttl(&env);

        // Update last accrual ledger
        env.storage().instance().set(&DataKey::LastAccrualLedger, &env.ledger().sequence());

        let half = fee_amount / 2;
        let remainder = fee_amount - half;

        let asset: Address = env.storage().instance().get(&DataKey::UnderlyingAsset).unwrap();
        let token_client = token::Client::new(&env, &asset);

        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).unwrap();
        let reserve: Address = env.storage().instance().get(&DataKey::FirstLossReserve).unwrap();

        // 50% to First-Loss Reserve, 50% to Protocol Treasury
        if half > 0 {
            token_client.transfer(&env.current_contract_address(), &reserve, &half);
        }
        if remainder > 0 {
            token_client.transfer(&env.current_contract_address(), &treasury, &remainder);
        }

        Ok(())
    }

    pub fn update_fee_rates(env: Env, new_mgmt_bps: u32, new_perf_bps: u32) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if new_mgmt_bps > 500 || new_perf_bps > 2500 {
            // Cap management fee at 5% and performance fee at 25%
            return Err(Error::TxLimitExceeded);
        }

        env.storage().instance().set(&DataKey::ManagementFeeBps, &new_mgmt_bps);
        env.storage().instance().set(&DataKey::PerformanceFeeBps, &new_perf_bps);
        Ok(())
    }

    pub fn get_fee_config(env: Env) -> (u32, u32, i128) {
        let mgmt: u32 = env.storage().instance().get(&DataKey::ManagementFeeBps).unwrap();
        let perf: u32 = env.storage().instance().get(&DataKey::PerformanceFeeBps).unwrap();
        let hwm: i128 = env.storage().instance().get(&DataKey::HighWaterMark).unwrap();
        (mgmt, perf, hwm)
    }

    fn extend_ttl(env: &Env) {
        env.storage().instance().extend_ttl(LIFETIME_THRESHOLD, BUMP_AMOUNT);
    }
}

mod test;
