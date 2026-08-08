export type Preset = {
  id: string;
  name: string;
  cssFilter: string;
  overlayAssetUrl?: string; // For future grain/light-leak overlays
  cameraBodyColor: string; // Used for the disposable camera UI body
};

export const presets: Record<string, Preset> = {
  'kodak-funsaver': {
    id: 'kodak-funsaver',
    name: 'Kodak FunSaver',
    cssFilter: 'contrast(1.2) saturate(1.3) sepia(0.2) hue-rotate(-10deg)',
    cameraBodyColor: '#FFD700', // Kodak Yellow
  },
  'fujifilm-quicksnap': {
    id: 'fujifilm-quicksnap',
    name: 'Fujifilm QuickSnap',
    cssFilter: 'contrast(1.1) saturate(1.2) hue-rotate(5deg)',
    cameraBodyColor: '#00A859', // Fujifilm Green
  },
  'ilford-hp5': {
    id: 'ilford-hp5',
    name: 'Ilford HP5 (B&W)',
    cssFilter: 'grayscale(1) contrast(1.5)',
    cameraBodyColor: '#000000', // Black
  },
};

export const defaultPreset = presets['kodak-funsaver'];
