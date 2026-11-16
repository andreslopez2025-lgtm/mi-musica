// musica.js — fuentes de música (Jamendo, Audius, Internet Archive) y lógica de gustos.
// No toca la pantalla: así se puede probar solo con `node prueba.mjs`.

export const APP = 'MiMusicaPersonal';
const JM = 'https://api.jamendo.com/v3.0';
const AU = 'https://api.audius.co/v1';
const IA = 'https://archive.org';
const ANIO = new Date().getFullYear();
const MAX_SEG = 15 * 60; // ponytail: descarta pistas de más de 15 min (mixes de DJ), súbelo si quieres sesiones largas

// Cada género sabe cómo pedirse a cada fuente.
// jm: parámetros de Jamendo · au: géneros/ánimos de Audius · ia: temas de Internet Archive
export const GENEROS = [
  { id: 'pop', nombre: 'Pop', jm: { tags: 'pop' }, au: { genre: ['Pop'] }, ia: 'pop' },
  { id: 'rock', nombre: 'Rock', jm: { tags: 'rock' }, au: { genre: ['Rock', 'Alternative'] }, ia: 'rock' },
  { id: 'salsa', nombre: 'Salsa', jm: { tags: 'salsa' }, au: { genre: ['Latin'], query: 'salsa' }, ia: 'salsa' },
  { id: 'latina', nombre: 'Latina', jm: { fuzzytags: 'latin reggaeton cumbia bachata' }, au: { genre: ['Latin'] }, ia: 'latin OR latino OR cumbia OR bolero OR tango' },
  { id: 'romantica', nombre: 'Romántica', jm: { fuzzytags: 'love romantic ballad' }, au: { mood: ['Romantic', 'Sentimental', 'Tender'] }, ia: 'love OR romantic OR bolero OR ballad' },
  { id: 'electronica', nombre: 'Electrónica', jm: { tags: 'electronic' }, au: { genre: ['Electronic', 'House', 'Techno', 'Trance'] }, ia: 'electronic OR electronica OR techno' },
  { id: 'bailable', nombre: 'Bailable', jm: { fuzzytags: 'dance disco house', speed: 'high veryhigh' }, au: { genre: ['House', 'Dancehall', 'Disco', 'Electronic', 'Latin', 'Pop'], mood: ['Energizing', 'Upbeat', 'Excited'] }, ia: 'dance OR disco OR swing OR foxtrot' },
  { id: 'relajante', nombre: 'Relajante', jm: { fuzzytags: 'relaxation chillout lounge ambient', speed: 'verylow low' }, au: { mood: ['Peaceful', 'Easygoing', 'Tender'] }, ia: 'relaxing OR relax OR ambient OR meditation OR chillout' },
  { id: 'instrumental', nombre: 'Instrumental', jm: { vocalinstrumental: 'instrumental' }, au: { genre: ['Soundtrack', 'Ambient', 'Classical', 'Lo-Fi'] }, ia: 'instrumental' },
  { id: 'hiphop', nombre: 'Hip hop', jm: { tags: 'hiphop' }, au: { genre: ['Hip-Hop/Rap'] }, ia: '"hip hop" OR hiphop OR rap' },
  { id: 'reggae', nombre: 'Reggae', jm: { tags: 'reggae' }, au: { genre: ['Reggae', 'Dancehall'] }, ia: 'reggae OR ska' },
  { id: 'jazz', nombre: 'Jazz', jm: { tags: 'jazz' }, au: { genre: ['Jazz'] }, ia: 'jazz' },
  { id: 'blues', nombre: 'Blues', jm: { tags: 'blues' }, au: { genre: ['Blues'] }, ia: 'blues' },
  { id: 'clasica', nombre: 'Clásica', jm: { tags: 'classical' }, au: { genre: ['Classical'] }, ia: 'classical OR symphony OR opera' },
  { id: 'folk', nombre: 'Folk', jm: { tags: 'folk' }, au: { genre: ['Folk', 'Acoustic', 'Country'] }, ia: 'folk OR country' },
  { id: 'metal', nombre: 'Metal', jm: { tags: 'metal' }, au: { genre: ['Metal'] }, ia: 'metal' },
  { id: 'lofi', nombre: 'Lo-fi', jm: { fuzzytags: 'lofi chillhop' }, au: { genre: ['Lo-Fi'] }, ia: 'lofi OR "lo-fi"' },
];
const genero = id => GENEROS.find(g => g.id === id);

// Géneros que entiende Audius (para convertir tus gustos en filtros de Audius)
const AU_GEN = new Map(['Electronic', 'Rock', 'Metal', 'Alternative', 'Hip-Hop/Rap', 'Punk', 'Folk', 'Pop', 'Ambient', 'Soundtrack', 'World', 'Jazz', 'Acoustic', 'Funk', 'R&B/Soul', 'Classical', 'Reggae', 'Country', 'Blues', 'Latin', 'Lo-Fi', 'Dancehall', 'Techno', 'Trap', 'House', 'Disco', 'Trance', 'Downtempo', 'Drum & Bass', 'Dubstep'].map(g => [norm(g), g]));

