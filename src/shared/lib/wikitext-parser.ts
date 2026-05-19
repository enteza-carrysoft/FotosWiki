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

// Extract bullet-list items under a section (e.g. *Personajes:\n# Name1\n# Name2)
const extractListSection = (wikitext: string, field: string): string => {
  const regex = new RegExp(`^\\*\\s*${field}\\s*:([\\s\\S]*?)(?=^\\*\\s*\\w|$)`, 'im')
  const match = wikitext.match(regex)
  if (!match) return ''
  return match[1]
    .split('\n')
    .map((l) => l.replace(/^[#*]\s*/, '').replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').trim())
    .filter(Boolean)
    .join(', ')
}

export const parseWikitext = (wikitext: string) => ({
  description:
    extractField(wikitext, 'Descripci[oó]n') ||
    extractField(wikitext, 'Titulo') ||
    extractField(wikitext, 'T[ií]tulo') ||
    '',
  date: extractField(wikitext, 'Fecha'),
  author: extractField(wikitext, 'Autor'),
  origin: extractField(wikitext, 'Origen') || extractField(wikitext, 'Fuente'),
  persons: extractListSection(wikitext, 'Personajes'),
})
