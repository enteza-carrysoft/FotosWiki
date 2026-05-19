# PRP: FotosWiki — PWA de Fotografía Histórica de Mairena del Alcor

> **Documento de referencia para IA**: Este archivo contiene toda la información necesaria para que un agente de IA pueda desarrollar la aplicación de principio a fin, sin necesidad de investigar la wiki de origen.

---

## 1. Visión General

**FotosWiki** es una Progressive Web App (PWA) que actúa como portal visual para el archivo fotográfico de [Mairena Wiki](https://www.mairenawiki.es), la Enciclopedia Digital de Mairena del Alcor (Sevilla, España), impulsada por el Ateneo de Mairena del Alcor. La wiki está construida sobre **MediaWiki** y expone una API REST estándar.

El objetivo de la app es ofrecer una experiencia visual inmersiva del patrimonio fotográfico histórico del municipio, aprovechando los miles de fotografías catalogadas en la wiki, sin reemplazarla sino complementándola.

---

## 2. Fuente de Datos: Mairena Wiki

### 2.1 API disponible

La wiki expone la **API estándar de MediaWiki** en:

```
https://www.mairenawiki.es/wiki/api.php
```

No requiere autenticación para lecturas públicas.

### 2.2 Estructura del archivo fotográfico

Cada fotografía es un **artículo wiki** con nombre `FotoXXXX` (donde XXXX es un número correlativo). Ejemplo: `Foto0156`, `Foto1649`.

**Página de foto típica contiene:**
- Título descriptivo (ej: "Fiesta de la Flor")
- Fecha (ej: "Diciembre de 1922")
- Autor (o "Sin firmar")
- Origen/colección (ej: "Colección Miguel Labrador Jiménez")
- Personajes identificados en la foto
- Categorías temáticas y cronológicas

**URL de imagen física:**
```
https://www.mairenawiki.es/wiki/images/thumb/[a]/[ab]/FotoXXXX.jpg/[ancho]px-FotoXXXX.jpg
```
El hash del path se obtiene via API (ver sección 4.2).

### 2.3 Volumen total de fotografías

La categoría `Categoría:Fotos` contiene **miles de páginas fotográficas**. La paginación de la API devuelve un token `cmcontinue` para recorrerlas.

### 2.4 Categorías de fotografías

#### Por año cronológico (1890–1984):
| Década | Categorías |
|--------|-----------|
| 1890s | Foto 1890, Foto 1893, Foto 1898 |
| 1900s | Foto 1902, Foto 1907, Foto 1908, Foto 1909 |
| 1910s | Foto 1910–1919 |
| 1920s | Foto 1920–1929 (la más numerosa: Foto 1922 con 15) |
| 1930–1984 | Foto 1930 a Foto 1984 (pico en los 50s-60s-70s) |

#### Por temática (las más importantes por volumen):
| Categoría | Fotos |
|-----------|-------|
| Foto personas | 2.449 |
| Foto vistas | 1.083 |
| Foto Feria | 736 |
| Foto Religión | 680 |
| Foto Castillo | 107 |
| Foto colegios | 222 |
| Foto deportes | 260 |
| Foto Soldados | 75 |
| Foto Boda | 88 |
| Foto Comuniones | 62 |
| Foto Verónica | 64 |
| Foto Festival Cante Jondo | 69 |
| Foto C.D. Mairena | 55 |
| Foto Palacio Cinema | 41 |
| Foto Reyes Magos | 32 |
| Foto Romería | 15 |
| Foto flamenco | 9 |
| Foto Fondo Bonsor | 26 |
| Foto Nevada / nevada | 6 / 15 |

---

## 3. Especificación de la Aplicación

### 3.1 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 |
| PWA | next-pwa |
| Estado | Zustand |
| Fetching | TanStack Query v5 |
| Validación | Zod |
| Testing | Playwright CLI |

### 3.2 Características PWA obligatorias

- `manifest.json` con nombre "FotosWiki", iconos, `theme_color`, `background_color`
- Service Worker con estrategia **cache-first** para imágenes ya vistas
- Instalable en Android/iOS/Desktop
- Funciona offline (muestra fotos ya cacheadas)
- Pantalla de carga splash

---

## 4. Integración con la API de MediaWiki

### 4.1 Obtener lista de fotos de una categoría

```
GET https://www.mairenawiki.es/wiki/api.php
  ?action=query
  &list=categorymembers
  &cmtitle=Categoría:Fotos          ← categoría principal
  &cmlimit=50                        ← máximo por página
  &cmnamespace=0                     ← solo artículos
  &format=json
  &origin=*                          ← necesario para CORS
```

**Paginación**: La respuesta incluye `query-continue.categorymembers.cmcontinue`. Pasarlo como `&cmcontinue=TOKEN` en la siguiente llamada.

**Respuesta esperada:**
```json
{
  "query": {
    "categorymembers": [
      { "pageid": 1410, "ns": 0, "title": "Foto0156" },
      { "pageid": 1253, "ns": 0, "title": "Foto0001" }
    ]
  },
  "query-continue": {
    "categorymembers": { "cmcontinue": "page|464f544f30303134|1253" }
  }
}
```

### 4.2 Obtener imagen y metadatos de una foto

```
GET https://www.mairenawiki.es/wiki/api.php
  ?action=query
  &titles=Foto0156
  &prop=revisions|images|categories
  &rvprop=content
  &format=json
  &origin=*
```

De la respuesta extraer:
- `revisions[0]["*"]` → Wikitext con metadatos (parsear con regex)
- `images[0].title` → Nombre del archivo: `"Archivo:Foto0156.jpg"`

### 4.3 Construir URL de imagen via API

Una vez que tienes el nombre de archivo (`Archivo:Foto0156.jpg`):

```
GET https://www.mairenawiki.es/wiki/api.php
  ?action=query
  &titles=Archivo:Foto0156.jpg
  &prop=imageinfo
  &iiprop=url|size|mime
  &iiurlwidth=800
  &format=json
  &origin=*
```

**Respuesta:**
```json
{
  "query": {
    "pages": {
      "-1": {
        "imagerepository": "local",
        "imageinfo": [{
          "url": "https://www.mairenawiki.es/wiki/images/4/4e/Foto0156.jpg",
          "thumburl": "https://www.mairenawiki.es/wiki/images/thumb/4/4e/Foto0156.jpg/800px-Foto0156.jpg",
          "width": 1200,
          "height": 900
        }]
      }
    }
  }
}
```

### 4.4 Foto aleatoria de la wiki

MediaWiki tiene endpoint nativo de página aleatoria:

```
GET https://www.mairenawiki.es/wiki/api.php
  ?action=query
  &list=random
  &rnnamespace=0
  &rnlimit=1
  &format=json
  &origin=*
```

⚠️ **Problema**: Devuelve cualquier artículo, no solo fotos. La solución es:
1. Mantener en caché local un índice parcial de IDs de fotos (obtenido paginando la categoría Fotos).
2. Seleccionar aleatoriamente del índice local.
3. Si el índice no está disponible, usar el endpoint random y verificar que el título empiece por "Foto".

### 4.5 Parsear metadatos del Wikitext

El contenido de cada página de foto sigue este patrón de Wikitext:

```wikitext
== Información de la Foto ==

* '''Autor''': Sin firmar
* '''Origen''': Colección Miguel Labrador Jiménez
* '''Fecha''': Diciembre de 1922
* '''Descripción''': Fiesta de la Flor

== Personajes ==
* Ana Sánchez Ferreras ("Anita Calixto")
* Lola Alba
```

**Regex de extracción (TypeScript):**
```typescript
const extractField = (wikitext: string, field: string): string => {
  const regex = new RegExp(`\\*\\s*'''${field}'''\\s*:\\s*(.+)`, 'i');
  const match = wikitext.match(regex);
  return match ? match[1].trim() : '';
};

const metadata = {
  description: extractField(content, 'Descripción'),
  date: extractField(content, 'Fecha'),
  author: extractField(content, 'Autor'),
  origin: extractField(content, 'Origen'),
};
```

### 4.6 CORS

La API de MediaWiki de mairenawiki.es **sí permite CORS** para peticiones GET con `origin=*`. No se necesita proxy en desarrollo, pero en producción verificar headers.

---

## 5. Funcionalidades por Fases

### FASE 1: MVP (Pantalla Principal)

#### 5.1.1 Pantalla de inicio — Cover Photo

La pantalla inicial debe transmitir la identidad histórica del municipio:

- **Fondo**: Imagen de portada fija (hardcodeada en la primera versión). Elegir una foto emblemática de alta resolución del Castillo de Mairena o la Plaza principal. Puede ser `Foto0001` u otra seleccionada manualmente.
- **Overlay**: Gradiente oscuro sobre la foto para legibilidad
- **Título centrado**: "Mairena del Alcor" en tipografía serif elegante
- **Subtítulo**: "Archivo Fotográfico Histórico"
- **Botón principal**: "Ver foto aleatoria" (icono de dados o shuffle)
- **Botón secundario**: "Explorar colección" (lleva a la galería)
- **Logo o badge**: "Powered by Mairena Wiki" con enlace a la wiki original

**Comportamiento del botón "Ver foto aleatoria":**
1. Mostrar spinner de carga
2. Llamar al endpoint de foto aleatoria (estrategia del índice local, ver 4.4)
3. Obtener metadatos e imagen de la foto seleccionada
4. Abrir el **Modal de Foto** (ver 5.1.2)

#### 5.1.2 Modal de Foto

Al visualizar cualquier foto, mostrar:

- **Imagen a pantalla completa** (o casi) con `object-fit: contain`
- **Overlay inferior** con los metadatos:
  - Título/descripción de la foto
  - Año o fecha
  - Autor y colección de origen
- **Acciones**:
  - Botón "Siguiente aleatoria" (carga otra foto sin cerrar el modal)
  - Botón "Compartir" (Web Share API)
  - Botón "Ver en Wiki" (enlace a la página original)
  - Botón "Cerrar" (X en esquina)
- **Gestos táctiles**: swipe horizontal para siguiente/anterior

---

### FASE 2: Galería y Exploración

#### 5.2.1 Galería Grid

- Grid masonry de 2-3 columnas (responsive)
- Carga infinita (infinite scroll con `cmcontinue`)
- Skeleton loading mientras cargan imágenes
- Al tocar una foto → Modal de foto

#### 5.2.2 Filtros

- **Por época**: Slider de años (1890–1984) o selector de décadas
- **Por temática**: Chips/tabs con las categorías principales (Feria, Personas, Castillo, Religión, Deportes, etc.)
- Los filtros cambian la categoría consultada en la API

#### 5.2.3 Búsqueda

```
GET https://www.mairenawiki.es/wiki/api.php
  ?action=query
  &list=search
  &srsearch=Foto+feria
  &srnamespace=0
  &format=json
  &origin=*
```

---

### FASE 3: Features Avanzadas

#### 5.3.1 "Foto del Día"

- Al abrir la app, mostrar siempre la misma foto durante 24h (determinista por fecha)
- Algoritmo: `fotoIndex = fechaEnDias % totalFotosEnIndice`
- La foto del día sustituye a la cover foto estática

#### 5.3.2 Colección personal (favoritos)

- Guardar fotos favoritas en `localStorage`
- Sección "Mis fotos guardadas"

#### 5.3.3 Compartir foto

- Web Share API nativa: `navigator.share({ title, text, url })`
- Fallback: copiar enlace al portapapeles
- El enlace compartido apunta a la página de la foto en la wiki

#### 5.3.4 Modo offline

- Service Worker cachea las últimas 50 fotos vistas
- Página offline elegante mostrando fotos ya cacheadas

---

## 6. Arquitectura de Archivos

```
src/
├── app/
│   ├── layout.tsx              # Root layout con metadata PWA
│   ├── page.tsx                # Pantalla de inicio (cover + botón)
│   ├── gallery/
│   │   └── page.tsx            # Galería explorable
│   └── manifest.ts             # Web App Manifest dinámico
│
├── features/
│   ├── cover/
│   │   ├── components/
│   │   │   ├── CoverScreen.tsx      # Pantalla principal
│   │   │   └── CoverButton.tsx      # Botón "Ver foto aleatoria"
│   │   └── hooks/
│   │       └── useRandomPhoto.ts    # Hook para foto aleatoria
│   │
│   ├── photo-viewer/
│   │   ├── components/
│   │   │   ├── PhotoModal.tsx       # Modal de foto a pantalla completa
│   │   │   ├── PhotoMetadata.tsx    # Overlay con datos de la foto
│   │   │   └── PhotoActions.tsx     # Botones de acción
│   │   └── hooks/
│   │       └── usePhotoSwipe.ts     # Gestos táctiles
│   │
│   └── gallery/
│       ├── components/
│       │   ├── PhotoGrid.tsx        # Grid masonry
│       │   ├── PhotoCard.tsx        # Card individual
│       │   ├── CategoryFilters.tsx  # Chips de filtro
│       │   └── YearSlider.tsx       # Slider cronológico
│       └── hooks/
│           └── useInfinitePhotos.ts # Carga infinita
│
└── shared/
    ├── lib/
    │   ├── mediawiki-api.ts     # Cliente de la API
    │   ├── wikitext-parser.ts   # Parser de wikitext
    │   └── photo-cache.ts       # Índice local de fotos
    ├── types/
    │   └── wiki.types.ts        # Tipos TypeScript
    └── hooks/
        └── useSharePhoto.ts     # Web Share API
```

---

## 7. Tipos TypeScript

```typescript
// shared/types/wiki.types.ts

export interface WikiPhoto {
  pageId: number;
  title: string;           // "Foto0156"
  description: string;     // "Fiesta de la Flor"
  date: string;            // "Diciembre de 1922"
  author: string;          // "Sin firmar"
  origin: string;          // "Colección Miguel Labrador Jiménez"
  categories: string[];    // ["Foto 1922", "Foto personas"]
  imageUrl: string;        // URL completa de la imagen
  thumbUrl: string;        // URL del thumbnail
  wikiUrl: string;         // URL de la página en la wiki
}

export interface CategoryMember {
  pageid: number;
  ns: number;
  title: string;
}

export interface PhotoIndex {
  lastUpdated: number;     // timestamp
  titles: string[];        // ["Foto0001", "Foto0002", ...]
  total: number;
}
```

---

## 8. Cliente de la API MediaWiki

```typescript
// shared/lib/mediawiki-api.ts

const BASE_URL = 'https://www.mairenawiki.es/wiki/api.php';

const apiParams = (params: Record<string, string>) => {
  const url = new URL(BASE_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
};

export const getPhotoPage = async (title: string): Promise<WikiPhoto> => {
  // 1. Obtener wikitext + nombre de archivo de imagen
  const contentRes = await fetch(apiParams({
    action: 'query',
    titles: title,
    prop: 'revisions|images|categories',
    rvprop: 'content',
  }));
  // ... parsear y extraer metadata

  // 2. Obtener URL de imagen con imageinfo
  const imageRes = await fetch(apiParams({
    action: 'query',
    titles: `Archivo:${title}.jpg`,
    prop: 'imageinfo',
    iiprop: 'url|size',
    iiurlwidth: '800',
  }));
  // ... extraer thumburl y url
};

export const getCategoryPhotos = async (
  category: string,
  cmcontinue?: string,
  limit = 50
): Promise<{ members: CategoryMember[]; nextContinue?: string }> => {
  const params: Record<string, string> = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Categoría:${category}`,
    cmlimit: String(limit),
    cmnamespace: '0',
  };
  if (cmcontinue) params.cmcontinue = cmcontinue;

  const res = await fetch(apiParams(params));
  const data = await res.json();
  return {
    members: data.query?.categorymembers ?? [],
    nextContinue: data['query-continue']?.categorymembers?.cmcontinue,
  };
};