export function norm(s) { return String(s || '').trim().toLowerCase(); }

// ---------- red ----------
const cache = new Map();
function getJSON(url) {
  if (!cache.has(url)) {
    cache.set(url, fetch(url, { signal: AbortSignal.timeout?.(15000) })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(e => { cache.delete(url); throw e; }));
  }
  return cache.get(url);
}
const azar = a => a[Math.floor(Math.random() * a.length)];

// ---------- Jamendo ----------
async function jamendo(c) {
  if (!c.clave) return [];
  const g = genero(c.genero);
  const orden = c.modo === 'top' ? 'popularity_total' : c.modo === 'mix' ? azar(['popularity_total', 'popularity_month', 'listens_month', 'downloads_total']) : 'popularity_month';
  const p = new URLSearchParams({
    client_id: c.clave, format: 'json', limit: c.n, offset: c.n * (c.pag || 0), order: orden,
    audioformat: 'mp32', include: 'musicinfo', imagesize: '300', type: 'single albumtrack',
  });
  if (g) for (const [k, v] of Object.entries(g.jm)) p.set(k, v);
  if (c.etiquetas?.length) p.set('fuzzytags', [p.get('fuzzytags'), ...c.etiquetas.map(t => t.replace(/[^a-z0-9]/g, ''))].filter(Boolean).join(' '));
  if (c.desde || c.hasta) p.set('datebetween', `${c.desde || 1900}-01-01_${c.hasta || ANIO}-12-31`);
  if (c.artista) p.set('artist_name', c.artista);
  const j = await getJSON(`${JM}/tracks/?${p}`);
  if (j.headers?.status !== 'success') throw new Error('Jamendo: ' + (j.headers?.error_message || 'error'));
  return j.results.filter(r => r.audio).map(r => ({
    id: 'jm' + r.id, src: 'jm', title: r.name, artist: r.artist_name, album: r.album_name || '',
    img: r.image || r.album_image || '', url: r.audio, dur: +r.duration || 0,
    year: parseInt(r.releasedate) || null,
    genres: (r.musicinfo?.tags?.genres || []).map(norm),
    tags: (r.musicinfo?.tags?.vartags || []).map(norm),
  }));
}

// ---------- Audius ----------
async function audius(c) {
  const g = genero(c.genero);
  const p = new URLSearchParams({
    app_name: APP, limit: c.n, offset: c.n * (c.pag || 0),
    sort_method: c.modo === 'top' ? 'popular' : c.modo === 'mix' ? azar(['popular', 'relevant']) : 'relevant',
    query: [c.artista, g?.au.query].filter(Boolean).join(' '),
  });
  const generos = g ? g.au.genre || [] : (c.etiquetas || []).map(t => AU_GEN.get(t)).filter(Boolean);
  generos.forEach(x => p.append('genre', x));
  (g?.au.mood || []).forEach(x => p.append('mood', x));
  const j = await getJSON(`${AU}/tracks/search?${p}`);
  const art = norm(c.artista);
  return (j.data || [])
    .filter(r => !r.is_stream_gated && r.is_streamable !== false && !r.is_delete && r.is_available !== false)
    .map(r => ({
      id: 'au' + r.id, src: 'au', title: r.title, artist: r.user?.name || '', album: '',
      img: r.artwork?.['480x480'] || r.artwork?.['150x150'] || '',
      url: `${AU}/tracks/${r.id}/stream?app_name=${APP}`, dur: r.duration || 0,
      year: parseInt(r.release_date || r.created_at) || null,
      genres: [norm(r.genre)].filter(Boolean),
      tags: [r.mood, ...String(r.tags || '').split(',')].map(norm).filter(Boolean),
    }))
    // Audius busca el texto en todo; si filtras por artista, deja solo ese artista
    .filter(t => !art || norm(t.artist).includes(art));
}

// ---------- Internet Archive (solo licencias Creative Commons o dominio público) ----------
// Solo "netlabels" (sellos con licencia libre) y "78rpm" (discos antiguos). Las colecciones de subida
// libre (audio_music, opensource_audio) traían música comercial mal etiquetada como libre.
const IA_BASE = 'mediatype:audio AND collection:(netlabels OR 78rpm)'
  + ' AND (licenseurl:*creativecommons* OR licenseurl:*publicdomain*)'
  + ' AND -subject:(podcast OR audiobook OR librivox OR sermon OR radio OR spoken)';
