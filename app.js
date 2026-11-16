// app.js — pantallas y reproductor. La música y los gustos viven en musica.js.
import { GENEROS, FUENTES, buscar, sugerirArtistas, probarJamendo, votar, mix as armarMix, paraTi, mezclar, gustosVacios, unicos } from './musica.js';

// Si quieres, deja aquí tu clave de Jamendo para no tener que escribirla en Ajustes.
const CLAVE_JAMENDO = '';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const img = u => (/^https:\/\//.test(u || '') ? u : 'icon-512.png');
const I = n => `<svg class="i"><use href="#i-${n}"/></svg>`;
const mmss = s => (!isFinite(s) || !s ? '0:00' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);
const ANIO = new Date().getFullYear();
const audio = $('#audio');

// ---------- lo que se guarda en el celular ----------
const GUARDADO = 'mimusica';
let S = {};
try { S = JSON.parse(localStorage.getItem(GUARDADO)) || {}; } catch {}
S = { f: { genero: null, desde: null, hasta: null, artista: '' }, top: false, listas: [], clave: '', rep: 'off', alea: false, ...S };
S.g = { ...gustosVacios(), ...S.g };
function guardar() {
  try { localStorage.setItem(GUARDADO, JSON.stringify(S)); } catch { toast('No se pudo guardar en el celular'); }
}
navigator.storage?.persist?.(); // pide al navegador que no borre tus datos
const clave = () => S.clave || CLAVE_JAMENDO;

let tt;
function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(() => (t.hidden = true), 2600);
}

// ---------- filas de canciones ----------
const vistas = {}; // nombre de la lista en pantalla → canciones
function filas(nombre, canciones, quitar = false) {
  vistas[nombre] = canciones;
  const actual = cola[pos]?.id;
  return canciones.map((t, i) => `
<div class="fila${t.id === actual ? ' sonando' : ''}" data-v="${nombre}" data-i="${i}" data-id="${esc(t.id)}">
  <img loading="lazy" src="${esc(img(t.img))}" alt="" onerror="this.onerror=null;this.src='icon-512.png'">
  <div class="txt"><b>${esc(t.title)}</b><small>${esc(t.artist)}${t.year ? ' · ' + t.year : ''} · ${FUENTES[t.src]}</small></div>
  <button class="ico${S.g.si[t.id] ? ' on' : ''}" data-a="si" aria-label="Me gusta">${I('up')}</button>
  <button class="ico${S.g.no[t.id] ? ' on' : ''}" data-a="no" aria-label="No me gusta">${I('down')}</button>
  ${quitar
    ? `<button class="ico" data-a="quitar" aria-label="Quitar de la lista">${I('del')}</button>`
    : `<button class="ico" data-a="lista" aria-label="Añadir a una lista">${I('add')}</button>`}
</div>`).join('');
}
const cargando = '<div class="cargando">Buscando música…</div>';
const sinVetados = l => l.filter(t => !S.g.no[t.id]);

document.addEventListener('click', e => {
  const el = e.target;
  const hit = sel => el.closest(sel);
  let b;
  if ((b = hit('[data-abrir]'))) return abrir(b.dataset.abrir);
  if ((b = hit('[data-cerrar]'))) return cerrar(b.dataset.cerrar);
  if ((b = hit('[data-tab]'))) return irA(b.dataset.tab);
  if ((b = hit('[data-quitar]'))) return quitarFiltro(b.dataset.quitar);
  if ((b = hit('[data-reproducir]'))) return reproducirVista(b.dataset.reproducir, b.hasAttribute('data-aleatorio'));
  const fila = hit('.fila');
  const t = fila && vistas[fila.dataset.v]?.[+fila.dataset.i];
  if (!t) return;
  const a = hit('[data-a]')?.dataset.a;
  if (a === 'si') return votarUI(t, 1);
  if (a === 'no') return votarUI(t, -1);
  if (a === 'lista') return elegirLista(t);
  if (a === 'quitar') return quitarDeLista(t);
  if (fila.dataset.v === 'cola') { pos = cola.indexOf(t); return cargar(); }
  tocar(vistas[fila.dataset.v], +fila.dataset.i);
});

