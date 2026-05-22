# Propuesta de Mejoras — MairenaFotos

**Fecha**: 2026-05-22
**Alcance**: Revisión integral del proyecto (diseño, implementación, rendimiento, carga de fotos)
**Estado**: Propuesta — pendiente de aprobación antes de implementar

---

## Resumen ejecutivo

El proyecto está sólido y en producción, pero he detectado **3 bugs críticos**, **8 problemas de rendimiento** y **una docena de mejoras de diseño/UX** que conviene abordar. He agrupado todo por severidad para que decidas qué entra y qué se queda fuera.

> **Nota**: La filosofía es KISS/YAGNI. No propongo refactors masivos ni introducir librerías nuevas. Todo lo que sigue se hace con el stack actual (Next.js 16 + Tailwind + MediaWiki API).

---

## 🔴 CRÍTICO — Bugs reales que afectan a usuarios

### C1. Iconos PWA faltantes → instalación rota

**Problema**: `src/app/manifest.ts` referencia `/icon-192.png` y `/icon-512.png`, pero **esos archivos no existen en `public/`** (solo está `sw.js`).

**Impacto**: Al intentar instalar la PWA en Android/iOS el navegador rechaza el manifest o muestra icono por defecto. Probablemente nadie ha podido instalar la app correctamente.

**Solución**:
- Generar `icon-192.png`, `icon-512.png` y un `apple-touch-icon.png` (180×180) basados en la identidad visual (probablemente la "M" dorada de Mairena en fondo `#1c1409`).
- Añadir `favicon.ico` y `favicon.svg`.
- Añadir `purpose: 'any maskable'` al icono 512 para soportar adaptive icons en Android.

---

### C2. PhotoModal y PhotoLightbox cargan thumbnail, no la foto en alta resolución

**Problema**:
- `PhotoModal` (foto del día, aleatoria, favoritos) usa `photo.thumbUrl` para mostrar a pantalla completa. `thumbUrl` está limitado a 800px desde `getPhotoData()`.
- `PhotoLightbox` recibe `imageUrl || thumbUrl`. `imageUrl` apunta a la URL original sin redimensionar — bien — pero en `FavoritesScreen` se construye el `WikiPhoto` con `imageUrl: photo.thumbUrl` (línea 29 de FavoritesScreen.tsx), perdiendo la URL original.

**Impacto**: En móviles modernos (390pt × 3x = 1170px reales) y en escritorio, las fotos se ven borrosas al ampliar. El proyecto promete "archivo fotográfico histórico" pero entrega thumbnails.

**Solución**:
1. En `PhotoModal`, usar `photo.imageUrl || photo.thumbUrl` (igual que el lightbox).
2. En `FavoritesScreen`, hacer fetch de `getPhotoData()` al abrir el modal en vez de reconstruir el objeto a mano. Coste: una API call (~200-500ms). Beneficio: alta resolución + metadatos completos (autor, origen, personajes, observaciones).
3. Alternativa más eficiente: guardar también `imageUrl` en `FavoritePhoto` cuando se añade a favoritos (no requiere API call al abrir).

---

### C3. Service Worker — eviction LRU no es realmente LRU

**Problema**: `sw.js` línea 38–41 evicta `keys[0]` cuando llega a 300 imágenes. Pero `cache.keys()` no garantiza orden de inserción — depende del navegador (en Chrome sí, en Safari no siempre). En la práctica puede borrar imágenes recientes y mantener las viejas.

**Impacto**: Cache thrashing. Usuario abre la galería, ve fotos, vuelve más tarde y todas las imágenes vuelven a descargarse aunque "deberían" estar cacheadas.

**Solución**:
- Implementar LRU real: en cada hit, mover la entrada al final con `cache.delete(req); cache.put(req, response)`.
- O usar timestamps en metadatos (más complejo).
- Subir `MAX_IMAGES` a 500 (con ~2400 fotos disponibles, 500 cubre el 20% más usado).

---

## 🟠 ALTO — Rendimiento

