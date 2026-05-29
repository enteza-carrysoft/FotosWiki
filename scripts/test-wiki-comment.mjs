#!/usr/bin/env node
/**
 * Script de demostración para los administradores de mairenawiki.es.
 * Autentica con WIKI_BOT_USER / WIKI_BOT_PASS del .env.local y publica
 * un comentario de prueba en la talk page indicada.
 *
 * Uso:
 *   node scripts/test-wiki-comment.mjs "Archivo:NombreFoto.jpg" "Nombre" "Texto"
 *   node scripts/test-wiki-comment.mjs --sandbox "Nombre" "Texto"
 *
 * Variables de entorno requeridas (en .env.local):
 *   WIKI_BOT_USER=MairenaFotosBot
 *   WIKI_BOT_PASS=contraseña
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Cargar .env.local manualmente (sin dependencias externas)
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
}

const WIKI_API = 'https://www.mairenawiki.es/wiki/api.php'
const WIKI_BOT_USER = process.env.WIKI_BOT_USER
const WIKI_BOT_PASS = process.env.WIKI_BOT_PASS

if (!WIKI_BOT_USER || !WIKI_BOT_PASS) {
  console.error('❌ Faltan WIKI_BOT_USER y WIKI_BOT_PASS en .env.local')
  console.error('   Copia .env.local.example a .env.local y rellena las credenciales.')
  process.exit(1)
}

function parseCookies(res) {
  const raw = res.headers.raw?.()?.['set-cookie'] ?? []
  return raw.map(h => h.split(';')[0]).join('; ')
}

async function login() {
  // 1. Obtener logintoken
  const ltRes = await fetch(`${WIKI_API}?action=query&meta=tokens&type=login&format=json`)
  const ltData = await ltRes.json()
  const logintoken = ltData.query.tokens.logintoken
  const c1 = parseCookies(ltRes)

  // 2. Login
  const loginBody = new URLSearchParams({
    action: 'login',
    lgname: WIKI_BOT_USER,
    lgpassword: WIKI_BOT_PASS,
    lgtoken: logintoken,
    format: 'json',
  })
  const loginRes = await fetch(WIKI_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: c1 },
    body: loginBody.toString(),
  })
  const loginData = await loginRes.json()
  if (loginData.login?.result !== 'Success') {
    throw new Error(`Login fallido: ${loginData.login?.result} — ${loginData.login?.reason ?? ''}`)
  }
  const c2 = parseCookies(loginRes) || c1

  // 3. Obtener CSRF token
  const csrfRes = await fetch(`${WIKI_API}?action=query&meta=tokens&type=csrf&format=json`, {
    headers: { Cookie: c2 },
  })
  const csrfData = await csrfRes.json()
  const csrfToken = csrfData.query.tokens.csrftoken
  if (!csrfToken) throw new Error('No se pudo obtener CSRF token')

  return { cookie: c2, csrfToken }
}

async function postComment(talkTitle, author, text, session) {
  const date = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const wikitext = `*'''Nombre:''' ${author}\n*'''Comentario:''' ${text}\n— ''Enviado desde [[MairenaFotos]] · ${date} (PRUEBA)''`

  const body = new URLSearchParams({
    action: 'edit',
    title: talkTitle,
    section: 'new',
    sectiontitle: 'Comentario desde MairenaFotos (PRUEBA)',
    text: wikitext,
    summary: 'Prueba de envío de comentario desde script CLI',
    token: session.csrfToken,
    format: 'json',
  })
  const res = await fetch(WIKI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: session.cookie,
    },
    body: body.toString(),
  })
  return res.json()
}

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

const { talkTitle, author, text } = parseArgs(process.argv)

console.log(`→ Autenticando como ${WIKI_BOT_USER}…`)
const session = await login()
console.log('✓ Login correcto')

console.log(`→ Publicando en: ${talkTitle}`)
console.log(`  Autor: ${author}`)
console.log(`  Texto: ${text}`)

const result = await postComment(talkTitle, author, text, session)
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
