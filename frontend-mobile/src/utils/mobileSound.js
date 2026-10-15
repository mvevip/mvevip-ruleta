/**
 * Módulo de vibración táctil silenciosa para el celular
 * (Sin efectos de sonido de acuerdo al requerimiento del stand)
 */

class MobileAudio {
  // Vibración táctil desactivada para evitar avisos de permisos
  triggerHaptics() {}

  // Desactivado completamente
  playEngineStart() {}
}

export const mobileAudio = new MobileAudio();
