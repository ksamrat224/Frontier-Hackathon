use anchor_lang::prelude::*;

declare_id!("5cJSjnL6XchWvGwRqqJM2FQnRRB2Xu62duawATgoit6d");

#[program]
pub mod saathiloan {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
