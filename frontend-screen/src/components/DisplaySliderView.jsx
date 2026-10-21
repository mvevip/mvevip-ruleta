import React, { useState, useEffect } from 'react';
import useRemoteDisplaySync from '../hooks/useRemoteDisplaySync';
import { Image as ImageIcon, Sparkles } from 'lucide-react';
import { getScreenBrandConfig } from '../brand';

export default function DisplaySliderView() {
  const brand = getScreenBrandConfig();
  const { displayConfig, sliderImages } = useRemoteDisplaySync('slider');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const orientation = displayConfig?.orientation || 'auto';

  // Si no hay imágenes en la base de datos, mostramos slides semilla elegantes según el stand
  const defaultSlides = brand.isFord
    ? [
        {
          id: 'default-ford-1',
          title: 'Ford | Quito Motors - Feria 2026',
          image_url: '',
          isPlaceholder: true,
          duration_seconds: 8,
          heading: 'FORD | QUITO MOTORS',
          subheading: 'Descubre la gama Ford y vive la experiencia oficial en nuestro stand'
        },
        {
          id: 'default-ford-2',
          title: 'Premios Inmediatos Ford',
          image_url: '',
          isPlaceholder: true,
          duration_seconds: 8,
          heading: '¡ESCANEA EL QR Y GIRA LA RULETA!',
          subheading: 'Participa en tu celular y gana premios oficiales Ford al instante'
        }
      ]
    : [
        {
          id: 'default-1',
          title: 'Marketing VIP Autos - Feria 2026',
          image_url: '',
          isPlaceholder: true,
          duration_seconds: 8,
          heading: 'ESPECIALISTAS EN SUEÑOS',
          subheading: 'Encuentra el auto de tus sueños con las mejores condiciones VIP de la feria'
        },
        {
          id: 'default-2',
          title: 'Premios Inmediatos en Ruleta',
          image_url: '',
          isPlaceholder: true,
          duration_seconds: 8,
          heading: '¡GIRA Y GANA EN NUESTRO STAND!',
          subheading: 'Escanea el código QR en tu celular y participa por bonos y viajes internacionales'
        }
      ];

  const activeSlides = sliderImages && sliderImages.length > 0 ? sliderImages : defaultSlides;
  const currentSlide = activeSlides[currentIndex % activeSlides.length] || activeSlides[0];
  const slideDuration = (currentSlide?.duration_seconds || displayConfig?.slide_duration || 8) * 1000;

  // Manejo del temporizador de avance de slides y barra de progreso
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

  return (
    <div className={`relative w-full h-screen overflow-hidden flex flex-col justify-between select-none ${
      brand.isFord ? 'bg-white' : 'bg-black'
    }`}>
      {/* Contenedor de Diapositivas con Transición Suave */}
      <div className="absolute inset-0 w-full h-full">
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
                /* Diapositiva por defecto cuando aún no se han subido imágenes */
                <div className={`w-full h-full flex flex-col items-center justify-center text-center p-8 relative ${
                  brand.isFord
                    ? 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-[#212650]'
                    : 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white'
                }`}>
                  {!brand.isFord && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#9AC31C]/15 via-transparent to-transparent pointer-events-none" />
                  )}

                  <img
                    src={brand.logoSrc}
                    alt={brand.logoAlt}
                    className="h-20 w-auto mb-8 drop-shadow-[0_0_25px_rgba(154,195,28,0.6)]"
                    onError={(e) => {
                      e.currentTarget.src = brand.logoFallbackSrc;
                    }}
                  />

                  <div className="inline-flex items-center gap-2 bg-[#9AC31C]/20 border border-[#9AC31C] px-5 py-2 rounded-full text-[#9AC31C] font-racing font-bold tracking-widest text-sm uppercase mb-6 shadow-[0_0_20px_rgba(154,195,28,0.4)]">
                    <Sparkles className="w-5 h-5" />
                    <span>{slide.title || 'Cartelería Digital VIP'}</span>
                  </div>

                  <h2 className={`text-4xl sm:text-6xl font-black font-racing uppercase tracking-tight max-w-4xl leading-tight ${
                    brand.isFord ? 'text-[#212650]' : 'text-white drop-shadow-2xl'
                  }`}>
                    {slide.heading || 'BIENVENIDOS AL STAND VIP'}
                  </h2>

                  <p className={`text-xl sm:text-2xl mt-4 max-w-2xl font-light ${
                    brand.isFord ? 'text-[#212650]/80' : 'text-zinc-300'
                  }`}>
                    {slide.subheading || 'Sube imágenes publicitarias desde el panel de administración (/admin)'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gradiente sutil en el borde inferior para contraste */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-20" />

      {/* Barra de Progreso del Slide Activo en la Base */}
      <div className="absolute bottom-0 inset-x-0 h-2 bg-zinc-900/80 z-30 overflow-hidden">
        <div
          className="h-full bg-[#9AC31C] shadow-[0_0_12px_#9AC31C] transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Indicador discreto de diapositivas en la esquina inferior */}
      <div className="absolute bottom-4 right-6 z-30 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 text-xs font-mono text-zinc-300">
        <ImageIcon className="w-3.5 h-3.5 text-[#9AC31C]" />
        <span>
          {(currentIndex % activeSlides.length) + 1} / {activeSlides.length}
        </span>
        <span className="text-zinc-500">•</span>
        <span className="text-white font-semibold">{orientation.toUpperCase()}</span>
      </div>
    </div>
  );
}

