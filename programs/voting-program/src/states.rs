use anchor_lang::prelude::*;
use std::collections::BTreeMap;
use std::collections::BTreeSet;

pub const MIN_NUMBER_OF_CANDIDATES: usize = 2;
pub const MAX_NUMBER_OF_CANDIDATES: usize = 12;

pub const PROPOSAL_MAX_TITLE_LENGTH: usize = 100;
pub const PROPOSAL_MAX_DESCRIPTION_LENGTH: usize = 600;
pub const PROPOSAL_SEED: &str = "PROPOSAL_SEED";

pub const VOTE_SEED: &str = "VOTE_SEED";

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    // pub id: u64,
    #[max_len(PROPOSAL_MAX_TITLE_LENGTH)]
    pub title: String,
    #[max_len(PROPOSAL_MAX_DESCRIPTION_LENGTH)]
    pub description: String,
    #[max_len(MAX_NUMBER_OF_CANDIDATES)]
    pub candidates: Vec<Candidate>,
    pub proposal_open_from: i64,
    pub proposal_finished_from: i64,
    pub proposer: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Vote {
    pub proposal: Pubkey,
    pub voter: Pubkey,
    #[max_len(MAX_NUMBER_OF_CANDIDATES)]
    pub candidates: Vec<Candidate>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Candidate {
    #[max_len(50)]
    pub id: String,
    pub vote_count: u64,
}