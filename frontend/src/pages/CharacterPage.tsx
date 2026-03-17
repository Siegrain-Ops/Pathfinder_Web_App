import { useEffect, useState }    from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCharacterStore }      from '@/app/store/characterStore'
import { Spinner }                from '@/components/ui/Spinner'

import { CharacterSheetHeader } from '@/features/characters/components/sheet/CharacterSheetHeader'
import { SheetTabs, type SheetTab } from '@/features/characters/components/sheet/SheetTabs'
import { OverviewSection }      from '@/features/characters/components/sheet/OverviewSection'
import { StatsSection }         from '@/features/characters/components/sheet/StatsSection'
import { CombatSection }        from '@/features/characters/components/sheet/CombatSection'
import { SavesSection }         from '@/features/characters/components/sheet/SavesSection'
import { SkillsSection }        from '@/features/characters/components/sheet/SkillsSection'
import { FeatsSection }         from '@/features/characters/components/sheet/FeatsSection'
import { AbilitiesSection }     from '@/features/characters/components/sheet/AbilitiesSection'
import { SpellsSection }        from '@/features/characters/components/sheet/SpellsSection'
import { InventorySection }     from '@/features/characters/components/sheet/InventorySection'
import { NotesSection }         from '@/features/characters/components/sheet/NotesSection'
import { LevelUpSection }       from '@/features/characters/components/sheet/LevelUpSection'
import { DiceRollerSection }   from '@/features/characters/components/sheet/DiceRollerSection'
import { ArcaneBondSection }   from '@/features/characters/components/sheet/ArcaneBondSection'

export function CharacterPage() {
  const { id }        = useParams<{ id: string }>()
  const navigate      = useNavigate()
  const [tab, setTab] = useState<SheetTab>('overview')

  const { loadCharacter, clearActive, isLoading, error, active, isDirty, saveCharacter } =
    useCharacterStore()

  // Load on mount, clear on unmount
  useEffect(() => {
    if (!id) { navigate('/'); return }
    void loadCharacter(id)
    return () => clearActive()
  }, [id, loadCharacter, clearActive, navigate])

  // Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty) void saveCharacter()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDirty, saveCharacter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <button className="text-sm text-stone-400 underline" onClick={() => navigate('/')}>
          Back to characters
        </button>
      </div>
    )
  }

  if (!active) return null

  const hasArcaneBond =
    active.data.className.toLowerCase() === 'wizard' &&
    (active.data.classOptions?.arcaneBondType === 'bonded_item' ||
     active.data.classOptions?.arcaneBondType === 'familiar')
  const hiddenTabs: SheetTab[] = hasArcaneBond ? [] : ['arcane_bond']

  return (
    <div className="flex flex-col h-full">
      {/* Sticky character header */}
      <div className="sticky top-0 z-20">
        <CharacterSheetHeader />
        <SheetTabs active={tab} onChange={setTab} hiddenTabs={hiddenTabs} />
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <TabPanel active={tab} id="overview">     <OverviewSection />     </TabPanel>
          <TabPanel active={tab} id="stats">        <StatsSection />        </TabPanel>
          <TabPanel active={tab} id="combat">       <CombatSection />       </TabPanel>
          <TabPanel active={tab} id="saves">        <SavesSection />        </TabPanel>
          <TabPanel active={tab} id="skills">       <SkillsSection />       </TabPanel>
          <TabPanel active={tab} id="feats">        <FeatsSection />        </TabPanel>
          <TabPanel active={tab} id="abilities">    <AbilitiesSection />    </TabPanel>
          <TabPanel active={tab} id="spells">       <SpellsSection />       </TabPanel>
          <TabPanel active={tab} id="arcane_bond">  <ArcaneBondSection />   </TabPanel>
          <TabPanel active={tab} id="inventory">    <InventorySection />    </TabPanel>
          <TabPanel active={tab} id="notes">        <NotesSection />        </TabPanel>
          <TabPanel active={tab} id="dice">         <DiceRollerSection />   </TabPanel>
          <TabPanel active={tab} id="levelup">      <LevelUpSection />      </TabPanel>
        </div>
      </div>
    </div>
  )
}

function TabPanel({
  active, id, children,
}: { active: SheetTab; id: SheetTab; children: React.ReactNode }) {
  if (active !== id) return null
  return <>{children}</>
}
