import { Sky, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Yard120kV } from './Yard120kV';
import { TransformerBay } from './TransformerBay';
import { MvSwitchgearRoom } from './MvSwitchgearRoom';
import { ControlRoom } from './ControlRoom';
import { CableRuns } from './CableRuns';
import { PostFx } from './PostFx';
import { FirstPersonController, type InteractTarget } from './FirstPersonController';
import { useGravelTexture } from './textures';

interface SubstationSceneProps {
  onHoverChange: (target: InteractTarget | null) => void;
}

const SUN_POSITION: [number, number, number] = [60, 45, 20];

function Ground() {
  const gravel = useGravelTexture();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[70, 70]} />
      <meshStandardMaterial map={gravel} roughness={0.95} metalness={0} />
    </mesh>
  );
}

export function SubstationScene({ onHoverChange }: SubstationSceneProps) {
  return (
    <>
      <Sky sunPosition={SUN_POSITION} turbidity={4} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <fog attach="fog" args={['#bcd7e8', 45, 130]} />

      {/* Procedural environment (no external HDRI fetch) so painted metal / copper / glass
          materials pick up soft reflections instead of looking flat. Baked once (frames={1}) —
          the scene's lighting doesn't change at runtime, so there's no need to recompute it. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2} color="#bcdcf0" scale={[30, 30, 1]} position={[0, 20, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#fff6e0" scale={[15, 15, 1]} position={[20, 10, 10]} rotation={[0, -Math.PI / 3, 0]} />
        <Lightformer form="rect" intensity={0.6} color="#7a8a5a" scale={[30, 30, 1]} position={[0, -5, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </Environment>

      <ambientLight intensity={0.4} color="#dceeff" />
      <hemisphereLight args={['#bcdcf0', '#7a8a5a', 0.5]} />
      {/* Sun casts real shadow maps — equipment throws shadows on the ground and each other, which
          is the single biggest realism gain over flat-lit boxes. Shadow camera is sized to cover the
          whole yard→control-room extent; bias tuned to avoid shadow acne on the thin geometry. */}
      <directionalLight
        position={SUN_POSITION}
        intensity={2.6}
        color="#fff6e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
      />

      <Ground />
      {/* Very light contact shadows on top of the real shadow maps — kept faint so equipment bases
          don't get a heavy black halo (SSAO already provides subtle contact darkening). */}
      <ContactShadows position={[0, 0.01, -2]} opacity={0.14} scale={45} blur={3} far={5} resolution={512} frames={1} />

      <Yard120kV />
      <TransformerBay />
      <MvSwitchgearRoom />
      <ControlRoom />
      <CableRuns />
      <FirstPersonController onHoverChange={onHoverChange} />
      <PostFx />
    </>
  );
}
