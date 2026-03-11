import { useNavigate }       from 'react-router-dom'
import { Card, CardBody }    from '@/components/ui/Card'
import { Badge }             from '@/components/ui/Badge'
import { Button }            from '@/components/ui/Button'
import { formatDate }        from '@/lib/utils/format.utils'
import type { CharacterSummary } from '@/types'

interface CharacterCardProps {
  character:   CharacterSummary
  onDelete:    (id: string) => void
  onDuplicate: (id: string) => void
}

export function CharacterCard({ character, onDelete, onDuplicate }: CharacterCardProps) {
  const navigate = useNavigate()

  const alignmentVariant = getAlignmentVariant(character.alignment)

  return (
    <Card
      className="group flex flex-col gap-0 hover:border-amber-500/40 transition-colors cursor-pointer"
      onClick={() => navigate(`/characters/${character.id}`)}
    >
      {/* Top bar — level indicator */}
      <div className="h-1 rounded-t-lg bg-gradient-to-r from-amber-600 to-amber-400 opacity-80" />

      <CardBody className="flex flex-col gap-3 p-4">
        {/* Name + level */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-display font-bold text-lg text-stone-100 leading-tight">
            {character.name}
          </h2>
          <span className="shrink-0 rounded bg-amber-900/50 border border-amber-700/40 px-2 py-0.5 text-xs font-bold text-amber-300">
            Lv {character.level}
          </span>
        </div>

        {/* Race · Class */}
        <p className="text-sm text-stone-400">
          {character.race} &middot; {character.className}
        </p>

        {/* Alignment badge */}
        <Badge variant={alignmentVariant}>{character.alignment}</Badge>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 mt-auto border-t border-stone-700">
          <span className="text-xs text-stone-500">
            Updated {formatDate(character.updatedAt as unknown as string)}
          </span>

          {/* Action buttons — visible on hover */}
          <div
            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              title="Duplicate"
              onClick={() => onDuplicate(character.id)}
            >
              ⧉
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Delete"
              className="hover:text-red-400"
              onClick={() => onDelete(character.id)}
            >
              ✕
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function getAlignmentVariant(alignment: string) {
  if (alignment.includes('Good'))    return 'blue'    as const
  if (alignment.includes('Evil'))    return 'red'     as const
  if (alignment.includes('Lawful'))  return 'purple'  as const
  if (alignment.includes('Chaotic')) return 'amber'   as const
  return 'default' as const
}
