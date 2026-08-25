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
      /**
       * A SEPARATE FILE FOR `maskable`, not the same PNG listed twice.
       *
       * The old entry pointed `purpose: 'maskable'` at the ordinary icon, which tells Android it
       * may crop that image to whatever shape the launcher uses. The ordinary icon IS the mark's
       * rounded square with its own 8/256 inset — a circular mask takes the corners off a shape
       * whose corners are the shape. The maskable cut is full-bleed ink with the glyph enlarged
       * into the 80% safe zone, so any mask lands on ground rather than on the mark.
       */
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
