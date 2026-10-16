import React, { useState, useEffect, useRef } from 'react';
import { UserCheck, ChevronDown, X, Check, AlertCircle } from 'lucide-react';

export const DEFAULT_ADVISORS = [
  'CEVALLOS ERIKA',
  'CHASI WILSON',
  'COBA JEANNETH',
  'ESPINOZA RUTH',
  'LEDEZMA JESUJE',
  'PRADO IRMA',
  'SALAZAR SILVIA',
  'SAMUEZA BELEN',
  'TOAPANTA PAOLA',
  'ZHINDON CARMEN',
  'PROANO MISHELLE',
  'SANGUCHO HENRY',
  'SARAGURO JHEYMY',
  'MARTINEZ GALAN EVELIN',
  'PENA DANIEL',
  'NUNEZ DAVID',
  'CORDOVA KAREN',
  'MINDA ARIANNY',
  'ALAYON JOSE',
  'MARTINEZ NATALIA',
  'MARTINEZ PAOLA',
  'ONTANEDA SAMANIEGO SAMANTHA NAYELLI',
  'MIREYA VILANEZ',
  'MONTES ESCOBAR ROSELYN',
  'VELASTEGUI ESTEFANIA',
  'IMBAQUINGO BRENDA',
  'SIMBANA VILLACIS KENNY MATHIAS',
  'ANDARA RUIZ NURY DE JESUS'
];

function normalizeText(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export default function StrictAdvisorSelect({
  leadId,
  value = '',
  advisors = DEFAULT_ADVISORS,
  onAssign
}) {
  const validList = Array.isArray(advisors) && advisors.length > 0 ? advisors : DEFAULT_ADVISORS;
  const [inputText, setInputText] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setInputText(value || '');
  }, [value]);

  // Cerrar desplegable al hacer clic fuera y validar estrictamente el texto
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (isOpen) {
          setIsOpen(false);
          validateOrRevert(inputText);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  const findExactAdvisor = (raw) => {
    const norm = normalizeText(raw);
    if (!norm) return '';
    return validList.find((item) => normalizeText(item) === norm) || null;
  };

  const commitSelection = async (canonicalAdvisor) => {
    setInvalidMsg('');
    setInputText(canonicalAdvisor || '');
    setIsOpen(false);

    if ((canonicalAdvisor || '') === (value || '')) {
      return;
    }

    setIsSaving(true);
    try {
      const ok = await onAssign(leadId, canonicalAdvisor || '');
      if (ok) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      } else {
        setInputText(value || '');
      }
    } catch (_) {
      setInputText(value || '');
    } finally {
      setIsSaving(false);
    }
  };

  const validateOrRevert = (currentStr) => {
    const trimmed = String(currentStr || '').trim();
    if (trimmed === '') {
      if (value) {
        commitSelection('');
      } else {
        setInputText('');
      }
      return;
    }

    const exact = findExactAdvisor(trimmed);
    if (exact) {
      commitSelection(exact);
    } else {
      // No pertenece a la lista: revertir estrictamente al valor válido anterior
      setInputText(value || '');
      setInvalidMsg('Solo puedes elegir un nombre de la lista');
      setTimeout(() => setInvalidMsg(''), 2800);
    }
  };

  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    setInputText(nextVal);
    setInvalidMsg('');
    if (!isOpen) setIsOpen(true);

    // Si selecciona desde un datalist nativo una coincidencia exacta, guardarla de inmediato
    const exact = findExactAdvisor(nextVal);
    if (exact) {
      commitSelection(exact);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const exact = findExactAdvisor(inputText);
      if (exact) {
        commitSelection(exact);
      } else if (filteredAdvisors.length === 1) {
        commitSelection(filteredAdvisors[0]);
      } else {
        validateOrRevert(inputText);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText(value || '');
    }
  };

  const normQuery = normalizeText(inputText);
  const isCurrentExact = Boolean(value && normalizeText(value) === normQuery);

  // Si el texto actual ya es el asesor seleccionado, mostrar toda la lista al abrir para cambiar fácilmente
  const filteredAdvisors = (!normQuery || isCurrentExact)
    ? validList
    : validList.filter((adv) => normalizeText(adv).includes(normQuery));

  return (
    <div ref={containerRef} className="pt-2 border-t border-zinc-800/80 space-y-1 relative">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-400 font-medium flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-[#9AC31C]" />
          <span>Asesor Asignado:</span>
        </span>
        {isSaving && (
          <span className="text-[10px] font-mono text-amber-400 animate-pulse">
            Guardando...
          </span>
        )}
        {!isSaving && justSaved && (
          <span className="text-[10px] font-mono text-[#9AC31C] flex items-center gap-1 font-bold">
            <Check className="w-3 h-3" />
            <span>Guardado</span>
          </span>
        )}
        {!isSaving && !justSaved && value && (
          <span className="text-[10px] font-mono text-emerald-400 font-semibold">
            Asignado
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={inputText}
          onFocus={() => setIsOpen(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setIsOpen(false);
            validateOrRevert(inputText);
          }}
          placeholder="Escribe para buscar o selecciona asesor..."
          disabled={isSaving}
          autoComplete="off"
          className={`w-full pl-3 pr-14 py-2 rounded-xl bg-zinc-950 border text-xs font-mono transition-all focus:outline-none ${
            invalidMsg
              ? 'border-red-500 text-red-300'
              : value
              ? 'border-[#9AC31C]/60 text-[#9AC31C] font-bold focus:border-[#9AC31C]'
              : 'border-zinc-700 text-white placeholder-zinc-500 focus:border-[#9AC31C]'
          }`}
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {(inputText || value) && !isSaving && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commitSelection('');
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Limpiar asesor asignado"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }}
            className="p-1 rounded-lg text-zinc-400 hover:text-[#9AC31C] hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Ver lista de asesores"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-[#9AC31C]' : ''}`} />
          </button>
        </div>

        {/* Lista desplegable filtrada con validación estricta */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto rounded-xl bg-zinc-950 border border-[#9AC31C]/60 shadow-[0_10px_30px_rgba(0,0,0,0.85)] z-50 divide-y divide-zinc-800/70">
            {filteredAdvisors.length > 0 ? (
              filteredAdvisors.map((adv) => {
                const isSelected = value === adv;
                return (
                  <button
                    key={adv}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      commitSelection(adv);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#9AC31C]/20 text-[#9AC31C] font-bold'
                        : 'text-zinc-200 hover:bg-zinc-900 hover:text-[#9AC31C]'
                    }`}
                  >
                    <span>{adv}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#9AC31C] shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2.5 text-[11px] text-amber-400 flex items-center gap-1.5 font-sans">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>No coincide con ningún asesor de la lista oficial</span>
              </div>
            )}
          </div>
        )}
      </div>

      {invalidMsg && (
        <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium pt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{invalidMsg}</span>
        </div>
      )}
    </div>
  );
}