// ---------- pestañas y pantallas ----------
const TITULOS = { descubrir: 'Descubrir', parati: 'Para ti', favoritos: 'Favoritos', listas: 'Mis listas' };
let tabActual = 'descubrir';
function irA(tab) {
  tabActual = tab;
  for (const k in TITULOS) $('#v-' + k).hidden = k !== tab;
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#titulo').textContent = TITULOS[tab];
  scrollTo(0, 0);
  ({ parati: pintarParaTi, favoritos: pintarFavoritos, listas: pintarListas })[tab]?.();
}
function abrir(id) {
  $('#' + id).hidden = false;
  history.pushState({ capa: id }, ''); // el botón "atrás" del celular la cierra
  if (id === 'ajustes') {
    $('#clave').value = S.clave;
    $('#estado-clave').textContent = clave() ? 'Jamendo está activo ✓' : 'Jamendo está desactivado (falta la clave).';
  }
  if (id === 'player') { pintarCola(); progreso(); }
}
function cerrar(id) {
  if (history.state?.capa) history.back();
  else $('#' + id).hidden = true;
}
addEventListener('popstate', () => { $('#player').hidden = $('#ajustes').hidden = true; });

// ---------- filtros ----------
const DECADAS = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
const nombreDecada = d => (d < 2000 ? `Años ${String(d).slice(2)}` : `${d}s`);
const finDecada = d => Math.min(d + 9, ANIO);
const opciones = ['<option value="">Cualquiera</option>', ...Array.from({ length: ANIO - 1919 }, (_, i) => `<option>${ANIO - i}</option>`)].join('');
$('#desde').innerHTML = $('#hasta').innerHTML = opciones;

function pintarFiltros() {
  $('#generos').innerHTML = [['', 'Todos'], ...GENEROS.map(g => [g.id, g.nombre])]
    .map(([id, n]) => `<button class="chip${(S.f.genero || '') === id ? ' on' : ''}" data-genero="${id}">${n}</button>`).join('');
  $('#decadas').innerHTML = `<button class="chip${!S.f.desde && !S.f.hasta ? ' on' : ''}" data-decada="">Todos</button>`
    + DECADAS.map(d => `<button class="chip${S.f.desde === d && S.f.hasta === finDecada(d) ? ' on' : ''}" data-decada="${d}">${nombreDecada(d)}</button>`).join('');
  $('#desde').value = S.f.desde || '';
  $('#hasta').value = S.f.hasta || '';
  if (document.activeElement !== $('#artista')) $('#artista').value = S.f.artista;
  $('#btn-top').classList.toggle('on', S.top);
  $('#aviso-clave').hidden = !!clave();
}
function resumenFiltro() {
  const p = [];
  if (S.f.genero) p.push(GENEROS.find(g => g.id === S.f.genero)?.nombre);
  if (S.f.desde || S.f.hasta) p.push(S.f.desde && S.f.hasta ? `${S.f.desde}–${S.f.hasta}` : S.f.desde ? `desde ${S.f.desde}` : `hasta ${S.f.hasta}`);
  if (S.f.artista) p.push(S.f.artista);
  return p.join(' · ');
}
function cambiarFiltro(cambio) {
  const nuevo = { ...S.f, ...cambio };
  if (JSON.stringify(nuevo) === JSON.stringify(S.f)) return;
  S.f = nuevo;
  guardar();
  pintarFiltros();
  recargar();
}
function quitarFiltro(k) {
  cambiarFiltro(k === 'anios' ? { desde: null, hasta: null } : k === 'artista' ? { artista: '' } : { genero: null });
}

$('#generos').onclick = e => {
  const b = e.target.closest('[data-genero]');
  if (b) cambiarFiltro({ genero: b.dataset.genero || null });
};
$('#decadas').onclick = e => {
  const b = e.target.closest('[data-decada]');
  if (!b) return;
  const d = +b.dataset.decada;
  cambiarFiltro(d ? { desde: d, hasta: finDecada(d) } : { desde: null, hasta: null });
};
$('#desde').onchange = $('#hasta').onchange = () => {
  let d = +$('#desde').value || null, h = +$('#hasta').value || null;
  if (d && h && d > h) [d, h] = [h, d];
  cambiarFiltro({ desde: d, hasta: h });
};

