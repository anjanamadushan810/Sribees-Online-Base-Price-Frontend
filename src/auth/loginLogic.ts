import axios from 'axios'
import { errorMessage } from '../api/client'

export type LoginError = 'bad' | 'tooMany' | 'offline' | null

/** The kind of failure, so the page can say it in the person's language. */
export function loginErrorKind(e: unknown): LoginError {
  if (!axios.isAxiosError(e)) return null
  if (!e.response) return 'offline'
  if (e.response.status === 401) return 'bad'
  if (e.response.status === 423 || e.response.status === 429) return 'tooMany'
  return null
}

/** A friendly text from `texts` for known failures, the server's own words for the rest. */
export function loginErrorText(e: unknown, texts: Record<Exclude<LoginError, null>, string>): string {
  const kind = loginErrorKind(e)
  return kind ? texts[kind] : errorMessage(e)
}
