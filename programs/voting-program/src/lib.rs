use anchor_lang::prelude::*;

use instructions::create_proposal::*;

pub mod instructions;
pub mod states;
pub mod errors;

declare_id!("E1iBq3vym5K5BuSm5v53oKKrQuQ4BTieCBJswg4PMGhi");

#[program]
pub mod voting_program {
    use super::*;
    
    pub fn create_proposal(ctx: Context<CreateProposal>) -> Result<()> {
        create_proposal(ctx)
    }
}
