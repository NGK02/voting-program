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
    #[msg("Cannot create proposal, invalid proposal time")]
    InvalidProposalTime,
    #[msg("Cannot cast vote, no votes provided")]
    NoVotesProvided,
    #[msg("Cannot cast vote, too many approvals provided")]
    TooManyApprovals,
    #[msg("Cannot cast vote, invalid approval provided")]
    InvalidApproval,
    #[msg("Cannot create proposal, duplicate candidates specified")]
    DuplicateCandidates,
    #[msg("Cannot cast vote, invalid candidate ID")]
    InvalidCandidateId,
    #[msg("Cannot cast vote, proposal already closed")]
    ProposalClosed,
}
