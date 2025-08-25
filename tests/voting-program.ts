import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingProgram } from "../target/types/voting_program";
import { PublicKey } from '@solana/web3.js';
import * as assert from "assert";
import { BN } from "bn.js";

const PROPOSAL_SEED = "PROPOSAL_SEED";

describe("voting-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingProgram as Program<VotingProgram>;

  const bob = anchor.web3.Keypair.generate();

  const title1 = "Presidential election 2024";
  const description1 = "Vote for your favorite candidates!";
  const candidateIds1 = ["John", "Barry", "Grok"];
  const proposalOpenFrom1 = Math.floor(new Date().getTime() / 1000);
  const proposalFinishedFrom1 = proposalOpenFrom1 + 86400;

  describe("Create Proposal", async () => {
    it("Should sucessfully create proposal when parameters are valid", async () => {
      const connection = provider.connection;
      const latestBlockHash = await connection.getLatestBlockhash();

      await connection.confirmTransaction({
        signature: await connection.requestAirdrop(bob.publicKey, 1000000000),
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      });

      let [proposalPublicKey, proposalBump] = await PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          anchor.utils.bytes.utf8.encode(title1),
          bob.publicKey.toBuffer()
        ], program.programId);

      const tx = await program.methods.createProposal(title1, description1, candidateIds1, new BN(proposalOpenFrom1), new BN(proposalFinishedFrom1)).accounts(
        {
          proposer: bob.publicKey,
          proposal: proposalPublicKey,
          systemProgram: anchor.web3.SystemProgram.programId
        }
      ).signers([bob]).rpc({ commitment: "confirmed" });

      checkProposal(program, proposalPublicKey, bob.publicKey, title1, description1, candidateIds1.map(id => ({ id, voteCount: new anchor.BN(0) })), proposalOpenFrom1, proposalFinishedFrom1);
    });
  })
});

type Candidate = {
  id: string;
  voteCount: anchor.BN;
};

async function checkProposal(
  program: anchor.Program,
  proposal: PublicKey,
  proposer?: PublicKey,
  title?: string,
  description?: string,
  candidates?: Candidate[],
  proposalOpenFrom?: anchor.BN | number,
  proposalFinishedFrom?: anchor.BN | number,
  bump?: number,
) {
  const proposalData = await program.account.proposal.fetch(proposal);

  if (proposer) {
    assert.strictEqual(
      proposalData.proposer.toString(),
      proposer.toString(),
      `Proposer should be ${proposer.toString()} but was ${proposalData.proposer.toString()}`
    );
  }
  if (title) {
    assert.strictEqual(
      proposalData.title,
      title,
      `Title should be "${title}" but was "${proposalData.title}"`
    );
  }
  if (description) {
    assert.strictEqual(
      proposalData.description,
      description,
      `Description should be "${description}" but was "${proposalData.description}"`
    );
  }
  if (candidates) {
    assert.strictEqual(
      proposalData.candidates.length,
      candidates.length,
      `Candidates length should be ${candidates.length} but was ${proposalData.candidates.length}`
    );
    for (let i = 0; i < candidates.length; i++) {
      assert.strictEqual(
        proposalData.candidates[i].id,
        candidates[i].id,
        `Candidate ${i} id should be "${candidates[i].id}" but was "${proposalData.candidates[i].id}"`
      );
      assert.strictEqual(
        proposalData.candidates[i].voteCount.toString(),
        new anchor.BN(candidates[i].voteCount).toString(),
        `Candidate ${i} voteCount should be ${candidates[i].voteCount} but was ${proposalData.candidates[i].voteCount.toString()}`
      );
    }
  }
  if (proposalOpenFrom !== undefined) {
    const val = proposalOpenFrom instanceof anchor.BN ? proposalOpenFrom : new anchor.BN(proposalOpenFrom);
    assert.strictEqual(
      proposalData.proposalOpenFrom.toString(),
      val.toString(),
      `proposalOpenFrom should be ${val.toString()} but was ${proposalData.proposalOpenFrom.toString()}`
    );
  }
  if (proposalFinishedFrom !== undefined) {
    const val = proposalFinishedFrom instanceof anchor.BN ? proposalFinishedFrom : new anchor.BN(proposalFinishedFrom);
    assert.strictEqual(
      proposalData.proposalFinishedFrom.toString(),
      val.toString(),
      `proposalFinishedFrom should be ${val.toString()} but was ${proposalData.proposalFinishedFrom.toString()}`
    );
  }
  if (bump !== undefined) {
    assert.strictEqual(
      proposalData.bump.toString(),
      bump.toString(),
      `Bump should be ${bump} but was ${proposalData.bump.toString()}`
    );
  }
}
