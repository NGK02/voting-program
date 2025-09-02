import { useWalletUi } from '@wallet-ui/react'
import { useState } from 'react'
import { Address } from 'gill';

import { VOTING_PROGRAM_PROGRAM_ADDRESS } from '@/lib/solana/generated/programs/votingProgram'
import { Proposal } from '@/lib/solana/generated/accounts/proposal';
import { Candidate } from '@/lib/solana/generated/types/candidate';
import { getProposalAccounts } from '@/lib/solana/data-access';
import { Button } from '../ui/button'
import { CreateProposal } from './create-proposal-form'
import { CastVote } from './cast-vote-form'

export function ProposalList() {
    const client = useWalletUi().client
    const programId = VOTING_PROGRAM_PROGRAM_ADDRESS;
    const [proposals, setProposals] = useState<Array<{ address: Address, data: Proposal }>>([])

    const refresh = async () => {
        const proposalAccounts = await getProposalAccounts(client, programId)
        setProposals(proposalAccounts)
    }

    // Helper function to get sorted candidates with winner info
    const getSortedCandidates = (candidates: Candidate[]) => {
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return [];
        }

        // Sort candidates by vote count in descending order
        return candidates
            .map(candidate => ({
                ...candidate,
                voteCount: Number(candidate.voteCount) // Convert bigint to number for display
            }))
            .sort((a, b) => b.voteCount - a.voteCount);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    Proposals
                </h3>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={refresh}
                        variant="outline"
                        size="default"
                        className="bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-0 dark:hover:bg-neutral-700"
                    >
                        Refresh
                    </Button>
                    <CreateProposal />
                </div>
            </div>

            {/* Proposals Grid */}
            {proposals.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-neutral-500 dark:text-neutral-400 text-lg">
                        No proposals found. Create one to get started!
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {proposals.map((proposal, index) => {
                        const sortedCandidates = getSortedCandidates(proposal.data.candidates);
                        const hasVotes = sortedCandidates.some(candidate => candidate.voteCount > 0);
                        const isProposalActive = new Date(Number(proposal.data.proposalFinishedFrom) * 1000) > new Date();

                        return (
                            <div
                                key={index}
                                className="bg-white dark:bg-neutral-800 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow duration-200 flex flex-col h-148"
                            >
                                {/* Proposal Header - Fixed height */}
                                <div className="p-6 pb-4 flex-shrink-0 h-40">
                                    <h4 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                                        {proposal.data.title}
                                    </h4>

                                    <p className="text-neutral-600 dark:text-neutral-300 mb-4 line-clamp-3 overflow-y-auto">
                                        {proposal.data.description}
                                    </p>
                                </div>

                                {/* Candidates Section - Scrollable */}
                                <div className="px-6 flex-1 flex flex-col min-h-0 mt-3">
                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 flex-shrink-0">
                                        Candidates & Results:
                                    </span>

                                    {sortedCandidates.length === 0 ? (
                                        <div className="text-sm text-neutral-500 dark:text-neutral-400 italic flex-shrink-0">
                                            No candidates
                                        </div>
                                    ) : (
                                        <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                            {sortedCandidates.map((candidate, candidateIndex) => {
                                                const isWinner = candidateIndex === 0 && hasVotes && sortedCandidates[1]?.voteCount < candidate.voteCount;
                                                const rank = candidateIndex + 1;

                                                return (
                                                    <div
                                                        key={candidate.id}
                                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors flex-shrink-0 ${isWinner
                                                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                                                            : 'bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600'
                                                            }`}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            {/* Rank number */}
                                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isWinner
                                                                ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                                                                : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-300'
                                                                }`}>
                                                                #{rank}
                                                            </span>

                                                            {/* Crown icon for winner */}
                                                            {isWinner && (
                                                                <span className="text-yellow-500 dark:text-yellow-400" title="Winner">
                                                                    👑
                                                                </span>
                                                            )}

                                                            {/* Candidate name */}
                                                            <span className={`font-medium ${isWinner
                                                                ? 'text-yellow-800 dark:text-yellow-200'
                                                                : 'text-neutral-700 dark:text-neutral-300'
                                                                }`}>
                                                                {candidate.id}
                                                            </span>
                                                        </div>

                                                        {/* Vote count */}
                                                        <div className="flex items-center space-x-1">
                                                            <span className={`text-sm font-semibold ${isWinner
                                                                ? 'text-yellow-700 dark:text-yellow-300'
                                                                : 'text-neutral-600 dark:text-neutral-400'
                                                                }`}>
                                                                {candidate.voteCount}
                                                            </span>
                                                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                {candidate.voteCount === 1 ? 'vote' : 'votes'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Footer - Fixed height */}
                                <div className="p-6 pt-4 flex-shrink-0">
                                    {/* Finish Date */}
                                    <div className="mb-4">
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Ends on:
                                        </span>
                                        <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                                            {new Date(Number(proposal.data.proposalFinishedFrom) * 1000).toLocaleString()}
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mb-4">
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                            Status:
                                        </span>
                                        <div>
                                            {isProposalActive ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                    Ended
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-600">
                                        <CastVote proposal={proposal} onRefresh={refresh} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    )
}