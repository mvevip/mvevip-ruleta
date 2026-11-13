import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Monitor,
  Smartphone,
  Layers,
  ExternalLink,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Video,
  Maximize2,
  Type
} from 'lucide-react';

export default function DisplaysManager({ apiUrl, getAdminHeaders, onNotification, stand = 'autos', standLabel = '', screenPath = '', formPath = '' }) {
  const isFord = stand === 'ford';
  const isKiosk = stand === 'kiosk' || stand.endsWith('_kiosk'); // kiosco de 2 pantallas (KIOSK_01, RIO_KIOSK, AMB_KIOSK)
  // Rutas del stand: Autos y Ford conservan las suyas; el kiosco y las ferias llegan desde el Admin (p. ej. /pantalla/?screen=RIO_STAND)
  const rawScreenPath = screenPath || (isFord ? '/pantalla2' : '/pantalla');
  const [screenBasePath, screenQs] = rawScreenPath.split('?'); // '/pantalla/' + 'screen=RIO_STAND'
  const withScreenQuery = (extra) => {
    const qs = [screenQs, extra].filter(Boolean).join('&');
    return qs ? `${screenBasePath}?${qs}` : screenBasePath;
  };
  const mobileFormPath = formPath || (isFord ? '/formulario2' : '/');
  const standName = standLabel || (isFord ? 'FORD (Pantalla 2)' : 'AUTOS (Pantalla 1)');

  const [displayConfigs, setDisplayConfigs] = useState({
    roulette: { orientation: 'auto', slide_duration: 8, layout_ratio: 'default', video_url: 'AzQlHkHx6HI', wheel_scale_x: 100, wheel_font_size: 100, video_logo_scale: 100, video_logo_visible: false },
    qr: { orientation: 'auto', slide_duration: 8, layout_ratio: 'default' },
    slider: { orientation: 'auto', slide_duration: 8, layout_ratio: 'default' },
    combo: { orientation: 'auto', slide_duration: 8, layout_ratio: '55/45' }
  });
  const [sliderImages, setSliderImages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Video de ruleta
  const [rouletteVideoInput, setRouletteVideoInput] = useState('AzQlHkHx6HI');
  const [isSavingVideo, setIsSavingVideo] = useState(false);

  // Ensanchamiento horizontal de la ruleta (Aspecto ovalado)
  const [rouletteWheelScale, setRouletteWheelScale] = useState(100);
  const [isSavingWheelScale, setIsSavingWheelScale] = useState(false);

  // Tamaño de letras de premios en la ruleta
  const [rouletteWheelFontSize, setRouletteWheelFontSize] = useState(100);
  const [isSavingWheelFontSize, setIsSavingWheelFontSize] = useState(false);

  // Tamaño y visibilidad del logotipo en pantalla de video (Oculto por defecto)
  const [rouletteVideoLogoScale, setRouletteVideoLogoScale] = useState(100);
  const [isSavingVideoLogoScale, setIsSavingVideoLogoScale] = useState(false);
  const [rouletteVideoLogoVisible, setRouletteVideoLogoVisible] = useState(false);
  const [isSavingVideoLogoVisible, setIsSavingVideoLogoVisible] = useState(false);


  // Estados de subida
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState(8);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [compressedDataUrl, setCompressedDataUrl] = useState('');
  const [compressedSizeKb, setCompressedSizeKb] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Estados de recarga remota
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAllDisplaysData();
  }, [stand]);

  const loadAllDisplaysData = async () => {
    setLoading(true);
    try {
      // 1. Configuraciones de pantallas del stand seleccionado
      const resConfig = await fetch(`${apiUrl}/api/admin/displays/config?stand=${encodeURIComponent(stand)}`, {
        headers: getAdminHeaders()
      });
      if (resConfig.ok) {
        const jsonConfig = await resConfig.json();
        if (jsonConfig.success && jsonConfig.configs) {
          setDisplayConfigs(prev => ({ ...prev, ...jsonConfig.configs }));
          if (jsonConfig.configs.roulette?.video_url) {
            setRouletteVideoInput(jsonConfig.configs.roulette.video_url);
          }
          if (jsonConfig.configs.roulette?.wheel_scale_x) {
            setRouletteWheelScale(Number(jsonConfig.configs.roulette.wheel_scale_x));
          }
          if (jsonConfig.configs.roulette?.wheel_font_size) {
            setRouletteWheelFontSize(Number(jsonConfig.configs.roulette.wheel_font_size));
          }
          if (jsonConfig.configs.roulette?.video_logo_scale) {
            setRouletteVideoLogoScale(Number(jsonConfig.configs.roulette.video_logo_scale));
          }
          setRouletteVideoLogoVisible(Boolean(jsonConfig.configs.roulette?.video_logo_visible));
        }
      }

      // 2. Lista completa de imágenes del slider para el stand seleccionado
      const resImages = await fetch(`${apiUrl}/api/admin/displays/slider-images?stand=${encodeURIComponent(stand)}`, {
        headers: getAdminHeaders()
      });
      if (resImages.ok) {
        const jsonImages = await resImages.json();
        if (jsonImages.success && Array.isArray(jsonImages.images)) {
          setSliderImages(jsonImages.images);
        }
      }
    } catch (err) {
      console.warn('Error cargando datos de pantallas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compresión inteligente en el navegador (Canvas -> WebP/JPEG max 1920x1080)
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const maxWidth = 1920;
          const maxHeight = 1080;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Intentar WebP con fallback a JPEG
          let dataUrl = canvas.toDataURL('image/webp', 0.82);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }

          const sizeInKb = Math.round((dataUrl.length * 3) / 4 / 1024);
          setIsCompressing(false);
          resolve({ dataUrl, sizeInKb });
        };
        img.onerror = () => {
          setIsCompressing(false);
          reject(new Error('No se pudo procesar la imagen'));
        };
      };
      reader.onerror = () => {
        setIsCompressing(false);
        reject(new Error('Error al leer archivo'));
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));

    try {
      const { dataUrl, sizeInKb } = await compressImage(file);
      setCompressedDataUrl(dataUrl);
      setCompressedSizeKb(sizeInKb);
    } catch (err) {
      alert('Error al optimizar imagen: ' + err.message);
    }
  };

  const handleUploadImage = async (e) => {
    e.preventDefault();
    if (!compressedDataUrl) {
      alert('Por favor selecciona una imagen para subir');
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/displays/slider-images`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          title: newTitle.trim(),
          image_url: compressedDataUrl,
          duration_seconds: Number(newDuration) || 8,
          sort_order: sliderImages.length,
          active: true
        })
      });

      const json = await res.json();
      if (json.success) {
        onNotification('Imagen agregada al slider con éxito');
        setNewTitle('');
        setNewDuration(8);
        setSelectedFile(null);
        setImagePreview('');
        setCompressedDataUrl('');
        setCompressedSizeKb(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadAllDisplaysData();
      } else {
        alert(json.error || 'Error al subir imagen');
      }
    } catch (err) {
      alert('Error de red al subir imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateOrientation = async (screenKey, newOrientation) => {
    try {
      const current = displayConfigs[screenKey] || {};
      const res = await fetch(`${apiUrl}/api/admin/displays/config`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          screen_key: screenKey,
          orientation: newOrientation,
          slide_duration: current.slide_duration || 8,
          layout_ratio: current.layout_ratio || '55/45'
        })
      });

      const json = await res.json();
      if (json.success) {
        setDisplayConfigs(prev => ({
          ...prev,
          [screenKey]: { ...prev[screenKey], orientation: newOrientation }
        }));
        onNotification(`Orientación de ${screenKey} actualizada`);
      }
    } catch (err) {
      alert('Error al actualizar orientación');
    }
  };

  const handleUpdateVideoUrl = async (screenKey = 'roulette') => {
    setIsSavingVideo(true);
    try {
      const current = displayConfigs[screenKey] || {};
      const res = await fetch(`${apiUrl}/api/admin/displays/config`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          screen_key: screenKey,
          orientation: current.orientation || 'auto',
          slide_duration: current.slide_duration || 8,
          layout_ratio: current.layout_ratio || 'default',
          video_url: rouletteVideoInput
        })
      });

      const json = await res.json();
      if (json.success) {
        const savedId = json.video_url || rouletteVideoInput;
        setDisplayConfigs(prev => ({
          ...prev,
          [screenKey]: { ...prev[screenKey], video_url: savedId }
        }));
        setRouletteVideoInput(savedId);
        onNotification('Video de YouTube de la ruleta actualizado');
      } else {
        alert(json.error || 'Error al actualizar video');
      }
    } catch (err) {
      alert('Error al actualizar video: ' + err.message);
    } finally {
      setIsSavingVideo(false);
    }
  };

  const handleUpdateWheelScale = async (newScale) => {
    const scaleNum = Math.max(80, Math.min(160, Number(newScale) || 100));
    setIsSavingWheelScale(true);
    try {
      const current = displayConfigs['roulette'] || {};
      const res = await fetch(`${apiUrl}/api/admin/displays/config`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          screen_key: 'roulette',
          orientation: current.orientation || 'auto',
          slide_duration: current.slide_duration || 8,
          layout_ratio: current.layout_ratio || 'default',
          video_url: current.video_url || 'AzQlHkHx6HI',
          qr_scale_percent: current.qr_scale_percent || 55,
          wheel_scale_x: scaleNum,
          wheel_font_size: current.wheel_font_size || rouletteWheelFontSize || 100,
          video_logo_scale: current.video_logo_scale || rouletteVideoLogoScale || 100
        })
      });

      const json = await res.json();
      if (json.success) {
        setDisplayConfigs(prev => ({
          ...prev,
          roulette: { ...prev.roulette, wheel_scale_x: scaleNum }
        }));
        setRouletteWheelScale(scaleNum);
        onNotification(`Ensanchamiento horizontal guardado: ${scaleNum}% (${(scaleNum / 100).toFixed(2)}x)`);
      } else {
        alert(json.error || 'Error al guardar ensanchamiento de ruleta');
      }
    } catch (err) {
      alert('Error al actualizar ensanchamiento: ' + err.message);
    } finally {
      setIsSavingWheelScale(false);
    }
  };

  const handleUpdateWheelFontSize = async (newFontSize) => {
    const fontNum = Math.max(70, Math.min(160, Number(newFontSize) || 100));
    setIsSavingWheelFontSize(true);
    try {
      const current = displayConfigs['roulette'] || {};
      const res = await fetch(`${apiUrl}/api/admin/displays/config`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          screen_key: 'roulette',
          orientation: current.orientation || 'auto',
          slide_duration: current.slide_duration || 8,
          layout_ratio: current.layout_ratio || 'default',
          video_url: current.video_url || 'AzQlHkHx6HI',
          qr_scale_percent: current.qr_scale_percent || 55,
          wheel_scale_x: current.wheel_scale_x || rouletteWheelScale || 100,
          wheel_font_size: fontNum,
          video_logo_scale: current.video_logo_scale || rouletteVideoLogoScale || 100
        })
      });

      const json = await res.json();
      if (json.success) {
        setDisplayConfigs(prev => ({
          ...prev,
          roulette: { ...prev.roulette, wheel_font_size: fontNum }
        }));
        setRouletteWheelFontSize(fontNum);
        onNotification(`Tamaño de letras de premios guardado: ${fontNum}%`);
      } else {
        alert(json.error || 'Error al guardar tamaño de letras');
      }
    } catch (err) {
      alert('Error al actualizar tamaño de letras: ' + err.message);
    } finally {
      setIsSavingWheelFontSize(false);
    }
  };

  const handleUpdateVideoLogoScale = async (newScale) => {
    const scaleNum = Math.max(50, Math.min(250, Number(newScale) || 100));
    setIsSavingVideoLogoScale(true);
    try {
      const current = displayConfigs['roulette'] || {};
      const res = await fetch(`${apiUrl}/api/admin/displays/config`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          screen_key: 'roulette',
          orientation: current.orientation || 'auto',
          slide_duration: current.slide_duration || 8,
          layout_ratio: current.layout_ratio || 'default',
          video_url: current.video_url || 'AzQlHkHx6HI',
          qr_scale_percent: current.qr_scale_percent || 55,
          wheel_scale_x: current.wheel_scale_x || rouletteWheelScale || 100,
          wheel_font_size: current.wheel_font_size || rouletteWheelFontSize || 100,
          video_logo_scale: scaleNum,
          video_logo_visible: rouletteVideoLogoVisible
        })
      });

      const json = await res.json();
      if (json.success) {
        setDisplayConfigs(prev => ({
          ...prev,
          roulette: { ...prev.roulette, video_logo_scale: scaleNum }
        }));
        setRouletteVideoLogoScale(scaleNum);
        onNotification(`Tamaño del logo en video guardado: ${scaleNum}% (${Math.round(54 * (scaleNum / 100))}px)`);
      } else {
        alert(json.error || 'Error al guardar tamaño del logo');
      }
    } catch (err) {
      alert('Error al actualizar tamaño del logo: ' + err.message);
    } finally {
      setIsSavingVideoLogoScale(false);
    }
  };

  const handleToggleVideoLogoVisible = async (newVisible) => {
    const visibleBool = Boolean(newVisible);
    setIsSavingVideoLogoVisible(true);
    try {
      const current = displayConfigs['roulette'] || {};
      const res = await fetch(`${apiUrl}/api/admin/displays/config`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          screen_key: 'roulette',
          orientation: current.orientation || 'auto',
          slide_duration: current.slide_duration || 8,
          layout_ratio: current.layout_ratio || 'default',
          video_url: current.video_url || 'AzQlHkHx6HI',
          qr_scale_percent: current.qr_scale_percent || 55,
          wheel_scale_x: current.wheel_scale_x || rouletteWheelScale || 100,
          wheel_font_size: current.wheel_font_size || rouletteWheelFontSize || 100,
          video_logo_scale: current.video_logo_scale || rouletteVideoLogoScale || 100,
          video_logo_visible: visibleBool
        })
      });

      const json = await res.json();
      if (json.success) {
        setDisplayConfigs(prev => ({
          ...prev,
          roulette: { ...prev.roulette, video_logo_visible: visibleBool }
        }));
        setRouletteVideoLogoVisible(visibleBool);
        onNotification(visibleBool ? 'Logotipo en video: VISIBLE' : 'Logotipo en video: OCULTO');
      } else {
        alert(json.error || 'Error al cambiar visibilidad del logo');
      }
    } catch (err) {
      alert('Error al cambiar visibilidad del logo: ' + err.message);
    } finally {
      setIsSavingVideoLogoVisible(false);
    }
  };

  const handleUpdateQrScale = async (screenKey, newScale) => {
    const scaleNum = Math.max(20, Math.min(100, Number(newScale) || 55));
    try {
      const current = displayConfigs[screenKey] || {};
      const res = await fetch(`${apiUrl}/api/admin/displays/config`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          screen_key: screenKey,
          orientation: current.orientation || 'auto',
          slide_duration: current.slide_duration || 8,
          layout_ratio: current.layout_ratio || '55/45',
          video_url: current.video_url || 'AzQlHkHx6HI',
          qr_scale_percent: scaleNum
        })
      });

      const json = await res.json();
      if (json.success) {
        setDisplayConfigs(prev => ({
          ...prev,
          [screenKey]: { ...prev[screenKey], qr_scale_percent: scaleNum }
        }));
        onNotification(`Tamaño del QR (${screenKey}) guardado: ${scaleNum}%`);
      } else {
        alert(json.error || 'Error al actualizar tamaño del QR');
      }
    } catch (err) {
      alert('Error al actualizar tamaño del QR');
    }
  };

  const handleToggleImageActive = async (image) => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/displays/slider-images/${image.id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ active: !image.active })
      });
      const json = await res.json();
      if (json.success) {
        onNotification(`Imagen ${!image.active ? 'activada' : 'desactivada'}`);
        loadAllDisplaysData();
      }
    } catch (err) {
      alert('Error al cambiar estado de imagen');
    }
  };

  const handleChangeDuration = async (id, newSecs) => {
    const secs = Math.max(2, Math.min(60, Number(newSecs) || 8));
    try {
      const res = await fetch(`${apiUrl}/api/admin/displays/slider-images/${id}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ duration_seconds: secs })
      });
      const json = await res.json();
      if (json.success) {
        setSliderImages(prev => prev.map(img => img.id === id ? { ...img, duration_seconds: secs } : img));
        onNotification('Duración actualizada');
      }
    } catch (err) {
      alert('Error al actualizar duración');
    }
  };

  const handleMoveImage = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sliderImages.length) return;

    const updated = [...sliderImages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const itemsPayload = updated.map((img, i) => ({ id: img.id, sort_order: i }));
    setSliderImages(updated);

    try {
      const res = await fetch(`${apiUrl}/api/admin/displays/slider-images/reorder`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ stand, items: itemsPayload })
      });
      const json = await res.json();
      if (json.success) {
        onNotification('Orden de imágenes guardado');
      }
    } catch (err) {
      alert('Error al guardar nuevo orden');
    }
  };

  const handleDeleteImage = async (id, title) => {
    if (!confirm(`¿Eliminar la imagen "${title || 'Slide'}"?`)) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/displays/slider-images/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      const json = await res.json();
      if (json.success) {
        onNotification('Imagen eliminada del slider');
        loadAllDisplaysData();
      }
    } catch (err) {
      alert('Error al eliminar imagen');
    }
  };

  const handleTriggerRemoteReload = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/displays/reload`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ stand, action: 'FORCE_RELOAD' })
      });
      const json = await res.json();
      if (json.success) {
        onNotification(`¡Comando emitido! Las pantallas de ${standName} se están recargando`);
      } else {
        alert(json.error || 'Error al emitir recarga');
      }
    } catch (err) {
      alert('Error de red al conectar con servidor');
    } finally {
      setTimeout(() => setIsSyncing(false), 1500);
    }
  };

  const screenHostUrl = typeof window !== 'undefined' && window.location.port === '5504'
    ? `${window.location.protocol}//${window.location.hostname}:5502`
    : '';
  const mobileHostUrl = typeof window !== 'undefined' && window.location.port === '5504'
    ? `${window.location.protocol}//${window.location.hostname}:5503`
    : '';

  // Tema claro/oscuro del kiosco (arriba y abajo). Claro = para sol directo.
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const kioskTheme = displayConfigs.roulette?.theme === 'light' ? 'light' : 'dark';
  const handleUpdateTheme = async (newTheme) => {
    if (newTheme === kioskTheme) return;
    setIsSavingTheme(true);
    try {
      const current = displayConfigs['roulette'] || {};
      const res = await fetch(`${apiUrl}/api/admin/displays/config`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          stand,
          screen_key: 'roulette',
          orientation: current.orientation || 'auto',
          slide_duration: current.slide_duration || 8,
          layout_ratio: current.layout_ratio || 'default',
          theme: newTheme
        })
      });
      const json = await res.json();
      if (json.success) {
        setDisplayConfigs(prev => ({ ...prev, roulette: { ...prev.roulette, theme: newTheme } }));
        onNotification(`Tema del kiosco: ${newTheme === 'light' ? 'CLARO ☀️' : 'OSCURO 🌙'} (se aplica en segundos en las dos pantallas)`);
      } else {
        alert(json.error || 'Error al guardar el tema');
      }
    } catch (err) {
      alert('Error de red al guardar el tema: ' + err.message);
    } finally {
      setIsSavingTheme(false);
    }
  };

  const presetClass = (active) =>
    `px-2.5 py-1 text-[11px] rounded-full font-semibold border transition-all cursor-pointer ${
      active
        ? 'bg-navy text-white border-navy'
        : 'bg-white text-ink-2 border-line-strong hover:bg-surface-2'
    }`;

  return (
    <div className="space-y-4">
      {/* TARJETA MANDO CONTROL REMOTO */}
      <div className="card card-pad flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-line bg-brand-soft text-brand-dark flex items-center justify-center shrink-0">
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className="panel-title">
              Control remoto • {standLabel || (isFord ? 'Stand 2 (Ford)' : 'Stand 1 (Autos)')}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Sincroniza y recarga las pantallas de <strong className="text-ink">{withScreenQuery('')}</strong> (Formulario: <a href={`${mobileHostUrl}${mobileFormPath}`} target="_blank" rel="noreferrer" className="underline text-brand-dark font-semibold">{mobileFormPath}</a>)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerRemoteReload}
          disabled={isSyncing}
          className="btn-primary w-full sm:w-auto min-h-[40px] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Enviando señal...' : `Recargar ${standLabel ? 'pantallas' : isFord ? 'pantalla 2' : 'pantalla 1'}`}</span>
        </button>
      </div>

      {/* SECCIÓN 1: CONFIGURACIÓN DE PANTALLAS Y ORIENTACIÓN */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-brand-dark" />
          <h3 className="panel-title">
            Pantallas de {standLabel || (isFord ? 'Ford (/pantalla2)' : 'Autos (/pantalla)')} y orientación
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Pantalla 1: Ruleta */}
          <div className="card card-pad space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="panel-title flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand" />
                Ruleta principal ({withScreenQuery('')})
              </span>
              <a
                href={`${screenHostUrl}${withScreenQuery('')}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-brand-dark hover:underline flex items-center gap-1"
              >
                <span>Abrir</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-ink-muted">
              Pantalla del juego con ruleta, telemetría y QR hacia <code className="text-ink-2 font-mono">{mobileFormPath}</code>.
            </p>

            {/* Video de YouTube de atracción */}
            <div className="bg-surface-2 border border-line rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-2 font-semibold flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-brand-dark" />
                  Video de espera (YouTube)
                </span>
                {rouletteVideoInput && (
                  <a
                    href={`https://www.youtube.com/watch?v=${rouletteVideoInput}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink-muted hover:text-brand-dark flex items-center gap-1 transition-colors"
                    title="Ver en YouTube"
                  >
                    <span>Ver</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={rouletteVideoInput}
                  onChange={(e) => setRouletteVideoInput(e.target.value)}
                  placeholder="ID o link (ej: AzQlHkHx6HI)"
                  className="input flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateVideoUrl('roulette')}
                  disabled={isSavingVideo}
                  className="btn-primary btn-sm min-h-[40px] whitespace-nowrap disabled:opacity-50"
                >
                  {isSavingVideo ? '...' : 'Guardar'}
                </button>
              </div>
              <p className="text-xs text-ink-muted leading-tight">
                Pega el enlace de YouTube o el ID. Se actualizará en la pantalla grande.
              </p>
            </div>

            {/* Tema del kiosco: oscuro / claro (sol directo) */}
            {isKiosk && (
              <div className="bg-surface-2 border border-line rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-2 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-dark" />
                    Tema del kiosco (pantalla de arriba y de abajo)
                  </span>
                  <span className="badge-lime font-mono">{kioskTheme === 'light' ? 'CLARO ☀️' : 'OSCURO 🌙'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" disabled={isSavingTheme} onClick={() => handleUpdateTheme('dark')} className={presetClass(kioskTheme === 'dark')}>🌙 Oscuro</button>
                  <button type="button" disabled={isSavingTheme} onClick={() => handleUpdateTheme('light')} className={presetClass(kioskTheme === 'light')}>☀️ Claro (sol directo)</button>
                </div>
                <p className="text-xs text-ink-muted leading-tight">
                  Usa CLARO en kioscos al aire libre: fondo blanco y texto de alto contraste para que se vea con el sol. Aplica solo a este kiosco, en las dos pantallas, en pocos segundos y sin recargar.
                </p>
              </div>
            )}

            {/* Ensanchamiento Horizontal de la Ruleta (Aspecto Ovalado) */}
            <div className="bg-surface-2 border border-line rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-ink-2 font-semibold flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-brand-dark" />
                  Ensanchamiento horizontal (ovalado)
                </span>
                <span className="badge-lime font-mono">
                  {rouletteWheelScale}% ({(rouletteWheelScale / 100).toFixed(2)}x)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="90"
                  max="150"
                  step="1"
                  value={rouletteWheelScale}
                  onChange={(e) => setRouletteWheelScale(Number(e.target.value))}
                  className="flex-1 accent-[#9AC31C] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateWheelScale(rouletteWheelScale)}
                  disabled={isSavingWheelScale}
                  className="btn-primary btn-sm min-h-[40px] whitespace-nowrap disabled:opacity-50"
                >
                  {isSavingWheelScale ? '...' : 'Guardar'}
                </button>
              </div>

              {/* Botones rápidos de preset */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '100% Circular', val: 100 },
                  { label: '110% Leve', val: 110 },
                  { label: '115% Recomendado', val: 115 },
                  { label: '120% Notorio', val: 120 },
                  { label: '125% Amplio', val: 125 }
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setRouletteWheelScale(preset.val);
                      handleUpdateWheelScale(preset.val);
                    }}
                    className={presetClass(rouletteWheelScale === preset.val)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-muted leading-tight">
                Ajusta la anchura de la ruleta en la pantalla del stand para adaptarla a pantallas anchas LED.
              </p>
            </div>

            {/* Tamaño de Letras de Premios en la Ruleta */}
            <div className="bg-surface-2 border border-line rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-ink-2 font-semibold flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-brand-dark" />
                  Tamaño de letras de premios
                </span>
                <span className="badge-lime font-mono">
                  {rouletteWheelFontSize}% {rouletteWheelFontSize > 100 ? `(+${rouletteWheelFontSize - 100}%)` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="80"
                  max="150"
                  step="1"
                  value={rouletteWheelFontSize}
                  onChange={(e) => setRouletteWheelFontSize(Number(e.target.value))}
                  className="flex-1 accent-[#9AC31C] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateWheelFontSize(rouletteWheelFontSize)}
                  disabled={isSavingWheelFontSize}
                  className="btn-primary btn-sm min-h-[40px] whitespace-nowrap disabled:opacity-50"
                >
                  {isSavingWheelFontSize ? '...' : 'Guardar'}
                </button>
              </div>

              {/* Botones rápidos de preset */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '90% Compacto', val: 90 },
                  { label: '100% Estándar', val: 100 },
                  { label: '115% Recomendado', val: 115 },
                  { label: '125% Grande', val: 125 },
                  { label: '135% Extra Grande', val: 135 }
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => {
                      setRouletteWheelFontSize(preset.val);
                      handleUpdateWheelFontSize(preset.val);
                    }}
                    className={presetClass(rouletteWheelFontSize === preset.val)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-muted leading-tight">
                Aumenta el tamaño del texto dentro de cada gajo con ajuste automático de seguridad para no salirse.
              </p>
            </div>

            {/* Visibilidad y Tamaño del Logotipo en Pantalla de Video */}
            <div className="bg-surface-2 border border-line rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-ink-2 font-semibold flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-dark" />
                  Logo en pantalla de video
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleVideoLogoVisible(!rouletteVideoLogoVisible)}
                  disabled={isSavingVideoLogoVisible}
                  className={`${rouletteVideoLogoVisible ? 'btn-primary' : 'btn-ghost'} btn-sm min-h-[40px] flex items-center gap-1.5 disabled:opacity-50`}
                  title={rouletteVideoLogoVisible ? 'Ocultar logotipo en video' : 'Mostrar logotipo en video'}
                >
                  {rouletteVideoLogoVisible ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visible (clic para ocultar)</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Oculto (clic para mostrar)</span>
                    </>
                  )}
                </button>
              </div>

              {rouletteVideoLogoVisible && (
                <>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-ink-muted">Escala del logo:</span>
                    <span className="badge-lime font-mono">
                      {rouletteVideoLogoScale}% ({Math.round(54 * (rouletteVideoLogoScale / 100))}px)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="70"
                      max="220"
                      step="5"
                      value={rouletteVideoLogoScale}
                      onChange={(e) => setRouletteVideoLogoScale(Number(e.target.value))}
                      className="flex-1 accent-[#9AC31C] cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateVideoLogoScale(rouletteVideoLogoScale)}
                      disabled={isSavingVideoLogoScale}
                      className="btn-primary btn-sm min-h-[40px] whitespace-nowrap disabled:opacity-50"
                    >
                      {isSavingVideoLogoScale ? '...' : 'Guardar'}
                    </button>
                  </div>

                  {/* Botones rápidos de preset */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: '100% (54px)', val: 100 },
                      { label: '125% (68px)', val: 125 },
                      { label: '150% (81px)', val: 150 },
                      { label: '175% (95px)', val: 175 },
                      { label: '200% (108px)', val: 200 }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => {
                          setRouletteVideoLogoScale(preset.val);
                          handleUpdateVideoLogoScale(preset.val);
                        }}
                        className={presetClass(rouletteVideoLogoScale === preset.val)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="text-xs text-ink-muted leading-tight">
                Por defecto el logotipo permanece escondido para no tapar el video. Actívalo aquí si deseas mostrarlo.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Pantalla 2: Solo QR */}
            <div className="card card-pad space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="panel-title flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-brand-dark" />
                  Solo QR gigante
                </span>
                <a
                  href={`${screenHostUrl}${withScreenQuery('view=qr')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-dark hover:underline flex items-center gap-1"
                >
                  <span>Abrir</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-muted">Orientación:</span>
                <select
                  value={displayConfigs.qr?.orientation || 'auto'}
                  onChange={(e) => handleUpdateOrientation('qr', e.target.value)}
                  className="input !w-auto min-w-0 max-w-[62%] sm:max-w-none"
                >
                  <option value="auto">Automática (Auto)</option>
                  <option value="landscape">Horizontal (Landscape)</option>
                  <option value="portrait">Vertical (Portrait / Tótem)</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-line">
                <span className="text-xs text-ink-muted">Tamaño QR:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="40"
                    max="95"
                    step="5"
                    value={displayConfigs.qr?.qr_scale_percent || 75}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDisplayConfigs(prev => ({
                        ...prev,
                        qr: { ...prev.qr, qr_scale_percent: val }
                      }));
                    }}
                    onMouseUp={(e) => handleUpdateQrScale('qr', e.target.value)}
                    onTouchEnd={(e) => handleUpdateQrScale('qr', e.target.value)}
                    className="w-20 sm:w-28 accent-[#9AC31C] cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-brand-dark w-9 text-right">
                    {displayConfigs.qr?.qr_scale_percent || 75}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQrScale('qr', displayConfigs.qr?.qr_scale_percent || 75)}
                    className="btn-primary btn-sm min-h-[40px]"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>

            {/* Pantalla 3: Solo Slider */}
            <div className="card card-pad space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="panel-title flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-dark" />
                  Solo slider de banners
                </span>
                <a
                  href={`${screenHostUrl}${withScreenQuery('view=slider')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-dark hover:underline flex items-center gap-1"
                >
                  <span>Abrir</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-muted">Orientación:</span>
                <select
                  value={displayConfigs.slider?.orientation || 'auto'}
                  onChange={(e) => handleUpdateOrientation('slider', e.target.value)}
                  className="input !w-auto min-w-0 max-w-[62%] sm:max-w-none"
                >
                  <option value="auto">Automática (Auto)</option>
                  <option value="landscape">Horizontal (Landscape)</option>
                  <option value="portrait">Vertical (Portrait / Tótem)</option>
                </select>
              </div>
            </div>

            {/* Pantalla 4: Híbrida Combo */}
            <div className="card card-pad space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="panel-title flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand-dark" />
                  Híbrida (slider + QR)
                </span>
                <a
                  href={`${screenHostUrl}${withScreenQuery('view=combo')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-dark hover:underline flex items-center gap-1"
                >
                  <span>Abrir</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-ink-muted">Orientación:</span>
                <select
                  value={displayConfigs.combo?.orientation || 'auto'}
                  onChange={(e) => handleUpdateOrientation('combo', e.target.value)}
                  className="input !w-auto min-w-0 max-w-[62%] sm:max-w-none"
                >
                  <option value="auto">Automática (Auto)</option>
                  <option value="landscape">Horizontal (Landscape)</option>
                  <option value="portrait">Vertical (Portrait / Tótem)</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-line">
                <span className="text-xs text-ink-muted">Tamaño QR:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="30"
                    max="90"
                    step="5"
                    value={displayConfigs.combo?.qr_scale_percent || 55}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDisplayConfigs(prev => ({
                        ...prev,
                        combo: { ...prev.combo, qr_scale_percent: val }
                      }));
                    }}
                    onMouseUp={(e) => handleUpdateQrScale('combo', e.target.value)}
                    onTouchEnd={(e) => handleUpdateQrScale('combo', e.target.value)}
                    className="w-20 sm:w-28 accent-[#9AC31C] cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-brand-dark w-9 text-right">
                    {displayConfigs.combo?.qr_scale_percent || 55}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQrScale('combo', displayConfigs.combo?.qr_scale_percent || 55)}
                    className="btn-primary btn-sm min-h-[40px]"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: GESTOR DE IMÁGENES DEL SLIDER */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-brand-dark" />
          <h3 className="panel-title">
            Banners y slider de imágenes ({sliderImages.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Formulario de Subida con Compresión WebP en Cliente */}
          <form onSubmit={handleUploadImage} className="card card-pad space-y-3">
            <span className="panel-title block">
              Subir nueva imagen publicitaria
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Título / nombre de campaña</label>
                <input
                  type="text"
                  placeholder="Ej: Promo Autos 0km 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Tiempo en pantalla (segundos)</label>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={newDuration}
                  onChange={(e) => setNewDuration(parseInt(e.target.value, 10) || 8)}
                  className="input font-mono"
                />
              </div>
            </div>

            {/* Selector de Archivo */}
            <div>
              <label className="label">Seleccionar imagen (JPG, PNG, WebP)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-ink-2 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border file:border-line-strong file:text-xs file:font-semibold file:bg-white file:text-ink-2 hover:file:bg-surface-2 cursor-pointer"
              />
            </div>

            {/* Preview y Detalles de Compresión */}
            {imagePreview && (
              <div className="flex items-center gap-3 p-2 bg-surface-2 rounded-xl border border-line">
                <img src={imagePreview} alt="Preview" className="w-16 h-12 object-cover rounded-lg border border-line bg-surface" />
                <div className="text-xs text-ink-2">
                  <span className="text-brand-dark font-semibold block">
                    {isCompressing ? 'Optimizando imagen...' : `Lista para subir (~${compressedSizeKb} KB WebP)`}
                  </span>
                  <span className="text-ink-muted text-xs">Optimizada automáticamente a Full HD</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!compressedDataUrl || isCompressing || isUploading}
              className="btn-primary w-full min-h-[40px] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Subiendo...' : 'Agregar al slider'}</span>
            </button>
          </form>

          {/* Lista de Imágenes Existentes */}
          <div className="space-y-2">
            {sliderImages.length === 0 ? (
              <div className="card card-pad text-center text-ink-muted text-xs">
                No hay imágenes en el slider. Sube la primera imagen con el formulario.
              </div>
            ) : (
              sliderImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`card p-3 flex items-center justify-between gap-3 transition-all ${
                    image.active ? '' : 'opacity-60'
                  }`}
                >
                  {/* Miniatura e Información */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={image.image_url}
                      alt={image.title}
                      className="w-16 h-12 object-cover rounded-xl border border-line bg-surface-2 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-ink truncate block">
                        {image.title || `Slide #${index + 1}`}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-muted">
                        <Clock className="w-3 h-3 text-brand-dark" />
                        <input
                          type="number"
                          min="2"
                          max="60"
                          value={image.duration_seconds}
                          onChange={(e) => handleChangeDuration(image.id, e.target.value)}
                          className="input !w-14 !px-1 !py-0.5 text-center font-mono"
                        />
                        <span>segundos</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones: Reordenar, Toggle Activo y Eliminar */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveImage(index, -1)}
                      className="btn-icon !w-9 !h-9 disabled:opacity-30"
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={index === sliderImages.length - 1}
                      onClick={() => handleMoveImage(index, 1)}
                      className="btn-icon !w-9 !h-9 disabled:opacity-30"
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleImageActive(image)}
                      className={`btn-icon !w-9 !h-9 ${
                        image.active ? '!bg-brand-soft !text-brand-dark !border-brand' : '!text-ink-muted'
                      }`}
                      title={image.active ? 'Desactivar de pantalla' : 'Activar en pantalla'}
                    >
                      {image.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image.id, image.title)}
                      className="btn-icon !w-9 !h-9 !text-red-600 hover:!bg-red-50"
                      title="Eliminar del slider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