let tSug;
$('#artista').addEventListener('input', e => {
  const v = e.target.value.trim();
  clearTimeout(tSug);
  if (!v) return cambiarFiltro({ artista: '' });
  if ([...$('#sugerencias').options].some(o => o.value === v)) return cambiarFiltro({ artista: v }); // tocó una sugerencia
  tSug = setTimeout(async () => {
    const nombres = await sugerirArtistas(v, clave()).catch(() => []);
    if ($('#artista').value.trim() === v) $('#sugerencias').innerHTML = nombres.map(n => `<option value="${esc(n)}">`).join('');
  }, 300);
});
$('#artista').addEventListener('change', e => cambiarFiltro({ artista: e.target.value.trim() }));
$('#artista').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

// ---------- resultados de Descubrir ----------
const consulta = (extra = {}) => ({ ...S.f, clave: clave(), modo: S.top ? 'top' : 'variado', n: 20, pag: 0, ...extra });
let pagina = 0, ficha = 0;

async function recargar(mas = false) {
  const mia = ++ficha;
  pagina = mas ? pagina + 1 : 0;
  $('#titulo-res').textContent = S.top ? 'Lo más sonado' : 'Para descubrir';
  $('#nota-res').textContent = resumenFiltro() || 'Sin filtros: un poco de todo';
  if (!mas) $('#res').innerHTML = cargando;
  $('#ver-mas').hidden = true;
  const antes = mas ? vistas.res : [];
  const { canciones, errores } = await buscar(consulta({ pag: pagina }), parcial => {
    if (mia === ficha && parcial.length) $('#res').innerHTML = filas('res', sinVetados(unicos([...antes, ...parcial])));
  });
  if (mia !== ficha) return; // llegó una búsqueda más nueva
  const lista = sinVetados(unicos([...antes, ...canciones]));
  $('#res').innerHTML = lista.length ? filas('res', lista) : vacio(errores);
  $('#ver-mas').hidden = lista.length === antes.length;
  if (errores.length && errores.length < 3) toast(`No respondió: ${errores.join(', ')}`);
}
function vacio(errores = []) {
  if (errores.length === 3) return '<div class="vacio"><p><b>No hay conexión con las fuentes de música.</b></p><p>Revisa tu internet e inténtalo de nuevo.</p></div>';
  const q = [];
  if (S.f.genero) q.push(`<button class="chip" data-quitar="genero">Quitar género (${esc(GENEROS.find(g => g.id === S.f.genero)?.nombre)})</button>`);
  if (S.f.desde || S.f.hasta) q.push('<button class="chip" data-quitar="anios">Quitar años</button>');
  if (S.f.artista) q.push(`<button class="chip" data-quitar="artista">Quitar artista (${esc(S.f.artista)})</button>`);
  return `<div class="vacio"><p><b>No encontramos canciones con estos filtros.</b></p>
    ${q.length ? `<p>Prueba quitando alguno:</p><div class="chips envolver" style="justify-content:center">${q.join('')}</div>` : ''}
    ${S.f.desde && S.f.desde < 2005 ? '<p class="nota" style="margin-top:14px">Ojo: Jamendo tiene música desde 2005 y Audius desde 2019. Lo más antiguo viene de Internet Archive, que tiene menos variedad.</p>' : ''}</div>`;
}
$('#ver-mas').onclick = () => recargar(true);
$('#btn-top').onclick = () => {
  S.top = !S.top;
  guardar();
  pintarFiltros();
  recargar();
  $('#titulo-res').scrollIntoView({ behavior: 'smooth' });
};
$('#btn-mix').onclick = async () => {
  desbloquear();
  toast('Armando tu mix…');
  const c = consulta();
  const lista = await armarMix(c, S.g).catch(() => []);
  if (!lista.length) return toast('No encontré canciones para el mix. Prueba quitando algún filtro.');
  tocar(lista, 0, c);
};

