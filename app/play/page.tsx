import { Sf2PlayApp } from '@/components/sf2/play-app'
import { DemoBudgetGate } from '@/components/setup/demo-budget-gate'
import { PassphraseGate } from '@/components/setup/passphrase-gate'

export default function StoryforgePlayPage() {
  return (
    <PassphraseGate>
      <DemoBudgetGate>
        <Sf2PlayApp />
      </DemoBudgetGate>
    </PassphraseGate>
  )
}
