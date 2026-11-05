import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// خلفية داكنة لحواف الأيقونات القابلة للاقتصاص بدل الأبيض الافتراضي
const background = '#05040f';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { ...minimal2023Preset.maskable.resizeOptions, background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { ...minimal2023Preset.apple.resizeOptions, background } },
  },
  images: ['public/logo.png'],
});
