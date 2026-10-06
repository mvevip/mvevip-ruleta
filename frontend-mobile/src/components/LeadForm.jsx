import React from 'react';
import { User, Phone, Mail, Compass } from 'lucide-react';

const DESTINATIONS = [
  '🌴 Cancún',
  '🏰 Europa',
  '🏖️ Punta Cana',
  '🎢 Orlando / Disney',
  '🚢 Crucero Caribe',
  '☀️ Miami Beach'
];

export default function LeadForm({ formData, onChange, errors = {} }) {
  const handlePhoneChange = (e) => {
    let raw = e.target.value;
    let clean = raw.replace(/\D/g, '');
    
    if (clean.startsWith('593')) {
      clean = '0' + clean.slice(3);
    }
    
    if (clean.length > 10) {
      clean = clean.slice(0, 10);
    }

    onChange({ target: { name: 'phone', value: clean } });
  };

  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-racing font-black text-white tracking-wide uppercase">
          Registro de Piloto
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Ingresa tus datos para activar la ruleta y ganar premios exclusivos
        </p>
      </div>

      {/* Campo: Nombre Completo */}
      <div>
        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
          Nombres y Apellidos *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <User className="w-4 h-4 text-[#9AC31C]" />
          </div>
          <input
            type="text"
            required
            name="name"
            value={formData.name}
            onChange={onChange}
            placeholder="Ej: Carlos Andrade"
            className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-[#9AC31C] focus:ring-1 focus:ring-[#9AC31C] text-sm transition-all"
          />
        </div>
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Campo: Celular / WhatsApp (Ecuador: 09XXXXXXXX) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            WhatsApp / Celular (Ecuador) *
          </label>
          <span className="text-[10px] text-[#9AC31C] font-mono font-bold">
            {formData.phone ? `${formData.phone.length}/10` : '09XXXXXXXX'}
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Phone className="w-4 h-4 text-[#9AC31C]" />
          </div>
          <input
            type="tel"
            inputMode="numeric"
            required
            name="phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="0991234567"
            className={`w-full pl-10 pr-3.5 py-3 rounded-2xl bg-zinc-900 border text-white placeholder-zinc-500 focus:outline-none text-sm transition-all ${
              errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-700 focus:border-[#9AC31C] focus:ring-1 focus:ring-[#9AC31C]'
            }`}
          />
        </div>
        {errors.phone ? (
          <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
        ) : (
          <p className="text-[11px] text-zinc-500 mt-1">10 dígitos iniciando con 09 (sin código de país)</p>
        )}
      </div>

      {/* Campo: Correo Electrónico */}
      <div>
        <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
          Correo Electrónico *
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Mail className="w-4 h-4 text-[#9AC31C]" />
          </div>
          <input
            type="email"
            required
            name="email"
            value={formData.email}
            onChange={onChange}
            placeholder="Ej: piloto@gmail.com"
            className={`w-full pl-10 pr-3.5 py-3 rounded-2xl bg-zinc-900 border text-white placeholder-zinc-500 focus:outline-none text-sm transition-all ${
              errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-700 focus:border-[#9AC31C] focus:ring-1 focus:ring-[#9AC31C]'
            }`}
          />
        </div>
        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
      </div>

      {/* Pregunta Estratégica: Destino Soñado */}
      <div>
        <label className="block text-xs font-semibold text-[#9AC31C] uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-bold">
          <Compass className="w-3.5 h-3.5 text-[#9AC31C]" />
          ¿A qué destino sueñas viajar en tu próximo viaje?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DESTINATIONS.map((dest) => {
            const isSelected = formData.dream_destination === dest;
            return (
              <button
                type="button"
                key={dest}
                onClick={() => onChange({ target: { name: 'dream_destination', value: dest } })}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-left transition-all border ${
                  isSelected
                    ? 'bg-[#9AC31C]/20 border-[#9AC31C] text-[#9AC31C] shadow-[0_0_12px_rgba(154,195,28,0.3)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {dest}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
