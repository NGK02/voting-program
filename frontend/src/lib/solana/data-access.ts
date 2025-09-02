import { Address, createSolanaClient, createTransaction, Instruction, signAndSendTransactionMessageWithSigners, SolanaClient, TransactionSigner } from 'gill'
import { getProposalDiscriminatorBytes, getProposalDecoder } from '../../lib/solana/generated/accounts/proposal'

export async function processTransaction(
    signer: TransactionSigner,
    client: SolanaClient,
    instructions: Instruction[]
) {
    const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send()

    const transaction = createTransaction({
        feePayer: signer,
        version: 'legacy',
        latestBlockhash,
        instructions: instructions,
    })

    const { simulateTransaction } = createSolanaClient({
        urlOrMoniker: "devnet",
    });
    const simulation = await simulateTransaction(transaction);

    console.log("Transaction debug:")
    console.log("- Simulation result:", simulation);
    console.log("- Transaction instructions:", instructions);
    console.log("- Signer:", signer);

    const signature = await signAndSendTransactionMessageWithSigners(transaction);
    return signature;
}

export async function getProposalAccounts(client: SolanaClient, programId: Address) {
    const allAccounts = await client.rpc.getProgramAccounts(programId, {
        encoding: 'base64'
    }).send()

    const filteredAccounts = allAccounts.filter((account) => {
        const data = Buffer.from(account.account.data[0], 'base64')
        const discriminator = data.subarray(0, 8)
        return discriminator.equals(Buffer.from(getProposalDiscriminatorBytes()))
    })

    const decoder = getProposalDecoder()
    const decodedAccounts = filteredAccounts.map((account) => ({
        address: account.pubkey,
        data: decoder.decode(Buffer.from(account.account.data[0], "base64"))
    }))

    return decodedAccounts
}