// ---------- Para ti ----------
let ptClave = '';
async function pintarParaTi() {
  const r = resumenFiltro();
  $('#pt-nota').textContent = 'Recomendaciones según tus me gusta' + (r ? ` y tu filtro (${r}).` : '.');
  const k = JSON.stringify([S.f, Object.keys(S.g.si).length, Object.keys(S.g.no).length, clave()]);
  if (k === ptClave) return;
  ptClave = k;
  $('#pt-play').hidden = true;
  $('#pt-res').innerHTML = cargando;
  const l = await paraTi(consulta(), S.g).catch(() => []);
  if (k !== ptClave) return;
  if (l === null) {
    $('#pt-res').innerHTML = '<div class="vacio"><p><b>Todavía no sé qué te gusta.</b></p><p>Toca 👍 en las canciones que te gusten (en Descubrir o en el reproductor) y aquí aparecerán recomendaciones para ti.</p></div>';
    return;
  }
  $('#pt-play').hidden = !l.length;
  $('#pt-res').innerHTML = l.length ? filas('parati', l) : vacio();
}
$('#pt-play').onclick = () => vistas.parati?.length && tocar(vistas.parati, 0);

// ---------- Favoritos y listas ----------
function pintarFavoritos() {
  const l = Object.values(S.g.si).reverse();
  $('#fav-res').innerHTML = l.length ? filas('favoritos', l)
    : '<div class="vacio"><p><b>Todavía no tienes favoritos.</b></p><p>Toca 👍 en cualquier canción y aparecerá aquí.</p></div>';
}
function reproducirVista(nombre, aleatorio) {
  const l = nombre === 'favoritos' ? Object.values(S.g.si).reverse() : vistas[nombre];
  if (!l?.length) return toast('No hay canciones para reproducir');
  if (aleatorio) { S.alea = true; guardar(); }
  tocar(l, aleatorio ? Math.floor(Math.random() * l.length) : 0);
}

let abierta = null; // lista abierta en pantalla
function pintarListas() {
  const c = $('#listas-res');
  const L = S.listas[abierta];
  if (L) {
    c.innerHTML = `<button class="boton" data-lista-volver>${I('back')}Mis listas</button>
      <h2>${esc(L.nombre)}</h2><p class="nota">${L.canciones.length} canciones</p>
      <div class="acciones-lista">
        <button class="boton" data-reproducir="lista">${I('play')}Reproducir</button>
        <button class="boton" data-reproducir="lista" data-aleatorio>${I('shuffle')}Aleatorio</button>
        <button class="boton peligro" data-lista-borrar>${I('del')}Borrar lista</button>
      </div>
      ${L.canciones.length ? filas('lista', L.canciones, true) : '<div class="vacio">Esta lista está vacía. Añade canciones con el botón de lista que tiene cada canción.</div>'}`;
    return;
  }
  abierta = null;
  c.innerHTML = `<div class="acciones-lista"><button class="boton" data-lista-nueva>${I('add')}Nueva lista</button></div><div class="listas">`
    + (S.listas.map((L, i) => `<button class="lista-item" data-lista-abrir="${i}"><span class="cuadro">${I('lists')}</span><span class="txt"><b>${esc(L.nombre)}</b><small>${L.canciones.length} canciones</small></span></button>`).join('')
      || '<div class="vacio">Aún no tienes listas. Crea una con "Nueva lista" o desde el botón de lista de cualquier canción.</div>')
    + '</div>';
}
$('#listas-res').addEventListener('click', e => {
  const b = e.target.closest('[data-lista-abrir],[data-lista-volver],[data-lista-nueva],[data-lista-borrar]');
  if (!b) return;
  const d = b.dataset;
  if ('listaAbrir' in d) abierta = +d.listaAbrir;
  if ('listaVolver' in d) abierta = null;
  if ('listaNueva' in d) nuevaLista();
  if ('listaBorrar' in d && confirm(`¿Borrar la lista "${S.listas[abierta].nombre}"? Las canciones no se borran de tus favoritos.`)) {
    S.listas.splice(abierta, 1);
    abierta = null;
    guardar();
  }
  pintarListas();
});
function nuevaLista(t) {
  const nombre = prompt('Nombre de la nueva lista:')?.trim();
  if (!nombre) return;
  S.listas.push({ nombre, canciones: t ? [t] : [] });
  guardar();
  toast(t ? `Añadida a "${nombre}"` : `Lista "${nombre}" creada`);
  if (tabActual === 'listas') pintarListas();
}
function elegirLista(t) {
  const d = $('#dlg');
  d.innerHTML = `<h3>Añadir a una lista</h3>`
    + S.listas.map((L, i) => `<button class="opc" data-l="${i}">${esc(L.nombre)}<small>${L.canciones.length}</small></button>`).join('')
    + `<button class="opc" data-l="nueva">＋ Nueva lista</button><button class="opc cancelar" data-l="x">Cancelar</button>`;
  d.onclick = e => {
    const b = e.target.closest('[data-l]');
    if (!b) return;
    d.close();
    const v = b.dataset.l;
    if (v === 'nueva') return nuevaLista(t);
    const L = S.listas[+v];
    if (!L) return;
    if (L.canciones.some(c => c.id === t.id)) return toast('Ya estaba en esa lista');
    L.canciones.push(t);
    guardar();
    toast(`Añadida a "${L.nombre}"`);
  };
  d.showModal();
}
function quitarDeLista(t) {
  const L = S.listas[abierta];
  if (!L) return;
  L.canciones = L.canciones.filter(c => c.id !== t.id);
  guardar();
  pintarListas();
}

