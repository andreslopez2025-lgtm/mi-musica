// Prueba rápida: node prueba.mjs [CLAVE_JAMENDO]
import assert from 'node:assert';
import { buscar, votar, puntaje, mezclar, gustosVacios, segundos, sugerirArtistas, paraTi, mix } from './musica.js';

// --- lógica de gustos (sin internet) ---
const g = gustosVacios();
const a = { id: 'x1', artist: 'Ana', genres: ['salsa'], tags: ['happy'] };
const b = { id: 'x2', artist: 'Beto', genres: ['rock'], tags: [] };
assert.equal(votar(g, a, 1), 1);
assert.equal(g.art.Ana, 1);
assert.equal(votar(g, a, 1), 0, 'tocar otra vez quita el me gusta');
assert.deepEqual(g.art, {});
votar(g, a, 1); votar(g, a, -1);
assert.equal(g.art.Ana, -1, 'cambiar a no me gusta resta');
assert.equal(puntaje(g, a), -Infinity, 'lo marcado con no me gusta nunca sale');
assert.ok(!mezclar([a, b], g).includes(a));
votar(g, { ...b, id: 'x3' }, 1);
assert.ok(puntaje(g, { id: 'x4', artist: 'Beto', genres: ['rock'], tags: [] }) > 0);
assert.equal(segundos('04:02'), 242);
assert.equal(segundos('242.66'), 242);
assert.equal(segundos('1:00:01'), 3601);
console.log('✓ lógica de gustos');

// --- fuentes en vivo ---
const clave = process.argv[2] || '';
const base = { genero: null, desde: null, hasta: null, artista: '', clave, modo: 'variado', n: 12, pag: 0 };
const ver = async (nombre, c) => {
  const t0 = Date.now();
  const r = await buscar({ ...base, ...c });
  const por = r.canciones.reduce((m, t) => ((m[t.src] = (m[t.src] || 0) + 1), m), {});
  console.log(`${nombre.padEnd(28)} ${String(r.canciones.length).padStart(3)} canciones ${JSON.stringify(por)} errores:${r.errores.join(',') || '-'} ${Date.now() - t0}ms`);
  r.canciones.slice(0, 3).forEach(t => console.log('     ·', t.title, '—', t.artist, t.year || '', t.src));
  return r;
};
await ver('sin filtros', {});
await ver('salsa', { genero: 'salsa' });
await ver('rock 2010-2020 top', { genero: 'rock', desde: 2010, hasta: 2020, modo: 'top' });
await ver('jazz años 20-40', { genero: 'jazz', desde: 1920, hasta: 1949 });
await ver('relajante', { genero: 'relajante' });
await ver('bailable', { genero: 'bailable' });
await ver('instrumental top', { genero: 'instrumental', modo: 'top' });
await ver('romántica', { genero: 'romantica' });
await ver('imposible (metal 1925)', { genero: 'metal', desde: 1925, hasta: 1925 });
console.log('sugerencias "sk":', await sugerirArtistas('sk', clave));
const m = await mix({ ...base, genero: 'electronica' }, g);
console.log('mix electrónica:', m.length, 'canciones');
votar(g, m[0], 1);
const pt = await paraTi(base, g);
console.log('para ti tras 1 me gusta:', pt?.length, pt?.slice(0, 3).map(t => t.title + ' — ' + t.artist));
