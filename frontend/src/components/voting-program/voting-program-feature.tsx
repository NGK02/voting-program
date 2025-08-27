import { WalletButton } from '../solana/solana-provider'
import { VotingProgram } from './voting-program-ui'
import { AppHero } from '../app-hero'
import { useWalletUi } from '@wallet-ui/react'

export default function VotingProgramFeature() {
    const { account } = useWalletUi()

    if (!account) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="hero py-[64px]">
                    <div className="hero-content text-center flex flex-col items-center">
                        <WalletButton />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <AppHero title="Voting Program" subtitle={'Run the program by clicking the "Run program" button.'}>
            </AppHero>
            <VotingProgram />
        </div>
    )
}