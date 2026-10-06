/**
 * Módulo de vibración táctil silenciosa para el celular
 * (Sin efectos de sonido de acuerdo al requerimiento del stand)
 */

class MobileAudio {
  // Vibración táctil silenciosa (sin sonido)
  triggerHaptics() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([80, 40, 120]);
      } catch (e) {
        // Ignorar si no está soportado
      }
    }
  }

  // Desactivado completamente
  playEngineStart() {}
}

export const mobileAudio = new MobileAudio();