export const getRandomPhotoFromIndex = (index: PhotoIndex): string => {
  const randomIdx = Math.floor(Math.random() * index.titles.length);
  return index.titles[randomIdx];
};
```

---

## 9. Estrategia del Índice Local de Fotos

Para la funcionalidad de "foto aleatoria" eficiente:

1. **Primera carga**: Obtener los primeros 500 títulos de `Categoría:Fotos` y guardarlos en `localStorage` como `photoIndex`.
2. **Selección aleatoria**: `Math.random()` sobre el array de títulos.
3. **Caducidad**: El índice expira cada 7 días y se refresca en background.
4. **Fallback**: Si el índice está vacío, hacer una llamada directa a la API con `rnlimit=1`.

```typescript
// shared/lib/photo-cache.ts

const INDEX_KEY = 'fotoswiki_photo_index';
const INDEX_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días

export const getOrBuildPhotoIndex = async (): Promise<PhotoIndex> => {
  const cached = localStorage.getItem(INDEX_KEY);
  if (cached) {
    const index: PhotoIndex = JSON.parse(cached);
    if (Date.now() - index.lastUpdated < INDEX_TTL) return index;
  }
  // Construir índice: paginar hasta 500 títulos
  const titles: string[] = [];
  let cmcontinue: string | undefined;
  do {
    const { members, nextContinue } = await getCategoryPhotos('Fotos', cmcontinue, 50);
    titles.push(...members.map(m => m.title));
    cmcontinue = nextContinue;
  } while (cmcontinue && titles.length < 500);

  const index: PhotoIndex = { lastUpdated: Date.now(), titles, total: titles.length };
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  return index;
};
```

---

## 10. Diseño Visual

### 10.1 Identidad Visual

- **Paleta**: Tonos sepia/tierra para conectar con la fotografía histórica. Acento en dorado (#C4A35A).
- **Tipografía**: `Playfair Display` (serif) para títulos, `Inter` para cuerpo.
- **Estilo**: Elegante, histórico, contemplativo. No moderno/tech.
- **Fondo cover**: Foto de alta resolución con overlay gradiente `from-black/70 to-transparent`.

### 10.2 Pantalla de Inicio — Wireframe

```
┌─────────────────────────────────┐
│  [FOTO DE PORTADA — FULL BLEED] │
│                                 │
│                                 │
│   ┌─────────────────────────┐   │
│   │  Mairena del Alcor      │   │  ← Playfair Display, blanco
│   │  Archivo Fotográfico    │   │  ← Subtítulo, gris claro
│   │  Histórico              │   │
│   └─────────────────────────┘   │
│                                 │
│   [ 🎲 Ver foto aleatoria  ]    │  ← Botón dorado
│   [ Explorar colección     ]    │  ← Botón outline blanco
│                                 │
│          Powered by             │
│         Mairena Wiki            │  ← Pequeño, abajo
└─────────────────────────────────┘
```

### 10.3 Modal de Foto — Wireframe

```
┌─────────────────────────────────┐
│ [X]                     [💾][↗] │  ← Cerrar / Guardar / Compartir
│                                 │
│                                 │
│      [IMAGEN CENTRADA]          │
│                                 │
│                                 │
├─────────────────────────────────┤
│ "Fiesta de la Flor"             │  ← Descripción
│ Diciembre de 1922               │  ← Fecha
│ Col. Miguel Labrador Jiménez    │  ← Colección
│                                 │
│ [ ← Anterior ] [ Siguiente → ] │
│ [ Ver en Mairena Wiki          ]│
└─────────────────────────────────┘
```

---

## 11. Configuración PWA

### 11.1 manifest.ts (Next.js)

```typescript
// app/manifest.ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FotosWiki — Mairena del Alcor',
    short_name: 'FotosWiki',
    description: 'Archivo fotográfico histórico de Mairena del Alcor',
    start_url: '/',
    display: 'standalone',
    background_color: '#1a1008',
    theme_color: '#C4A35A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
