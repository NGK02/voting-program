use anchor_lang::prelude::*;
use std::collections::BTreeMap;

use crate::errors::*;
use crate::states::*;

pub fn cast_vote(ctx: Context<CastVote>, candidate_ids: Vec<String>) -> Result<()> {
    let now = Clock::get().unwrap().unix_timestamp;
    let proposal_open_from = ctx.accounts.proposal.proposal_open_from;
    let proposal_finished_from = ctx.accounts.proposal.proposal_finished_from;

    if proposal_open_from > now || proposal_finished_from < now {
        return Err(VotingError::ProposalClosed.into());
    }

    if candidate_ids.is_empty() {
        return Err(VotingError::NoVotesProvided.into());
    }

    if candidate_ids.len() > ctx.accounts.proposal.candidates.len() {
        return Err(VotingError::TooManyApprovals.into());
    }

    // Validate length of each candidate ID.
    // Validate all candidate IDs are unique.
    // Validate all the ids are contained in the proposal and are not invalid ids.
    // Update candidate votes on the proposal.
    let original_candidate_ids_len = candidate_ids.len();
    let unique_candidates: BTreeMap<String, Candidate> = candidate_ids
        .into_iter()
        // TODO: Is it okay to clone here?
        .map(|id| (id.clone(), Candidate { id, vote_count: 0 }))
        .collect();

    if unique_candidates.len() != original_candidate_ids_len {
        return Err(VotingError::DuplicateCandidates.into());
    }

    let candidates = &mut ctx.accounts.proposal.candidates;

    candidates.iter_mut().try_for_each(|candidate| {
        if unique_candidates.contains_key(&candidate.id) {
            candidate.vote_count += 1;
            Ok(())
        } else {
            Err(VotingError::InvalidCandidateId)
        }
    })?;

    ctx.accounts.vote.candidates = unique_candidates.into_values().collect();
    ctx.accounts.vote.proposal = ctx.accounts.proposal.key();
    ctx.accounts.vote.voter = ctx.accounts.voter.key();

    Ok(())
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    #[account(
        init,
        payer = voter,
        space = 8 + Vote::INIT_SPACE,
        seeds = [VOTE_SEED.as_bytes(), voter.key().as_ref(), proposal.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, Vote>,
    #[account(
        mut,
        seeds = [PROPOSAL_SEED.as_bytes(), proposal.title.as_bytes(), proposal.proposer.key().as_ref()],
        bump = proposal.bump
    )]
    pub proposal: Account<'info, Proposal>,
    pub system_program: Program<'info, System>,
}
