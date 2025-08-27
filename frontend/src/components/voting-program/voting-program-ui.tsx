import { useWalletUiSigner } from '../solana/use-wallet-ui-signer'
import { useWalletUi } from '@wallet-ui/react'
import { useState } from 'react'
import { AppModal } from '../app-modal'
import { Label } from '@radix-ui/react-label'
import { Input } from '../ui/input'
import { getCreateProposalInstruction } from '../../lib/solana/generated/instructions/createProposal'
import { VOTING_PROGRAM_PROGRAM_ADDRESS } from '../../lib/solana/generated/programs/votingProgram'
import { Proposal } from '../../lib/solana/generated/accounts/proposal'
import { deriveProposalPda } from '../../lib/pda';
import { processTransaction, getProposalAccounts } from './voting-program-data-access'
import { Address } from 'gill';
import { Button } from '../ui/button'

export function VotingProgram() {
    return (
        <div className="voting-program">
            <div className="flex flex-col items-center">
                <CreateProposal />
            </div>
            <br />
            <ProposalList />
        </div>
    )
}

export function CreateProposal() {
    const signer = useWalletUiSigner()
    const { client, account } = useWalletUi()

    // Initialize with current date/time in the correct format
    const now = new Date();
    now.setDate(now.getDate() + 10);
    // const offset = now.getTimezoneOffset() * 60000;
    // const localDate = new Date(now.getTime() - offset);
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
            <div className="create-event-modal">
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

    return (
        <div className="proposals-section">
            <div>
                <h3>Proposals</h3>
                <Button
                    onClick={refresh}
                    variant="outline"
                    size="sm"
                >
                    Refresh
                </Button>
            </div>
            <div>
                {proposals.map((
                    proposal, index
                ) => (
                    <div key={index}>
                        <h4>{proposal.data.title}</h4>
                        <p>{proposal.data.description}</p>
                        <div>
                            <span>Candidates: {proposal.data.candidates.join(', ')}</span><br />
                            <span>Proposal finished date: {new Date(Number(proposal.data.proposalFinishedFrom) * 1000).toLocaleString()}</span><br />
                        </div>
                        <div>
                            {/* <CastVote eventAddress={proposal.address} /> */}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