### P1. PhotoCard usa `<img>` puro en vez de `next/image`

**Problema**: Cada celda del grid usa `<img loading="lazy">` sin srcset, sin AVIF/WebP, sin tamaño explícito → causa CLS (Cumulative Layout Shift) cero solo gracias al `aspect-[4/3]`, pero pierde:
- Conversión automática a AVIF/WebP (50% menos peso).
- `srcset` responsive (móvil descarga 400px, escritorio 800px).
- Optimización del LCP (Largest Contentful Paint).
- Blur placeholder nativo.

**Impacto**: En 4G una galería con 48 fotos descarga ~6-8 MB. Con `next/image` bajaría a ~2-3 MB.

**Solución**:
- Convertir `PhotoCard` a `next/image` con `sizes="(max-width: 768px) 33vw, 16vw"`, `fill`, `quality={80}`.
- El dominio ya está configurado en `next.config.ts`.
- Probar primero — algunos navegadores podrían tener problemas con CORS o con el SW interceptando.

> **Atención**: Si esto interfiere con el Service Worker (que cachea las URLs originales de wiki), evaluar mantener `<img>` pero generar URLs con `iiurlwidth` adaptado al viewport.

---

### P2. CoverScreen background pixelado en escritorio

**Problema**: Línea 76 de `CoverScreen.tsx` — el fondo es `coverPhoto.thumbUrl` (800px) estirado a pantalla completa al 22% de opacidad. En monitores grandes y con `object-cover` pierde nitidez incluso con la opacidad baja.

**Solución**:
- Pedir un thumb mayor para la cover (e.g., 1600px) usando una variante de `getBatchThumbs` o un parámetro en `getPhotoData`.
- O dejar el fondo como degradado puro sin foto en >768px (gana en rendimiento y la portada queda más limpia).

---

### P3. Sin abort controllers — race conditions y memory leaks

**Problema**: Ningún `fetch()` del proyecto usa `AbortController`. Al cambiar de categoría rápido, navegar entre páginas o desmontar componentes:
- `useInfinitePhotos`: sí hay un `cancelled` flag, pero el fetch sigue corriendo. Bien hecho pero no perfecto.
- `usePhotoDetail`: no hay cancelación. Si abres foto A y rápidamente B, puede que A llegue después y sobrescriba.
- `getPhotoOfDay`, `getRandomPhotoTitle`: sin guard alguno.

**Solución**:
- Añadir `AbortController` en `getPhotoData`, `getCategoryPhotos`, `getBatchThumbs`. Cambiar la firma para aceptar opcionalmente `signal`.
- Cancelar en cleanup de los hooks.

---

### P4. localStorage del índice de búsqueda cerca del límite

**Problema**: `search-index.ts` guarda 2.400 entradas con texto concatenado de todos los campos. Estimación: ~1-2 MB. Sumado a `photo_index_v2` (200 KB) y favoritos (variable), está cerca del límite de 5 MB en algunos navegadores móviles.

**Síntoma**: El `try/catch` silencia errores. Usuarios con almacenamiento lleno no se enteran de que el índice no se cachea y se rebuilda cada vez.

**Solución**:
1. Medir el tamaño real con `JSON.stringify(stored).length` antes de guardar.
2. Si supera, guardar solo el campo `title` y reconsultar el `text` solo en búsqueda activa (más lento pero ocupa 10%).
3. Mejor: migrar a IndexedDB para el índice (100 MB+ disponibles). Coste: ~50 líneas con `idb-keyval` o vanilla.

---

### P5. Re-fetch del `thumbUrl` en búsqueda

**Problema**: `usePhotoSearch.ts` línea 65 hace `getBatchThumbs(titles.slice(0, 48), 400)` en cada búsqueda. Si buscas "Antonio", obtienes 48 thumbs vía API. Si tecleas "Antoni", se cancela el debounce pero igualmente cada keystroke completo dispara un batch fetch.

