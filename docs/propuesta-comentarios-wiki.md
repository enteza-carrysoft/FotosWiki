# Propuesta: Comentarios desde MairenaFotos a la Wiki

**Para:** Administradores de mairenawiki.es  
**De:** Ateneo de Mairena del Alcor — Proyecto MairenaFotos  
**Fecha:** Mayo 2026

---

## ¿En qué consiste?

MairenaFotos es la aplicación móvil del archivo fotográfico histórico de Mairena del Alcor. Actualmente permite explorar, buscar y compartir las más de 2.400 fotos del archivo. Miles de personas de Mairena la utilizan desde el móvil para descubrir y disfrutar del patrimonio fotográfico de la localidad.

La propuesta es añadir una funcionalidad sencilla: **que los usuarios de la app puedan dejar un comentario en cada foto**, directamente desde el móvil.

---

## ¿Cómo funcionaría para el usuario?

1. El usuario abre una foto en la app.
2. Ve un pequeño apartado al final de la ficha de la foto: **"Deja un comentario"**.
3. Escribe su nombre y su comentario (por ejemplo: *"Mi abuelo aparece en esta foto, es el tercero por la izquierda"* o *"Esta imagen fue tomada en la calle Real, no en la plaza"*).
4. Pulsa **Enviar**.
5. El comentario queda registrado.

---

## ¿Dónde se guardan los comentarios?

Los comentarios se almacenan directamente en **la página de discusión de cada foto dentro de mairenawiki.es**, que es el espacio de debate asociado a cada página de la wiki.

Por ejemplo, para la foto `Archivo:Corpus_1978.jpg`, el comentario aparecería en `Archivo Discusión:Corpus_1978.jpg`.

Esto significa que:
- Los comentarios **son visibles en la wiki** para cualquiera que acceda a esa página de discusión.
- Los **editores y administradores de la wiki pueden leerlos, editarlos o borrarlos** con normalidad, igual que cualquier otra edición.
- Los comentarios pueden ser una **fuente valiosa de información**: identificación de personas, corrección de fechas, aportación de contexto histórico.

---

## ¿Qué aparece exactamente en la wiki?

Cada comentario genera una nueva sección en la página de discusión de la foto, con este formato:

```
== Comentario desde MairenaFotos ==
*Nombre:* María García
*Comentario:* Mi abuelo aparece en esta foto, es el tercero por la izquierda.
— Enviado desde MairenaFotos · mayo 2026
```

---

## ¿Quién puede comentar?

Cualquier persona que use la app puede dejar un comentario. Solo se pide un nombre (no se verifica — el usuario escribe lo que quiere). No se necesita crear cuenta en la wiki.

---

## ¿Qué necesitamos de vosotros?

Técnicamente, la API pública de mairenawiki.es ya permite esta operación sin cambios de configuración. Sin embargo, antes de activar esta funcionalidad queremos vuestra aprobación por dos razones:

### 1. Moderación
Los comentarios llegan directamente a las páginas de discusión de la wiki. Necesitáis estar de acuerdo en gestionar ese contenido: borrar comentarios inapropiados, integrar la información útil en el artículo principal si lo merece, etc.

### 2. Política de uso
Si estáis de acuerdo, podríamos acordar unas normas básicas que se muestren al usuario antes de comentar (por ejemplo: *"Los comentarios son públicos y pueden ser editados por los administradores de la wiki. Por favor, sé respetuoso y aporta información relevante sobre la foto."*).

---

## Valor potencial

Esta funcionalidad puede convertirse en una herramienta de **enriquecimiento colectivo del archivo**. Muchos vecinos de Mairena reconocen a personas, lugares o fechas en las fotos que los editores de la wiki no conocen. Abrir un canal sencillo desde el móvil para que aporten ese conocimiento podría mejorar significativamente la calidad de los metadatos del archivo fotográfico.

---

## Preguntas que nos gustaría que valoraseis

1. ¿Estáis dispuestos a recibir y gestionar comentarios de usuarios anónimos en las páginas de discusión de las fotos?
2. ¿Preferís que los comentarios lleguen primero a una bandeja de revisión antes de publicarse, o directamente a la wiki?
3. ¿Hay alguna restricción técnica o de política en la wiki que debamos tener en cuenta?

---

Quedamos a vuestra disposición para cualquier pregunta o para hacer una demostración de cómo funcionaría en la app.

**Contacto:** carrysoft.dev@gmail.com
