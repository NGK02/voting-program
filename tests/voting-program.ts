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

// --- Test Utilities & Constants ---

const wrongErrCodeMessage = (expected: string, found: string) =>
  `Expected ${expected} code, but found ${found}`;
const expectedToFailErrMsg = "Expected transaction to fail, but it succeeded";

const PROPOSAL_SEED = "PROPOSAL_SEED";
const PROPOSAL_MAX_TITLE_LENGTH = 100;
const PROPOSAL_MAX_DESCRIPTION_LENGTH = 600;
const MIN_NUMBER_OF_CANDIDATES = 2;
const MAX_NUMBER_OF_CANDIDATES = 12;
const CANDIDATE_MAX_LENGTH = 50;

// Error codes from the program
const titleTooLongErrCode = "TitleTooLong";
const descriptionTooLongErrCode = "DescriptionTooLong";
const tooManyCandidatesErrCode = "TooManyCandidates";
const notEnoughCandidatesErrCode = "NotEnoughCandidates";
const duplicateCandidatesErrCode = "DuplicateCandidates";
const invalidProposalTimeErrCode = "InvalidProposalTime";
const candidateIdTooLongErrCode = "CandidateIdTooLong";


describe("voting-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingProgram as Program<VotingProgram>;

  // --- Reusable Test Data ---

  const title = "Presidential election 2025";
  const invalidTitle = "x".repeat(PROPOSAL_MAX_TITLE_LENGTH + 1);

  const description = "Vote for your favorite candidates!";
  const invalidDescription = "x".repeat(PROPOSAL_MAX_DESCRIPTION_LENGTH + 1);

  const invalidCandidateId = "x".repeat(CANDIDATE_MAX_LENGTH + 1); // 51 characters
  const invalidCandidateIds = ["John", invalidCandidateId];

  const candidateIds = ["John", "Barry", "Grok"];
  const now = Math.floor(new Date().getTime() / 1000);
  const proposalOpenFrom = now + 60;
  const proposalFinishedFrom = proposalOpenFrom + 86400;

  describe("Create Proposal", async () => {
    it("Should sucessfully create proposal when parameters are valid", async () => {
      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      await program.methods.createProposal(title, description, candidateIds, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
        {
          proposer: proposer.publicKey,
          proposal: proposalPublicKey,
        }
      ).signers([proposer]).rpc({ commitment: "confirmed" });

      // Verify the data stored on-chain
      await checkProposal(program, proposalPublicKey, {
        proposer: proposer.publicKey,
        title,
        description,
        candidates: candidateIds.map(id => ({ id, voteCount: new BN(0) })),
        proposalOpenFrom,
        proposalFinishedFrom,
      });
    });


    it("Should throw an error when title is too long", async () => {
      const titleHash = hash(invalidTitle);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        await program.methods.createProposal(invalidTitle, description, candidateIds, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, titleTooLongErrCode, wrongErrCodeMessage(titleTooLongErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when description is too long", async () => {
      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        await program.methods.createProposal(title, invalidDescription, candidateIds, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, descriptionTooLongErrCode, wrongErrCodeMessage(descriptionTooLongErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when there are too many candidates", async () => {
      const tooManyCandidates = Array.from({ length: MAX_NUMBER_OF_CANDIDATES + 1 }, (_, i) => `Candidate ${i + 1}`);
      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        await program.methods.createProposal(title, description, tooManyCandidates, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, tooManyCandidatesErrCode, wrongErrCodeMessage(tooManyCandidatesErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when there are not enough candidates", async () => {
      const notEnoughCandidates = ["SoloCandidate"];
      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        await program.methods.createProposal(title, description, notEnoughCandidates, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, notEnoughCandidatesErrCode, wrongErrCodeMessage(notEnoughCandidatesErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when there are duplicate candidates", async () => {
      const duplicateCandidates = ["Candidate A", "Candidate B", "Candidate A"];
      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        await program.methods.createProposal(title, description, duplicateCandidates, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, duplicateCandidatesErrCode, wrongErrCodeMessage(duplicateCandidatesErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when the proposal start time is in the past", async () => {
      const invalidStartTime = now - 100; // 100 seconds in the past
      const validEndTime = now + 86400;
      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        await program.methods.createProposal(title, description, candidateIds, new BN(invalidStartTime), new BN(validEndTime)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, invalidProposalTimeErrCode, wrongErrCodeMessage(invalidProposalTimeErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when the proposal end time is before the start time", async () => {
      const startTime = now + 200;
      const invalidEndTime = now + 100; // End time is before start time
      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        await program.methods.createProposal(title, description, candidateIds, new BN(startTime), new BN(invalidEndTime)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, invalidProposalTimeErrCode, wrongErrCodeMessage(invalidProposalTimeErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when candidate ID is too long", async () => {
      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      try {
        await program.methods.createProposal(title, description, invalidCandidateIds, new BN(proposalOpenFrom), new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        assert.strictEqual(error.error.errorCode.code, candidateIdTooLongErrCode, wrongErrCodeMessage(candidateIdTooLongErrCode, error.error.errorCode.code));
      }
    });

  })

  describe("Cast Vote", async () => {
    it("Should sucessfully cast a vote when parameters are valid", async () => { });

  })
});


// --- Helper Functions ---

/**
 * Airdrops SOL to a specified recipient publicKey.
 */
async function airdropSol(provider: anchor.Provider, recipient: PublicKey, amount: number) {
  const connection = provider.connection;
  const signature = await connection.requestAirdrop(recipient, amount);
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    signature,
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  });
}

/**
 * Creates a SHA256 hash buffer from a string, matching the Rust `hash` function.
 */
function hash(data: string): Buffer {
  return crypto.createHash('sha256').update(data, 'utf-8').digest();
}


type ProposalCheckParams = {
  proposer?: PublicKey;
  title?: string;
  description?: string;
  candidates?: Candidate[];
  proposalOpenFrom?: anchor.BN | number;
  proposalFinishedFrom?: anchor.BN | number;
  bump?: number;
};

/**
 * Fetches a proposal account and asserts its fields match the expected values.
 */
async function checkProposal(
  program: anchor.Program<VotingProgram>,
  proposal: PublicKey,
  expected: ProposalCheckParams
) {
  const proposalData = await program.account.proposal.fetch(proposal);

  if (expected.proposer) {
    assert.ok(proposalData.proposer.equals(expected.proposer),
      `Proposer should be ${expected.proposer.toBase58()} but was ${proposalData.proposer.toBase58()}`
    );
  }
  if (expected.title) {
    assert.strictEqual(proposalData.title, expected.title,
      `Title should be "${expected.title}" but was "${proposalData.title}"`
    );
  }
  if (expected.description) {
    assert.strictEqual(proposalData.description, expected.description,
      `Description should be "${expected.description}" but was "${proposalData.description}"`
    );
  }
  if (expected.candidates) {
    assert.strictEqual(proposalData.candidates.length, expected.candidates.length,
      `Candidates length should be ${expected.candidates.length} but was ${proposalData.candidates.length}`
    );
    for (let i = 0; i < expected.candidates.length; i++) {
      assert.strictEqual(proposalData.candidates[i].id, expected.candidates[i].id,
        `Candidate ${i} id should be "${expected.candidates[i].id}" but was "${proposalData.candidates[i].id}"`
      );
      assert.ok(proposalData.candidates[i].voteCount.eq(new BN(expected.candidates[i].voteCount)),
        `Candidate ${i} voteCount should be ${expected.candidates[i].voteCount} but was ${proposalData.candidates[i].voteCount.toString()}`
      );
    }
  }
  if (expected.proposalOpenFrom !== undefined) {
    const val = expected.proposalOpenFrom instanceof BN ? expected.proposalOpenFrom : new BN(expected.proposalOpenFrom);
    assert.ok(proposalData.proposalOpenFrom.eq(val),
      `proposalOpenFrom should be ${val.toString()} but was ${proposalData.proposalOpenFrom.toString()}`
    );
  }
  if (expected.proposalFinishedFrom !== undefined) {
    const val = expected.proposalFinishedFrom instanceof BN ? expected.proposalFinishedFrom : new BN(expected.proposalFinishedFrom);
    assert.ok(proposalData.proposalFinishedFrom.eq(val),
      `proposalFinishedFrom should be ${val.toString()} but was ${proposalData.proposalFinishedFrom.toString()}`
    );
  }
  if (expected.bump !== undefined) {
    assert.strictEqual(proposalData.bump, expected.bump,
      `Bump should be ${expected.bump} but was ${proposalData.bump}`
    );
  }
}