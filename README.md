# Mi Música

App web personal para escuchar música libre, completa y sin anuncios. No pide cuentas y no lleva rastreadores.

**Abrir la app:** https://andreslopez2025-lgtm.github.io/mi-musica/

La música sale de:
- **Jamendo**, la fuente principal: música independiente con licencia libre.
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

## Jamendo
Ya viene activado: la app trae incluido el Client ID de la cuenta de programador (usuario jaimeandreslopez2025 en devportal.jamendo.com). Si algún día quieres cambiarlo, toca el engranaje ⚙, pega otro Client ID y toca **Guardar**. El "Client Secret" de esa cuenta no se usa y no debe compartirse.

## Cómo se usa
- **Descubrir**: elige un género, unos años o un artista. La lista se actualiza sola.
- **Escuchar mix**: arma una lista aleatoria con tu filtro y no para de sonar.
- **Lo más sonado**: muestra primero lo más popular de tu filtro.
- 👍 / 👎 en cada canción: el mix pone más de lo que te gusta y nunca lo que marcaste con 👎.
- **Para ti**: recomendaciones según tus 👍 y tu filtro.
- **Favoritos** y **Listas**: se guardan solo en este celular. Si borras los datos del navegador o desinstalas la app, se pierden.

## Para el programador
- No necesita instalar nada para compilar: son archivos estáticos (`index.html`, `app.js`, `musica.js`, `sw.js`).
- Prueba rápida: `node prueba.mjs c31bfecb`.
- El Client ID está en `CLAVE_JAMENDO`, dentro de `app.js`.
