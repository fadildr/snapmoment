export type Preset = {
  id: string;
  name: string;
  cssFilter: string; // Used for live preview and canvas rendering
  grainIntensity?: number; // 0 to 1, opacity of the grain layer
  hasVignette?: boolean; // Whether to draw a dark edge vignette on canvas
  hasLightLeak?: boolean; // Whether to randomly draw an orange/red light leak on canvas
  cameraBodyColor: string; // Used for UI accent colors in the new skeuomorphic design
};

export const presets: Record<string, Preset> = {
  'kodak-funsaver': {
    id: 'kodak-funsaver',
    name: 'Kodak FunSaver',
    // Kodak: Warm, saturated, slightly soft, magenta/yellow tint
    cssFilter: 'contrast(1.2) saturate(1.4) sepia(0.3) hue-rotate(-15deg) brightness(1.05)',
    grainIntensity: 0.18,
    hasVignette: true,
    hasLightLeak: true,
    cameraBodyColor: '#FFD700', // Kodak Yellow
  },
  'fujifilm-quicksnap': {
    id: 'fujifilm-quicksnap',
    name: 'Fujifilm QuickSnap',
    // Fuji: Cool shadows, strong greens/blues, high contrast
    cssFilter: 'contrast(1.25) saturate(1.1) hue-rotate(10deg) brightness(0.95)',
    grainIntensity: 0.15,
    hasVignette: true,
    hasLightLeak: false,
    cameraBodyColor: '#00A859', // Fujifilm Green
  },
  'ilford-hp5': {
    id: 'ilford-hp5',
    name: 'Ilford HP5 (B&W)',
    // B&W: High contrast, no color, strong grain
    cssFilter: 'grayscale(1) contrast(1.4) brightness(0.9)',
    grainIntensity: 0.3,
    hasVignette: true,
    hasLightLeak: false,
    cameraBodyColor: '#000000', // Black
  },
};

export const defaultPreset = presets['kodak-funsaver'];
