import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Keep the generated PWA icon edges consistent with the Android launcher icon.
const background = '#101A3A';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { ...minimal2023Preset.maskable.resizeOptions, background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { ...minimal2023Preset.apple.resizeOptions, background } },
  },
  images: ['assets/logo.svg'],
});
