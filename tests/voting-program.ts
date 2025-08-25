import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingProgram } from "../target/types/voting_program";
import { PublicKey } from '@solana/web3.js';
import * as assert from "assert";
import { BN } from "bn.js";
import crypto from 'crypto';

type Candidate = {
  id: string;
  voteCount: anchor.BN;
};

const wrongErrCodeMessage = (expected: string, found: string) =>
  `Expected ${expected} code, but found ${found}`;
const expectedToFailErrMsg = "Expected transaction to fail, but it succeeded";

const PROPOSAL_SEED = "PROPOSAL_SEED";
const PROPOSAL_MAX_TITLE_LENGTH = 100;
const PROPOSAL_MAX_DESCRIPTION_LENGTH = 600;
const MIN_NUMBER_OF_CANDIDATES = 2;
const MAX_NUMBER_OF_CANDIDATES = 12;

const titleTooLongErrCode = "TitleTooLong";
const descriptionTooLongErrCode = "DescriptionTooLong";
const tooManyCandidatesErrCode = "TooManyCandidates";
const notEnoughCandidatesErrCode = "NotEnoughCandidates";

describe("voting-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingProgram as Program<VotingProgram>;

  const title = "Presidential election 2024";
  const invalidTitle = "x".repeat(PROPOSAL_MAX_TITLE_LENGTH + 1);

  const description = "Vote for your favorite candidates!";
  const invalidDescription = "x".repeat(PROPOSAL_MAX_DESCRIPTION_LENGTH + 1);

  const candidateIds = ["John", "Barry", "Grok"];
  const proposalOpenFrom = Math.floor(new Date().getTime() / 1000);
  const proposalFinishedFrom = proposalOpenFrom + 86400;

  describe("Create Proposal", async () => {
    it("Should sucessfully create proposal when parameters are valid", async () => {

      let titleHash = Uint8Array.from(Buffer.from(crypto.createHash('sha256').update(title, 'utf-8').digest('hex'), 'hex'));
      let proposer = anchor.web3.Keypair.generate();
      let [proposalPublicKey, proposalBump] = await PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      const tx = await program.methods.createProposal(title, description, candidateIds, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
        {
          proposer: proposer.publicKey,
          proposal: proposalPublicKey,
        }
      ).signers([proposer]).rpc({ commitment: "confirmed" });

      checkProposal(program, proposalPublicKey, proposer.publicKey, title, description, candidateIds.map(id => ({ id, voteCount: new anchor.BN(0) })), proposalOpenFrom, proposalFinishedFrom);
    });


    it("Should throw an error when title is too long", async () => {
      let titleHash = Uint8Array.from(Buffer.from(crypto.createHash('sha256').update(invalidTitle, 'utf-8').digest('hex'), 'hex'));
      let proposer = anchor.web3.Keypair.generate();
      let failedExpectedly = false;
      let [proposalPublicKey, proposalBump] = await PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        const tx = await program.methods.createProposal(invalidTitle, description, candidateIds, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, titleTooLongErrCode, wrongErrCodeMessage(titleTooLongErrCode, error.error.errorCode.code));
        failedExpectedly = true;
      }

      assert.strictEqual(failedExpectedly, true, expectedToFailErrMsg);
    });


    it("Should throw an error when description is too long", async () => {
      let titleHash = Uint8Array.from(Buffer.from(crypto.createHash('sha256').update(title, 'utf-8').digest('hex'), 'hex'));
      let proposer = anchor.web3.Keypair.generate();
      let failedExpectedly = false;
      let [proposalPublicKey, proposalBump] = await PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        const tx = await program.methods.createProposal(title, invalidDescription, candidateIds, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
      } catch (error) {
        console.log(error);
        assert.strictEqual(error.error.errorCode.code, descriptionTooLongErrCode, wrongErrCodeMessage(descriptionTooLongErrCode, error.error.errorCode.code));
        failedExpectedly = true;
      }

      assert.strictEqual(failedExpectedly, true, expectedToFailErrMsg);
    });
  })
});

async function airdropSol(provider: anchor.Provider, recipient: PublicKey, amount: number) {
  const connection = provider.connection;
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    signature: await connection.requestAirdrop(recipient, amount),
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  });
}

async function checkProposal(
  program: anchor.Program<VotingProgram>,
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
