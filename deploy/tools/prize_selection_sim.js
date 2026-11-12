#!/usr/bin/env node
/**
 * Simulación del sorteo de premios (sin base de datos): compara la lógica ANTERIOR con la nueva usando la
 * configuración real de Autos (pesos, stock y límites diarios).
 *   node deploy/tools/prize_selection_sim.js
 */
const { selectWeightedPrize, quitoDayStartUtc } = require('../../api/src/services/rouletteLogic');

// Lógica anterior (copia fiel) para demostrar el defecto
function legacy(prizes, today = {}) {
  const eligible = prizes.filter((p) => {
    if (p.active !== undefined && !p.active) return false;
    if (p.stock !== undefined && Number(p.stock) <= 0) return false;
    if (Number(p.max_daily_wins) > 0 && (today[p.id] || 0) >= Number(p.max_daily_wins)) return false;
    return (Number(p.weight) || 0) > 0;
  });
  if (eligible.length === 0) return prizes.find((p) => (p.active === undefined || p.active) && (p.stock === undefined || Number(p.stock) > 0)) || prizes[0];
  const total = eligible.reduce((s, p) => s + (Number(p.weight) || 1), 0);
  let r = Math.random() * total;
  for (const p of eligible) { const w = Number(p.weight) || 1; if (r < w) return p; r -= w; }
  return eligible[0];
}

const base = () => [
  { id: 3, name: 'Visado EEUU', weight: 1, stock: 0, max_daily_wins: 10, active: 1 },
  { id: 4, name: 'Bono $200', weight: 10, stock: 52, max_daily_wins: 5, active: 1 },
  { id: 5, name: 'Maleta', weight: 10, stock: 21, max_daily_wins: 3, active: 1 },
  { id: 6, name: 'Segundo destino', weight: 10, stock: 7, max_daily_wins: 2, active: 1 },
  { id: 7, name: 'Tonsupa', weight: 10, stock: 3, max_daily_wins: 1, active: 1 },
  { id: 8, name: 'Kit viajero', weight: 10, stock: 0, max_daily_wins: 1, active: 1 }
];

function simulate(fn, spins = 60) {
  const prizes = base(); const today = {}; const out = [];
  for (let i = 0; i < spins; i++) {
    const w = fn(prizes, today);
    out.push(w.id);
    today[w.id] = (today[w.id] || 0) + 1;
    const p = prizes.find((x) => x.id === w.id); if (p.stock > 0) p.stock -= 1;
  }
  return out;
}
const names = Object.fromEntries(base().map((p) => [p.id, p.name]));
const tally = (arr) => arr.reduce((a, id) => { a[names[id]] = (a[names[id]] || 0) + 1; return a; }, {});
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };

const old = simulate(legacy, 60);
const neu = simulate(selectWeightedPrize, 60);
console.log('ANTES, 60 giros en un día  :', JSON.stringify(tally(old)));
console.log('AHORA, 60 giros en un día  :', JSON.stringify(tally(neu)));
console.log('ANTES, giros 20-60         :', JSON.stringify(tally(old.slice(19))));
console.log('AHORA, giros 20-60         :', JSON.stringify(tally(neu.slice(19))));

const topShare = (arr) => { const c = {}; arr.forEach((id) => { c[id] = (c[id] || 0) + 1; }); return Math.max(...Object.values(c)) / arr.length; };
const shareOld = topShare(old.slice(19)); const shareNew = topShare(neu.slice(19));
check('Defecto reproducido: con la lógica anterior, un solo premio acapara casi todos los giros del resto del día', shareOld >= 0.9, `${(shareOld * 100).toFixed(0)} % del mismo premio`);
check('Lógica nueva: el reparto del resto del día es mucho más parejo', shareNew < 0.7 && shareNew < shareOld, `${(shareNew * 100).toFixed(0)} % el más frecuente`);

// Distribución con límites agotados y mucho stock: debe respetar los pesos (~ iguales, 10/10/10/10)
const pr = base().map((p) => ({ ...p, stock: 100000 }));
const today = { 3: 99, 4: 99, 5: 99, 6: 99, 7: 99, 8: 99 };
const counts = {}; const N = 40000;
for (let i = 0; i < N; i++) { const w = selectWeightedPrize(pr, today); counts[w.id] = (counts[w.id] || 0) + 1; }
const total = pr.reduce((s, p) => s + p.weight, 0);
const maxDev = Math.max(...pr.map((p) => Math.abs((counts[p.id] || 0) / N - p.weight / total)));
check('Con límites agotados el sorteo respeta los pesos (desvío < 1 punto)', maxDev < 0.01, `desvío máx ${(maxDev * 100).toFixed(2)} pts`);

// Sin límites alcanzados se comporta como antes: nunca sale premio sin stock
let bad = 0; for (let i = 0; i < 5000; i++) { const w = selectWeightedPrize(base(), {}); if (w.stock <= 0) bad++; }
check('Nunca entrega un premio sin stock mientras haya otros con stock', bad === 0);

// Respeta el límite diario mientras haya premios por debajo de su límite
const p2 = base().map((p) => ({ ...p, stock: 100 }));
let over = 0; for (let i = 0; i < 5000; i++) { const w = selectWeightedPrize(p2, { 4: 5, 5: 0, 6: 0, 7: 0, 3: 0, 8: 0 }); if (w.id === 4) over++; }
check('Respeta el límite diario mientras existan otros premios disponibles', over === 0);

// Sin stock en nada
const none = base().map((p) => ({ ...p, stock: 0 }));
check('Sin stock en ningún premio no lanza error', Boolean(selectWeightedPrize(none, {})));
// Peso 0 en todos los que tienen stock: parejo
const z = base().map((p) => ({ ...p, stock: 5, weight: 0 })); const seen = new Set();
for (let i = 0; i < 300; i++) seen.add(selectWeightedPrize(z, {}).id);
check('Todos con peso 0: sortea parejo entre los que tienen stock', seen.size >= 4, `${seen.size} premios distintos`);

// Día de Quito
check('Inicio del día en Quito (UTC-5): 12-nov 02:00 UTC -> día 11 empieza 11-nov 05:00 UTC', quitoDayStartUtc(new Date('2026-11-12T02:00:00Z')) === '2026-11-11 05:00:00', quitoDayStartUtc(new Date('2026-11-12T02:00:00Z')));
check('Inicio del día en Quito: 12-nov 05:00 UTC -> 12-nov 05:00 UTC', quitoDayStartUtc(new Date('2026-11-12T05:00:00Z')) === '2026-11-12 05:00:00');
check('Inicio del día en Quito: 12-nov 04:59 UTC -> 11-nov 05:00 UTC', quitoDayStartUtc(new Date('2026-11-12T04:59:00Z')) === '2026-11-11 05:00:00');

console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
process.exit(results.every(Boolean) ? 0 : 1);
