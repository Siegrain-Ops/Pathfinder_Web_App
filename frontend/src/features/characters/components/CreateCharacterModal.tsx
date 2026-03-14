import { useForm, useWatch } from 'react-hook-form'
import { zodResolver }        from '@hookform/resolvers/zod'
import { useNavigate }        from 'react-router-dom'
import { Modal }              from '@/components/ui/Modal'
import { Button }             from '@/components/ui/Button'
import {
  characterIdentitySchema,
  type CharacterIdentityFormValues,
} from '@/lib/validators/character.validators'
import { ALIGNMENTS, COMMON_CLASSES, COMMON_RACES } from '@/lib/constants'
import { useCharacterStore }   from '@/app/store/characterStore'
import { recomputeCharacter }  from '@/lib/formulas/character.formulas'
import { createBlankCharacter } from '@/lib/utils/character.utils'
import type { Alignment, SizeCategory } from '@/types'
import { useReferenceRaces } from '../hooks/useReferenceRaces'
import { useReferenceClasses } from '../hooks/useReferenceClasses'

interface CreateCharacterModalProps {
  open:    boolean
  onClose: () => void
}

export function CreateCharacterModal({ open, onClose }: CreateCharacterModalProps) {
  const navigate = useNavigate()
  const { races, isLoading: racesLoading } = useReferenceRaces()
  const { classes, isLoading: classesLoading } = useReferenceClasses()
  const raceOptions = races.length > 0 ? races.map(race => race.name) : COMMON_RACES
  const classOptions = classes.length > 0 ? classes.map(classRecord => classRecord.name) : COMMON_CLASSES

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CharacterIdentityFormValues>({
    resolver: zodResolver(characterIdentitySchema),
    defaultValues: {
      name:              '',
      playerName:        '',
      race:              'Human',
      className:         'Fighter',
      level:             1,
      alignment:         'True Neutral',
      background:        '',
      deity:             '',
      size:              'Medium',
      age:               20,
      gender:            '',
      height:            '',
      weight:            '',
      homeland:          '',
      favoredClassBonus: 'hp',
    },
  })

  const favoredClassBonus = useWatch({ control, name: 'favoredClassBonus' })

  const onSubmit = async (values: CharacterIdentityFormValues) => {
    const blank = createBlankCharacter()
    const data  = recomputeCharacter({
      ...blank,
      ...values,
      // Zod validates these but types as string; cast to the narrower union types
      alignment: values.alignment as Alignment,
      size:      values.size as SizeCategory,
    })
    const referenceRaceId = races.find(race => race.name === values.race)?.id ?? null
    const character = await useCharacterStore.getState().createCharacterWithData(data, referenceRaceId)
    reset()
    onClose()
    navigate(`/characters/${character.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Character" className="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Row: Name + Player */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Character Name *" error={errors.name?.message}>
            <input {...register('name')} placeholder="Valeron" />
          </Field>
          <Field label="Player Name" error={errors.playerName?.message}>
            <input {...register('playerName')} placeholder="Optional" />
          </Field>
        </div>

        {/* Row: Race + Class + Level */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Race *" error={errors.race?.message}>
            <select
              className="field"
              {...register('race')}
              disabled={racesLoading}
            >
              {raceOptions.map(raceName => <option key={raceName} value={raceName}>{raceName}</option>)}
            </select>
          </Field>
          <Field label="Class *" error={errors.className?.message}>
            <select
              className="field"
              {...register('className')}
              disabled={classesLoading}
            >
              {classOptions.map(className => <option key={className} value={className}>{className}</option>)}
            </select>
          </Field>
          <Field label="Level" error={errors.level?.message}>
            <input {...register('level', { valueAsNumber: true })} type="number" min={1} max={20} />
          </Field>
        </div>

        {/* Alignment */}
        <Field label="Alignment" error={errors.alignment?.message}>
          <select {...register('alignment')}>
            {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>

        {/* Favored Class Bonus */}
        <div className="flex flex-col gap-2">
          <div>
            <span className="text-xs font-medium text-stone-400">Favored Class Bonus</span>
            <p className="text-[10px] text-stone-500 mt-0.5">
              Choose a bonus you gain each time you level up in your favored class.
              You can change this later in the Overview tab.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['hp', 'skill_rank'] as const).map(choice => (
              <label
                key={choice}
                className={`flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors duration-150 ${
                  favoredClassBonus === choice
                    ? 'border-amber-600/60 bg-amber-950/20'
                    : 'border-stone-700/50 hover:border-stone-600/60 hover:bg-stone-800/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    value={choice}
                    {...register('favoredClassBonus')}
                    className="accent-amber-500"
                  />
                  <span className={`text-sm font-semibold ${favoredClassBonus === choice ? 'text-amber-300' : 'text-stone-300'}`}>
                    {choice === 'hp' ? '+1 HP per level' : '+1 Skill Rank per level'}
                  </span>
                </div>
                <span className="text-[10px] text-stone-500 leading-relaxed pl-5">
                  {choice === 'hp'
                    ? 'Gain 1 extra hit point each time you gain a level in your favored class.'
                    : 'Gain 1 extra skill rank each time you gain a level in your favored class.'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Row: Background + Deity */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Background" error={errors.background?.message}>
            <input {...register('background')} placeholder="e.g. Soldier" />
          </Field>
          <Field label="Deity" error={errors.deity?.message}>
            <input {...register('deity')} placeholder="e.g. Iomedae" />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose() }}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create Character
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Reusable form field wrapper ─────────────────────────────────────────────

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-stone-400">{label}</span>
      <div className="[&>input]:field [&>select]:field [&>textarea]:field">
        {children}
      </div>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
