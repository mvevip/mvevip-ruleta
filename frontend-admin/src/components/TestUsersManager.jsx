import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Phone,
  Mail,
  User,
  RotateCcw,
  Info
} from 'lucide-react';

export default function TestUsersManager({ apiUrl, getAdminHeaders, onNotification }) {
  const [testUsers, setTestUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Formulario nuevo usuario demo
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTestUsers();
  }, []);

  const loadTestUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/test-users`, {
        headers: getAdminHeaders()
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTestUsers(json.data);
      }
    } catch (err) {
      console.error('Error cargando usuarios de prueba:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    if (e) e.preventDefault();
    if (!phone.trim()) {
      alert('Ingresa el número de celular del usuario demo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/test-users`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          name: name.trim() || 'Asesor Demo',
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim()
        })
      });

      const json = await res.json();
      if (json.success) {
        setName('');
        setPhone('');
        setEmail('');
        setNotes('');
        loadTestUsers();
        if (onNotification) onNotification('Usuario de prueba registrado con éxito');
      } else {
        alert(json.message || 'Error al guardar usuario');
      }
    } catch (err) {
      alert('Error de conexión al guardar usuario de prueba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/test-users/${user.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ active: !user.active })
      });
      const json = await res.json();
      if (json.success) {
        setTestUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, active: !u.active } : u))
        );
        if (onNotification) {
          onNotification(`Usuario ${user.name} ${!user.active ? 'activado' : 'desactivado'}`);
        }
      }
    } catch (err) {
      alert('Error al actualizar estado del usuario');
    }
  };

  const handleDelete = async (id, userName) => {
    if (!window.confirm(`¿Estás seguro de eliminar el usuario de prueba "${userName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/admin/test-users/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      const json = await res.json();
      if (json.success) {
        setTestUsers(prev => prev.filter(u => u.id !== id));
        if (onNotification) onNotification('Usuario de prueba eliminado');
      }
    } catch (err) {
      alert('Error al eliminar usuario de prueba');
    }
  };

  const handleCopy = (text, fieldKey) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Autocompletar con el siguiente número secuencial de demo (099000000X)
  const handleAutoCompleteNext = () => {
    let nextNum = 1;
    testUsers.forEach(u => {
      const match = u.phone.match(/099000000(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val >= nextNum) nextNum = val + 1;
      }
    });

    const padded = nextNum.toString();
    const suggestedPhone = `099000000${padded}`;
    setName(`Asesor Demo ${nextNum}`);
    setPhone(suggestedPhone);
    setEmail(`demo${nextNum}@mvevip.com`);
    setNotes('Demostración Stand');
  };

  return (
    <div className="space-y-4">
      {/* Banner informativo */}
      <div className="notice-info">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-line flex items-center justify-center text-sky-700 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="panel-title flex items-center gap-2 flex-wrap">
              <span>Usuarios demo</span>
              <span className="badge-sky">{testUsers.filter((u) => u.active).length} activos</span>
            </h3>
            <p className="text-xs text-ink-2 leading-relaxed">
              Los usuarios demo juegan sin descontar stock y salen marcados como DEMO. Pueden girar la ruleta las veces que quieras, con el celular o correo registrado aquí, y no afectan las métricas de la feria.
            </p>
          </div>
        </div>
      </div>

      {/* Formulario para agregar usuario demo */}
      <div className="card card-pad space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="panel-title flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-brand-dark" />
            Agregar usuario demo
          </span>
          <button
            type="button"
            onClick={handleAutoCompleteNext}
            className="btn-ghost btn-sm"
            title="Rellena el formulario con datos de ejemplo"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sugerir siguiente</span>
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">Nombre del asesor</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Asesor Juan Stand"
                  className="input pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="label">Celular (10 dígitos)</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0990000001"
                  maxLength={10}
                  className="input pl-9 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">Correo de prueba</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo1@mvevip.com"
                  className="input pl-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="label">Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Demostraciones Stand A"
                className="input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !phone.trim()}
            className="btn-primary w-full disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : 'Registrar usuario demo'}</span>
          </button>
        </form>
      </div>

      {/* Lista de usuarios demo */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="section-label">
            Usuarios configurados ({testUsers.length})
          </span>
          <button
            onClick={loadTestUsers}
            className="btn-ghost btn-sm"
            title="Recargar lista"
          >
            <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {testUsers.length === 0 ? (
          <div className="card card-pad text-center space-y-2 py-8">
            <FlaskConical className="w-8 h-8 text-ink-muted mx-auto" />
            <p className="text-sm text-ink-2">Todavía no hay usuarios demo.</p>
            <p className="help">Crea uno para probar la ruleta sin gastar premios reales.</p>
            <button
              onClick={handleAutoCompleteNext}
              className="btn-soft btn-sm"
            >
              Crear el primer usuario demo
            </button>
          </div>
        ) : (
          testUsers.map((u) => {
            const isPhoneCopied = copiedField === `phone_${u.id}`;
            const isEmailCopied = copiedField === `email_${u.id}`;

            return (
              <div
                key={u.id}
                className={`card card-pad space-y-2 transition-all ${
                  u.active ? '' : 'opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-bold text-sm text-ink uppercase">{u.name}</span>
                    <span className="badge-navy">DEMO</span>
                    {u.notes && (
                      <span className="text-xs text-ink-muted italic">
                        ({u.notes})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="badge-slate">
                      {u.spins_count || 0} giros demo
                    </span>
                    <span className="text-xs text-ink-muted">{u.active ? 'Activo' : 'Inactivo'}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!u.active}
                      onClick={() => handleToggleActive(u)}
                      className="switch"
                      title={u.active ? 'Desactivar usuario de prueba' : 'Activar usuario de prueba'}
                    >
                      <span className="switch-dot" />
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      className="btn-icon text-red-600 hover:bg-red-50"
                      title="Eliminar usuario de prueba"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-line">
                  {/* Copiar celular */}
                  <div className="flex items-center justify-between bg-surface-2 border border-line rounded-xl px-3 py-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="w-3 h-3 text-ink-muted" />
                      <span className="font-mono text-ink-2">{u.phone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(u.phone, `phone_${u.id}`)}
                      className="text-xs text-brand-dark hover:underline flex items-center gap-1 cursor-pointer ml-2"
                      title="Copiar teléfono al portapapeles"
                    >
                      {isPhoneCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span className="text-emerald-700 font-bold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Copiar correo */}
                  {u.email && (
                    <div className="flex items-center justify-between bg-surface-2 border border-line rounded-xl px-3 py-1.5">
                      <div className="flex items-center gap-2 text-xs truncate mr-2">
                        <Mail className="w-3 h-3 text-ink-muted shrink-0" />
                        <span className="font-mono text-ink-2 truncate">{u.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(u.email, `email_${u.id}`)}
                        className="text-xs text-brand-dark hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                        title="Copiar correo al portapapeles"
                      >
                        {isEmailCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span className="text-emerald-700 font-bold">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
