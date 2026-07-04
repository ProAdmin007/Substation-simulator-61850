import { EffectComposer, SSAO, Bloom, SMAA, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

/**
 * Screen-space post-processing stack. Kept deliberately restrained so it still runs on a normal
 * laptop (a stated project requirement):
 *  - SSAO: soft contact darkening in crevices / where surfaces meet — the biggest cue that lifts
 *    a scene out of "flat-lit boxes" (needs the composer's normal pass, hence enableNormalPass).
 *  - Bloom: only the brightest things (status LEDs, the bright sky) glow, thanks to a high
 *    luminance threshold — not an arcade-wide glow.
 *  - SMAA: cheap anti-aliasing on the composited image.
 *  - Vignette: a faint corner darkening for a more "camera"-like, less clinical image.
 */
export function PostFx() {
  return (
    <EffectComposer enableNormalPass multisampling={0}>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={16}
        radius={0.06}
        intensity={6}
        luminanceInfluence={0.7}
        bias={0.04}
        fade={0.02}
      />
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={0.35} mipmapBlur />
      <SMAA />
      <Vignette offset={0.25} darkness={0.45} />
    </EffectComposer>
  );
}
