// ---------------------------------------------------------------------------
// parser-feats.ts — d20pfsrd.com feat table parser
//
// Target page: https://www.d20pfsrd.com/feats/all-feats
//
// Expected HTML structure:
//
//   <table>
//     <thead>
//       <tr>
//         <th>Feat</th><th>Feat Type</th><th>Prerequisites</th><th>Benefit</th>
//       </tr>
//     </thead>
//     <tbody>
//       <tr>
//         <td><a href="/feats/combat-feats/power-attack-combat">Power Attack</a></td>
//         <td>Combat</td>
//         <td>Str 13, base attack bonus +1</td>
//         <td>You can make exceptionally powerful melee attacks.</td>
//       </tr>
//       ...
//     </tbody>
//   </table>
//
// d20pfsrd may have multiple tables (one per feat type).
// This parser handles all of them.
// ---------------------------------------------------------------------------

import { load } from 'cheerio'
import { cleanText } from './normalizer'

export interface ParsedFeat {
  name:         string
  featType:     string | null
  prerequisites: string | null
  benefit:      string | null
  description:  string | null   // same as benefit for list-only import
  sourceUrl:    string
}

const BASE_URL = 'https://www.d20pfsrd.com'

export function parseFeatListPage(html: string): ParsedFeat[] {
  const $ = load(html)
  const feats: ParsedFeat[] = []
  const seen  = new Set<string>()

  $('table').each((_, table) => {
    // Try to infer the feat type from a heading above this table
    let tableType: string | null = null
    const prevH = $(table).prevAll('h2, h3, h4').first()
    if (prevH.length) tableType = cleanText(prevH.text())

    $(table).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length < 2) return

      const nameCell = $(cells.eq(0))
      const name     = cleanText(nameCell.text())
      if (!name) return

      // Resolve href to an absolute URL
      const href = nameCell.find('a[href]').first().attr('href') ?? ''
      const sourceUrl = href
        ? (href.startsWith('http') ? href : `${BASE_URL}${href}`)
        : `${BASE_URL}/feats/${name.toLowerCase().replace(/\s+/g, '-')}/`

      if (seen.has(sourceUrl)) return
      seen.add(sourceUrl)

      // Column positions vary by table; detect by header
      const headers: string[] = []
      $(table).find('thead th').each((_, th) => {
        headers.push($(th).text().trim().toLowerCase())
      })

      const typeIdx  = headers.indexOf('feat type')
      const prereqIdx = headers.findIndex(h => h.includes('prerequisite'))
      const benefitIdx = headers.findIndex(h => h.includes('benefit'))

      const featType    = typeIdx    >= 0 ? cleanText(cells.eq(typeIdx).text())   : tableType
      const prerequisites = prereqIdx >= 0 ? cleanText(cells.eq(prereqIdx).text()) : null
      const benefit     = benefitIdx >= 0 ? cleanText(cells.eq(benefitIdx).text()) : null

      feats.push({
        name,
        featType,
        prerequisites,
        benefit,
        description: benefit,
        sourceUrl,
      })
    })
  })

  return feats
}
