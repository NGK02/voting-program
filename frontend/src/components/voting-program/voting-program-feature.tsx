import { WalletButton } from '../solana/solana-provider'
import { VotingProgram } from './voting-program-ui'
import { AppHero } from '../app-hero'
import { useWalletUi } from '@wallet-ui/react'

export default function VotingProgramFeature() {
    const { account } = useWalletUi()

    if (!account) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="hero py-16 flex flex-col items-center gap-8">

                    <div className="max-w-3xl w-full">

                        <AppHero title="Voting Program" />

                        <div className="mt-6 text-left text-lg space-y-4">
                            <p>This program serves two purposes:</p>
                            <ol className="list-decimal list-inside pl-2">
                                <li>Provide a decentralized and transparent way to vote on proposals.</li>
                                <li>Provide a much better alternative to the traditional First Past the Post voting system which is also quite easy to grasp (Approval).</li>
                            </ol>
                            <p className="font-medium">To get started, connect your wallet.</p>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <WalletButton />
                    </div>

                </div>
            </div>

        )
    }

    return (
        <div>
            <AppHero title="Voting Program">
            </AppHero>
            <VotingProgram />
        </div>
    )
}