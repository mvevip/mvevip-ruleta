import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Move, RotateCcw } from 'lucide-react';

export default function QRCodeCard({
  mobileUrl = 'http://localhost:5503',
  screenId = 'STAND_01',
  driverConnected = false,
  isDraggable = true,
  storageKey = 'mvevip_screen_qr_pos'
}) {
  const fullUrl = `${mobileUrl}?screen=${screenId}`;
  const cardRef = useRef(null);

  const [position, setPosition] = useState(null); // { x: number, y: number } or null (default layout)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  const loadSavedPosition = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const safeX = Math.max(10, Math.min(window.innerWidth - 340, parsed.x));
          const safeY = Math.max(10, Math.min(window.innerHeight - 400, parsed.y));
          setPosition({ x: safeX, y: safeY });
          return;
        }
      }
      setPosition(null);
    } catch (e) {
      console.warn('Error leyendo posición guardada del QR:', e);
    }
  };

  // 1. Cargar posición guardada desde localStorage al montar y escuchar sincronizaciones
  useEffect(() => {
    if (!isDraggable) return;
    loadSavedPosition();

    const handleSync = () => loadSavedPosition();
    window.addEventListener('storage', handleSync);
    window.addEventListener('qr-position-updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('qr-position-updated', handleSync);
    };
  }, [isDraggable, storageKey]);

  // 2. Control de inicio de arrastre (Mouse / Touch)
  const handlePointerDown = (e) => {
    if (!isDraggable || e.button !== 0) return; // Solo click izquierdo
    if (e.target.closest('button')) return; // No arrastrar si presiona el botón reset

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY
    };

    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // 3. Arrastre en vivo con límites de pantalla
  const handlePointerMove = (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const rawX = dragStartRef.current.initialX + deltaX;
    const rawY = dragStartRef.current.initialY + deltaY;

    const cardWidth = cardRef.current?.offsetWidth || 320;
    const cardHeight = cardRef.current?.offsetHeight || 440;

    const clampedX = Math.max(10, Math.min(window.innerWidth - cardWidth - 10, rawX));
    const clampedY = Math.max(10, Math.min(window.innerHeight - cardHeight - 10, rawY));

    setPosition({ x: clampedX, y: clampedY });
  };

  // 4. Fin de arrastre y persistencia en localStorage
  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (position) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(position));
        window.dispatchEvent(new Event('qr-position-updated'));
      } catch (err) {
        console.warn('Error guardando posición de QR:', err);
      }
    }
  };

  // 5. Restablecer posición a la ubicación por defecto
  const handleResetPosition = (e) => {
    e.stopPropagation();
    setPosition(null);
    try {
      localStorage.removeItem(storageKey);
      window.dispatchEvent(new Event('qr-position-updated'));
    } catch (_) {}
  };

  const cardStyle = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 50,
        margin: 0
      }
    : {};

  return (
    <div
      ref={cardRef}
      style={cardStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`brushed-metal p-5 rounded-3xl border-2 border-[#9AC31C]/60 shadow-[0_0_30px_rgba(154,195,28,0.25)] flex flex-col items-center w-80 text-center relative overflow-hidden select-none transition-shadow ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'shadow-[0_0_50px_rgba(154,195,28,0.6)] ring-2 ring-[#9AC31C] scale-[1.02]' : ''}`}
    >
      {/* Resplandor decorativo verde lima */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#9AC31C]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Barra de Mover y Botón de Reset si ha sido movido */}
      {isDraggable && (
        <div className="w-full flex items-center justify-between mb-2 text-zinc-400 text-[10px] tracking-wider uppercase font-semibold border-b border-zinc-800/80 pb-1.5">
          <div className="flex items-center gap-1 text-zinc-400 hover:text-[#9AC31C] transition-colors">
            <Move className="w-3.5 h-3.5 text-[#9AC31C]" />
            <span>Mover QR libremente</span>
          </div>
          {position && (
            <button
              type="button"
              onClick={handleResetPosition}
              title="Restablecer a posición original"
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 px-2 py-0.5 rounded-md border border-red-800/50 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-5 h-5 text-[#9AC31C]" />
        <h3 className="font-racing font-bold text-sm tracking-widest text-[#9AC31C] uppercase">
          Escanea para Girar
        </h3>
      </div>

      {/* Contenedor del Código QR */}
      <div className="bg-white p-3.5 rounded-2xl shadow-[0_0_25px_rgba(154,195,28,0.4)] border-2 border-[#9AC31C] mb-3 relative">
        <QRCodeSVG
          value={fullUrl}
          size={160}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Indicador de Stand */}
      <div className="w-full mb-3">
        <div className="flex items-center justify-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#9AC31C]" />
          <span>Feria Automotriz • {screenId}</span>
        </div>
      </div>

      {/* Pasos Rápidos */}
      <div className="space-y-1.5 text-left w-full text-xs text-zinc-300">
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800">
          <span className="w-5 h-5 rounded-full bg-red-600 font-racing font-bold text-[10px] flex items-center justify-center text-white shrink-0">1</span>
          <span>Apunta con la cámara de tu celular</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800">
          <span className="w-5 h-5 rounded-full bg-[#9AC31C] font-racing font-bold text-[10px] flex items-center justify-center text-black shrink-0">2</span>
          <span>Completa tu nombre y celular</span>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1.5 rounded-lg border border-zinc-800">
          <span className="w-5 h-5 rounded-full bg-red-600 font-racing font-bold text-[10px] flex items-center justify-center text-white shrink-0">3</span>
          <span>Presiona <strong>ENGINE START</strong></span>
        </div>
      </div>
    </div>
  );
}
