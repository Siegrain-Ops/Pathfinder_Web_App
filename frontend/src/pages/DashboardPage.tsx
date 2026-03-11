import { useEffect, useState } from 'react'
import { useCharacterStore }   from '@/app/store/characterStore'
import { CharacterCard }       from '@/features/characters/components/CharacterCard'
import { CreateCharacterModal } from '@/features/characters/components/CreateCharacterModal'
import { Button }              from '@/components/ui/Button'
import { Spinner }             from '@/components/ui/Spinner'
import { EmptyState }          from '@/components/ui/EmptyState'

export function DashboardPage() {
  const { summaries, isLoading, error, fetchAll, deleteCharacter, duplicateCharacter } =
    useCharacterStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [search,    setSearch]    = useState('')

  useEffect(() => { void fetchAll() }, [fetchAll])

  const filtered = summaries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.race.toLowerCase().includes(search.toLowerCase()) ||
    c.className.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-100">
            Characters
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {summaries.length} character{summaries.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <input
            type="search"
            placeholder="Search characters…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="field w-56 text-sm"
          />
          <Button onClick={() => setModalOpen(true)}>
            + New Character
          </Button>
        </div>
      </div>

      {/* ── States ──────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          Failed to load characters: {error}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          icon="⚔"
          title={search ? 'No characters match your search' : 'No characters yet'}
          description={
            search
              ? 'Try a different name, race, or class.'
              : 'Create your first Pathfinder character to get started.'
          }
          action={
            !search && (
              <Button onClick={() => setModalOpen(true)}>
                + New Character
              </Button>
            )
          }
        />
      )}

      {/* ── Character Grid ──────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => (
            <CharacterCard
              key={c.id}
              character={c}
              onDelete={deleteCharacter}
              onDuplicate={duplicateCharacter}
            />
          ))}
        </div>
      )}

      {/* ── Create Modal ─────────────────────────────────────── */}
      <CreateCharacterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
