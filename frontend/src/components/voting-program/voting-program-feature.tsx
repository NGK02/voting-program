import { WalletButton } from '../solana/solana-provider'
import { VotingProgram } from './voting-program-ui'
import FrontImage from '@/components/svg/voxpup-front-image-no-bg';
import { useWalletUi } from '@wallet-ui/react'

export default function VotingProgramFeature() {
	const { account } = useWalletUi()

	if (!account) {
		return (
			<section className="container mx-auto max-w-7xl lg:px-10 py-16 lg:py-24">
				<div className="grid grid-cols-1 lg:grid-cols-32 items-center gap-8">
					<div className="lg:col-span-14 flex justify-center lg:justify-end">
						<FrontImage className="w-[340px] sm:w-[400px] md:w-[400px] lg:w-[400px]" />
					</div>

					<div className="max-w-3xl lg:col-span-18 lg:block flex flex-col items-center">
						<h1 className="font-extrabold tracking-tight leading-[0.9] text-5xl sm:text-6xl md:text-6xl lg:text-7xl">
							<span className="block italic">THE FUTURE</span>
							<span className="lg:ml-8 block italic">OF ELECTIONS</span>
						</h1>

						<p className="lg:ml-16 md:max-w-120 sm:max-w-96 max-w-78 mt-8 text-lg sm:text-xl text-neutral-500 dark:text-neutral-400">
							VoxPup showcases fair and effective voting by combining the decentralised nature of blockchain with the effective but dead simple approval voting system.
						</p>

						<div className="lg:ml-16 mt-12">
							<WalletButton />
						</div>
					</div>
				</div>
			</section>
		)
	}

	return (
		<VotingProgram />
	)
}