# Mi Música

App web personal para escuchar música libre, completa y sin anuncios. No pide cuentas y no lleva rastreadores.

**Abrir la app:** https://andreslopez2025-lgtm.github.io/mi-musica/

La música sale de:
- **Jamendo**, la fuente principal. Necesita una clave gratis (ver abajo).
- **Audius**, música que publican sus propios artistas.
- **Internet Archive**, solo grabaciones de dominio público o con licencia Creative Commons (aquí está lo más antiguo).

## Instalarla en el celular

### Android (Chrome)
1. Abre el link de arriba en **Chrome**.
2. Si arriba aparece el botón **Instalar**, tócalo. Si no, toca el menú **⋮** (arriba a la derecha) y elige **Instalar aplicación** o **Añadir a pantalla de inicio**.
3. Confirma con **Instalar**. Te queda el ícono "Mi Música" junto a tus otras apps.
4. La primera vez que suene una canción, Android puede pedir permiso para mostrar notificaciones. Acepta: así salen los controles en la barra de notificaciones y en la pantalla de bloqueo.

### iPhone (Safari)
1. Abre el link de arriba en **Safari**. Tiene que ser Safari, no Chrome.
2. Toca el botón **Compartir** (el cuadrado con una flecha hacia arriba, abajo en el centro).
3. Baja y toca **Añadir a pantalla de inicio**, y luego **Añadir**.
4. Abre "Mi Música" desde el ícono nuevo.

## Activar Jamendo (una sola vez)
1. Entra a https://devportal.jamendo.com y crea una cuenta gratis.
2. En **My Applications**, crea una aplicación. De nombre ponle "Mi Música" y, si te pide una web, pon el link de la app.
3. Copia el **Client ID**.
4. En la app, toca el engranaje ⚙ (arriba a la derecha), pega la clave y toca **Guardar**. Debe decir "Jamendo está activo ✓".

## Cómo se usa
- **Descubrir**: elige un género, unos años o un artista. La lista se actualiza sola.
- **Escuchar mix**: arma una lista aleatoria con tu filtro y no para de sonar.
- **Lo más sonado**: muestra primero lo más popular de tu filtro.
- 👍 / 👎 en cada canción: el mix pone más de lo que te gusta y nunca lo que marcaste con 👎.
- **Para ti**: recomendaciones según tus 👍 y tu filtro.
- **Favoritos** y **Listas**: se guardan solo en este celular. Si borras los datos del navegador o desinstalas la app, se pierden.

## Para el programador
- No necesita instalar nada para compilar: son archivos estáticos (`index.html`, `app.js`, `musica.js`, `sw.js`).
- Prueba rápida: `node prueba.mjs [CLIENT_ID_JAMENDO]`.
- Para dejar la clave de Jamendo fija en el código, ponla en `CLAVE_JAMENDO` dentro de `app.js`.
