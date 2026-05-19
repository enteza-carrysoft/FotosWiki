const extractField = (wikitext: string, field: string): string => {
  const regex = new RegExp(`'''${field}'''\\s*:\\s*(.+)`, 'i')
  const match = wikitext.match(regex)
  return match ? match[1].replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1').trim() : ''
}

export const parseWikitext = (wikitext: string) => ({
  description:
    extractField(wikitext, 'Descripción') ||
    extractField(wikitext, 'Descripcion') ||
    extractField(wikitext, 'Titulo') ||
    extractField(wikitext, 'Título') ||
    '',
  date: extractField(wikitext, 'Fecha'),
  author: extractField(wikitext, 'Autor'),
  origin: extractField(wikitext, 'Origen') || extractField(wikitext, 'Fuente'),
})
