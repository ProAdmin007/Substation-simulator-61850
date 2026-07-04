import { useMemo } from 'react';
import * as THREE from 'three';

// Procedural canvas textures instead of flat colours — cheap (generated once, cached), no
// external asset files, but reads far more like a real outdoor material than a solid fill.
// Approach ported from the reference prototype's canvasMat() helper.

const cache = new Map<string, THREE.CanvasTexture>();

function makeTexture(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat: number): THREE.CanvasTexture {
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

export function useGravelTexture(): THREE.CanvasTexture {
  return useMemo(
    () =>
      makeTexture(
        'gravel',
        256,
        (ctx, size) => {
          ctx.fillStyle = '#9a9a8c';
          ctx.fillRect(0, 0, size, size);
          for (let i = 0; i < 2200; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const v = 120 + Math.random() * 70;
            ctx.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
            ctx.beginPath();
            ctx.ellipse(x, y, 1 + Math.random() * 2.4, 1 + Math.random() * 1.6, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
          }
        },
        30,
      ),
    [],
  );
}

export function useConcreteTexture(): THREE.CanvasTexture {
  return useMemo(
    () =>
      makeTexture(
        'concrete',
        256,
        (ctx, size) => {
          ctx.fillStyle = '#b7b7ad';
          ctx.fillRect(0, 0, size, size);
          for (let i = 0; i < 700; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const v = 170 + Math.random() * 40;
            ctx.fillStyle = `rgba(${v},${v},${v - 6},0.5)`;
            ctx.fillRect(x, y, Math.random() * 3, Math.random() * 3);
          }
          ctx.strokeStyle = 'rgba(70,70,64,0.3)';
          ctx.lineWidth = 1;
          for (let x = 0; x < size; x += 64) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, size);
            ctx.stroke();
          }
        },
        4,
      ),
    [],
  );
}

export function useWarningStickerTexture(): THREE.CanvasTexture {
  return useMemo(
    () =>
      makeTexture(
        'warning-sticker',
        128,
        (ctx, size) => {
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, size, size);
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, size, size);
          ctx.clip();
          const stripe = size / 8;
          ctx.fillStyle = '#f1c40f';
          for (let i = -8; i < 16; i++) {
            ctx.beginPath();
            ctx.moveTo(i * stripe, 0);
            ctx.lineTo(i * stripe + stripe, 0);
            ctx.lineTo(i * stripe + stripe - size, size);
            ctx.lineTo(i * stripe - size, size);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
          // High-voltage flash symbol, roughly centred
          ctx.fillStyle = '#1a1a1a';
          ctx.beginPath();
          ctx.moveTo(size * 0.56, size * 0.22);
          ctx.lineTo(size * 0.4, size * 0.55);
          ctx.lineTo(size * 0.5, size * 0.55);
          ctx.lineTo(size * 0.42, size * 0.82);
          ctx.lineTo(size * 0.62, size * 0.45);
          ctx.lineTo(size * 0.52, size * 0.45);
          ctx.closePath();
          ctx.fill();
        },
        1,
      ),
    [],
  );
}

export function useLouverTexture(): THREE.CanvasTexture {
  return useMemo(
    () =>
      makeTexture(
        'louver',
        128,
        (ctx, size) => {
          ctx.fillStyle = '#3a3f42';
          ctx.fillRect(0, 0, size, size);
          const slat = size / 12;
          for (let i = 0; i < 12; i++) {
            const y = i * slat;
            // Dark gap (the vent opening)
            ctx.fillStyle = '#14171a';
            ctx.fillRect(0, y, size, slat * 0.5);
            // Lit angled slat face
            ctx.fillStyle = '#5a6167';
            ctx.fillRect(0, y + slat * 0.5, size, slat * 0.5);
          }
        },
        1,
      ),
    [],
  );
}

export function usePanelMimicTexture(): THREE.CanvasTexture {
  return useMemo(
    () =>
      makeTexture(
        'panel-mimic',
        256,
        (ctx, size) => {
          // Light-grey instrument panel with a single-line mimic silkscreen and a few labels/lamps.
          ctx.fillStyle = '#cbcfca';
          ctx.fillRect(0, 0, size, size);
          // Mimic bus line + tee-off, drawn in dark red like real mimic diagrams
          ctx.strokeStyle = '#5a2b2b';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(size * 0.2, size * 0.25);
          ctx.lineTo(size * 0.8, size * 0.25);
          ctx.moveTo(size * 0.5, size * 0.25);
          ctx.lineTo(size * 0.5, size * 0.7);
          ctx.stroke();
          // Breaker symbol (small square) on the drop line
          ctx.fillStyle = '#cbcfca';
          ctx.fillRect(size * 0.45, size * 0.42, size * 0.1, size * 0.12);
          ctx.strokeRect(size * 0.45, size * 0.42, size * 0.1, size * 0.12);
          // Indicator lamps row
          const lamps = ['#2ecc71', '#e74c3c', '#f1c40f'];
          lamps.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(size * 0.3 + i * size * 0.2, size * 0.85, size * 0.03, 0, Math.PI * 2);
            ctx.fill();
          });
          // Nameplate strip
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(size * 0.2, size * 0.05, size * 0.6, size * 0.08);
        },
        1,
      ),
    [],
  );
}

export function useBrushedMetalTexture(): THREE.CanvasTexture {
  return useMemo(
    () =>
      makeTexture(
        'brushed-metal',
        128,
        (ctx, size) => {
          ctx.fillStyle = '#8a929a';
          ctx.fillRect(0, 0, size, size);
          for (let y = 0; y < size; y++) {
            const v = 130 + Math.round(Math.random() * 25);
            ctx.strokeStyle = `rgba(${v},${v + 4},${v + 8},0.5)`;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(size, y);
            ctx.stroke();
          }
        },
        2,
      ),
    [],
  );
}
