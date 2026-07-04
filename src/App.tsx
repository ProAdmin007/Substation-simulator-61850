import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SubstationScene } from './scene3d/SubstationScene';
import type { InteractTarget } from './scene3d/FirstPersonController';
import { HmiOverlay } from './ui/HmiOverlay';
import { EventAlarmList } from './ui/EventAlarmList';
import { BayControlPanel } from './ui/BayControlPanel';
import { IedFrontPanel } from './ui/IedFrontPanel';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { ScenarioControls } from './ui/ScenarioControls';
import { NetworkCommsPanel } from './ui/NetworkCommsPanel';
import { useSubstationStore } from './simulation/store/useSubstationStore';

function App() {
  const setShowTutorial = useSubstationStore((s) => s.setShowTutorial);
  const selectedBayId = useSubstationStore((s) => s.selectedBayId);
  const selectedIedId = useSubstationStore((s) => s.selectedIedId);
  const showComms = useSubstationStore((s) => s.showComms);

  const [hoverTarget, setHoverTarget] = useState<InteractTarget | null>(null);
  const panelOpen = Boolean(selectedBayId || selectedIedId || showComms);

  // A panel needs a visible cursor to click its buttons — pointer lock hides it for look-around.
  // FirstPersonController opens panels on the E key, which can land in the brief window before the
  // canvas's own click-to-lock has actually engaged; this listener re-releases the lock for as long
  // as a panel is open so the cursor never gets stuck.
  useEffect(() => {
    if (panelOpen) document.exitPointerLock?.();
    const onLockChange = () => {
      if (panelOpen && document.pointerLockElement) document.exitPointerLock?.();
    };
    document.addEventListener('pointerlockchange', onLockChange);
    return () => document.removeEventListener('pointerlockchange', onLockChange);
  }, [panelOpen]);

  return (
    <div className="app-root">
      <div className="canvas-container">
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          gl={{ antialias: true, toneMappingExposure: 1.05 }}
          camera={{ position: [0, 1.75, 10], fov: 65 }}
        >
          <SubstationScene onHoverChange={setHoverTarget} />
        </Canvas>
      </div>

      <div className="top-bar">
        <h1>Onderstation Hoogeveen-Toldijk — PAC Engineer Console</h1>
        <button onClick={() => setShowTutorial(true)}>Briefing</button>
      </div>

      {!panelOpen && (
        <>
          <div id="crosshair" />
          {hoverTarget && <div className="interact-hint">{hoverTarget.hint}</div>}
        </>
      )}
      <div className="controls-bar">
        WASD / pijltjes lopen · muis kijken · Shift sprint · E bedienen · B relais · F schema · Z labels · Esc sluiten · klik = muis vastzetten
      </div>

      <HmiOverlay />
      <EventAlarmList />
      <ScenarioControls />
      <BayControlPanel />
      <IedFrontPanel />
      <NetworkCommsPanel />
      <TutorialOverlay />
    </div>
  );
}

export default App;
