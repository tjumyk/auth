import { z } from 'zod'

/** Flask `jsonify(msg=..., detail=..., code=...)` error payload. */
export const BasicErrorSchema = z.object({
  msg: z.string(),
  detail: z.string().nullish(),
  code: z.string().nullish(),
})

export type BasicError = z.infer<typeof BasicErrorSchema>

export function parseBasicErrorFromUnknown(data: unknown): BasicError | null {
  const r = BasicErrorSchema.safeParse(data)
  return r.success ? r.data : null
}
