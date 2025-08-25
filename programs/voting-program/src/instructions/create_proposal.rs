use anchor_lang::prelude::*;
use std::collections::BTreeSet;

use crate::errors::*;
use crate::states::*;

pub fn create_proposal(
    ctx: Context<CreateProposal>,
    title: String,
    // TODO: Make description optional.
    description: String,
    candidate_ids: Vec<String>,
    proposal_open_from: i64,
    proposal_finished_from: i64,
) -> Result<()> {
    if title.len() > PROPOSAL_TITLE_LENGTH {
        return Err(VotingError::TitleTooLong.into());
    }

    if description.len() > PROPOSAL_DESCRIPTION_LENGTH {
        return Err(VotingError::DescriptionTooLong.into());
    }

    if candidate_ids.len() < MIN_NUMBER_OF_CANDIDATES {
        return Err(VotingError::NotEnoughCandidates.into());
    } else if candidate_ids.len() > MAX_NUMBER_OF_CANDIDATES {
        return Err(VotingError::TooManyCandidates.into());
    }

    // TODO: Validate length of candidate ids.

    let unique_candidates: BTreeSet<_> = candidate_ids.iter().collect();
    if unique_candidates.len() != candidate_ids.len() {
        return Err(VotingError::DuplicateCandidates.into());
    }

    let now = Clock::get().unwrap().unix_timestamp;
    if proposal_open_from >= proposal_finished_from
        || proposal_open_from < now
        || proposal_finished_from < now
    {
        return Err(VotingError::InvalidProposalTime.into());
    }

    ctx.accounts.proposal.title = title;
    ctx.accounts.proposal.description = description;
    ctx.accounts.proposal.candidates = candidate_ids
        .into_iter()
        .map(|id| Candidate { id, vote_count: 0 })
        .collect();
    ctx.accounts.proposal.proposal_open_from = proposal_open_from;
    ctx.accounts.proposal.proposal_finished_from = proposal_finished_from;
    ctx.accounts.proposal.proposer = ctx.accounts.proposer.key();
    ctx.accounts.proposal.bump = ctx.bumps.proposal;

    Ok(())
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,
    #[account(
        init,
        payer = proposer,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [PROPOSAL_SEED.as_bytes(), title.as_bytes(), proposer.key().as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub system_program: Program<'info, System>,
}
