// ---------------------------------------------------------------------------
// Backend request validators (used in controllers)
// ---------------------------------------------------------------------------

import { z } from 'zod'

/** Accept any valid object as CharacterData — full validation is in the frontend.
 *  Backend validates only the envelope shape to keep things practical. */
export const characterDataSchema = z.record(z.unknown())

export const createCharacterSchema = z.object({
  data: characterDataSchema,
  referenceRaceId: z.string().uuid().nullable().optional(),
})

export const updateCharacterSchema = z.object({
  data: characterDataSchema,
  referenceRaceId: z.string().uuid().nullable().optional(),
})

export type CreateCharacterRequest = z.infer<typeof createCharacterSchema>
export type UpdateCharacterRequest = z.infer<typeof updateCharacterSchema>
