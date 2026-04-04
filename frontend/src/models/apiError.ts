import { z } from 'zod'

/** Flask `jsonify(msg=..., detail=...)` includes `"detail": null` when detail is absent. */
export const BasicErrorSchema = z.object({
  msg: z.string(),
  detail: z.string().nullish(),
})

export type BasicError = z.infer<typeof BasicErrorSchema>

export function parseBasicErrorFromUnknown(data: unknown): BasicError | null {
  const r = BasicErrorSchema.safeParse(data)
  return r.success ? r.data : null
}