const comillas = s => `"${String(s).replace(/["\\]/g, '')}"`;
const lista = x => (Array.isArray(x) ? x : x ? [x] : []);
export const segundos = s => String(s || '').split(':').reduce((a, x) => a * 60 + (parseFloat(x) || 0), 0) | 0;

async function archivo(c) {
  const g = genero(c.genero);
  const q = [IA_BASE];
  if (g) q.push(`subject:(${g.ia})`);
  if (c.etiquetas?.length) q.push(`subject:(${c.etiquetas.map(comillas).join(' OR ')})`);
  if (c.desde || c.hasta) q.push(`year:[${c.desde || 1000} TO ${c.hasta || 3000}]`);
  if (c.artista) q.push(`creator:(${comillas(c.artista)})`);
  const items = Math.max(3, Math.ceil(c.n / 3));
  const u = new URL(IA + '/advancedsearch.php');
  u.searchParams.set('q', q.join(' AND '));
  ['identifier', 'title', 'creator', 'year', 'subject'].forEach(f => u.searchParams.append('fl[]', f));
  u.searchParams.set('sort[]', c.modo === 'top' ? 'downloads desc' : c.modo === 'mix' ? azar(['downloads desc', 'week desc', 'avg_rating desc']) : 'week desc');
  u.searchParams.set('rows', items);
  u.searchParams.set('page', (c.pag || 0) + 1);
  u.searchParams.set('output', 'json');
  const j = await getJSON(u.href);
  const docs = j.response?.docs || [];
  const grupos = await Promise.allSettled(docs.map(pistasIA));
  return grupos.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
}

