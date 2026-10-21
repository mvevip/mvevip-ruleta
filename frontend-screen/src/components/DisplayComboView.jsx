import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles } from 'lucide-react';
import useRemoteDisplaySync from '../hooks/useRemoteDisplaySync';
import { getScreenBrandConfig } from '../brand';

export default function DisplayComboView({ mobileUrl = '', screenId = '' }) {
  const brand = getScreenBrandConfig();
  const { displayConfig, sliderImages } = useRemoteDisplaySync('combo');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Detección reactiva de orientación de ventana (portrait vs landscape)
  const [windowOrientation, setWindowOrientation] = useState(() => 
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveScreenId = screenId || brand.screenId;
  const effectiveMobileUrl = mobileUrl || brand.mobileUrl;
  const fullUrl = `${effectiveMobileUrl}${effectiveMobileUrl.includes('?') ? '&' : '?'}screen=${effectiveScreenId}`;
  
  // Orientación efectiva
  const configOrientation = displayConfig?.orientation || 'auto';
  const effectiveOrientation = configOrientation !== 'auto' ? configOrientation : windowOrientation;
  const isPortrait = effectiveOrientation === 'portrait';
  const isLandscape = effectiveOrientation === 'landscape';

  // Escala porcentual configurable del QR (30% a 90%, default 55%)
  const qrScale = displayConfig?.qr_scale_percent ? Number(displayConfig.qr_scale_percent) : 55;

  // Diapositivas por defecto
  const defaultSlides = brand.isFord
    ? [
        {
          id: 'combo-ford-1',
          title: 'Ford | Quito Motors 2026',
          image_url: '',
          heading: 'TU PRÓXIMO FORD ESTÁ AQUÍ',
          subheading: 'Aprovecha las promociones exclusivas de feria en Quito Motors'
        },
        {
          id: 'combo-ford-2',
          title: 'Premios Inmediatos Ford',
          image_url: '',
          heading: '¡ESCANEA Y GIRA LA RULETA!',
          subheading: 'Gana gorras oficiales Ford, termos deportivos, llaveros y bonos de accesorios'
        }
      ]
    : [
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

  // Componente de los 3 Pasos Dinámicos - Compacto y protegido contra desbordes
  const renderStepsBanner = (extraClasses = '') => (
    <div className={`relative z-20 w-full border-y border-[#9AC31C]/60 py-1.5 sm:py-2 px-2 sm:px-4 flex-shrink-0 ${
      brand.isFord
        ? 'bg-[#212650] shadow-md'
        : 'bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 shadow-[0_0_25px_rgba(154,195,28,0.25)]'
    } ${extraClasses}`}>
      <div className="w-full max-w-xl mx-auto grid grid-cols-3 gap-1 sm:gap-2">
        {/* Paso 1: Escanea */}
        <div 
          className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-red-500/50 rounded-xl p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5 shadow-md overflow-hidden"
          style={{ animation: 'comboStepFloat 3s ease-in-out infinite 0s' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 text-white font-racing font-black text-[11px] sm:text-xs flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.7)]">
              1
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 animate-ping opacity-75" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-racing font-bold text-[10px] sm:text-xs text-white uppercase tracking-wider block truncate">
              Escanea
            </span>
            <span className="text-[8px] sm:text-[10px] text-zinc-400 block truncate font-light leading-tight">
              Abre cámara
            </span>
          </div>
        </div>

        {/* Paso 2: Regístrate */}
        <div 
          className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-[#9AC31C]/60 rounded-xl p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5 shadow-md overflow-hidden"
          style={{ animation: 'comboStepFloat 3s ease-in-out infinite 0.6s' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-[#9AC31C] to-[#7A9E14] text-black font-racing font-black text-[11px] sm:text-xs flex items-center justify-center shadow-[0_0_10px_rgba(154,195,28,0.7)]">
              2
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#9AC31C] animate-ping opacity-75" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-racing font-bold text-[10px] sm:text-xs text-white uppercase tracking-wider block truncate">
              Regístrate
            </span>
            <span className="text-[8px] sm:text-[10px] text-zinc-400 block truncate font-light leading-tight">
              Tus datos
            </span>
          </div>
        </div>

        {/* Paso 3: ¡Gira y Gana! */}
        <div 
          className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-yellow-500/60 rounded-xl p-1 sm:p-1.5 flex items-center gap-1 sm:gap-1.5 shadow-md overflow-hidden"
          style={{ animation: 'comboStepFloat 3s ease-in-out infinite 1.2s' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-yellow-400 via-amber-500 to-red-600 text-black font-racing font-black text-[11px] sm:text-xs flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.7)]">
              3
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-400 animate-ping opacity-75" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-racing font-black text-[10px] sm:text-xs text-yellow-400 uppercase tracking-wider block truncate">
              Gira y Gana
            </span>
            <span className="text-[8px] sm:text-[10px] text-zinc-300 block truncate font-light leading-tight">
              Premios ya
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full h-screen overflow-hidden flex select-none ${
      brand.isFord ? 'bg-white' : 'bg-black'
    } ${
      isPortrait ? 'flex-col' : isLandscape ? 'flex-row' : 'flex-col lg:flex-row'
    }`}>
      <style>{`
        @keyframes comboStepFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

      {/* SECCIÓN 1: Slider de Imágenes Publicitarias */}
      <div className={`relative overflow-hidden ${brand.isFord ? 'bg-slate-100' : 'bg-zinc-950'} ${
        isPortrait 
          ? 'h-[44%] w-full flex-shrink-0' 
          : isLandscape 
          ? 'w-[52%] h-full border-r-4 border-[#9AC31C]/60 flex-shrink-0' 
          : 'h-[44%] lg:h-full w-full lg:w-[52%] lg:border-r-4 border-[#9AC31C]/60 flex-shrink-0'
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
                <div className={`w-full h-full flex flex-col items-center justify-center text-center p-6 relative ${
                  brand.isFord
                    ? 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-[#212650]'
                    : 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white'
                }`}>
                  {!brand.isFord && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#9AC31C]/15 via-transparent to-transparent pointer-events-none" />
                  )}
                  <img
                    src={brand.logoSrc}
                    alt={brand.logoAlt}
                    className="h-14 sm:h-16 w-auto mb-3 drop-shadow-[0_0_20px_rgba(154,195,28,0.5)]"
                    onError={(e) => {
                      e.currentTarget.src = brand.logoFallbackSrc;
                    }}
                  />
                  <span className="text-[11px] font-racing font-bold text-[#9AC31C] tracking-widest uppercase mb-1.5">
                    {brand.tagline}
                  </span>
                  <h2 className={`text-xl sm:text-3xl font-racing font-black uppercase max-w-xl ${
                    brand.isFord ? 'text-[#212650]' : 'text-white'
                  }`}>
                    {slide.heading}
                  </h2>
                  <p className={`text-xs sm:text-sm mt-2 max-w-md font-light ${
                    brand.isFord ? 'text-[#212650]/80' : 'text-zinc-300'
                  }`}>
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

      {/* SECCIÓN INTERMEDIA: En modo Portrait se ubica en el medio entre slider y QR */}
      {isPortrait && renderStepsBanner()}

      {/* SECCIÓN 2: Contenedor del Código QR */}
      <div className={`relative flex flex-col items-center justify-between overflow-hidden ${
        brand.isFord
          ? 'bg-white text-[#212650]'
          : 'bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white'
      } ${
        isPortrait 
          ? 'flex-1 w-full min-h-0 px-3 py-2 sm:px-6 sm:py-3' 
          : isLandscape 
          ? 'w-[48%] h-full px-3 py-2 sm:px-6 sm:py-3' 
          : 'flex-1 lg:h-full w-full lg:w-[48%] min-h-0 px-3 py-2 sm:px-6 sm:py-3'
      }`}>
        {!brand.isFord && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#9AC31C]/10 via-transparent to-transparent pointer-events-none" />
        )}

        {/* En modo Landscape, los pasos dinámicos se colocan en la parte superior sobre el QR */}
        {!isPortrait && renderStepsBanner('mb-2 rounded-xl border')}

        {/* Encabezado */}
        <div className="text-center relative z-10 w-full flex-shrink-0">
          <div className="inline-flex items-center gap-1.5 bg-[#9AC31C]/20 border border-[#9AC31C] px-3 py-0.5 rounded-full text-[#9AC31C] text-[10px] sm:text-xs font-racing font-bold tracking-widest uppercase mb-1 shadow-[0_0_12px_rgba(154,195,28,0.25)] animate-pulse">
            <Sparkles className="w-3 h-3 text-[#9AC31C]" />
            <span>¡Gira la Ruleta en Vivo!</span>
          </div>
          <h2 className={`text-xl sm:text-2xl md:text-3xl font-black font-racing uppercase tracking-tight leading-none ${
            brand.isFord ? 'text-[#212650]' : 'text-white'
          }`}>
            ESCANEA <span className="text-[#9AC31C]">Y GANA</span>
          </h2>
        </div>

        {/* Área Central del Código QR */}
        <div className="relative z-10 flex-1 w-full min-h-0 flex flex-col items-center justify-center py-1 sm:py-2 overflow-hidden">
          <div 
            style={{
              width: `${qrScale}%`,
              maxWidth: `min(${qrScale}vw, ${Math.min(95, Math.round(qrScale * 0.52))}vh)`
            }}
            className="aspect-square bg-white p-3 sm:p-4 md:p-5 rounded-2xl sm:rounded-3xl shadow-[0_0_35px_rgba(154,195,28,0.45)] border-2 sm:border-4 border-[#9AC31C] flex items-center justify-center transition-all duration-300 mx-auto"
          >
            <QRCodeSVG
              value={fullUrl}
              size={350}
              style={{ width: '100%', height: '100%' }}
              level="H"
              includeMargin={false}
              fgColor={brand.isFord ? '#212650' : '#000000'}
              className="w-full h-full"
            />
          </div>
          
          <span className={`text-[10px] sm:text-xs font-racing font-bold uppercase tracking-widest mt-1.5 sm:mt-2 flex items-center gap-1.5 flex-shrink-0 ${
            brand.isFord ? 'text-[#212650]' : 'text-zinc-400'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#9AC31C] animate-ping" />
            STAND • {effectiveScreenId}
          </span>
        </div>

        {/* Pie / Instrucción inferior */}
        <p className={`text-[9px] sm:text-[11px] text-center relative z-10 flex-shrink-0 ${
          brand.isFord ? 'text-[#212650]/75 font-medium' : 'text-zinc-400'
        }`}>
          Apunta la cámara de tu celular • Completa tus datos • Presiona ENGINE START
        </p>
      </div>
    </div>
  );
}

