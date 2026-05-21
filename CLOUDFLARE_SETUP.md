# Configurar Cloudflare en mairenawiki.es

Protección anti-bots, rate limiting y caché para reducir la carga de la base de datos.

---

## Paso 1 — Crear cuenta en Cloudflare

1. Ve a **cloudflare.com**
2. Haz clic en **Sign Up**
3. Introduce tu email y una contraseña
4. Elige el plan **Free** (0 €/mes)

---

## Paso 2 — Añadir el dominio

1. En el dashboard → **Add a Site**
2. Escribe `mairenawiki.es` → **Continue**
3. Selecciona **Free** → **Continue**
4. Cloudflare escanea los DNS actuales y los importa automáticamente
5. Revisa que aparezcan todos los registros existentes (A, CNAME, MX, etc.)
6. Haz clic en **Continue**

> Cloudflare te mostrará dos nameservers propios. Los necesitas para el Paso 3.  
> Ejemplo: `aria.ns.cloudflare.com` y `bob.ns.cloudflare.com`  
> **Los tuyos serán distintos — cópialos exactamente.**

---

## Paso 3 — Cambiar nameservers en GoDaddy

1. Entra en **godaddy.com** e inicia sesión
2. Arriba a la derecha → tu nombre → **Mis productos**
3. Busca `mairenawiki.es` → botón **DNS**
4. Baja hasta la sección **Nameservers** → **Cambiar**
5. Selecciona **Especificar mis propios servidores de nombres**
6. Borra los nameservers actuales e introduce los dos de Cloudflare:
   ```
   [nameserver-1].ns.cloudflare.com
   [nameserver-2].ns.cloudflare.com
   ```
7. Haz clic en **Guardar**

> La propagación tarda entre 10 minutos y 24 horas.  
> La wiki no sufre ningún corte durante este proceso.  
> Cloudflare muestra el dominio en verde (**Active**) cuando está listo.

---

## Paso 4 — Activar Bot Fight Mode

Una vez el dominio esté **Active** en Cloudflare:

1. En el dashboard, selecciona `mairenawiki.es`
2. Menú izquierdo → **Security** → **Bots**
3. **Bot Fight Mode** → activar en **ON**

> Bloquea automáticamente bots maliciosos conocidos sin configuración adicional.

---

## Paso 5 — Crear regla de rate limiting para la API

Limita el número de peticiones a `/wiki/api.php` por IP:

1. Menú izquierdo → **Security** → **WAF**
2. Pestaña **Rate limiting rules** → **Create rule**
3. Rellena los campos:

| Campo | Valor |
|---|---|
| Rule name | `Limitar acceso API wiki` |
| Field | `URI Path` |
| Operator | `contains` |
| Value | `/wiki/api.php` |
| Requests | `100` |
| Period | `1 minute` |
| Action | `Block` |
| Duration | `1 hour` |

4. Haz clic en **Deploy**

> Cualquier IP que haga más de 100 peticiones a la API en 1 minuto queda bloqueada 1 hora.  
> La app FotosWiki no llega a ese límite en condiciones normales de uso.

---

## Paso 6 — Configurar caché

Reduce las peticiones que llegan al servidor de la wiki:

1. Menú izquierdo → **Caching** → **Configuration**
2. **Caching Level** → **Standard**
3. **Browser Cache TTL** → **4 hours**
4. Menú izquierdo → **Caching** → **Cache Rules** → **Create rule**

| Campo | Valor |
|---|---|
| Rule name | `Cachear imágenes wiki` |
| Field | `URI Path` |
| Operator | `contains` |
| Value | `/wiki/images/` |
| Cache status | `Eligible for cache` |
| Edge TTL | `1 day` |

5. Haz clic en **Deploy**

> Las imágenes de la wiki se sirven desde los servidores de Cloudflare,  
> sin tocar la base de datos ni el servidor original.

---

## Paso 7 — Configurar robots.txt en la wiki (opcional)

Para frenar también a los bots que respetan las normas, añade esto al `robots.txt`
del servidor de `mairenawiki.es`:

```
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: *
Crawl-delay: 10
```

> Accesible en: `https://www.mairenawiki.es/robots.txt`  
> En MediaWiki se puede editar desde: **Especial:Editar** → página `Mediawiki:Robots.txt`  
> o directamente en el servidor en el directorio raíz web.

---

## Resultado esperado

| Problema | Antes | Después |
|---|---|---|
| Bots maliciosos | Acceso libre | Bloqueados automáticamente |
| Scrapers agresivos | Sin límite | Bloqueados tras 100 req/min |
| Carga de imágenes | Servidor directo | Servidas desde Cloudflare |
| Carga de páginas | Servidor directo | Cacheadas en Cloudflare |
| Bots que respetan normas | Sin restricción | Crawl-delay de 10 segundos |

---

## Verificar que todo funciona

Una vez activo Cloudflare, comprueba que:

- `https://www.mairenawiki.es` sigue cargando correctamente
- `https://fotosmairena.es` sigue mostrando la app FotosWiki
- En Cloudflare → **Analytics** → **Security** aparecen los bots bloqueados

Si algo deja de funcionar, en Cloudflare → **Overview** → **Pause Cloudflare on Site**
suspende toda la protección temporalmente mientras se investiga.