// ---------- me gusta / no me gusta ----------
function votarUI(t, v) {
  const r = votar(S.g, t, v);
  guardar();
  toast(r === 1 ? 'Me gusta: sonará más en tus mix' : r === -1 ? 'No me gusta: no volverá a sonar en tus mix' : 'Marca quitada');
  document.querySelectorAll(`.fila[data-id="${CSS.escape(t.id)}"]`).forEach(f => {
    f.querySelector('[data-a=si]').classList.toggle('on', r === 1);
    f.querySelector('[data-a=no]').classList.toggle('on', r === -1);
  });
  pintarVotoActual();
  if (r === -1 && cola[pos]?.id === t.id) siguiente();
  if (tabActual === 'favoritos') pintarFavoritos();
}

// ---------- reproductor ----------
let cola = [], pos = -1, colaOrig = null, mixC = null, mixPag = 0, fallos = 0, extendiendo = null;
const ms = 'mediaSession' in navigator ? navigator.mediaSession : null;

function tocar(lista, i, mixConsulta = null) {
  cola = lista.slice();
  pos = i;
  colaOrig = null;
  mixC = mixConsulta;
  mixPag = 0;
  if (S.alea) barajar();
  cargar();
}
function barajar() {
  if (!cola[pos]) return;
  const t = cola[pos];
  colaOrig = cola.slice();
  const resto = cola.filter((_, j) => j !== pos);
  for (let j = resto.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [resto[j], resto[k]] = [resto[k], resto[j]];
  }
  cola = [t, ...resto];
  pos = 0;
}
function cargar() {
  const t = cola[pos];
  if (!t) return;
  audio.src = t.url;
  audio.dataset.id = t.id;
  audio.play().catch(() => pintarPlay());
  metadatos(t);
  pintarReproductor();
  if (mixC && cola.length - pos <= 3) extenderMix(); // pide más canciones antes de que se acaben
}
function siguiente() {
  let j = pos + 1;
  while (j < cola.length && S.g.no[cola[j].id]) j++;
  if (j < cola.length) { pos = j; return cargar(); }
  if (S.rep === 'all' && cola.length) { pos = 0; return cargar(); }
  if (mixC) return extenderMix().then(() => pos < cola.length - 1 && siguiente());
  audio.pause();
  toast('Se terminó la cola');
}
function anterior() {
  if (audio.currentTime > 3 || pos <= 0) { audio.currentTime = 0; return; }
  pos--;
  cargar();
}
// El mix nunca se acaba: trae más canciones de tu filtro y, si ya no hay nuevas, repite las anteriores en otro orden.
function extenderMix() {
  extendiendo ||= armarMix({ ...mixC, pag: ++mixPag }, S.g)
    .catch(() => [])
    .then(nuevas => {
      const ya = new Set(cola.map(t => t.id));
      nuevas = nuevas.filter(t => !ya.has(t.id));
      if (!nuevas.length) { mixPag = 0; nuevas = mezclar(cola.slice(0, Math.max(1, cola.length - 5)), S.g); }
      cola.push(...nuevas);
      colaOrig?.push(...nuevas);
      pintarCola();
    })
    .finally(() => (extendiendo = null));
  return extendiendo;
}

