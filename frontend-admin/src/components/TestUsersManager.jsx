import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
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
      {/* Banner Informativo */}
      <div className="bg-gradient-to-r from-purple-950/70 via-zinc-900 to-zinc-900 border border-purple-500/40 p-4 rounded-2xl shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-racing font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <span>Usuarios de Prueba (Modo Demo)</span>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-mono">
                {testUsers.length} Activos
              </span>
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              Los celulares y correos registrados aquí <strong>pueden jugar infinitas veces</strong>. Cada vez que ingresen sus datos en el móvil, la ruleta girará y entregará premio como si fuera un usuario nuevo, <strong>sin descontar stock real</strong> de premios ni distorsionar las métricas de la feria.
            </p>
          </div>
        </div>
      </div>

      {/* Formulario para agregar usuario demo */}
      <div className="brushed-metal p-4 rounded-2xl border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-racing text-xs text-white uppercase font-bold flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#9AC31C]" />
            Agregar Usuario de Prueba
          </span>
          <button
            type="button"
            onClick={handleAutoCompleteNext}
            className="text-[11px] text-[#9AC31C] hover:underline flex items-center gap-1 font-mono cursor-pointer"
            title="Genera datos secuenciales para prueba rápida"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ Sugerir Siguiente</span>
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-racing">Nombre / Asesor</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Asesor Juan Stand"
                  className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#9AC31C]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-racing">Celular Ecuador (10 dígitos)</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0990000001"
                  maxLength={10}
                  className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-[#9AC31C]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-racing">Email de Prueba</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo1@mvevip.com"
                  className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-[#9AC31C]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-racing">Notas (Opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Demostraciones Stand A"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#9AC31C]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !phone.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-[#84A816] to-[#9AC31C] hover:brightness-110 active:scale-95 text-black font-racing font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Guardando...' : 'Registrar Usuario Demo'}</span>
          </button>
        </form>
      </div>

      {/* Lista de Usuarios Demo */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="font-racing text-xs text-zinc-400 uppercase font-bold">
            Usuarios Configurados ({testUsers.length})
          </span>
          <button
            onClick={loadTestUsers}
            className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            title="Recargar lista"
          >
            <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {testUsers.length === 0 ? (
          <div className="bg-zinc-900/60 border border-zinc-800 p-8 rounded-2xl text-center space-y-2">
            <FlaskConical className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No hay usuarios de prueba registrados.</p>
            <button
              onClick={handleAutoCompleteNext}
              className="text-xs text-[#9AC31C] underline font-bold"
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
                className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                  u.active
                    ? 'bg-zinc-900/90 border-zinc-800 hover:border-purple-500/50'
                    : 'bg-zinc-950/60 border-zinc-900 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="font-bold text-sm text-white uppercase">{u.name}</span>
                    {u.notes && (
                      <span className="text-[10px] text-zinc-400 font-sans italic">
                        ({u.notes})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-500/40 px-2 py-0.5 rounded-full">
                      {u.spins_count || 0} giros demo
                    </span>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title={u.active ? 'Desactivar usuario de prueba' : 'Activar usuario de prueba'}
                    >
                      {u.active ? (
                        <ToggleRight className="w-6 h-6 text-[#9AC31C]" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-zinc-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.name)}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                      title="Eliminar usuario de prueba"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-800/60">
                  {/* Botón copiar Celular */}
                  <div className="flex items-center justify-between bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      <span className="font-mono text-zinc-200">{u.phone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(u.phone, `phone_${u.id}`)}
                      className="text-[10px] text-[#9AC31C] hover:underline flex items-center gap-1 font-mono cursor-pointer ml-2"
                      title="Copiar teléfono al portapapeles"
                    >
                      {isPhoneCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Botón copiar Email */}
                  {u.email && (
                    <div className="flex items-center justify-between bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-2 text-xs truncate mr-2">
                        <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="font-mono text-zinc-200 truncate">{u.email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(u.email, `email_${u.id}`)}
                        className="text-[10px] text-[#9AC31C] hover:underline flex items-center gap-1 font-mono cursor-pointer shrink-0"
                        title="Copiar correo al portapapeles"
                      >
                        {isEmailCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">¡Copiado!</span>
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
