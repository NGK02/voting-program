import { Address, getProgramDerivedAddress, getAddressEncoder } from 'gill';
import { VOTING_PROGRAM_PROGRAM_ADDRESS } from './solana/generated';

export async function deriveProposalPda(proposer: Address, title: string): Promise<Address> {
    const titleBytes = new TextEncoder().encode(title);
    const hashBuf = Buffer.from(await crypto.subtle.digest('SHA-256', titleBytes));

    console.log("PDA Derivation Debug:");
    console.log("- Proposer:", proposer);
    console.log("- Title:", `"${title}"`);

    const PROPOSAL_SEED = 'PROPOSAL_SEED';

    const addressEncoder = getAddressEncoder();
    const proposerBytes = Buffer.from(addressEncoder.encode(proposer));

    console.log("- Proposal seed:", Array.from(new TextEncoder().encode(PROPOSAL_SEED)));
    console.log("- Proposer public key:", Array.from(proposerBytes));

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
