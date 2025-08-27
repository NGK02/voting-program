import { useWalletUiSigner } from '../solana/use-wallet-ui-signer'
import { useWalletUi } from '@wallet-ui/react'
import { useState } from 'react'
import { AppModal } from '../app-modal'
import { Label } from '@radix-ui/react-label'
import { Input } from '../ui/input'
import { deriveProposalPda } from '../../lib/pda';
import { processTransaction, getProposalAccounts } from './voting-program-data-access'
import { Address } from 'gill';
import { Button } from '../ui/button'
import { getCreateProposalInstruction, getCastVoteInstruction } from '../../lib/solana/generated/instructions'
import { VOTING_PROGRAM_PROGRAM_ADDRESS } from '../../lib/solana/generated/programs/votingProgram'
import { Proposal, Vote } from '../../lib/solana/generated/accounts'
import { Candidate } from '../../lib/solana/generated/types/candidate'

export function VotingProgram() {
    return (
        <div className="min-h-screen bg-neutral-0 dark:bg-neutral-1000 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center mb-8">
                    <CreateProposal />
                </div>
                <ProposalList />
            </div>
        </div>
    )
}

// CreateProposal component remains the same as it's already in a modal
export function CreateProposal() {
    const signer = useWalletUiSigner()
    const { client, account } = useWalletUi()
    const now = new Date();
    now.setDate(now.getDate() + 10);
    const defaultDateTime = now.toISOString().slice(0, 16);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        candidateIds: [] as string[],
        proposalFinishedFrom: defaultDateTime,
    })

    const handleSubmit = async () => {
        if (!account?.address || !signer) return;
        console.log("Account address:", account.address);
        console.log("Signer address:", signer.address);
        const proposalPda = await deriveProposalPda(account.address as Address<string>, formData.title);
        const proposalFinishedFrom = BigInt(
            Math.floor(new Date(formData.proposalFinishedFrom).getTime() / 1000)
        );
        console.log("Instruction inputs:");
        console.log("- Title:", `"${formData.title}"`);
        console.log("- Description:", `"${formData.description}"`);
        console.log("- Candidate IDs:", formData.candidateIds);
        console.log("- Proposal Finished From:", proposalFinishedFrom);
        const ix = getCreateProposalInstruction({
            proposer: signer,
            proposal: proposalPda,
            title: formData.title,
            description: formData.description,
            candidateIds: formData.candidateIds,
            proposalFinishedFrom: proposalFinishedFrom
        });
        console.log("Instruction debug:")
        console.log("- Instruction:", ix);
        console.log("- Instruction accounts:", ix.accounts);
        console.log("- Instruction data length:", ix.data?.length);
        console.log("- Instruction program ID:", ix.programAddress.toString());
        await processTransaction(signer, client, [ix]);
        setFormData({
            title: '',
            description: '',
            candidateIds: [] as string[],
            proposalFinishedFrom: defaultDateTime,
        })
    }

    return (
        <AppModal
            title="Create Proposal"
            submit={handleSubmit}
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="title">Proposal title</Label>
                    <Input
                        id='title'
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                </div>
                <div>
                    <Label htmlFor="description">Proposal description</Label>
                    <Input
                        id='description'
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>
                <div>
                    <Label htmlFor="candidateIds">Candidate IDs</Label>
                    <Input
                        id='candidateIds'
                        type="text"
                        value={formData.candidateIds.join(', ')}
                        onChange={(e) => setFormData(prev => ({ ...prev, candidateIds: e.target.value.split(',').map(id => id.trim()) }))}
                    />
                </div>
                <div>
                    <Label htmlFor="proposalFinishedFrom">Finish date</Label>
                    <Input
                        id='proposalFinishedFrom'
                        type="datetime-local"
                        value={formData.proposalFinishedFrom}
                        onChange={(e) => setFormData(prev => ({ ...prev, proposalFinishedFrom: e.target.value }))}
                    />
                </div>
            </div>
        </AppModal>
    )
}

function ProposalList() {
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
                <Button
                    onClick={refresh}
                    variant="outline"
                    size="sm"
                    className="bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-0 dark:hover:bg-neutral-700"
                >
                    Refresh
                </Button>
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
                        
                        return (
                            <div
                                key={index}
                                className="bg-white dark:bg-neutral-800 rounded-lg shadow-md border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow duration-200 flex flex-col h-[600px]"
                            >
                                {/* Proposal Header - Fixed height */}
                                <div className="p-6 pb-4 flex-shrink-0">
                                    <h4 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                                        {proposal.data.title}
                                    </h4>
                                    
                                    <p className="text-neutral-600 dark:text-neutral-300 mb-4 line-clamp-3">
                                        {proposal.data.description}
                                    </p>
                                </div>
                                
                                {/* Candidates Section - Scrollable */}
                                <div className="px-6 flex-1 flex flex-col min-h-0">
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
                                                const isWinner = candidateIndex === 0 && hasVotes;
                                                const rank = candidateIndex + 1;
                                                
                                                return (
                                                    <div
                                                        key={candidate.id}
                                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors flex-shrink-0 ${
                                                            isWinner 
                                                                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' 
                                                                : 'bg-neutral-50 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600'
                                                        }`}
                                                    >
                                                        <div className="flex items-center space-x-2">
                                                            {/* Rank number */}
                                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                                                isWinner
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
                                                            <span className={`font-medium ${
                                                                isWinner 
                                                                    ? 'text-yellow-800 dark:text-yellow-200' 
                                                                    : 'text-neutral-700 dark:text-neutral-300'
                                                            }`}>
                                                                {candidate.id}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Vote count */}
                                                        <div className="flex items-center space-x-1">
                                                            <span className={`text-sm font-semibold ${
                                                                isWinner 
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
                                        {new Date(Number(proposal.data.proposalFinishedFrom) * 1000) > new Date() ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                Ended
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Action Button */}
                                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-600">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full bg-blue-50 dark:bg-neutral-900/20 border-blue-200 dark:border-neutral-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                            disabled={new Date(Number(proposal.data.proposalFinishedFrom) * 1000) <= new Date()}
                                        >
                                            {new Date(Number(proposal.data.proposalFinishedFrom) * 1000) > new Date()
                                                ? 'Vote'
                                                : 'Voting Ended'
                                            }
                                        </Button>
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
