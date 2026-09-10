#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol,
};

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

const BALANCE_BUMP_AMOUNT: u32 = 120 * DAY_IN_LEDGERS;
const BALANCE_LIFETIME_THRESHOLD: u32 = BALANCE_BUMP_AMOUNT - 30 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Vault,
    Decimals,
    Name,
    Symbol,
    TotalSupply,
    Balance(Address),
    Allowance(AllowanceKey),
}

#[contracttype]
#[derive(Clone)]
pub struct AllowanceKey {
    pub from: Address,
    pub spender: Address,
}

#[contracttype]
#[derive(Clone)]
pub struct AllowanceValue {
    pub amount: i128,
    pub live_until_ledger: u32,
}

#[contract]
pub struct HikariToken;

#[contractimpl]
impl HikariToken {
    pub fn __constructor(env: Env, admin: Address, vault: Address, name: String, symbol: Symbol) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Vault, &vault);
        env.storage().instance().set(&DataKey::Decimals, &7u32);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
    }

    pub fn set_vault(env: Env, new_vault: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Vault, &new_vault);
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0)
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        let key = DataKey::Balance(id);
        if let Some(balance) = env.storage().persistent().get(&key) {
            env.storage().persistent().extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
            balance
        } else {
            0
        }
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        Self::spend_balance(&env, &from, amount);
        Self::receive_balance(&env, &to, amount);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        Self::spend_allowance(&env, &from, &spender, amount);
        Self::spend_balance(&env, &from, amount);
        Self::receive_balance(&env, &to, amount);
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, live_until_ledger: u32) {
        from.require_auth();
        if amount < 0 {
            panic!("Negative amount not allowed");
        }
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        let val = AllowanceValue {
            amount,
            live_until_ledger,
        };
        env.storage().temporary().set(&key, &val);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let key = DataKey::Allowance(AllowanceKey { from, spender });
        if let Some(val) = env.storage().temporary().get::<_, AllowanceValue>(&key) {
            if val.live_until_ledger >= env.ledger().sequence() {
                return val.amount;
            }
        }
        0
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimals).unwrap_or(7)
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(env: Env) -> Symbol {
        env.storage().instance().get(&DataKey::Symbol).unwrap_or(symbol_short!("hXLM"))
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        let total_supply: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        let new_supply = total_supply.checked_add(amount).expect("Supply overflow");
        env.storage().instance().set(&DataKey::TotalSupply, &new_supply);
        Self::receive_balance(&env, &to, amount);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        let vault: Address = env.storage().instance().get(&DataKey::Vault).unwrap();
        vault.require_auth();
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        let total_supply: i128 = env.storage().instance().get(&DataKey::TotalSupply).unwrap_or(0);
        let new_supply = total_supply.checked_sub(amount).expect("Supply underflow");
        env.storage().instance().set(&DataKey::TotalSupply, &new_supply);
        Self::spend_balance(&env, &from, amount);
    }

    fn spend_balance(env: &Env, id: &Address, amount: i128) {
        let key = DataKey::Balance(id.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if current_balance < amount {
            panic!("Insufficient balance");
        }
        let new_balance = current_balance - amount;
        if new_balance == 0 {
            env.storage().persistent().remove(&key);
        } else {
            env.storage().persistent().set(&key, &new_balance);
            env.storage().persistent().extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
        }
    }

    fn receive_balance(env: &Env, id: &Address, amount: i128) {
        let key = DataKey::Balance(id.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_balance = current_balance.checked_add(amount).expect("Balance overflow");
        env.storage().persistent().set(&key, &new_balance);
        env.storage().persistent().extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
    }

    fn spend_allowance(env: &Env, from: &Address, spender: &Address, amount: i128) {
        let key = DataKey::Allowance(AllowanceKey {
            from: from.clone(),
            spender: spender.clone(),
        });
        let val: AllowanceValue = env
            .storage()
            .temporary()
            .get(&key)
            .expect("No allowance set");
        if val.live_until_ledger < env.ledger().sequence() {
            panic!("Allowance expired");
        }
        if val.amount < amount {
            panic!("Insufficient allowance");
        }
        let new_amount = val.amount - amount;
        env.storage().temporary().set(
            &key,
            &AllowanceValue {
                amount: new_amount,
                live_until_ledger: val.live_until_ledger,
            },
        );
    }
}

mod test;
