import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elite Nexus',
    short_name: 'Elite Nexus',
    description: 'Connect, share, and grow your social network',
    start_url: '/',
    display: 'standalone',
    // Both mirror `--nx-surface-page` (gray-100). A web-app manifest is static JSON with no
    // media-query form, so the light ground is the single honest value, and it cannot read a
    // CSS custom property. WAS #ffffff / #000000 — a white splash handing over to black
    // browser chrome, neither of which is a surface this design system contains.
    // eslint-disable-next-line no-restricted-syntax -- build-time JSON, token mirrored above
    background_color: '#eceef0',
    // eslint-disable-next-line no-restricted-syntax -- build-time JSON, token mirrored above
    theme_color: '#eceef0',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