```

### 11.2 next.config.ts con PWA

```typescript
import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/www\.mairenawiki\.es\/wiki\/images\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'wiki-images',
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/www\.mairenawiki\.es\/wiki\/api\.php.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'wiki-api',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
      },
    },
  ],
})({});

export default nextConfig;
```

---

## 12. Consideraciones Técnicas Importantes

### 12.1 CORS
- La API de mairenawiki.es **permite CORS** con `origin=*` en peticiones GET.
- Si en producción hay problemas, crear una API Route de Next.js como proxy.

### 12.2 Construcción de URL de imagen
- El nombre del archivo de imagen asociado a `FotoXXXX` es `Archivo:FotoXXXX.jpg`.
- La URL thumb se obtiene via `prop=imageinfo&iiprop=url&iiurlwidth=800`.
- NO construir la URL manualmente desde el hash — usar siempre la API.

### 12.3 Categorías — nombres exactos
- Usar tildes donde corresponde: `Categoría:Fotos` (con tilde en Categoría).
- Sin tilde en `Categoria:Fotos` da error "invalid category name".
- En la URL encodear como: `Categor%C3%ADa:Fotos`.

### 12.4 Rate limiting
- La API pública de MediaWiki tiene límites (~500 req/min para lecturas).
- Usar TanStack Query para deduplicar peticiones y cachear resultados.
- El índice local de fotos evita peticiones repetidas.

### 12.5 Imágenes sin URL directa
- Algunas páginas `FotoXXXX` pueden no tener imagen asociada (artículos de texto).
- Manejar el caso `images: []` en la respuesta y mostrar placeholder.

---

## 13. Plan de Implementación

### Fase 1 — Cover + Foto Aleatoria (MVP)
1. Crear proyecto Next.js 16 con TypeScript + Tailwind
2. Configurar next-pwa
3. Implementar `mediawiki-api.ts` con `getCategoryPhotos` y `getPhotoPage`
4. Implementar `photo-cache.ts` con índice local
5. Crear `CoverScreen.tsx` con foto de portada fija
6. Crear `useRandomPhoto.ts` hook
7. Crear `PhotoModal.tsx` con metadatos
8. Conectar botón → random → modal
9. Añadir gestos swipe para mobile
10. Test en Playwright: flujo cover → random → modal → cerrar

### Fase 2 — Galería
11. Crear `PhotoGrid.tsx` con infinite scroll
12. Crear `CategoryFilters.tsx` con las categorías principales
13. Crear `YearSlider.tsx` para filtro cronológico
14. Integrar búsqueda

### Fase 3 — Features avanzadas
15. "Foto del Día" determinista
16. Favoritos en localStorage
17. Web Share API
18. Optimizar Service Worker y caché offline

---

## 14. URL de Ejemplo para Testing

Verificar que estas URLs devuelven datos durante el desarrollo:

```bash
# Lista primeras 10 fotos de la categoría Fotos
curl "https://www.mairenawiki.es/wiki/api.php?action=query&list=categorymembers&cmtitle=Categor%C3%ADa:Fotos&cmlimit=10&cmnamespace=0&format=json&origin=*"

