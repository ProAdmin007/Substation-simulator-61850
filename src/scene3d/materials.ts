import type * as THREE from 'three';
import { useBrushedMetalTexture, useConcreteTexture, useLouverTexture, usePanelMimicTexture, useWarningStickerTexture } from './textures';

// Reusable PBR material presets for the substation scene, tuned by eye against real switchgear
// photography (see docs/research.md §4-5) rather than measured reflectance data — this is an
// educational simulation, not a lighting-accurate renderer.
//
// HOW TO EXTEND: each `use*Material()` hook below returns a plain props object — spread it onto
// a <BoxPrimitive {...useXMaterial()} .../> or read `.roughness`/`.metalness`/`.map` directly on
// a raw <meshStandardMaterial>. To add a new material, add a hook here (reuse a texture from
// `textures.ts`, or add a new procedural one there) and export it; nothing else needs to change,
// since BoxPrimitive already forwards `color`/`roughness`/`metalness`/`map` straight through to
// meshStandardMaterial. Swapping any of these for a real photographic/PBR texture set later only
// means changing the hook body, not any call site.

export interface MaterialProps {
  color: string;
  roughness: number;
  metalness: number;
  map?: THREE.Texture;
}

/** Painted sheet-steel cabinetry (MV switchgear bodies, breaker tanks, IED enclosures). */
export function usePaintedMetal(color: string): MaterialProps {
  return { color, roughness: 0.5, metalness: 0.3 };
}

/** Brushed/galvanised steel (door panels, CT/disconnector stands, gantry steelwork). */
export function useBrushedMetal(color = '#8a929a'): MaterialProps {
  const map = useBrushedMetalTexture();
  return { color, roughness: 0.35, metalness: 0.75, map };
}

/** Cast concrete (equipment pedestals, plinths, floor slabs) — procedural surface texture. */
export function useConcreteFloor(): MaterialProps {
  const map = useConcreteTexture();
  return { color: '#ffffff', roughness: 0.92, metalness: 0, map };
}

/** Black rubber cable insulation / gaskets — matte, non-metallic, slightly glossy sheen. */
export function useRubberInsulation(color = '#1c1c1c'): MaterialProps {
  return { color, roughness: 0.75, metalness: 0 };
}

/** Dark glazed glass (IED display windows, viewing ports) — low roughness reads as glossy/reflective. */
export function useGlassPanel(color = '#0a1420'): MaterialProps {
  return { color, roughness: 0.12, metalness: 0.1 };
}

/** Bare copper (busbars, jumper conductors, earthing braid). */
export function useCopperBusbar(color = '#b5651d'): MaterialProps {
  return { color, roughness: 0.35, metalness: 0.85 };
}

/** Yellow/black hazard-stripe decal with a high-voltage flash symbol — mount as a thin plane on
 * cabinet doors and breaker tanks, not as the whole surface material. */
export function useWarningSticker(): MaterialProps {
  const map = useWarningStickerTexture();
  return { color: '#ffffff', roughness: 0.6, metalness: 0, map };
}

/** Light-grey RAL-7035-style painted switchgear body — the standard indoor MV cabinet colour. */
export function useSwitchgearGrey(color = '#c9cdc8'): MaterialProps {
  return { color, roughness: 0.55, metalness: 0.25 };
}

/** Ventilation-louver decal for switchgear compartment doors — mount as a thin recessed plane. */
export function useLouver(): MaterialProps {
  const map = useLouverTexture();
  return { color: '#ffffff', roughness: 0.7, metalness: 0.3, map };
}

/** Instrument-panel mimic face (single-line diagram silkscreen + indicator lamps + nameplate). */
export function usePanelMimic(): MaterialProps {
  const map = usePanelMimicTexture();
  return { color: '#ffffff', roughness: 0.6, metalness: 0.05, map };
}
