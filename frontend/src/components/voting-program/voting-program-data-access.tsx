import { createSolanaClient, createTransaction, Instruction, signAndSendTransactionMessageWithSigners, SolanaClient, TransactionSigner } from 'gill'

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