audio.addEventListener('ended', () => { if (audio.dataset.id === cola[pos]?.id) siguiente(); });
audio.addEventListener('playing', () => { fallos = 0; });
audio.addEventListener('error', () => {
  if (!audio.dataset.id || audio.dataset.id !== cola[pos]?.id) return;
  if (++fallos > 4) { fallos = 0; pintarPlay(); return toast('Varias canciones no cargaron. Revisa tu conexión.'); }
  toast('Esta canción no cargó, paso a la siguiente');
  siguiente();
});
audio.addEventListener('play', () => { if (ms) ms.playbackState = 'playing'; pintarPlay(); posicion(); });
audio.addEventListener('pause', () => { if (ms) ms.playbackState = 'paused'; pintarPlay(); posicion(); });
audio.addEventListener('loadedmetadata', () => { posicion(); progreso(); });
audio.addEventListener('seeked', posicion);
audio.addEventListener('timeupdate', progreso);

// Controles en la notificación y en la pantalla de bloqueo
function metadatos(t) {
  if (!ms) return;
  ms.metadata = new MediaMetadata({
    title: t.title, artist: t.artist, album: t.album || FUENTES[t.src],
    artwork: [{ src: new URL(img(t.img), location.href).href, sizes: '512x512' }],
  });
}
function posicion() {
  if (!ms?.setPositionState || !isFinite(audio.duration) || !(audio.duration > 0)) return;
  try { ms.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate || 1 }); } catch {}
}
if (ms) {
  const acciones = {
    play: () => audio.play(),
    pause: () => audio.pause(),
    previoustrack: anterior,
    nexttrack: siguiente,
    seekto: d => { audio.currentTime = d.seekTime; posicion(); },
  };
  for (const [k, f] of Object.entries(acciones)) try { ms.setActionHandler(k, f); } catch {}
}

// En iPhone, el primer "play" tiene que nacer de un toque. Si antes hay que buscar en internet (el mix),
// se "despierta" el reproductor con un sonido mudo dentro del toque y luego ya puede sonar solo.
let despierto = false;
function desbloquear() {
  if (despierto || audio.src) return;
  despierto = true;
  const n = 800, b = new ArrayBuffer(44 + n), v = new DataView(b);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  new Uint8Array(b, 44).fill(128);
  audio.src = URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  audio.play().catch(() => {});
}

