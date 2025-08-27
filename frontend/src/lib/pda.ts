import { Address, getProgramDerivedAddress, getAddressEncoder } from 'gill';
import { VOTING_PROGRAM_PROGRAM_ADDRESS } from './solana/generated';
import crypto from 'crypto';

export async function deriveProposalPda(proposer: Address, title: string): Promise<Address> {
    const PROPOSAL_SEED = 'PROPOSAL_SEED';
    const hashBuf = crypto.createHash('sha256').update(title, 'utf-8').digest();
    const addressEncoder = getAddressEncoder();
    const proposerBytes = Buffer.from(addressEncoder.encode(proposer));

    console.log("PDA Derivation Debug:");
    console.log("- Proposer:", proposer);
    console.log("- Title:", `"${title}"`);
    console.log("- Proposal seed:", new TextEncoder().encode(PROPOSAL_SEED));
    console.log("- Proposer public key:", proposerBytes);

    const [pda] = await getProgramDerivedAddress({
        programAddress: VOTING_PROGRAM_PROGRAM_ADDRESS,
        seeds: [
            new TextEncoder().encode(PROPOSAL_SEED),
            hashBuf,
            proposerBytes
        ],
    });

    console.log("- Derived PDA:", pda);

    return pda;
}

export async function deriveVotePda(voter: Address, proposal: Address): Promise<Address> {
    const VOTE_SEED = 'VOTE_SEED';
    const addressEncoder = getAddressEncoder();
    const voterBytes = Buffer.from(addressEncoder.encode(voter));
    const proposalBytes = Buffer.from(addressEncoder.encode(proposal));

    const [pda] = await getProgramDerivedAddress({
        programAddress: VOTING_PROGRAM_PROGRAM_ADDRESS,
        seeds: [
            new TextEncoder().encode(VOTE_SEED),
            voterBytes,
            proposalBytes
        ],
    });

    return pda;
}