**Solución**:
- Cachear thumbs en memoria (`Map<title, PhotoThumb>`) durante la sesión.
- O incluir `thumbUrl` precomputado en el índice del servidor (`/api/search-index`). Aumenta el JSON ~100 KB pero elimina N+1 calls. Recomiendo esto.

---

### P6. Sin preload del siguiente thumbnail en el modal

**Problema**: Al pulsar "Siguiente" en PhotoModal/PhotoDetailPanel, se ve spinner. La siguiente foto se podría precargar mientras el usuario mira la actual.

**Solución**:
- En `GalleryScreen`, cuando `selectedIndex` cambia, precargar `activePhotos[selectedIndex + 1]?.thumbUrl` con `new Image()` o `<link rel="preload" as="image">`.

---

### P7. Sin `unstable_cache` en `/api/search-index`

**Problema**: El endpoint usa `revalidate = 86400` (ISR 24h). Funciona, pero en cold start tras revalidation tarda 20-30 segundos para reconstruir todo el índice (48 batches × 5 concurrency). Mientras tanto los visitantes piden el endpoint y reciben respuestas inconsistentes.

**Solución**:
- Mantener ISR pero envolver la lógica con `unstable_cache` (Next 16) o usar `Cache-Control: s-maxage=86400, stale-while-revalidate=604800` — ya tiene `stale-while-revalidate=3600` (1h) → subir a 7 días.
- Esto hace que durante la revalidación se siga sirviendo el índice viejo.

---

### P8. `getBatchThumbs` asume todas las fotos son `.jpg`

**Problema**: Línea 52 de `mediawiki-api.ts`: `photoTitles.map((t) => \`Archivo:${t}.jpg\`)`. Si hay alguna foto `.jpeg`, `.png` o sin extensión, se silencia y no aparece en el grid.

**Impacto**: Algunas fotos de la wiki podrían no aparecer en la galería. Probablemente la mayoría son .jpg, pero conviene robustecer.

**Solución**:
- Cambiar a `prop=imageinfo&generator=allimages` o usar `prop=images` para obtener las extensiones reales.
- O hacer fetch con `Archivo:${t}` (sin extensión) y dejar que MediaWiki resuelva — verificar si la API lo admite.

---

## 🟡 MEDIO — Diseño y UX

### D1. PhotoCard no muestra título en móvil

**Problema**: La etiqueta del título está bajo `hover:opacity-100` (líneas 26-28). En móvil **nunca** se ve. Solo aparece al hacer hover con ratón.

**Solución**:
- Mostrar siempre un gradiente sutil en la parte inferior con el título truncado, o
- Mostrar título solo cuando `selected`, o
- Eliminar la etiqueta y depender del panel/sheet de detalle.

---

### D2. Tab "Por época" tiene labels engañosos

**Problema**: `FilterBar.tsx` líneas 28-37 etiqueta "1890–1909" pero la categoría es solo `Foto 1898`, "1910s" pero categoría `Foto 1916`, etc. Los usuarios esperan ver todas las fotos de la década y solo ven las de un año específico.

**Solución (orden de preferencia)**:
1. Verificar qué categorías existen realmente en MediaWiki (`Foto 1890`, `Foto 1898`, `Foto 1899`...). Si existe una por año, agruparlas: cuando se elija "1890s", hacer fetch a múltiples categorías y mergear resultados.
2. O ajustar los labels para que coincidan con la categoría real (`1898`, `1916`...). Honesto y simple.
3. O añadir una capa de filtrado en el cliente por el campo `date` del wikitext, ya disponible en el índice de búsqueda.

---

### D3. PhotoLightbox — zoom solo con click, no pinch en móvil

**Problema**: El lightbox soporta click-to-zoom (escritorio) y rueda del mouse, pero **no pinch-to-zoom** ni doble tap. En móvil el comportamiento es: tocar para ampliar, luego un solo nivel de zoom sin gestos.

**Solución**:
- Usar `touchAction: 'pinch-zoom'` en el contenedor y dejar que el navegador maneje el pinch nativo, o
- Implementar gesture handlers con `react-use-gesture` (suma dependencia) o vanilla touch events (multitouch).
- Mínima viable: doble tap zoom in/out + drag pan.

