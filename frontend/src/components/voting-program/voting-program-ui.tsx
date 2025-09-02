import { ProposalList } from './proposal-list'

export function VotingProgram() {
    return (
        <div className="min-h-auto bg-neutral-0 dark:bg-neutral-1000 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ProposalList />
            </div>
        </div>
    )
}