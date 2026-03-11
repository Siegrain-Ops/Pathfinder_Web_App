// ---------------------------------------------------------------------------
// scraper.ts — HTTP fetching with polite rate limiting
// ---------------------------------------------------------------------------

import axios from 'axios'

// Identify the bot clearly so site admins can contact us if needed.
const USER_AGENT =
  'PathfinderCharacterManager/1.0 (reference-data-importer; non-commercial; https://github.com/your-org/pathfinder-app)'

/** Pause between requests so we don't hammer the source server. */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

/**
 * Fetch a URL and return its HTML.
 * Retries up to `retries` times with exponential backoff on network errors
 * or 5xx responses.
 */
export async function fetchHtml(url: string, retries = 3): Promise<string> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get<string>(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept':     'text/html,application/xhtml+xml',
        },
        responseType: 'text',
        timeout:      15_000,
        // Treat 5xx as errors so we can retry them
        validateStatus: s => s < 500,
      })
      return data
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        const backoff = 1_000 * 2 ** attempt   // 1 s, 2 s, 4 s
        console.warn(`  [retry ${attempt + 1}/${retries}] ${url} — waiting ${backoff}ms`)
        await sleep(backoff)
      }
    }
  }
  throw lastErr
}
