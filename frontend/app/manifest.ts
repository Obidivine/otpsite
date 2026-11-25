// frontend/app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OTP360 - Verification Numbers',
    short_name: 'OTP360',
    description: 'Get temporary foreign numbers for OTP verification instantly.',
    start_url: '/',
    display: 'standalone', // This makes it open without the browser bar
    background_color: '#ffffff',
    theme_color: '#2563eb', // Your brand blue
    icons: [
      {
        src: '/icon-192x192.png', // We will generate these next
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable', // This makes it look good on Android's shaped icons
      },
    ],
  }
}