// Un "item" del Archive puede ser un álbum: tomamos hasta 3 canciones mp3 de cada uno.
async function pistasIA(d) {
  const j = await getJSON(`${IA}/metadata/${encodeURIComponent(d.identifier)}/files`);
  const mp3 = (j.result || [])
    .filter(f => /mp3/i.test(f.format || '') && !/zip/i.test(f.format) && !/_64kb/i.test(f.name))
    .sort((a, b) => (a.format === 'VBR MP3' ? 0 : 1) - (b.format === 'VBR MP3' ? 0 : 1));
  const vistos = new Set(), out = [];
  for (const f of mp3) {
    const title = f.title || f.name.replace(/^.*\//, '').replace(/\.mp3$/i, '').replace(/[_]+/g, ' ');
    if (vistos.has(title)) continue;
    vistos.add(title);
    out.push({
      id: 'ia' + d.identifier + '/' + f.name, src: 'ia', title,
      artist: f.creator || lista(d.creator)[0] || 'Artista desconocido', album: lista(d.title)[0] || '',
      img: `${IA}/services/img/${encodeURIComponent(d.identifier)}`,
      url: `${IA}/download/${encodeURIComponent(d.identifier)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
      dur: segundos(f.length), year: parseInt(lista(d.year)[0]) || null, genres: [],
      tags: lista(d.subject).flatMap(s => String(s).split(/[;,]/)).map(norm).filter(Boolean).slice(0, 8),
    });
    if (out.length >= 3) break;
  }
  return out;
}

// ---------- búsqueda combinada ----------
export const FUENTES = { jm: 'Jamendo', au: 'Audius', ia: 'Internet Archive' };

function intercalar(listas) {
  const out = [];
  for (let i = 0; listas.some(l => i < l.length); i++) for (const l of listas) if (i < l.length) out.push(l[i]);
  return out;
}
export function unicos(canciones) {
  const vistos = new Set();
  return canciones.filter(t => {
    const k = norm(t.artist) + '|' + norm(t.title);
    if (vistos.has(t.id) || vistos.has(k)) return false;
    vistos.add(t.id); vistos.add(k);
    return true;
  });
}
const valida = c => t => t.url && (!t.dur || t.dur <= MAX_SEG)
  && (!c.desde || (t.year && t.year >= c.desde)) && (!c.hasta || (t.year && t.year <= c.hasta));

// c = { genero, desde, hasta, artista, clave, modo: 'top'|'variado'|'mix', n, pag, etiquetas }
// alAvanzar(canciones) se llama cada vez que responde una fuente, para mostrar algo sin esperar a la más lenta.
export async function buscar(c, alAvanzar) {
  const listas = [[], [], []], errores = [];
  await Promise.all([jamendo, audius, archivo].map((f, i) => f(c).then(
    r => { listas[i] = r.filter(valida(c)); },
    () => { errores.push(Object.values(FUENTES)[i]); },
  ).then(() => alAvanzar?.(unicos(intercalar(listas))))));
  return { canciones: unicos(intercalar(listas)), errores };
}

export async function probarJamendo(clave) {
  const j = await getJSON(`${JM}/tracks/?client_id=${encodeURIComponent(clave)}&format=json&limit=1`);
  return j.headers?.status === 'success';
}

export async function sugerirArtistas(texto, clave) {
  if (norm(texto).length < 2) return [];
  const t = encodeURIComponent(texto);
  const rs = await Promise.allSettled([
    clave ? getJSON(`${JM}/autocomplete/?client_id=${clave}&format=json&entity=artists&limit=8&prefix=${t}`)
      .then(j => (j.results?.artists || []).map(a => a.name ?? a)) : [],
    getJSON(`${AU}/users/search?query=${t}&limit=8&app_name=${APP}`)
      .then(j => (j.data || []).filter(u => u.track_count > 0).sort((a, b) => b.follower_count - a.follower_count).map(u => u.name)),
  ]);
  // Audius devuelve nombres "parecidos" que a veces no tienen nada que ver: deja solo los que contienen lo escrito
  const q = norm(texto);
  const nombres = rs.flatMap(r => (r.status === 'fulfilled' ? r.value : [])).filter(n => norm(n).includes(q));
  nombres.sort((a, b) => !norm(a).startsWith(q) - !norm(b).startsWith(q));
  return [...new Map(nombres.map(n => [norm(n), n])).values()].slice(0, 10);
}

// ---------- gustos ----------
// g = { si: {id: canción}, no: {id: 1}, art: {artista: puntos}, gen: {género: puntos}, tag: {etiqueta: puntos} }
export const gustosVacios = () => ({ si: {}, no: {}, art: {}, gen: {}, tag: {} });

function ajustar(g, t, d) {
  if (!d) return;
  const sumar = (m, k) => { if (!k) return; m[k] = (m[k] || 0) + d; if (!m[k]) delete m[k]; };
  sumar(g.art, t.artist);
  t.genres.forEach(x => sumar(g.gen, x));
  t.tags.forEach(x => sumar(g.tag, x));
}

// v: 1 = me gusta, -1 = no me gusta. Tocar el mismo botón otra vez lo quita. Devuelve el estado final.
export function votar(g, t, v) {
  const antes = g.si[t.id] ? 1 : g.no[t.id] ? -1 : 0;
  if (antes === v) v = 0;
  ajustar(g, t, -antes);
  delete g.si[t.id];
  delete g.no[t.id];
  if (v === 1) g.si[t.id] = t;
  if (v === -1) g.no[t.id] = 1;
  ajustar(g, t, v);
  return v;
}

// Cuánto te debería gustar una canción. -Infinity = nunca ponerla.
export function puntaje(g, t) {
  if (g.no[t.id]) return -Infinity;
  const a = g.art[t.artist] || 0;
  if (a <= -2) return -Infinity; // dos "no me gusta" a un artista sin ningún "me gusta" = artista vetado
  let s = 2 * a;
  for (const x of t.genres) s += g.gen[x] || 0;
  for (const x of t.tags) s += 0.5 * (g.tag[x] || 0);
  return s;
}

const mejores = (m, n) => Object.entries(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
export const etiquetasFavoritas = (g, n) => [...new Set([...mejores(g.gen, n), ...mejores(g.tag, n)])].slice(0, n);

// Orden aleatorio con peso: lo que más te gusta tiende a salir antes y más seguido; lo vetado no sale.
export function mezclar(canciones, g) {
  return canciones
    .map(t => [t, puntaje(g, t)])
    .filter(([, s]) => s > -Infinity)
    .map(([t, s]) => [t, Math.random() ** (1 / Math.max(0.3, 1 + s))])
    .sort((x, y) => y[1] - x[1])
    .map(([t]) => t);
}

export async function mix(c, g) {
  const fav = etiquetasFavoritas(g, 4);
  const [a, b] = await Promise.all([
    buscar({ ...c, modo: 'mix', n: 30 }),
    fav.length ? buscar({ ...c, modo: 'mix', n: 15, etiquetas: fav }) : { canciones: [] },
  ]);
  return mezclar(unicos([...a.canciones, ...b.canciones]), g);
}

// Recomendaciones: más de tus artistas, géneros y etiquetas favoritas, dentro del filtro activo.
export async function paraTi(c, g) {
  const artistas = mejores(g.art, 3), fav = etiquetasFavoritas(g, 5);
  if (!artistas.length && !fav.length) return null;
  const consultas = [
    ...(fav.length ? [{ ...c, modo: 'variado', n: 24, etiquetas: fav }] : []),
    ...artistas.map(a => ({ ...c, modo: 'top', n: 8, artista: a })),
  ];
  const rs = await Promise.all(consultas.map(q => buscar(q)));
  return unicos(rs.flatMap(r => r.canciones))
    .filter(t => !g.si[t.id])
    .map(t => [t, puntaje(g, t) + Math.random()])
    .filter(([, s]) => s > -Infinity)
    .sort((x, y) => y[1] - x[1])
    .map(([t]) => t);
}