// ---------- pintar el reproductor ----------
function pintarReproductor() {
  const t = cola[pos];
  $('#mini').hidden = !t;
  if (!t) return;
  $('#m-img').src = $('#p-img').src = img(t.img);
  $('#m-tit').textContent = $('#p-tit').textContent = t.title;
  $('#m-art').textContent = t.artist;
  $('#p-art').textContent = t.artist + (t.year ? ' · ' + t.year : '');
  $('#p-fuente').textContent = 'Desde ' + FUENTES[t.src];
  document.title = `${t.title} · Mi Música`;
  pintarVotoActual();
  pintarPlay();
  pintarModos();
  pintarCola();
  document.querySelectorAll('.fila.sonando').forEach(f => f.classList.remove('sonando'));
  document.querySelectorAll(`.fila[data-id="${CSS.escape(t.id)}"]`).forEach(f => f.classList.add('sonando'));
}
function pintarVotoActual() {
  const t = cola[pos];
  if (!t) return;
  $('#m-si').classList.toggle('on', !!S.g.si[t.id]);
  $('#p-si').classList.toggle('on', !!S.g.si[t.id]);
  $('#p-no').classList.toggle('on', !!S.g.no[t.id]);
}
function pintarPlay() {
  const n = audio.paused ? 'play' : 'pause';
  $('#m-play').innerHTML = $('#p-play').innerHTML = I(n);
}
function pintarModos() {
  $('#p-alea').classList.toggle('on', S.alea);
  $('#p-rep').classList.toggle('on', S.rep !== 'off');
  $('#p-rep').innerHTML = I(S.rep === 'one' ? 'repeat1' : 'repeat');
  audio.loop = S.rep === 'one'; // repetir una: el navegador la repite sin pausa
}
function pintarCola() {
  if ($('#player').hidden) return;
  const resto = cola.slice(pos + 1, pos + 51);
  $('#cola').innerHTML = resto.length ? filas('cola', resto) : `<p class="nota">${mixC ? 'Buscando más canciones…' : 'No hay más canciones en la cola.'}</p>`;
}
let arrastrando = false;
function progreso() {
  const d = audio.duration, c = audio.currentTime;
  const f = isFinite(d) && d > 0 ? c / d : 0;
  $('#m-prog').value = f;
  if (arrastrando || $('#player').hidden) return;
  $('#barra').value = f * 1000;
  $('#t-act').textContent = mmss(c);
  $('#t-tot').textContent = mmss(isFinite(d) ? d : cola[pos]?.dur);
}
$('#barra').addEventListener('input', e => {
  arrastrando = true;
  $('#t-act').textContent = mmss((e.target.value / 1000) * (audio.duration || 0));
});
$('#barra').addEventListener('change', e => {
  if (isFinite(audio.duration)) audio.currentTime = (e.target.value / 1000) * audio.duration;
  arrastrando = false;
});

const alternar = () => { if (cola[pos]) audio.paused ? audio.play().catch(() => {}) : audio.pause(); };
$('#m-play').onclick = $('#p-play').onclick = alternar;
$('#m-sig').onclick = $('#p-sig').onclick = siguiente;
$('#p-ant').onclick = anterior;
$('#m-abrir').onclick = $('#m-img').onclick = () => abrir('player');
$('#m-si').onclick = $('#p-si').onclick = () => cola[pos] && votarUI(cola[pos], 1);
$('#p-no').onclick = () => cola[pos] && votarUI(cola[pos], -1);
$('#p-lista').onclick = () => cola[pos] && elegirLista(cola[pos]);
$('#p-alea').onclick = () => {
  S.alea = !S.alea;
  guardar();
  if (S.alea) barajar();
  else if (colaOrig) { const t = cola[pos]; cola = colaOrig; colaOrig = null; pos = cola.indexOf(t); }
  pintarModos();
  pintarCola();
  toast(S.alea ? 'Aleatorio activado' : 'Aleatorio desactivado');
};
$('#p-rep').onclick = () => {
  S.rep = { off: 'all', all: 'one', one: 'off' }[S.rep] || 'off';
  guardar();
  pintarModos();
  toast({ off: 'Repetir desactivado', all: 'Repetir toda la cola', one: 'Repetir esta canción' }[S.rep]);
};

// ---------- ajustes ----------
$('#guardar-clave').onclick = async () => {
  const k = $('#clave').value.trim();
  const e = $('#estado-clave');
  if (k) {
    e.textContent = 'Probando la clave…';
    const ok = await probarJamendo(k).catch(() => false);
    if (!ok) { e.textContent = 'Esa clave no funcionó. Revisa que copiaste el "Client ID" completo.'; return; }
  }
  S.clave = k;
  guardar();
  pintarFiltros();
  e.textContent = clave() ? 'Jamendo está activo ✓' : 'Clave borrada: Jamendo desactivado.';
  ptClave = '';
  recargar();
};
$('#borrar-gustos').onclick = () => {
  if (!confirm('Se borrarán tus favoritos y todo lo que marcaste con me gusta o no me gusta. Tus listas se quedan. ¿Seguro?')) return;
  S.g = gustosVacios();
  guardar();
  toast('Gustos borrados');
};

// ---------- instalar (Android muestra su propio aviso) ----------
let aviso;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); aviso = e; $('#instalar').hidden = false; });
addEventListener('appinstalled', () => ($('#instalar').hidden = true));
$('#instalar').onclick = () => { $('#instalar').hidden = true; aviso?.prompt(); };

// ---------- arranque ----------
pintarFiltros();
pintarModos();
recargar();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
