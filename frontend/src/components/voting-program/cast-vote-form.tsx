import { useWalletUi, useWalletUiSigner } from '@wallet-ui/react'
import { useState } from 'react'
import { Address } from 'gill';

import { Button } from '../ui/button'
import { AppModal } from '../app-modal'
import { Proposal } from '@/lib/solana/generated/accounts/proposal';
import { deriveVotePda } from '@/lib/solana/pda';
import { getCastVoteInstruction } from '@/lib/solana/generated/instructions'
import { processTransaction } from '@/lib/solana/data-access';

export function CastVote({ proposal, onRefresh }: {
    proposal: { address: Address, data: Proposal },
    onRefresh: () => void
}) {
    const isVotingActive = new Date(Number(proposal.data.proposalFinishedFrom) * 1000) > new Date()
    const signer = useWalletUiSigner()
    const { client, account } = useWalletUi()
    const [formData, setFormData] = useState({
        chosenCandidateIds: [] as string[],
    })

    const handleCandidateToggle = (candidateId: string) => {
        setFormData(prev => {
            const newChosenCandidateIds = prev.chosenCandidateIds.includes(candidateId)
                ? prev.chosenCandidateIds.filter(id => id !== candidateId)
                : [...prev.chosenCandidateIds, candidateId]

            return { ...prev, chosenCandidateIds: newChosenCandidateIds }
        })
    }

    const handleSubmit = async () => {
        if (!account?.address || !signer || formData.chosenCandidateIds.length === 0) return;

        console.log("Account address:", account.address);
        console.log("Signer address:", signer.address);

        const votePda = await deriveVotePda(account.address as Address<string>, proposal.address);
        const voteAccount = await client.rpc.getAccountInfo(votePda, {
            "commitment": "confirmed",
            "encoding": "base64"
        }).send();
        if (voteAccount.value !== null) {
            // TODO: Replace alert with a nicer UI message.
            alert("You have already voted on this proposal.");
            return;
        }

        console.log("Instruction inputs:");
        console.log("- Candidate IDs:", formData.chosenCandidateIds);
        console.log("- Proposal Address:", proposal.address);
        console.log("- Vote PDA:", votePda);

        const ix = getCastVoteInstruction({
            voter: signer,
            vote: votePda,
            proposal: proposal.address,
            candidateIds: formData.chosenCandidateIds
        });

        console.log("Instruction debug:")
        console.log("- Instruction:", ix);
        console.log("- Instruction accounts:", ix.accounts);
        console.log("- Instruction data length:", ix.data?.length);
        console.log("- Instruction program ID:", ix.programAddress.toString());

        await processTransaction(signer, client, [ix]);

        // Reset form and refresh proposals
        setFormData({
            chosenCandidateIds: [],
        })

        onRefresh()
    }

    // Don't render modal if wallet not connected or voting ended
    if (!account?.address || !signer || !isVotingActive) {
        return (
            <Button
                variant="outline"
                size="default"
                className="w-full bg-neutral-100 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400"
                disabled
            >
                {!isVotingActive ? 'Voting Ended' : 'Connect Wallet to Vote'}
            </Button>
        )
    }

    return (
        <AppModal
            title={`Vote`}
            submit={handleSubmit}
            submitDisabled={formData.chosenCandidateIds.length === 0}
            submitLabel="Cast Vote"
            triggerClassName="w-full"
            submitClassName="w-full"
        >
            <div className="space-y-4">
                <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        Select the candidate(s) you want to vote for:
                    </p>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {proposal.data.candidates.map((candidate) => (
                            <div
                                key={candidate.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                                onClick={() => handleCandidateToggle(candidate.id)}
                            >
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        checked={formData.chosenCandidateIds.includes(candidate.id)}
                                        onChange={() => handleCandidateToggle(candidate.id)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
                                    />
                                    <div>
                                        <span className="font-medium text-neutral-900 dark:text-white">
                                            {candidate.id}
                                        </span>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                            Current votes: {Number(candidate.voteCount)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {formData.chosenCandidateIds.length > 0 && (
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm text-blue-700 dark:text-blue-300">
                            Selected: {formData.chosenCandidateIds.join(', ')}
                        </div>
                    )}
                </div>

                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    <p>• You can select multiple candidates</p>
                    <p>• Voting ends on {new Date(Number(proposal.data.proposalFinishedFrom) * 1000).toLocaleString()}</p>
                </div>
            </div>
        </AppModal>
    )
}