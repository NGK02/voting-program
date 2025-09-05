import { useWalletUi, useWalletUiSigner } from '@wallet-ui/react'
import { useState } from 'react'
import { Address } from 'gill';

import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { AppModal } from '../app-modal'
import { Input } from '../ui/input'
import { deriveProposalPda } from '@/lib/solana/pda';
import { processTransaction } from '@/lib/solana/data-access';
import { getCreateProposalInstruction } from '@/lib/solana/generated/instructions'

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

    const [candidateInput, setCandidateInput] = useState('')

    const addCandidate = () => {
        const v = candidateInput.trim()
        if (!v) return
        setFormData(prev => ({
            ...prev,
            candidateIds: [...prev.candidateIds, v],
        }))
        setCandidateInput('')
    }

    const handleSubmit = async () => {
        // TODO: Validations for all the fields to prevent failing transactions.
        if (!account?.address || !signer) return;
        console.log("Account address:", account.address);
        console.log("Signer address:", signer.address);
        const proposalPda = await deriveProposalPda(account.address as Address<string>, formData.title);
        const proposalFinishedFrom = BigInt(
            Math.floor(new Date(formData.proposalFinishedFrom).getTime() / 1000)
        );
        console.log("Instruction inputs:");
        console.log("- Title:", formData.title);
        console.log("- Description:", formData.description);
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
            triggerClassName="bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            submitClassName="w-full bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            contentClassName="sm:max-w-[525px] bg-neutral-50 dark:bg-neutral-900"
        >
            <div className="space-y-4">
                <div>
                    <Label htmlFor="title">Proposal title</Label>
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                </div>
                <div>
                    <Label htmlFor="description">Proposal description</Label>
                    <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>
                <div>
                    <Label htmlFor="candidateIds">Candidate IDs</Label>
                    <div className="flex space-x-2">
                        <Input
                            id="candidateIds"
                            type="text"
                            value={candidateInput}
                            onChange={(e) => setCandidateInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addCandidate() }}
                        />
                        <Button className="bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            variant="outline"
                            size="default"
                            onClick={addCandidate}>
                            +
                        </Button>
                    </div>
                    <div className='flex flex-row flex-wrap mt-2'>
                        {formData.candidateIds.map((candidateId) => (
                            <div key={candidateId} className="mr-2 mb-2 p-1 rounded-md bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600">
                                <span>{candidateId}</span>
                            </div>
                        ))}
                    </div>

                </div>
                <div>
                    <Label htmlFor="proposalFinishedFrom">Finish date</Label>
                    <Input
                        id="proposalFinishedFrom"
                        type="datetime-local"
                        value={formData.proposalFinishedFrom}
                        onChange={(e) => setFormData(prev => ({ ...prev, proposalFinishedFrom: e.target.value }))}
                    />
                </div>
            </div>
        </AppModal>
    )
}