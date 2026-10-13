import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Sparkles, Trophy, Zap, ArrowRight } from 'lucide-react';
import useRemoteDisplaySync from '../hooks/useRemoteDisplaySync';

export default function DisplayComboView({ mobileUrl = '', screenId = 'STAND_01' }) {
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

  const fullUrl = `${mobileUrl || window.location.origin}?screen=${screenId}`;
  
  // Si el admin configuró explícitamente portrait o landscape, respetamos esa opción; si está en 'auto', usamos la pantalla física
  const configOrientation = displayConfig?.orientation || 'auto';
  const effectiveOrientation = configOrientation !== 'auto' ? configOrientation : windowOrientation;
  const isPortrait = effectiveOrientation === 'portrait';
  const isLandscape = effectiveOrientation === 'landscape';

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

  // Componente de los 3 Pasos Dinámicos
  const renderStepsBanner = (extraClasses = '') => (
    <div className={`relative z-20 w-full bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-y-2 border-[#9AC31C]/60 py-2.5 sm:py-3.5 px-3 sm:px-6 shadow-[0_0_35px_rgba(154,195,28,0.3)] ${extraClasses}`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3 md:gap-4">
        {/* Paso 1: Escanea */}
        <div 
          className="flex-1 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-red-500/50 rounded-2xl p-2 sm:p-3 md:p-3.5 flex items-center gap-2 sm:gap-3 shadow-lg"
          style={{ animation: 'comboStepFloat 3.2s ease-in-out infinite 0s' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white font-racing font-black text-base sm:text-lg md:text-xl shadow-[0_0_15px_rgba(239,68,68,0.7)] flex items-center justify-center">
              1
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400 animate-ping opacity-75" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-red-400 hidden sm:inline" />
              <span className="font-racing font-black text-xs sm:text-sm md:text-base text-white uppercase tracking-wider truncate">
                Escanea
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 truncate font-light">
              Apunta tu cámara
            </p>
          </div>
        </div>

        {/* Conector 1 -> 2 */}
        <div className="flex-shrink-0 text-[#9AC31C] px-0.5 sm:px-1" style={{ animation: 'comboArrowBounce 1.5s ease-in-out infinite 0s' }}>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
        </div>

        {/* Paso 2: Regístrate */}
        <div 
          className="flex-1 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-[#9AC31C]/60 rounded-2xl p-2 sm:p-3 md:p-3.5 flex items-center gap-2 sm:gap-3 shadow-lg"
          style={{ animation: 'comboStepFloat 3.2s ease-in-out infinite 0.6s' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-xl bg-gradient-to-br from-[#9AC31C] to-[#7A9E14] text-black font-racing font-black text-base sm:text-lg md:text-xl shadow-[0_0_18px_rgba(154,195,28,0.7)] flex items-center justify-center">
              2
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#9AC31C] animate-ping opacity-75" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#9AC31C] hidden sm:inline" />
              <span className="font-racing font-black text-xs sm:text-sm md:text-base text-[#9AC31C] uppercase tracking-wider truncate">
                Regístrate
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 truncate font-light">
              Ingresa tus datos
            </p>
          </div>
        </div>

        {/* Conector 2 -> 3 */}
        <div className="flex-shrink-0 text-[#9AC31C] px-0.5 sm:px-1" style={{ animation: 'comboArrowBounce 1.5s ease-in-out infinite 0.3s' }}>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
        </div>

        {/* Paso 3: ¡Gira y Gana! */}
        <div 
          className="flex-1 bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-yellow-500/60 rounded-2xl p-2 sm:p-3 md:p-3.5 flex items-center gap-2 sm:gap-3 shadow-lg"
          style={{ animation: 'comboStepFloat 3.2s ease-in-out infinite 1.2s' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-red-600 text-black font-racing font-black text-base sm:text-lg md:text-xl shadow-[0_0_20px_rgba(245,158,11,0.7)] flex items-center justify-center">
              3
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-yellow-400 animate-ping opacity-75" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-400 hidden sm:inline" />
              <span className="font-racing font-black text-xs sm:text-sm md:text-base text-yellow-400 uppercase tracking-wider truncate">
                ¡Gira y Gana!
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-300 truncate font-light">
              Premios al instante
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full h-screen bg-black overflow-hidden flex select-none ${
      isPortrait ? 'flex-col' : isLandscape ? 'flex-row' : 'flex-col lg:flex-row'
    }`}>
      <style>{`
        @keyframes comboStepFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes comboArrowBounce {
          0%, 100% { transform: translateX(0px); opacity: 0.5; }
          50% { transform: translateX(4px); opacity: 1; }
        }
      `}</style>

      {/* SECCIÓN 1: Slider de Imágenes Publicitarias */}
      <div className={`relative overflow-hidden bg-zinc-950 ${
        isPortrait 
          ? 'h-[44%] w-full' 
          : isLandscape 
          ? 'w-[52%] h-full border-r-4 border-[#9AC31C]/60' 
          : 'h-[44%] lg:h-full w-full lg:w-[52%] lg:border-r-4 border-[#9AC31C]/60'
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

      {/* SECCIÓN INTERMEDIA: En modo Portrait se ubica DIRECTAMENTE EN EL MEDIO entre el slider y el QR */}
      {isPortrait && renderStepsBanner()}

      {/* SECCIÓN 2: Contenedor del Código QR (y Pasos si está en Landscape) */}
      <div className={`relative bg-gradient-to-b from-zinc-950 via-zinc-900 to-black flex flex-col justify-between items-center text-white ${
        isPortrait 
          ? 'flex-1 w-full min-h-0 p-4 sm:p-6' 
          : isLandscape 
          ? 'w-[48%] h-full p-4 sm:p-6 justify-between' 
          : 'flex-1 lg:h-full w-full lg:w-[48%] min-h-0 p-4 sm:p-6'
      }`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#9AC31C]/10 via-transparent to-transparent pointer-events-none" />

        {/* En modo Landscape, los pasos dinámicos se colocan en la parte superior sobre el QR */}
        {!isPortrait && renderStepsBanner('mb-3 sm:mb-4 rounded-2xl border-2')}

        {/* Encabezado Llamativo */}
        <div className="text-center relative z-10 w-full mb-1">
          <div className="inline-flex items-center gap-1.5 bg-[#9AC31C]/20 border border-[#9AC31C] px-3.5 py-1 rounded-full text-[#9AC31C] text-[11px] sm:text-xs font-racing font-bold tracking-widest uppercase mb-1.5 shadow-[0_0_15px_rgba(154,195,28,0.3)] animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-[#9AC31C]" />
            <span>¡Gira la Ruleta en Vivo!</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-racing uppercase tracking-tight text-white leading-tight">
            ESCANEA <span className="text-[#9AC31C]">Y GANA</span>
          </h2>
        </div>

        {/* Caja del Código QR - Ajustado a ~80% de ancho del contenedor */}
        <div className="relative z-10 my-auto flex-1 w-full flex flex-col items-center justify-center min-h-0 py-1">
          <div 
            className="w-[82%] max-w-[min(82vw,48vh)] aspect-square bg-white p-4 sm:p-6 rounded-3xl shadow-[0_0_50px_rgba(154,195,28,0.55),0_0_100px_rgba(154,195,28,0.2)] border-4 border-[#9AC31C] flex items-center justify-center relative transition-transform hover:scale-[1.02]"
          >
            <QRCodeSVG
              value={fullUrl}
              size={400}
              style={{ width: '100%', height: '100%' }}
              level="H"
              includeMargin={false}
              className="w-full h-full"
            />
          </div>
          <span className="text-xs sm:text-sm font-racing font-bold text-zinc-400 uppercase tracking-widest mt-2 sm:mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#9AC31C] animate-ping" />
            STAND • {screenId}
          </span>
        </div>

        {/* Subtítulo / Instrucción inferior */}
        <p className="text-[11px] sm:text-xs text-zinc-400 text-center relative z-10 mt-1">
          Apunta la cámara de tu celular • Completa tus datos • Presiona ENGINE START
        </p>
      </div>
    </div>
  );
}
