'use client';

import React from 'react';
import Image from 'next/image';

/**
 * Authentic Supaste Mountain Scenery Atmosphere
 * Reverse-engineered from https://www.supaste.com/
 * Features the ultra-high resolution mountain horizon wallpaper, twilight sky gradients,
 * and ambient atmospheric lighting masks.
 */
export const ScenicSceneryBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Master Sky Dusk Gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 20%, rgba(120, 80, 220, 0.25) 0%, rgba(60, 40, 140, 0.15) 45%, transparent 80%),
            radial-gradient(ellipse 80% 40% at 50% 45%, rgba(245, 140, 95, 0.20) 0%, rgba(180, 80, 140, 0.10) 40%, transparent 75%),
            linear-gradient(to bottom, 
              #05070E 0%, 
              #0A0F1E 20%, 
              #121632 40%, 
              #1A152E 70%, 
              #07080F 100%
            )
          `,
        }}
      />

      {/* 2. Authentic High-Resolution Mountain Wallpaper Image */}
      <div className="absolute inset-0 z-10 flex items-center justify-center opacity-85 mix-blend-screen">
        <Image
          src="/scenery/mountain_scenery.webp"
          alt="Atmospheric Alpine Horizon"
          fill
          priority
          sizes="100vw"
          className="object-cover object-bottom"
        />
      </div>

      {/* 3. Subtle Horizon Lighting Vignette & Contrast Overlay */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom, 
              rgba(5, 7, 14, 0.75) 0%, 
              rgba(5, 7, 14, 0.2) 30%, 
              rgba(5, 7, 14, 0.1) 60%, 
              rgba(7, 8, 15, 0.85) 85%, 
              #07080F 100%
            )
          `,
        }}
      />

      {/* 4. Subtle Stratospheric Telemetry Coordinates */}
      <svg
        className="absolute inset-0 w-full h-[500px] z-20 opacity-30 mix-blend-screen pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="15%" cy="14%" r="1" fill="#ffffff" opacity="0.8" />
        <circle cx="28%" cy="20%" r="1.5" fill="#a5b4fc" opacity="0.9" />
        <circle cx="45%" cy="10%" r="1" fill="#ffffff" opacity="0.6" />
        <circle cx="68%" cy="16%" r="1.5" fill="#ffffff" opacity="0.85" />
        <circle cx="82%" cy="24%" r="1" fill="#fbcfe8" opacity="0.75" />
        <circle cx="91%" cy="12%" r="1.2" fill="#ffffff" opacity="0.9" />

        <text
          x="6%"
          y="10%"
          fill="#818cf8"
          opacity="0.4"
          fontFamily="monospace"
          fontSize="9"
          letterSpacing="2"
        >
          ARGUS // ORBIT LAT 45.8326° N · ALPINE FLEET TELEMETRY
        </text>
        <text
          x="80%"
          y="10%"
          fill="#818cf8"
          opacity="0.4"
          fontFamily="monospace"
          fontSize="9"
          letterSpacing="2"
        >
          ELEV 4,810M · AZIMUTH 182°
        </text>
      </svg>

      {/* 5. Bottom Deep Obsidian Fade directly meeting ASCII stage */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07080F] via-[#07080F]/90 to-transparent z-30 pointer-events-none" />
    </div>
  );
};
