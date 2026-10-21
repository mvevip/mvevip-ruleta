import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles, Smartphone, Award, Trophy, Zap, ShieldCheck } from 'lucide-react';
import useRemoteDisplaySync from '../hooks/useRemoteDisplaySync';
import { getScreenBrandConfig } from '../brand';

export default function DisplayQRView({ mobileUrl = '', screenId = '' }) {
  const brand = getScreenBrandConfig();
  const { displayConfig } = useRemoteDisplaySync('qr');

  const effectiveScreenId = screenId || brand.screenId;
  const effectiveMobileUrl = mobileUrl || brand.mobileUrl;
  const fullUrl = `${effectiveMobileUrl}${effectiveMobileUrl.includes('?') ? '&' : '?'}screen=${effectiveScreenId}`;
  const orientation = displayConfig?.orientation || 'auto';

  // Detectar dinámicamente si el viewport físico es vertical (portrait)
  const [isViewportPortrait, setIsViewportPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsViewportPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determinar si aplica modo vertical (por configuración de Admin o viewport)
  const isVertical = orientation === 'portrait' || (orientation === 'auto' && isViewportPortrait);

  return (
    <div className={`relative min-h-screen w-full overflow-hidden flex flex-col justify-between select-none ${
      brand.isFord ? 'bg-white text-[#212650]' : 'bg-zinc-950 text-white'
    }`}>
      {/* Fondo de alta gama */}
      {!brand.isFord && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black pointer-events-none" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#9AC31C]/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {/* Barra Superior: Logo y Stand */}
      <header className={`relative z-10 w-full flex items-center justify-between px-8 py-5 border-b backdrop-blur-md ${
        brand.isFord ? 'border-[#212650]/20 bg-white' : 'border-zinc-800/80 bg-zinc-950/60'
      }`}>
        <div className="flex items-center gap-4">
          <img
            src={brand.logoSrc}
            alt={brand.logoAlt}
            className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(154,195,28,0.5)]"
            onError={(e) => {
              e.currentTarget.src = brand.logoFallbackSrc;
            }}
          />
          <div className="hidden sm:block">
            <span className="text-xs uppercase tracking-widest text-[#9AC31C] font-racing font-bold block">
              {brand.tagline}
            </span>
            <span className={`text-xs font-medium ${brand.isFord ? 'text-[#212650]/70' : 'text-zinc-400'}`}>
              {brand.subTagline}
            </span>
          </div>
        </div>

        <div className={`flex items-center gap-3 border px-4 py-2 rounded-2xl ${
          brand.isFord
            ? 'bg-[#212650] border-[#212650] text-white shadow-md'
            : 'bg-zinc-900/90 border-[#9AC31C]/40 shadow-[0_0_15px_rgba(154,195,28,0.2)]'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full animate-ping ${brand.isFord ? 'bg-white' : 'bg-[#9AC31C]'}`} />
          <span className="font-racing font-bold text-xs tracking-wider text-white">
            STAND ACTIVO • {effectiveScreenId}
          </span>
        </div>
      </header>

      {/* Contenido Principal */}
      {isVertical ? (
        <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 py-6 text-center max-w-2xl mx-auto w-full space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#9AC31C]/15 border border-[#9AC31C]/60 px-5 py-2 rounded-full text-[#9AC31C] text-xs sm:text-sm font-racing font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(154,195,28,0.3)] animate-bounce">
              <Sparkles className="w-4 h-4 text-[#9AC31C]" />
              <span>¡Gira la Ruleta en Vivo!</span>
            </div>

            <h1 className={`text-5xl sm:text-6xl font-black font-racing uppercase tracking-tight leading-none ${
              brand.isFord ? 'text-[#212650]' : 'text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]'
            }`}>
              ESCANEA <span className="text-[#9AC31C]">Y GANA</span>
            </h1>

            <p className="text-xl sm:text-2xl text-[#9AC31C] font-racing font-bold tracking-wide">
              ¡Premios exclusivos de feria te esperan!
            </p>
          </div>

          {/* Código QR Gigante y Visible */}
          <div className="flex flex-col items-center justify-center relative w-full pt-2">
            <div className="absolute inset-0 -m-8 rounded-full bg-[#9AC31C]/25 blur-3xl animate-pulse pointer-events-none" />

            <div className="brushed-metal p-6 sm:p-8 rounded-3xl border-3 border-[#9AC31C] shadow-[0_0_70px_rgba(154,195,28,0.5)] flex flex-col items-center relative z-10 bg-zinc-900/95 max-w-md w-full">
              {/* Insignia superior */}
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-6 h-6 text-[#9AC31C] animate-bounce" />
                <span className="font-racing font-bold text-sm tracking-widest text-[#9AC31C] uppercase">
                  Apunta tu Celular Aquí
                </span>
              </div>

              {/* Código QR de Tamaño Maximizado */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-[0_0_40px_rgba(154,195,28,0.5)] border-2 border-white">
                <QRCodeSVG
                  value={fullUrl}
                  size={340}
                  level="H"
                  includeMargin={false}
                  fgColor={brand.isFord ? '#212650' : '#000000'}
                />
              </div>

              {/* Barra inferior de seguridad */}
              <div className={`mt-4 flex items-center gap-2 text-xs font-semibold ${brand.isFord ? 'text-[#212650]' : 'text-zinc-300'}`}>
                <ShieldCheck className="w-4 h-4 text-[#9AC31C]" />
                <span>Participación 100% Gratuita e Inmediata</span>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="relative z-10 flex-1 flex flex-row justify-around items-center px-12 py-8 gap-8 max-w-7xl mx-auto w-full">
          {/* Columna de Llamados y Títulos Prominentes */}
          <div className="flex flex-col items-start text-left max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-[#9AC31C]/15 border border-[#9AC31C]/60 px-4 py-1.5 rounded-full text-[#9AC31C] text-xs font-racing font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(154,195,28,0.3)] animate-bounce">
              <Sparkles className="w-4 h-4 text-[#9AC31C]" />
              <span>¡Gira la Ruleta en Vivo!</span>
            </div>

            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black font-racing uppercase tracking-tight leading-none ${
              brand.isFord ? 'text-[#212650]' : 'text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.8)]'
            }`}>
              ESCANEA <span className="text-[#9AC31C]">Y GANA</span> AL INSTANTE
            </h1>

            <p className={`text-lg sm:text-xl font-light leading-relaxed ${brand.isFord ? 'text-[#212650]/85' : 'text-zinc-300'}`}>
              Apunta la cámara de tu celular, completa tu registro y toma el control de la gran pantalla.
              <span className={`block font-bold mt-1 ${brand.isFord ? 'text-[#212650]' : 'text-white'}`}>
                ¡Premios exclusivos de feria te esperan!
              </span>
            </p>

            {/* Pasos de Participación 1 - 2 - 3 */}
            <div className="grid grid-cols-3 gap-3 w-full pt-2">
              <div className={`border p-4 rounded-2xl flex flex-col items-center text-center shadow-lg ${
                brand.isFord ? 'bg-white border-[#212650]/25' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <span className={`w-8 h-8 rounded-full font-racing font-bold text-sm flex items-center justify-center text-white mb-2 ${
                  brand.isFord ? 'bg-[#212650]' : 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                }`}>
                  1
                </span>
                <span className={`font-bold text-xs uppercase tracking-wide ${brand.isFord ? 'text-[#212650]' : 'text-white'}`}>Escanea el QR</span>
                <span className={`text-[11px] mt-0.5 ${brand.isFord ? 'text-[#212650]/70' : 'text-zinc-400'}`}>Con tu cámara móvil</span>
              </div>

              <div className={`border p-4 rounded-2xl flex flex-col items-center text-center shadow-lg ${
                brand.isFord ? 'bg-white border-[#212650]/25' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <span className="w-8 h-8 rounded-full bg-[#9AC31C] font-racing font-bold text-sm flex items-center justify-center text-black mb-2 shadow-[0_0_10px_rgba(154,195,28,0.5)]">
                  2
                </span>
                <span className={`font-bold text-xs uppercase tracking-wide ${brand.isFord ? 'text-[#212650]' : 'text-white'}`}>Tus Datos</span>
                <span className={`text-[11px] mt-0.5 ${brand.isFord ? 'text-[#212650]/70' : 'text-zinc-400'}`}>Nombre y WhatsApp</span>
              </div>

              <div className={`border p-4 rounded-2xl flex flex-col items-center text-center shadow-lg ${
                brand.isFord ? 'bg-white border-[#212650]/25' : 'bg-zinc-900/80 border-zinc-800'
              }`}>
                <span className={`w-8 h-8 rounded-full font-racing font-bold text-sm flex items-center justify-center text-white mb-2 ${
                  brand.isFord ? 'bg-[#212650]' : 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                }`}>
                  3
                </span>
                <span className={`font-bold text-xs uppercase tracking-wide ${brand.isFord ? 'text-[#212650]' : 'text-white'}`}>ENGINE START</span>
                <span className={`text-[11px] mt-0.5 ${brand.isFord ? 'text-[#212650]/70' : 'text-zinc-400'}`}>¡Haz girar la rueda!</span>
              </div>
            </div>
          </div>

          {/* Columna del Código QR Gigante */}
          <div className="flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 -m-6 rounded-3xl bg-[#9AC31C]/20 blur-2xl animate-pulse pointer-events-none" />

            <div className="brushed-metal p-7 sm:p-9 rounded-3xl border-3 border-[#9AC31C] shadow-[0_0_60px_rgba(154,195,28,0.4)] flex flex-col items-center relative z-10 bg-zinc-900/90">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-6 h-6 text-[#9AC31C] animate-bounce" />
                <span className="font-racing font-bold text-sm tracking-widest text-[#9AC31C] uppercase">
                  Apunta tu Celular Aquí
                </span>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-[0_0_35px_rgba(154,195,28,0.5)] border-2 border-white">
                <QRCodeSVG
                  value={fullUrl}
                  size={260}
                  level="H"
                  includeMargin={false}
                  fgColor={brand.isFord ? '#212650' : '#000000'}
                />
              </div>

              <div className={`mt-4 flex items-center gap-2 text-xs font-semibold ${brand.isFord ? 'text-[#212650]' : 'text-zinc-400'}`}>
                <ShieldCheck className="w-4 h-4 text-[#9AC31C]" />
                <span>Participación 100% Gratuita e Inmediata</span>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Pie de Pantalla */}
      <footer className="relative z-10 w-full py-4 px-8 border-t border-zinc-800/80 bg-zinc-950/80 text-center text-xs text-zinc-500 font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#9AC31C]" />
          <span>{brand.footerTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">{brand.footerSub}</span>
          <span className="font-mono text-[#9AC31C] text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
            {orientation.toUpperCase()} MODE
          </span>
        </div>
      </footer>
    </div>
  );
}

