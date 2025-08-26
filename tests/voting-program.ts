import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { VotingProgram } from "../target/types/voting_program";
import { PublicKey } from '@solana/web3.js';
import * as assert from "assert";
import { BN } from "bn.js";
import crypto from 'crypto';
import { expect } from "chai";

type Candidate = {
  id: string;
  voteCount: anchor.BN;
};

type VoteCheckParams = {
  voter?: PublicKey;
  proposal?: PublicKey;
  candidates?: Candidate[];
  bump?: number;
};

type ProposalCheckParams = {
  proposer?: PublicKey;
  title?: string;
  description?: string;
  candidates?: Candidate[];
  proposalOpenFrom?: anchor.BN | number;
  proposalFinishedFrom?: anchor.BN | number;
  bump?: number;
};

const wrongErrCodeMessage = (expected: string, found: string) =>
  `Expected ${expected} code, but found ${found}`;
const expectedToFailErrMsg = "Expected transaction to fail, but it succeeded";

const PROPOSAL_SEED = "PROPOSAL_SEED";
const VOTE_SEED = "VOTE_SEED";
const PROPOSAL_MAX_TITLE_LENGTH = 100;
const PROPOSAL_MAX_DESCRIPTION_LENGTH = 600;
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
const notEnoughCandidateVotesErrCode = "NotEnoughCandidateVotes";
const tooManyCandidateVotesErrCode = "TooManyCandidateVotes";
const invalidCandidateIdErrCode = "InvalidCandidateId";
const proposalClosedErrCode = "ProposalClosed";

// Reusable Test Data
const title = "Presidential election 2025";
const description = "Vote for your favorite candidates!";
const candidateIds = ["John", "Barry", "Grok"];
const now = Math.floor(new Date().getTime() / 1000);
const proposalFinishedFrom = now + 86400;