# Metadatos de una foto específica
curl "https://www.mairenawiki.es/wiki/api.php?action=query&titles=Foto0156&prop=revisions|images|categories&rvprop=content&format=json&origin=*"

# URL de imagen
curl "https://www.mairenawiki.es/wiki/api.php?action=query&titles=Archivo:Foto0156.jpg&prop=imageinfo&iiprop=url|size&iiurlwidth=800&format=json&origin=*"

# Fotos de la Feria
curl "https://www.mairenawiki.es/wiki/api.php?action=query&list=categorymembers&cmtitle=Categor%C3%ADa:Foto_Feria&cmlimit=20&cmnamespace=0&format=json&origin=*"
```

---

## 15. Referencia: Estructura de la Wiki

- **URL base**: `https://www.mairenawiki.es`
- **API endpoint**: `https://www.mairenawiki.es/wiki/api.php`
- **Página de una foto**: `https://www.mairenawiki.es/wiki/index.php?title=Foto0156`
- **Categoría de fotos**: `https://www.mairenawiki.es/wiki/index.php?title=Categor%C3%ADa:Fotos`
- **Imagen directa (ejemplo)**: `https://www.mairenawiki.es/wiki/images/thumb/4/4e/Foto0156.jpg/800px-Foto0156.jpg`

---

*Documento generado el 2026-05-19. La wiki es pública y no requiere autenticación para lectura.*
