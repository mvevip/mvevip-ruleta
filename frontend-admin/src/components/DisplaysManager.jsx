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
  Video
} from 'lucide-react';

export default function DisplaysManager({ apiUrl, getAdminHeaders, onNotification }) {
  const [displayConfigs, setDisplayConfigs] = useState({
    roulette: { orientation: 'auto', slide_duration: 8, layout_ratio: 'default', video_url: 'AzQlHkHx6HI' },
    qr: { orientation: 'auto', slide_duration: 8, layout_ratio: 'default' },
    slider: { orientation: 'auto', slide_duration: 8, layout_ratio: 'default' },
    combo: { orientation: 'auto', slide_duration: 8, layout_ratio: '55/45' }
  });
  const [sliderImages, setSliderImages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Video de ruleta
  const [rouletteVideoInput, setRouletteVideoInput] = useState('AzQlHkHx6HI');
  const [isSavingVideo, setIsSavingVideo] = useState(false);

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
  }, []);

  const loadAllDisplaysData = async () => {
    setLoading(true);
    try {
      // 1. Configuraciones de pantallas
      const resConfig = await fetch(`${apiUrl}/api/admin/displays/config`, {
        headers: getAdminHeaders()
      });
      if (resConfig.ok) {
        const jsonConfig = await resConfig.json();
        if (jsonConfig.success && jsonConfig.configs) {
          setDisplayConfigs(prev => ({ ...prev, ...jsonConfig.configs }));
          if (jsonConfig.configs.roulette?.video_url) {
            setRouletteVideoInput(jsonConfig.configs.roulette.video_url);
          }
        }
      }

      // 2. Lista completa de imágenes del slider
      const resImages = await fetch(`${apiUrl}/api/admin/displays/slider-images`, {
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
        body: JSON.stringify({ items: itemsPayload })
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
        body: JSON.stringify({ action: 'FORCE_RELOAD' })
      });
      const json = await res.json();
      if (json.success) {
        onNotification('¡Comando emitido! Todas las pantallas se están recargando');
      } else {
        alert(json.error || 'Error al emitir recarga');
      }
    } catch (err) {
      alert('Error de red al conectar con servidor');
    } finally {
      setTimeout(() => setIsSyncing(false), 1500);
    }
  };

  return (
    <div className="space-y-6">
      {/* TARJETA MANDO CONTROL REMOTO */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 p-4 rounded-2xl border-2 border-[#9AC31C]/60 shadow-[0_0_25px_rgba(154,195,28,0.2)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#9AC31C]/20 border border-[#9AC31C] flex items-center justify-center text-[#9AC31C]">
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className="font-racing font-bold text-sm text-white uppercase tracking-wider">
              Control Remoto de Pantallas
            </h3>
            <p className="text-[11px] text-zinc-400">
              Sincroniza y recarga automáticamente todas las pantallas físicas del stand
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerRemoteReload}
          disabled={isSyncing}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-[#84A816] via-[#9AC31C] to-[#84A816] hover:brightness-110 active:scale-95 text-black font-racing font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'ENVIANDO SEÑAL...' : 'RECARGAR PANTALLAS'}</span>
        </button>
      </div>

      {/* SECCIÓN 1: CONFIGURACIÓN DE PANTALLAS Y ORIENTACIÓN */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-[#9AC31C]" />
          <h3 className="font-racing font-bold text-sm text-white uppercase tracking-wider">
            Pantallas del Stand & Orientación
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pantalla 1: Ruleta */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-racing font-bold text-xs text-white uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#9AC31C]" />
                Ruleta Principal
              </span>
              <a
                href="/pantalla"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#9AC31C] hover:underline flex items-center gap-1"
              >
                <span>Abrir</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-zinc-400">
              Pantalla del juego con ruleta rin, telemetría y QR arrastrable.
            </p>

            {/* Video de YouTube de atracción */}
            <div className="pt-2.5 border-t border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#9AC31C]" />
                  Video Standby (YouTube):
                </span>
                {rouletteVideoInput && (
                  <a
                    href={`https://www.youtube.com/watch?v=${rouletteVideoInput}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-zinc-400 hover:text-[#9AC31C] flex items-center gap-1 transition-colors"
                    title="Ver en YouTube"
                  >
                    <span>Ver</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={rouletteVideoInput}
                  onChange={(e) => setRouletteVideoInput(e.target.value)}
                  placeholder="ID o link (ej: AzQlHkHx6HI)"
                  className="flex-1 bg-zinc-950 border border-zinc-700 text-xs text-white rounded-lg px-2.5 py-1.5 focus:border-[#9AC31C] focus:outline-none placeholder-zinc-600 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateVideoUrl('roulette')}
                  disabled={isSavingVideo}
                  className="px-3 py-1.5 bg-[#9AC31C] hover:bg-[#84A816] active:scale-95 text-black font-racing font-bold text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                >
                  {isSavingVideo ? '...' : 'Guardar'}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">
                Pega el enlace de YouTube o el ID. Se actualizará en la pantalla grande.
              </p>
            </div>
          </div>

          {/* Pantalla 2: Solo QR */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-racing font-bold text-xs text-white uppercase flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#9AC31C]" />
                Solo QR Gigante
              </span>
              <a
                href="/pantalla?view=qr"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#9AC31C] hover:underline flex items-center gap-1"
              >
                <span>Abrir</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400">Orientación:</span>
              <select
                value={displayConfigs.qr?.orientation || 'auto'}
                onChange={(e) => handleUpdateOrientation('qr', e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-xs text-white rounded-lg px-2 py-1 focus:border-[#9AC31C] focus:outline-none"
              >
                <option value="auto">Automática (Auto)</option>
                <option value="landscape">Horizontal (Landscape)</option>
                <option value="portrait">Vertical (Portrait / Tótem)</option>
              </select>
            </div>
          </div>

          {/* Pantalla 3: Solo Slider */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-racing font-bold text-xs text-white uppercase flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#9AC31C]" />
                Solo Slider Banners
              </span>
              <a
                href="/pantalla?view=slider"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#9AC31C] hover:underline flex items-center gap-1"
              >
                <span>Abrir</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400">Orientación:</span>
              <select
                value={displayConfigs.slider?.orientation || 'auto'}
                onChange={(e) => handleUpdateOrientation('slider', e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-xs text-white rounded-lg px-2 py-1 focus:border-[#9AC31C] focus:outline-none"
              >
                <option value="auto">Automática (Auto)</option>
                <option value="landscape">Horizontal (Landscape)</option>
                <option value="portrait">Vertical (Portrait / Tótem)</option>
              </select>
            </div>
          </div>

          {/* Pantalla 4: Híbrida Combo */}
          <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-racing font-bold text-xs text-white uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#9AC31C]" />
                Híbrida (Slider + QR)
              </span>
              <a
                href="/pantalla?view=combo"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#9AC31C] hover:underline flex items-center gap-1"
              >
                <span>Abrir</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400">Orientación:</span>
              <select
                value={displayConfigs.combo?.orientation || 'auto'}
                onChange={(e) => handleUpdateOrientation('combo', e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-xs text-white rounded-lg px-2 py-1 focus:border-[#9AC31C] focus:outline-none"
              >
                <option value="auto">Automática (Auto)</option>
                <option value="landscape">Horizontal (Landscape)</option>
                <option value="portrait">Vertical (Portrait / Tótem)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: GESTOR DE IMÁGENES DEL SLIDER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#9AC31C]" />
            <h3 className="font-racing font-bold text-sm text-white uppercase tracking-wider">
              Banners y Slider de Imágenes ({sliderImages.length})
            </h3>
          </div>
        </div>

        {/* Formulario de Subida con Compresión WebP en Cliente */}
        <form onSubmit={handleUploadImage} className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl space-y-3">
          <span className="text-xs font-racing font-bold text-[#9AC31C] uppercase block">
            Subir Nueva Imagen Publicitaria
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Título / Nombre de Campaña</label>
              <input
                type="text"
                placeholder="Ej: Promo Autos 0km 2026"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white rounded-xl px-3 py-2 focus:border-[#9AC31C] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Tiempo en Pantalla (Segundos)</label>
              <input
                type="number"
                min="2"
                max="60"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value, 10) || 8)}
                className="w-full bg-zinc-950 border border-zinc-700 text-xs text-white rounded-xl px-3 py-2 focus:border-[#9AC31C] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Selector de Archivo */}
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1">Seleccionar Imagen (JPG, PNG, WebP)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-racing file:bg-zinc-800 file:text-[#9AC31C] hover:file:bg-zinc-700 cursor-pointer"
            />
          </div>

          {/* Preview y Detalles de Compresión */}
          {imagePreview && (
            <div className="flex items-center gap-3 p-2 bg-zinc-950 rounded-xl border border-zinc-800">
              <img src={imagePreview} alt="Preview" className="w-16 h-12 object-cover rounded-lg border border-zinc-700" />
              <div className="text-[11px] text-zinc-300">
                <span className="text-[#9AC31C] font-semibold block">
                  {isCompressing ? 'Optimizando imagen...' : `Lista para subir (~${compressedSizeKb} KB WebP)`}
                </span>
                <span className="text-zinc-500 text-[10px]">Optimizada automáticamente a Full HD</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!compressedDataUrl || isCompressing || isUploading}
            className="w-full py-2.5 bg-[#9AC31C] hover:bg-[#84A816] active:scale-95 text-black font-racing font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'SUBIENDO...' : 'AGREGAR AL SLIDER'}</span>
          </button>
        </form>

        {/* Lista de Imágenes Existentes */}
        <div className="space-y-2">
          {sliderImages.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl text-center text-zinc-500 text-xs">
              No hay imágenes en el slider. Sube la primera imagen arriba.
            </div>
          ) : (
            sliderImages.map((image, index) => (
              <div
                key={image.id}
                className={`bg-zinc-900/90 border p-3 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                  image.active ? 'border-zinc-800' : 'border-zinc-800/40 opacity-50'
                }`}
              >
                {/* Miniatura e Información */}
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={image.image_url}
                    alt={image.title}
                    className="w-16 h-12 object-cover rounded-xl border border-zinc-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white truncate block">
                      {image.title || `Slide #${index + 1}`}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                      <Clock className="w-3 h-3 text-[#9AC31C]" />
                      <input
                        type="number"
                        min="2"
                        max="60"
                        value={image.duration_seconds}
                        onChange={(e) => handleChangeDuration(image.id, e.target.value)}
                        className="w-12 bg-zinc-950 border border-zinc-700 px-1 py-0.5 rounded text-center text-white text-[11px] font-mono focus:border-[#9AC31C] focus:outline-none"
                      />
                      <span>segundos</span>
                    </div>
                  </div>
                </div>

                {/* Acciones: Reordenar, Toggle Activo y Eliminar */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Subir orden */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMoveImage(index, -1)}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Mover arriba"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Bajar orden */}
                  <button
                    type="button"
                    disabled={index === sliderImages.length - 1}
                    onClick={() => handleMoveImage(index, 1)}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
                    title="Mover abajo"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Activar / Desactivar */}
                  <button
                    type="button"
                    onClick={() => handleToggleImageActive(image)}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      image.active ? 'bg-[#9AC31C]/20 text-[#9AC31C]' : 'bg-zinc-800 text-zinc-500'
                    }`}
                    title={image.active ? 'Desactivar de pantalla' : 'Activar en pantalla'}
                  >
                    {image.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image.id, image.title)}
                    className="p-1.5 rounded-lg bg-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-950/60 cursor-pointer"
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
  );
}