describe("voting-program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.VotingProgram as Program<VotingProgram>;

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

      const txSignature = await program.methods.createProposal(title, description, candidateIds, new BN(proposalFinishedFrom)).accounts(
        {
          proposer: proposer.publicKey,
          proposal: proposalPublicKey,
        }
      ).signers([proposer]).rpc({ commitment: "confirmed" });
      await confirmTransaction(provider, txSignature);

      await checkProposal(program, proposalPublicKey, {
        proposer: proposer.publicKey,
        title,
        description,
        candidates: candidateIds.map(id => ({ id, voteCount: new BN(0) })),
        proposalFinishedFrom,
      });
    });


    it("Should throw an error when title is too long", async () => {
      const invalidTitle = "x".repeat(PROPOSAL_MAX_TITLE_LENGTH + 1);
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
        const txSignature = await program.methods.createProposal(invalidTitle, description, candidateIds, new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

        assert.strictEqual(error.error.errorCode.code, titleTooLongErrCode, wrongErrCodeMessage(titleTooLongErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when description is too long", async () => {
      const invalidDescription = "x".repeat(PROPOSAL_MAX_DESCRIPTION_LENGTH + 1);
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
        const txSignature = await program.methods.createProposal(title, invalidDescription, candidateIds, new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

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
        const txSignature = await program.methods.createProposal(title, description, tooManyCandidates, new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

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
        const txSignature = await program.methods.createProposal(title, description, notEnoughCandidates, new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

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
        const txSignature = await program.methods.createProposal(title, description, duplicateCandidates, new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

        assert.strictEqual(error.error.errorCode.code, duplicateCandidatesErrCode, wrongErrCodeMessage(duplicateCandidatesErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when the proposal end time is in the past", async () => {
      const invalidEndTime = now - 100; // 100 seconds in the past
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
        const txSignature = await program.methods.createProposal(title, description, candidateIds, new BN(invalidEndTime)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

        assert.strictEqual(error.error.errorCode.code, invalidProposalTimeErrCode, wrongErrCodeMessage(invalidProposalTimeErrCode, error.error.errorCode.code));
      }
    });


    it("Should throw an error when candidate ID is too long", async () => {
      const invalidCandidateId = "x".repeat(CANDIDATE_MAX_LENGTH + 1); // 51 characters
      const invalidCandidateIds = ["John", invalidCandidateId];
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
        const txSignature = await program.methods.createProposal(title, description, invalidCandidateIds, new BN(proposalFinishedFrom)).accounts(
          {
            proposer: proposer.publicKey,
            proposal: proposalPublicKey,
          }
        ).signers([proposer]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

        assert.strictEqual(error.error.errorCode.code, candidateIdTooLongErrCode, wrongErrCodeMessage(candidateIdTooLongErrCode, error.error.errorCode.code));
      }
    });

  })


  describe("Cast Vote", async () => {
    it("Should sucessfully cast a vote when parameters are valid", async () => {
      const proposalPublicKey = await createValidProposal(program, provider);
      const voter = anchor.web3.Keypair.generate();
      const [votePublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(VOTE_SEED),
          voter.publicKey.toBuffer(),
          proposalPublicKey.toBuffer()
        ], program.programId);
      await airdropSol(provider, voter.publicKey, 1000000000);

      const txSignature = await program.methods.castVote([candidateIds[0]]).accounts(
        {
          voter: voter.publicKey,
          proposal: proposalPublicKey
        }
      ).signers([voter]).rpc({ commitment: "confirmed" });
      await confirmTransaction(provider, txSignature);

      checkVote(program, votePublicKey, {
        voter: voter.publicKey,
        proposal: proposalPublicKey,
        candidates: [
          {
            id: candidateIds[0],
            voteCount: new BN(1)
          }
        ]
      });

      const proposalData = await program.account.proposal.fetch(proposalPublicKey);
      assert.strictEqual(true, proposalData.candidates.find(candidate => candidate.id === candidateIds[0]).voteCount.eq(new BN(1)));

    });


    it("Should return an error when not enough candidate votes are specified", async () => {
      const proposalPublicKey = await createValidProposal(program, provider);
      const voter = anchor.web3.Keypair.generate();
      const [votePublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(VOTE_SEED),
          voter.publicKey.toBuffer(),
          proposalPublicKey.toBuffer()
        ], program.programId);
      await airdropSol(provider, voter.publicKey, 1000000000);

      try {
        const txSignature = await program.methods.castVote([]).accounts(
          {
            voter: voter.publicKey,
            proposal: proposalPublicKey
          }
        ).signers([voter]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

        assert.strictEqual(error.error.errorCode.code, notEnoughCandidateVotesErrCode, wrongErrCodeMessage(notEnoughCandidateVotesErrCode, error.error.errorCode.code));
      }
    });


    it("Should return an error when too many candidate votes are specified", async () => {
      const proposalPublicKey = await createValidProposal(program, provider);
      const voter = anchor.web3.Keypair.generate();
      const [votePublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(VOTE_SEED),
          voter.publicKey.toBuffer(),
          proposalPublicKey.toBuffer()
        ], program.programId);
      await airdropSol(provider, voter.publicKey, 1000000000);
      const tooManyCandidateVotes = [...candidateIds, "ExtraCandidate"];

      try {
        const txSignature = await program.methods.castVote(tooManyCandidateVotes).accounts(
          {
            voter: voter.publicKey,
            proposal: proposalPublicKey
          }
        ).signers([voter]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

        assert.strictEqual(error.error.errorCode.code, tooManyCandidateVotesErrCode, wrongErrCodeMessage(tooManyCandidateVotesErrCode, error.error.errorCode.code));
      }
    });


    it("Should return an error when an invalid candidate ID is specified", async () => {
      const proposalPublicKey = await createValidProposal(program, provider);
      const voter = anchor.web3.Keypair.generate();
      const [votePublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(VOTE_SEED),
          voter.publicKey.toBuffer(),
          proposalPublicKey.toBuffer()
        ], program.programId);
      await airdropSol(provider, voter.publicKey, 1000000000);

      const invalidCandidateVotes = ["NonExistentCandidate"];

      try {
        const txSignature = await program.methods.castVote(invalidCandidateVotes).accounts(
          {
            voter: voter.publicKey,
            proposal: proposalPublicKey
          }
        ).signers([voter]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

        assert.strictEqual(error.error.errorCode.code, invalidCandidateIdErrCode, wrongErrCodeMessage(invalidCandidateIdErrCode, error.error.errorCode.code));
      }
    });


    it("Should return an error when proposal is already closed", async () => {
      const endTime = Math.floor(new Date().getTime() / 1000);

      const titleHash = hash(title);
      const proposer = anchor.web3.Keypair.generate();
      const [proposalPublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
          titleHash,
          proposer.publicKey.toBuffer()
        ], program.programId);

      await airdropSol(provider, proposer.publicKey, 1000000000);

      const txSignature = await program.methods.createProposal(title, description, candidateIds, new BN(endTime)).accounts(
        {
          proposer: proposer.publicKey,
          proposal: proposalPublicKey,
        }
      ).signers([proposer]).rpc({ commitment: "confirmed" });
      await confirmTransaction(provider, txSignature);

      await new Promise(resolve => setTimeout(resolve, 2000));
      const proposalData = await program.account.proposal.fetch(proposalPublicKey);
      assert.strictEqual(
        true,
        proposalData.proposalFinishedFrom.lt(new BN(Math.floor(new Date().getTime() / 1000))),
        "Proposal should be closed, but it's not.");

      const voter = anchor.web3.Keypair.generate();
      const [votePublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(VOTE_SEED),
          voter.publicKey.toBuffer(),
          proposalPublicKey.toBuffer()
        ], program.programId);
      await airdropSol(provider, voter.publicKey, 1000000000);

      try {
        const txSignature = await program.methods.castVote([candidateIds[0]]).accounts(
          {
            voter: voter.publicKey,
            proposal: proposalPublicKey
          }
        ).signers([voter]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);

        assert.strictEqual(error.error.errorCode.code, proposalClosedErrCode, wrongErrCodeMessage(proposalClosedErrCode, error.error.errorCode.code));
      }
    });


    it("Should return an error when duplicate candidate IDs are specified", async () => {
      const proposalPublicKey = await createValidProposal(program, provider);
      const voter = anchor.web3.Keypair.generate();
      const [votePublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(VOTE_SEED),
          voter.publicKey.toBuffer(),
          proposalPublicKey.toBuffer()
        ], program.programId);
      await airdropSol(provider, voter.publicKey, 1000000000);

      const duplicateVotes = [candidateIds[0], candidateIds[1], candidateIds[0]]; // John, Barry, John

      try {
        const txSignature = await program.methods.castVote(duplicateVotes).accounts(
          {
            voter: voter.publicKey,
            proposal: proposalPublicKey
          }
        ).signers([voter]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);
        assert.strictEqual(error.error.errorCode.code, duplicateCandidatesErrCode, wrongErrCodeMessage(duplicateCandidatesErrCode, error.error.errorCode.code));
      }
    });

    it("Should return an error when a voter attempts to vote a second time", async () => {
      const proposalPublicKey = await createValidProposal(program, provider);
      const voter = anchor.web3.Keypair.generate();
      const [votePublicKey] = PublicKey.findProgramAddressSync(
        [
          anchor.utils.bytes.utf8.encode(VOTE_SEED),
          voter.publicKey.toBuffer(),
          proposalPublicKey.toBuffer()
        ], program.programId);
      await airdropSol(provider, voter.publicKey, 1000000000);

      const txSignature = await program.methods.castVote([candidateIds[0]]).accounts(
        {
          voter: voter.publicKey,
          proposal: proposalPublicKey
        }
      ).signers([voter]).rpc({ commitment: "confirmed" });
      await confirmTransaction(provider, txSignature);

      try {
        const txSignature = await program.methods.castVote([candidateIds[0]]).accounts(
          {
            voter: voter.publicKey,
            proposal: proposalPublicKey
          }
        ).signers([voter]).rpc({ commitment: "confirmed" });
        await confirmTransaction(provider, txSignature);
        assert.fail(expectedToFailErrMsg);
      } catch (error) {
        console.log(error);
        expect(error.message).to.include("custom program error: 0x0");
      }
    });
  })
});

// --- Helper Functions ---

async function createValidProposal(program: anchor.Program<VotingProgram>, provider: anchor.Provider): Promise<PublicKey> {
  const titleHash = hash(title);
  const proposer = anchor.web3.Keypair.generate();
  const [proposalPublicKey] = PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode(PROPOSAL_SEED),
      titleHash,
      proposer.publicKey.toBuffer()
    ], program.programId);

  await airdropSol(provider, proposer.publicKey, 1000000000);

  const txSignature = await program.methods.createProposal(title, description, candidateIds, new BN(proposalFinishedFrom)).accounts(
    {
      proposer: proposer.publicKey,
      proposal: proposalPublicKey,
    }
  ).signers([proposer]).rpc({ commitment: "confirmed" });
  await confirmTransaction(provider, txSignature);

  return proposalPublicKey;
}

