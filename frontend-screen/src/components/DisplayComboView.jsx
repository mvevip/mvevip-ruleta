import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Sparkles, Trophy, Zap, ShieldCheck } from 'lucide-react';
import useRemoteDisplaySync from '../hooks/useRemoteDisplaySync';

export default function DisplayComboView({ mobileUrl = '', screenId = 'STAND_01' }) {
  const { displayConfig, sliderImages } = useRemoteDisplaySync('combo');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const fullUrl = `${mobileUrl || window.location.origin}?screen=${screenId}`;
  const orientation = displayConfig?.orientation || 'auto';

  // Diapositivas por defecto
  const defaultSlides = [
    {
      id: 'combo-1',
      title: 'Marketing VIP - Autos 2026',
      image_url: '',
      heading: 'TU PRÓXIMO AUTO ESTÁ AQUÍ',
      subheading: 'Aprovecha las promociones exclusivas de feria en nuestro stand'
    },
    {
      id: 'combo-2',
      title: 'Premios Inmediatos',
      image_url: '',
      heading: '¡ESCANEA Y GIRA LA RULETA!',
      subheading: 'Gana gorras oficiales, termos térmicos, bonos de viaje y noches de resort'
    }
  ];

  const activeSlides = sliderImages && sliderImages.length > 0 ? sliderImages : defaultSlides;
  const currentSlide = activeSlides[currentIndex % activeSlides.length] || activeSlides[0];
  const slideDuration = (currentSlide?.duration_seconds || displayConfig?.slide_duration || 8) * 1000;

  // Temporizador para el slider integrado
  useEffect(() => {
    setProgress(0);
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / slideDuration) * 100);
      setProgress(pct);

      if (elapsed >= slideDuration) {
        clearInterval(interval);
        setCurrentIndex((prev) => (prev + 1) % activeSlides.length);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentIndex, slideDuration, activeSlides.length]);

  const isPortrait = orientation === 'portrait';
  const isLandscape = orientation === 'landscape';

  return (
    <div className={`w-full h-screen bg-black overflow-hidden flex select-none ${
      isPortrait ? 'flex-col' : isLandscape ? 'flex-row' : 'flex-col lg:flex-row'
    }`}>
      {/* SECCIÓN 1: Slider de Imágenes Publicitarias */}
      <div className={`relative overflow-hidden bg-zinc-950 ${
        isPortrait ? 'h-3/5 w-full border-b-4 border-[#9AC31C]/60' : isLandscape ? 'w-3/5 h-full border-r-4 border-[#9AC31C]/60' : 'h-1/2 lg:h-full w-full lg:w-3/5 border-b-4 lg:border-b-0 lg:border-r-4 border-[#9AC31C]/60'
      }`}>
        {activeSlides.map((slide, idx) => {
          const isActive = idx === currentIndex % activeSlides.length;
          return (
            <div
              key={slide.id || idx}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out flex items-center justify-center ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {slide.image_url ? (
                <img
                  src={slide.image_url}
                  alt={slide.title || `Slide ${idx + 1}`}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center text-center p-6 relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#9AC31C]/15 via-transparent to-transparent pointer-events-none" />
                  <img
                    src="logotipo.png"
                    alt="Marketing VIP"
                    className="h-16 w-auto mb-4 drop-shadow-[0_0_20px_rgba(154,195,28,0.5)]"
                    onError={(e) => {
                      e.currentTarget.src = '/pantalla/logotipo.png';
                    }}
                  />
                  <span className="text-xs font-racing font-bold text-[#9AC31C] tracking-widest uppercase mb-2">
                    ESPECIALISTAS EN SUEÑOS
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-racing font-black text-white uppercase max-w-xl">
                    {slide.heading}
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-300 mt-2 max-w-md font-light">
                    {slide.subheading}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Barra de Progreso del Slide */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-zinc-900/80 z-20 overflow-hidden">
          <div
            className="h-full bg-[#9AC31C] shadow-[0_0_10px_#9AC31C] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* SECCIÓN 2: Código QR Gigante con Letreros 'Escanea y Gana' */}
      <div className={`relative bg-gradient-to-br from-zinc-950 via-zinc-900 to-black flex flex-col justify-between items-center p-6 sm:p-8 text-white ${
        isPortrait ? 'h-2/5 w-full' : isLandscape ? 'w-2/5 h-full' : 'h-1/2 lg:h-full w-full lg:w-2/5'
      }`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#9AC31C]/10 via-transparent to-transparent pointer-events-none" />

        {/* Encabezado Llamativo */}
        <div className="text-center relative z-10 w-full">
          <div className="inline-flex items-center gap-1.5 bg-[#9AC31C]/20 border border-[#9AC31C] px-3.5 py-1 rounded-full text-[#9AC31C] text-[11px] font-racing font-bold tracking-widest uppercase mb-2 shadow-[0_0_15px_rgba(154,195,28,0.3)] animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-[#9AC31C]" />
            <span>¡Gira la Ruleta en Vivo!</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-racing uppercase tracking-tight text-white leading-tight">
            ESCANEA <span className="text-[#9AC31C]">Y GANA</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
            Apunta la cámara de tu celular, llena tus datos y presiona ENGINE START
          </p>
        </div>

        {/* Caja del Código QR */}
        <div className="relative z-10 my-auto flex flex-col items-center">
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-[0_0_35px_rgba(154,195,28,0.5)] border-2 border-[#9AC31C]">
            <QRCodeSVG
              value={fullUrl}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>
          <span className="text-[11px] font-racing font-bold text-zinc-400 uppercase tracking-widest mt-2">
            STAND • {screenId}
          </span>
        </div>

        {/* Pasos Rápidos en Línea */}
        <div className="relative z-10 w-full flex items-center justify-around gap-2 text-[10px] text-zinc-300 border-t border-zinc-800/80 pt-3">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-red-600 font-bold text-[9px] flex items-center justify-center text-white">1</span>
            <span>Escanea</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-[#9AC31C] font-bold text-[9px] flex items-center justify-center text-black">2</span>
            <span>Regístrate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-red-600 font-bold text-[9px] flex items-center justify-center text-white">3</span>
            <span>¡Gira y Gana!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
