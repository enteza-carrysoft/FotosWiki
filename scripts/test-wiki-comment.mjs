#!/usr/bin/env node
/**
 * Script de demostración para los administradores de mairenawiki.es.
 * Publica un comentario de prueba en la talk page indicada y muestra la URL.
 *
 * Uso:
 *   node scripts/test-wiki-comment.mjs "Archivo:NombreFotoExistente.jpg" "Nombre" "Texto"
 *
 * Para una talk page de pruebas dedicada (recomendado para validación inicial):
 *   node scripts/test-wiki-comment.mjs --sandbox "Nombre" "Texto"
 *   → publica en "Archivo Discusión:Sandbox MairenaFotos"
 */

const WIKI_API = 'https://www.mairenawiki.es/wiki/api.php'

function parseArgs(argv) {
  const args = argv.slice(2)
  if (args[0] === '--sandbox') {
    return {
      talkTitle: 'Archivo Discusión:Sandbox MairenaFotos',
      author: args[1] ?? 'Test',
      text: args[2] ?? 'Comentario de prueba desde script CLI.',
    }
  }
  const [photoTitle, author, text] = args
  if (!photoTitle || !author || !text) {
    console.error('Uso: node scripts/test-wiki-comment.mjs "Archivo:Foto.jpg" "Nombre" "Texto"')
    console.error('     node scripts/test-wiki-comment.mjs --sandbox "Nombre" "Texto"')
    process.exit(1)
  }
  const talkTitle = photoTitle.startsWith('Archivo:')
    ? photoTitle.replace(/^Archivo:/, 'Archivo Discusión:')
    : `Archivo Discusión:${photoTitle}`
  return { talkTitle, author, text }
}

async function getCsrfToken() {
  const url = `${WIKI_API}?action=query&meta=tokens&type=csrf&format=json&origin=*`
  const res = await fetch(url)
  const data = await res.json()
  return data.query.tokens.csrftoken
}

async function postComment(talkTitle, author, text) {
  const date = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const wikitext = `*'''Nombre:''' ${author}\n*'''Comentario:''' ${text}\n— ''Enviado desde [[MairenaFotos]] · ${date} (PRUEBA)''`

  const token = await getCsrfToken()
  const body = new URLSearchParams({
    action: 'edit',
    title: talkTitle,
    section: 'new',
    sectiontitle: 'Comentario desde MairenaFotos (PRUEBA)',
    text: wikitext,
    summary: 'Prueba de envío de comentario desde script CLI',
    token,
    format: 'json',
    origin: '*',
  })
  const res = await fetch(WIKI_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  return res.json()
}

const { talkTitle, author, text } = parseArgs(process.argv)

console.log(`→ Publicando comentario en: ${talkTitle}`)
console.log(`  Autor: ${author}`)
console.log(`  Texto: ${text}`)

const result = await postComment(talkTitle, author, text)
if (result.edit?.result === 'Success') {
  const url = `https://www.mairenawiki.es/wiki/${encodeURIComponent(talkTitle.replace(/ /g, '_'))}`
  console.log('\n✅ ÉXITO')
  console.log(`   Ver en wiki: ${url}`)
  console.log(`   revid: ${result.edit.newrevid}`)
} else {
  console.error('\n❌ ERROR')
  console.error(JSON.stringify(result, null, 2))
  process.exit(2)
}