async function confirmTransaction(provider: anchor.Provider, txSignature: string) {
  const latestBlockHash = await provider.connection.getLatestBlockhash();
  await provider.connection.confirmTransaction({
    signature: txSignature,
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
  }, "confirmed");
}

async function airdropSol(provider: anchor.Provider, recipient: PublicKey, amount: number) {
  const connection = provider.connection;
  const signature = await connection.requestAirdrop(recipient, amount);
  await confirmTransaction(provider, signature);
}

function hash(data: string): Buffer {
  return crypto.createHash('sha256').update(data, 'utf-8').digest();
}

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

async function checkVote(
  program: anchor.Program<VotingProgram>,
  vote: PublicKey,
  expected: VoteCheckParams
) {
  const voteData = await program.account.vote.fetch(vote);

  if (expected.voter) {
    assert.ok(voteData.voter.equals(expected.voter),
      `Voter should be ${expected.voter.toBase58()} but was ${voteData.voter.toBase58()}`
    );
  }
  if (expected.proposal) {
    assert.ok(voteData.proposal.equals(expected.proposal),
      `Proposal should be ${expected.proposal.toBase58()} but was ${voteData.proposal.toBase58()}`
    );
  }
  if (expected.candidates) {
    assert.strictEqual(voteData.candidates.length, expected.candidates.length,
      `Vote candidates length should be ${expected.candidates.length} but was ${voteData.candidates.length}`
    );
    for (let i = 0; i < expected.candidates.length; i++) {
      assert.strictEqual(voteData.candidates[i].id, expected.candidates[i].id,
        `Vote candidate ${i} id should be "${expected.candidates[i].id}" but was "${voteData.candidates[i].id}"`
      );
      assert.ok(voteData.candidates[i].voteCount.eq(new BN(expected.candidates[i].voteCount)),
        `Vote candidate ${i} voteCount should be ${expected.candidates[i].voteCount} but was ${voteData.candidates[i].voteCount.toString()}`
      );
    }
  }
  if (expected.bump !== undefined) {
    assert.strictEqual(voteData.bump, expected.bump,
      `Vote bump should be ${expected.bump} but was ${voteData.bump}`
    );
  }
}