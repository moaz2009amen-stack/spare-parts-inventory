import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-16.png', 'icons/favicon-32.png'],
      manifest: {
        name: 'نظام إدارة مخزن قطع غيار السيارات',
        short_name: 'نظام المخزن',
        description: 'نظام إدارة مخازن ومبيعات ومشتريات قطع غيار السيارات',
        lang: 'ar',
        dir: 'rtl',
        theme_color: '#101d40',
        background_color: '#101d40',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // تخزين ملفات الواجهة (JS/CSS/الخطوط) محليًا عشان تفتح بسرعة حتى لو النت ضعيف.
        // ملاحظة: ده مش نفس معنى "العمل بدون نت بالكامل" لعمليات البيع والشراء،
        // لأن دي محتاجة اتصال فعلي بقاعدة البيانات وقت الحفظ. تخزين البيانات نفسها
        // أوفلاين مع مزامنة لاحقة هي خطوة تانية أكبر نقدر نبنيها بعد كده لو احتجتها.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
