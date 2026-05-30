# MairenaFotos — Archivo Fotográfico de Mairena del Alcor

PWA móvil que conecta con [mairenawiki.es](https://www.mairenawiki.es) para explorar el archivo fotográfico histórico de Mairena del Alcor (Sevilla).

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # build de producción
npm run typecheck # verificar tipos
```

## Stack

- Next.js 16 + React 19 + TypeScript (App Router)
- Tailwind CSS 3.4
- MediaWiki API pública (`mairenawiki.es/wiki/api.php`) — sin backend propio
- localStorage para caché de fotos, foto del día y favoritos
- Service Worker (`public/sw.js`) para PWA offline

## Variables de entorno

Crear `.env.local` a partir de `.env.local.example`:

```bash
# Credenciales del bot de MediaWiki (necesarias para la funcionalidad de comentarios)
WIKI_BOT_USER=MairenaFotosBot
WIKI_BOT_PASS=la-contraseña-del-bot
```

También deben configurarse en Vercel → Project Settings → Environment Variables para producción.

## Estructura

```
src/
├── app/                    # Rutas Next.js
│   ├── page.tsx            # Cover / portada
│   ├── gallery/            # Galería con scroll infinito
│   ├── favorites/          # Favoritos guardados
│   ├── layout.tsx          # Fonts, SW registrar, manifest
│   └── manifest.ts         # PWA manifest
├── features/
│   ├── cover/              # Pantalla de portada
│   ├── gallery/            # Grid + filtros + scroll infinito
│   ├── photo-viewer/       # Modal de foto a pantalla completa
│   ├── favorites/          # Vista de favoritos
│   └── comments/           # Comentarios a la wiki (modo administrador)
│       ├── actions/post-comment.ts
│       └── components/
│           ├── PhotoComments.tsx
│           └── CommentForm.tsx
└── shared/
    ├── lib/
    │   ├── mediawiki-api.ts    # getCategoryPhotos, getBatchThumbs, getPhotoData
    │   ├── photo-cache.ts      # Índice 500 títulos (TTL 7 días)
    │   ├── photo-of-day.ts     # Foto del día determinística
    │   ├── favorites.ts        # CRUD favoritos en localStorage
    │   ├── wikitext-parser.ts  # Parsea metadatos del wikitext
    │   └── wiki-comments.ts    # Bot de MediaWiki para publicar comentarios
    ├── hooks/useFavorites.ts
    ├── components/ServiceWorkerRegistrar.tsx
    └── types/
        ├── wiki.types.ts
        └── wiki-comment.types.ts
```

## Deploy

Vercel con auto-deploy desde `master` en GitHub.

**Importante:** Antes del primer deploy a producción, asegúrate de que las variables `WIKI_BOT_USER` y `WIKI_BOT_PASS` estén configuradas en Vercel → Project Settings → Environment Variables. Sin ellas, la funcionalidad de comentarios fallará silenciosamente.
