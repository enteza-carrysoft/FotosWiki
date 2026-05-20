const extractField = (wikitext: string, field: string): string => {
  const patterns = [
    // *Descripción: value  (bullet list format — most common)
    new RegExp(`^\\*\\s*${field}\\s*:\\s*(.+)`, 'im'),
    // '''Descripción''': value  (bold format)
    new RegExp(`'''${field}'''\\s*:\\s*(.+)`, 'i'),
    // | Descripción = value  (template format)
    new RegExp(`\\|\\s*${field}\\s*=\\s*(.+)`, 'i'),
  ]
  for (const regex of patterns) {
    const match = wikitext.match(regex)
    if (match) {
      return match[1]
        .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1') // strip [[links]]
        .replace(/\{\{[^}]+\}\}/g, '')                      // strip {{templates}}
        .replace(/<[^>]+>/g, '')                             // strip HTML tags
        .trim()
    }
  }
  return ''
}

// Extract bullet-list items under a section header (e.g. *Personajes:\n# Name1\n# Name2)
// Line-by-line approach avoids multiline-$ regex pitfall where lazy *? matches empty string.
const extractListSection = (wikitext: string, field: string): string[] => {
  const lines = wikitext.split('\n')
  const fieldStart = new RegExp(`^\\*\\s*${field}\\s*:`, 'i')
  const nextField = /^\*[^*]/  // single * = next field definition; ** = sub-item (keep reading)

  let inSection = false
  const items: string[] = []

  for (const line of lines) {
    if (!inSection) {
      if (fieldStart.test(line)) {
        inSection = true
        // Some fields put content on the same line after the colon
        const sameLine = line.replace(fieldStart, '').trim()
        if (sameLine) items.push(sameLine)
      }
    } else {
      if (nextField.test(line)) break
      const item = line
        .replace(/^[#*]+\s*/, '')
        .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
        .replace(/\.$/, '')   // strip trailing punctuation dot
        .trim()
      if (item) items.push(item)
    }
  }

  return items
}

export const parseWikitext = (wikitext: string) => ({
  description:
    extractField(wikitext, 'Descripci[oó]n') ||
    extractField(wikitext, 'T[ií]tulo') ||
    extractField(wikitext, 'Titulo') ||
    '',
  name:
    extractField(wikitext, 'Nombre') ||
    extractField(wikitext, 'T[ií]tulo') ||
    '',
  date: extractField(wikitext, 'Fecha') || extractField(wikitext, 'A[nñ]o'),
  author: extractField(wikitext, 'Autor') || extractField(wikitext, 'Fotograf[oó]'),
  origin: extractField(wikitext, 'Origen') || extractField(wikitext, 'Fuente') || extractField(wikitext, 'Colecci[oó]n'),
  location: extractField(wikitext, 'Localizaci[oó]n') || extractField(wikitext, 'Lugar') || extractField(wikitext, 'Barrio'),
  persons: extractListSection(wikitext, 'Personajes'),
})
