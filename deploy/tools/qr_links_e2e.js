#!/usr/bin/env node
/**
 * Pruebas de los QR dinámicos (redirección 302, conteo de escaneos, administración). SOLO LOCAL.
 * Requisitos: API :5500 en desarrollo (PIN por defecto VIP2026). Crea y borra sus propios QR de prueba.
 *   node deploy/tools/qr_links_e2e.js
 */
const API = 'http://localhost:5500';
const PIN = process.env.ADMIN_PIN || 'VIP2026';
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const H = { 'Content-Type': 'application/json', 'x-admin-pin': PIN };
const api = (method, path, body, headers = H) => fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json().then((j) => ({ status: r.status, body: j })));
const hit = (slug, ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', method = 'GET') =>
  fetch(`${API}/api/q/${slug}`, { method, redirect: 'manual', headers: { 'User-Agent': ua } });
const find = async (id) => (await api('GET', '/api/admin/qr')).body.data.find((x) => x.id === id);

(async () => {
  const A = 'https://autos.mvevip.com/?screen=AMB_STAND';
  const B = 'https://autos.mvevip.com/?screen=RIO_STAND';

  let r = await api('GET', '/api/admin/qr', null, { 'Content-Type': 'application/json' });
  check('Sin PIN no se puede listar (401)', r.status === 401);
  r = await api('POST', '/api/admin/qr', { name: 'x', target_url: A }, { 'Content-Type': 'application/json' });
  check('Sin PIN no se puede crear (401)', r.status === 401);

  r = await api('POST', '/api/admin/qr', { name: 'E2E QR de prueba', target_url: A });
  check('Crear QR con enlace corto automático', r.body.success && /^[a-z0-9-]{3,40}$/.test(r.body.slug), r.body.slug);
  const { id, slug } = r.body;

  r = await api('POST', '/api/admin/qr', { name: 'dup', target_url: A, slug });
  check('Enlace corto repetido -> 409', r.status === 409);
  r = await api('POST', '/api/admin/qr', { name: 'mal', target_url: 'http://insegura.com' });
  check('Destino http:// rechazado (400)', r.status === 400);
  r = await api('POST', '/api/admin/qr', { name: 'mal', target_url: 'javascript:alert(1)' });
  check('Destino javascript: rechazado (400)', r.status === 400);
  r = await api('POST', '/api/admin/qr', { name: 'bucle', target_url: 'https://autos.mvevip.com/api/q/otro' });
  check('Destino que es otro QR dinámico rechazado (sin bucles)', r.status === 400);
  r = await api('POST', '/api/admin/qr', { name: 'slug', target_url: A, slug: 'AB' });
  check('Enlace corto inválido rechazado (400)', r.status === 400);
  r = await api('POST', '/api/admin/qr', { name: '', target_url: A });
  check('Nombre vacío rechazado (400)', r.status === 400);

  // Redirección
  let t0 = Date.now();
  let h = await hit(slug);
  const ms = Date.now() - t0;
  check('GET /api/q/<slug> responde 302 al destino', h.status === 302 && h.headers.get('location') === A, `${h.status} ${h.headers.get('location')}`);
  check('Respuesta sin caché (cambio inmediato)', /no-store/.test(h.headers.get('cache-control') || ''));
  check('Redirección rápida (< 500 ms en local)', ms < 500, `${ms} ms`);
  await hit(slug); await hit(slug);
  let it = await find(id);
  check('3 escaneos contados (hoy, 7 días y total)', it.scans_today === 3 && it.scans_7d === 3 && it.scans_total === 3, `${it.scans_today}/${it.scans_7d}/${it.scans_total}`);

  // No cuentan: HEAD, bots y vistas previas
  await hit(slug, 'Mozilla/5.0', 'HEAD');
  await hit(slug, 'WhatsApp/2.23.20 A');
  await hit(slug, 'facebookexternalhit/1.1');
  await hit(slug, 'Googlebot/2.1');
  it = await find(id);
  check('HEAD, vistas previas de WhatsApp/Facebook y bots NO suman', it.scans_total === 3, String(it.scans_total));
  h = await hit(slug, 'WhatsApp/2.23.20 A');
  check('...pero igual redirigen (302)', h.status === 302 && h.headers.get('location') === A);

  // Cambiar el destino: efecto inmediato
  r = await api('PUT', `/api/admin/qr/${id}`, { target_url: B });
  check('Cambiar el destino', r.body.success);
  h = await hit(slug);
  check('El MISMO enlace ahora lleva al nuevo destino (inmediato)', h.status === 302 && h.headers.get('location') === B, h.headers.get('location'));
  it = await find(id);
  check('El conteo se conserva al cambiar el destino', it.scans_total === 4, String(it.scans_total));

  // Desactivar
  r = await api('PUT', `/api/admin/qr/${id}`, { active: false });
  h = await hit(slug);
  check('QR desactivado manda al inicio (302 a /)', h.status === 302 && h.headers.get('location') === '/', h.headers.get('location'));
  it = await find(id);
  check('Un QR desactivado no cuenta escaneos', it.scans_total === 4);
  await api('PUT', `/api/admin/qr/${id}`, { active: true });
  h = await hit(slug);
  check('Reactivado vuelve a redirigir', h.headers.get('location') === B);

  // Inexistente / slug raro
  h = await hit('no-existe-jamas');
  check('Enlace inexistente manda al inicio (nunca error)', h.status === 302 && h.headers.get('location') === '/');
  h = await hit("x';drop");
  check('Enlace con caracteres raros manda al inicio', h.status === 302 && h.headers.get('location') === '/');

  // Estadísticas
  r = await api('GET', `/api/admin/qr/${id}/stats`);
  const last = r.body.data && r.body.data[r.body.data.length - 1];
  check('Estadísticas: 30 días y hoy con 5 escaneos', r.body.success && r.body.data.length === 30 && last.total === 5, `${r.body.data && r.body.data.length} días, hoy=${last && last.total}`);

  // Editar enlace corto y nombre
  r = await api('PUT', `/api/admin/qr/${id}`, { name: 'E2E renombrado', slug: `${slug}-v2` });
  it = await find(id);
  check('Renombrar y cambiar el enlace corto', r.body.success && it.name === 'E2E renombrado' && it.slug === `${slug}-v2`);
  h = await hit(slug);
  check('El enlace corto anterior deja de funcionar (al inicio)', h.headers.get('location') === '/');

  // Eliminar
  r = await api('DELETE', `/api/admin/qr/${id}`);
  check('Eliminar', r.body.success);
  h = await hit(`${slug}-v2`);
  check('Eliminado manda al inicio', h.headers.get('location') === '/');
  r = await api('DELETE', `/api/admin/qr/${id}`);
  check('Eliminar otra vez -> 404', r.status === 404);

  console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
