import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Send, Check, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { EVENT_GROUPS, STAND_META, FRONT_LABEL } from '../utils/stands';
import { Spinner, formatQuito } from './ui';

/** Correo de bienvenida por Brevo: número de plantilla por frente. Con número se envía al registrarse; vacío = no envía. */
function Row({ stand, row, onSaved }) {
  const { apiFetch, toast } = useAdmin();
  const saved = row.template_id || '';
  const [value, setValue] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const dirty = value.trim() !== saved;
  const valid = value.trim() === '' || /^[0-9]{1,8}$/.test(value.trim());
  useEffect(() => { setValue(row.template_id || ''); }, [row.template_id]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/email/${stand}`, { method: 'PUT', body: JSON.stringify({ template_id: value.trim() }) });
      const json = await res.json();
      if (json.success) { toast(value.trim() ? 'Plantilla guardada: se enviará al registrarse' : 'Sin plantilla: este frente no enviará correo'); onSaved(); } else toast(json.message || 'No se pudo guardar', 'error');
    } catch (_) { /* sesión */ } finally { setBusy(false); }
  };

  const sendTest = async () => {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/admin/email/${stand}/test`, { method: 'POST', body: JSON.stringify({ email: testEmail.trim() }) });
      const json = await res.json();
      toast(json.success ? `Correo de prueba enviado a ${testEmail.trim()}` : (json.message || 'No se pudo enviar'), json.success ? 'ok' : 'error');
    } catch (_) { /* sesión */ } finally { setBusy(false); }
  };

  return (
    <li className="py-3.5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip !cursor-default">{FRONT_LABEL[STAND_META[stand].front]}</span>
        <span className="text-sm font-bold text-ink">{STAND_META[stand].title}</span>
        <span className="ml-auto text-xs text-ink-muted">{row.sent} {row.sent === 1 ? 'enviado' : 'enviados'}{row.failed ? <span className="text-red-600 font-semibold"> · {row.failed} con error</span> : null}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input w-40 font-mono" inputMode="numeric" placeholder="Nº de plantilla" value={value} aria-label={`Plantilla de Brevo de ${STAND_META[stand].title}`}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
        />
        <button type="button" className="btn-primary !py-2 text-sm" onClick={save} disabled={!dirty || !valid || busy}>{busy ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />} Guardar</button>
        {saved ? <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Activo (plantilla {saved})</span> : <span className="text-xs text-ink-muted">Sin plantilla: no envía correo</span>}
      </div>
      {saved && !dirty && (
        <div className="flex flex-wrap items-center gap-2">
          <input className="input w-64" type="email" inputMode="email" autoCapitalize="none" placeholder="correo para probar" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} aria-label="Correo de prueba" />
          <button type="button" className="btn-soft !py-2 text-sm" onClick={sendTest} disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())}><Send className="w-4 h-4" /> Enviar prueba</button>
        </div>
      )}
    </li>
  );
}

export default function WelcomeEmailPanel() {
  const { apiFetch } = useAdmin();
  const [state, setState] = useState(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/email');
      const json = await res.json();
      if (json.success) { setState(json); setMissing(false); } else if (json.code === 'MISSING_TABLE') { setMissing(true); setState({ data: [], recent: [], configured: true }); }
    } catch (_) { /* sesión */ }
  }, [apiFetch]);
  useEffect(() => { load(); }, [load]);

  if (!state) return <div className="card card-pad"><div className="skeleton h-24" /></div>;
  const byStand = Object.fromEntries(state.data.map((r) => [r.stand, r]));

  return (
    <div className="max-w-3xl space-y-4">
      <div className="notice-info"><Info className="w-5 h-5 shrink-0 mt-0.5" /><span className="text-sm">Escribe el <strong>número de plantilla de Brevo</strong> de cada frente. Cuando alguien se registra y entra al juego, recibe ese correo. Si dejas el número vacío, ese frente <strong>no envía nada</strong>. No se envía a usuarios demo y cada persona recibe un solo correo.</span></div>
      {missing && <div className="notice-warn"><AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /><span className="text-sm">Falta ejecutar la migración <code>014_correo_bienvenida_brevo.sql</code> en la base de datos.</span></div>}
      {!state.configured && <div className="notice-warn"><AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /><span className="text-sm">Falta la variable <code>BREVO_SENDER_EMAIL</code> en el servidor: aunque pongas plantillas, todavía no se enviará nada.</span></div>}

      {EVENT_GROUPS.map((g) => (
        <section key={g.key} className="card card-pad !py-3">
          <h3 className="panel-title flex items-center gap-2"><Mail className="w-4 h-4" /> {g.label}</h3>
          <ul className="divide-y divide-line">
            {g.fronts.map((f) => <Row key={f} stand={f} row={byStand[f] || { template_id: '', sent: 0, failed: 0 }} onSaved={load} />)}
          </ul>
        </section>
      ))}

      {state.recent.length > 0 && (
        <section className="card card-pad !py-3">
          <h3 className="panel-title">Últimos envíos</h3>
          <ul className="divide-y divide-line text-sm">
            {state.recent.map((r) => (
              <li key={r.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                {r.status === 'sent' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span className="font-semibold text-ink">{(STAND_META[r.stand] || {}).short || r.stand}</span>
                <span className="text-ink-muted font-mono text-xs">{r.to_masked}</span>
                <span className="text-ink-muted text-xs">plantilla {r.template_id}</span>
                <span className="ml-auto text-xs text-ink-muted">{formatQuito(r.created_at)}</span>
                {r.status !== 'sent' && r.error && <span className="basis-full text-xs text-red-600 break-words">{r.error}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
