use anchor_lang::prelude::*;

use instructions::cast_vote::*;
use instructions::create_proposal::*;

pub mod errors;
pub mod instructions;
pub mod states;

declare_id!("E1iBq3vym5K5BuSm5v53oKKrQuQ4BTieCBJswg4PMGhi");

#[program]
pub mod voting_program {
    use super::*;

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        // TODO: Make description optional.
        description: String,
        candidate_ids: Vec<String>,
        proposal_finished_from: i64,
    ) -> Result<()> {
        instructions::create_proposal::create_proposal(
            ctx,
            title,
            description,
            candidate_ids,
            proposal_finished_from,
        )
    }

    pub fn cast_vote(ctx: Context<CastVote>, candidate_ids: Vec<String>) -> Result<()> {
        instructions::cast_vote::cast_vote(ctx, candidate_ids)
    }
}