---

### D4. Filtros — al cambiar de tab, vuelve a "Fotos"

**Problema**: Líneas 56-58 de `FilterBar.tsx`: si pasas de "Por época" a "Temática", llama `onChange('Fotos')`. Si pasas de "Temática" a "Por época", **no** cambia la categoría — sigue mostrando la temática actual mientras la pestaña está en "Por época". Inconsistente.

**Solución**:
- Recordar la última selección de cada tab y restaurarla al cambiar.
- O cuando cambias de tab, seleccionar el primer chip de ese tab.

---

### D5. PhotoDetailPanel y PhotoDetailSheet — sin botón compartir

**Problema**: `PhotoModal` tiene botón "compartir" (↗) que usa Web Share API. `PhotoDetailPanel` y `PhotoDetailSheet` no lo tienen. Inconsistencia según contexto.

**Solución**: Añadir el mismo botón compartir junto al favorito en el header de ambos componentes.

---

### D6. PhotoModal — swipe horizontal solo va hacia adelante

**Problema**: `handleTouchEnd` solo dispara `onNext()` si `dx > 60`. Si haces swipe a la derecha (dx negativo), no pasa nada. En cualquier galería esperarías que swipe-derecha = anterior.

**Solución**:
- Añadir prop `onPrev` opcional. Si está, mapear `dx < -60` → `onPrev()`.
- O al menos permitir swipe en ambos sentidos para `onNext` (algunos usuarios esperan que cualquier swipe avance).

---

### D7. PhotoDetailPanel — sin navegación por teclado

**Problema**: Solo `PhotoModal` y `PhotoLightbox` escuchan teclas. En el panel lateral de escritorio, Esc no cierra y las flechas no navegan.

**Solución**:
- Añadir el mismo `useEffect` con `keydown` listener: Esc → close, ← → prev, → → next.

---

### D8. Foto del día — discrepancia día local vs UTC

**Problema**: `photo-of-day.ts` mezcla:
- `todayString()` usa hora local del navegador
- `daysSinceEpoch` usa `Date.now()` (UTC ms)

Cerca de medianoche (23:00-01:00 dependiendo de zona horaria) puede mostrar dos fotos diferentes en pocos minutos.

**Solución**:
- Usar todo en UTC o todo en local, consistente.
- Recomendado: usar la fecha local del usuario (`new Date().toDateString()`) y derivar `daysSinceEpoch` también con `Math.floor(localTimestamp / 86400000)`.

---

### D9. Falta ruta `/foto/[title]` compartible

**Problema**: Al compartir una foto desde PhotoModal, se comparte la URL de la wiki, no la URL de MairenaFotos. Quien reciba el link aterriza en mairenawiki.es, no en la PWA.

**Solución**:
- Crear `src/app/foto/[title]/page.tsx` server component que use `getPhotoData()` y renderice una página con OpenGraph apropiado (imagen, título, descripción).
- Cambiar el share para apuntar a `https://fotoswiki.tld/foto/{title}`.
- Bonus: SEO. Cada foto se indexa por Google.

---

### D10. CoverScreen — accesibilidad

**Problema**:
- Algunos textos en gris muy claro (`text-[#c9a84c]/35`) sobre fondo oscuro están bajo el ratio mínimo WCAG AA (4.5:1).
- El botón "Foto aleatoria" no tiene `aria-label` descriptivo.
- Stats decorativos (`+2.400 Personas`...) sin contexto semántico.

**Solución**:
- Subir opacidad de textos auxiliares a ≥0.55 sobre fondos oscuros.
- Auditar con Lighthouse Accessibility.

---

### D11. No hay "tirar para refrescar" (pull-to-refresh) ni indicador de actualización

**Problema**: En móvil no hay forma de forzar refresh del índice (excepto el botón ↺ dentro del modo búsqueda). Si la wiki añade fotos nuevas, hay que esperar 7 días.

