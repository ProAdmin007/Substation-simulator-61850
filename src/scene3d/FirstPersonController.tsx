import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { resolveCollisions } from './collision';
import { useSubstationStore } from '../simulation/store/useSubstationStore';

// Control scheme + feel taken from the reference project (docs: Voorbeelden/substation_v17_3_fix_prot.html):
//   WASD / arrow keys  walk        Shift  sprint
//   mouse (locked)     look        click  lock the pointer
//   E  operate / close panel       B  open IED relay
//   F  toggle SLD                  Z  toggle labels        Esc  close / release pointer
const WALK_SPEED = 4.5;
const SPRINT_SPEED = 9;
const EYE_HEIGHT = 1.75;
const MOUSE_SENSITIVITY = 0.0018;
const PITCH_LIMIT = 1.2;
const INTERACT_DISTANCE = 5.5;
// Walkable bounds spanning the yard (z≈-14) through the control building approach (z≈11).
const BOUNDS = { minX: -9, maxX: 9, minZ: -14, maxZ: 11 };

export interface InteractTarget {
  hint: string;
  onInteract: () => void;
  /** IED this object belongs to, if any — lets the B key jump straight to the relay front panel. */
  iedId?: string;
}

interface FirstPersonControllerProps {
  onHoverChange: (target: InteractTarget | null) => void;
}

/** Subtle hover feedback: a faint emissive tint on the hit mesh (not an arcade glow). */
function setHighlight(object: THREE.Object3D, on: boolean): void {
  const mesh = object as THREE.Mesh;
  const material = mesh.material as THREE.MeshStandardMaterial | undefined;
  if (!material || !('emissive' in material)) return;
  material.emissive.set(on ? '#5fb8ff' : '#000000');
  material.emissiveIntensity = on ? 0.25 : 0;
}

/** First-person controller: manual pointer-lock + yaw/pitch look + WASD/arrow movement, matching
 * the reference project's controls. Interaction is via a centre-screen (crosshair) raycast so the
 * keys operate whatever the player is looking at. */
export function FirstPersonController({ onHoverChange }: FirstPersonControllerProps) {
  const { camera, gl } = useThree();
  const scene = useThree((s) => s.scene);

  const selectIed = useSubstationStore((s) => s.selectIed);
  const setShowComms = useSubstationStore((s) => s.setShowComms);
  const toggleSld = useSubstationStore((s) => s.toggleSld);
  const toggleLabels = useSubstationStore((s) => s.toggleLabels);
  const closeAllPanels = useSubstationStore((s) => s.closeAllPanels);

  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const locked = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const hoverRef = useRef<InteractTarget | null>(null);
  const highlightedRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, 10);
    const canvas = gl.domElement;

    const panelOpen = () => {
      const s = useSubstationStore.getState();
      return Boolean(s.selectedBayId || s.selectedIedId || s.showComms || s.showTutorial);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (useSubstationStore.getState().showTutorial) return;

      if (e.code === 'Escape') {
        closeAllPanels();
        document.exitPointerLock?.();
        return;
      }
      if (e.code === 'KeyF') {
        toggleSld();
        return;
      }
      if (e.code === 'KeyZ') {
        toggleLabels();
        return;
      }
      if (e.code === 'KeyE') {
        if (panelOpen()) {
          closeAllPanels();
          canvas.requestPointerLock?.();
        } else {
          hoverRef.current?.onInteract();
        }
        return;
      }
      if (panelOpen()) return;
      if (e.code === 'KeyB' && hoverRef.current?.iedId) {
        selectIed(hoverRef.current.iedId);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!locked.current || panelOpen()) return;
      // Ignore implausibly large single-frame deltas — some browsers emit a big synthetic mousemove
      // the instant pointer lock engages, which would snap the camera; a real mouse never jumps this
      // far in one event during normal play.
      if (Math.abs(e.movementX) > 120 || Math.abs(e.movementY) > 120) return;
      yaw.current -= e.movementX * MOUSE_SENSITIVITY;
      pitch.current -= e.movementY * MOUSE_SENSITIVITY;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    };
    const onClick = () => {
      if (panelOpen() || locked.current) return;
      canvas.requestPointerLock?.();
    };
    const onLockChange = () => {
      locked.current = document.pointerLockElement === canvas;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
    };
  }, [camera, gl, selectIed, setShowComms, toggleSld, toggleLabels, closeAllPanels]);

  useFrame((_, delta) => {
    const s = useSubstationStore.getState();
    const paused = Boolean(s.selectedBayId || s.selectedIedId || s.showComms || s.showTutorial);
    if (paused) {
      if (highlightedRef.current) {
        setHighlight(highlightedRef.current, false);
        highlightedRef.current = null;
      }
      if (hoverRef.current) {
        hoverRef.current = null;
        onHoverChange(null);
      }
      return;
    }

    // Look: apply yaw/pitch as a YXZ euler (reference scheme).
    camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'));

    // Move on the ground plane relative to yaw.
    const speed = (keys.current['ShiftLeft'] || keys.current['ShiftRight'] ? SPRINT_SPEED : WALK_SPEED) * delta;
    const fwd = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
    const move = new THREE.Vector3();
    if (keys.current['KeyW'] || keys.current['ArrowUp']) move.add(fwd);
    if (keys.current['KeyS'] || keys.current['ArrowDown']) move.sub(fwd);
    if (keys.current['KeyD'] || keys.current['ArrowRight']) move.add(right);
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      camera.position.add(move);
    }
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, BOUNDS.minX, BOUNDS.maxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, BOUNDS.minZ, BOUNDS.maxZ);
    camera.position.y = EYE_HEIGHT;
    resolveCollisions(camera.position);

    // Crosshair raycast: interact only with what you're near and looking at (occlusion-aware).
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.current.far = INTERACT_DISTANCE;
    const hits = raycaster.current.intersectObjects(scene.children, true);
    const interactableHit = hits.find((h) => h.object.userData?.interactable);
    const occluded =
      interactableHit &&
      hits.length > 0 &&
      hits[0] !== interactableHit &&
      !hits[0].object.userData?.interactable &&
      hits[0].distance < interactableHit.distance - 0.25;
    const hit = occluded ? undefined : interactableHit;
    const nextHover: InteractTarget | null = hit
      ? { hint: hit.object.userData.hint, onInteract: hit.object.userData.onInteract, iedId: hit.object.userData.iedId }
      : null;

    if (nextHover?.hint !== hoverRef.current?.hint) {
      if (highlightedRef.current) setHighlight(highlightedRef.current, false);
      if (hit) setHighlight(hit.object, true);
      highlightedRef.current = hit ? hit.object : null;
      hoverRef.current = nextHover;
      onHoverChange(nextHover);
    }
  });

  return null;
}
