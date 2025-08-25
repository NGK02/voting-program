use anchor_lang::prelude::*;

#[error_code]
pub enum VotingError {
    #[msg("Cannot create proposal, title too long")]
    TitleTooLong,
    #[msg("Cannot create proposal, description too long")]
    DescriptionTooLong,
    #[msg("Cannot create proposal, too many candidates specified")]
    TooManyCandidates,
    #[msg("Cannot create proposal, not enough candidates specified")]
    NotEnoughCandidates,
    #[msg("Cannot create proposal, candidate ID too long")]
    CandidateIdTooLong,
    #[msg("Cannot create proposal, invalid proposal time")]
    InvalidProposalTime,
    #[msg("Cannot cast vote, no candidate votes specified")]
    NotEnoughCandidateVotes,
    #[msg("Cannot cast vote, too many candidate votes specified")]
    TooManyCandidateVotes,
    #[msg("Cannot create proposal, duplicate candidates specified")]
    DuplicateCandidates,
    #[msg("Cannot cast vote, invalid candidate ID specified")]
    InvalidCandidateId,
    #[msg("Cannot cast vote, proposal already closed")]
    ProposalClosed,
}