**Solución (low-cost)**:
- Botón "Actualizar archivo" en la cover screen o en el footer de galería.
- Detección de versión vía hash del índice del servidor → si cambia, mostrar toast "Hay fotos nuevas, recargar".

---

## 🟢 BAJO — Pulido

### B1. CLAUDE.md duplicado

El archivo `C:\Users\carry\CLAUDE.md` (global) y el del proyecto son idénticos. El global debería ser distinto.

### B2. Archivos de portada en raíz

`portada.jpeg`, `portada-mairenawiki.jpeg`, `portada-nueva.jpeg` en la raíz del repo son artefactos de desarrollo (vistos en `git status`). Mover a `docs/` o `.gitignore`.

### B3. `tsconfig.tsbuildinfo` está commiteado

Debería estar en `.gitignore`. Es output del compilador.

### B4. `next-env.d.ts` aparece como modificado

Es regenerado por Next y nunca debería editarse — revisar por qué aparece en `git status`.

### B5. Sin headers de seguridad

Añadir en `next.config.ts`:
```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ]
  }]
}
```

### B6. Sin error boundary

Un fallo en `parseWikitext` con un wikitext malformado podría dejar la app en blanco. Añadir un `error.tsx` por ruta.

### B7. Sin sitemap.xml ni robots.txt

Si la idea es indexar, añadir `app/sitemap.ts` y `app/robots.ts`. Especialmente con D9 (rutas `/foto/[title]`).

### B8. `eslint.config` no existe

`package.json` declara `eslint-config-next` pero no veo `.eslintrc` ni `eslint.config.mjs`. `npm run lint` probablemente falla o no valida nada.

---

## Plan de implementación sugerido

Tres fases. Total estimado: **1 día** de trabajo.

### Fase 1 — Bugs críticos (30-45 min)
- **C1**: Generar iconos PWA.
- **C2**: Fix de resolución en PhotoModal y FavoritesScreen.
- **C3**: LRU real en Service Worker.

### Fase 2 — Rendimiento esencial (1-2 h)
- **P1**: Migrar PhotoCard a `next/image` (validar contra SW).
- **P3**: Abort controllers en hooks.
- **P5**: Cache en memoria de thumbs durante búsqueda.
- **P6**: Preload del siguiente thumbnail.
- **P8**: Robustecer detección de extensión.

### Fase 3 — Diseño y pulido (2-3 h)
- **D1**: Mostrar título siempre en móvil.
- **D2**: Filtros por época con labels reales o agregando años.
- **D4**: Persistir selección por tab.
- **D5**: Compartir en panel y sheet.
- **D6**: Swipe bidireccional en modal.
- **D7**: Teclado en panel.
- **D8**: Día consistente UTC.
- **B1-B8**: Limpieza.

### Fase futura (separada, requiere decisión de producto)
- **D9**: Ruta `/foto/[title]` con OpenGraph.
- **D3**: Pinch-zoom y gestos avanzados.
- **D11**: Refresh y notificaciones de fotos nuevas.

---

## Lo que **NO** propongo cambiar

Mantenemos por buenos motivos:
- Sin auth / sin Supabase (la app no necesita usuarios; favoritos en localStorage es lo correcto).
- Sin backend propio (la wiki es la fuente de verdad).
- `<img>` directo en lugares donde el SW intercepta correctamente.
- Determinismo de foto del día (gran feature, solo arreglar D8).
- Estructura feature-first.
- Service Worker minimalista — solo robustecer la LRU.
- Stack Tailwind sin librerías de animación adicionales — todo se hace con CSS transitions.

---

## Pregunta para ti

**¿Por dónde quieres que empiece?**

Opciones:
1. **Todo en orden** (Fase 1 → 2 → 3, recomendado).
2. **Solo críticos** (Fase 1, parchear y revisar después).
3. **Quiero ver primero pruebas** de algún punto concreto antes de decidir.
4. **Otro orden** (dime cuáles priorizar).

Una vez que apruebes el alcance, ejecuto. No tocaré nada hasta tu visto bueno.
