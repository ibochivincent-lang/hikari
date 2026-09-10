#![no_std]
use soroban_sdk::{contractclient, contracterror, contracttype, Address, Env, String, Symbol};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    Paused = 4,
    ZeroAmount = 5,
    InsufficientBalance = 6,
    InsufficientShares = 7,
    StrategyCapExceeded = 8,
    StrategyRevoked = 9,
    StrategyNotFound = 10,
    CooldownNotMet = 11,
    DailyLimitExceeded = 12,
    TxLimitExceeded = 13,
    UnallowedDestination = 14,
    MathOverflow = 15,
    InvalidState = 16,
    RequestNotFound = 17,
    AlreadyFinalized = 18,
}

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum StrategyStatus {
    Active = 1,
    Paused = 2,
    Revoked = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StrategyInfo {
    pub address: Address,
    pub cap: i128,
    pub allocated: i128,
    pub risk_tier: u32,
    pub status: StrategyStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WithdrawalRequest {
    pub id: u64,
    pub user: Address,
    pub shares: i128,
    pub request_ledger: u32,
    pub finalized: bool,
    pub claimable_assets: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PolicyLimits {
    pub max_tx_amount: i128,
    pub daily_spend_limit: i128,
    pub spent_today: i128,
    pub last_reset_ledger: u32,
}

#[contractclient(name = "StrategyAdapterClient")]
pub trait StrategyAdapterTrait {
    fn deposit(env: Env, amount: i128) -> Result<i128, Error>;
    fn withdraw(env: Env, amount: i128) -> Result<i128, Error>;
    fn total_value(env: Env) -> i128;
    fn emergency_exit(env: Env) -> Result<i128, Error>;
    fn harvest(env: Env) -> Result<i128, Error>;
}

#[contractclient(name = "VaultClient")]
pub trait VaultTrait {
    fn deposit(env: Env, from: Address, amount: i128) -> Result<i128, Error>;
    fn withdraw(env: Env, to: Address, shares: i128) -> Result<i128, Error>;
    fn total_assets(env: Env) -> i128;
    fn total_shares(env: Env) -> i128;
    fn convert_to_shares(env: Env, assets: i128) -> i128;
    fn convert_to_assets(env: Env, shares: i128) -> i128;
    fn pause(env: Env, caller: Address) -> Result<(), Error>;
    fn unpause(env: Env, caller: Address) -> Result<(), Error>;
}

#[contractclient(name = "LiquidTokenClient")]
pub trait LiquidTokenTrait {
    fn balance(env: Env, id: Address) -> i128;
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);
    fn approve(env: Env, from: Address, spender: Address, amount: i128, live_until_ledger: u32);
    fn decimals(env: Env) -> u32;
    fn name(env: Env) -> String;
    fn symbol(env: Env) -> Symbol;
    fn mint(env: Env, to: Address, amount: i128);
    fn burn(env: Env, from: Address, amount: i128);
    fn total_supply(env: Env) -> i128;
}

#[contractclient(name = "StrategyRegistryClient")]
pub trait StrategyRegistryTrait {
    fn record_allocation(env: Env, strategy: Address, amount: i128) -> Result<(), Error>;
    fn record_deallocation(env: Env, strategy: Address, amount: i128) -> Result<(), Error>;
    fn revoke_strategy(env: Env, caller: Address, strategy: Address) -> Result<(), Error>;
}

#[contractclient(name = "PolicyAccountClient")]
pub trait PolicyAccountTrait {
    fn verify_and_record_action(
        env: Env,
        agent: Address,
        target_contract: Address,
        amount: i128,
    ) -> Result<(), Error>;
}

