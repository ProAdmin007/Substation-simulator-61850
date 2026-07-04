import { useSubstationStore } from '../simulation/store/useSubstationStore';

const STEPS = [
  'Welkom. Je bent de PAC-engineer op dienst bij Onderstation Hoogeveen-Toldijk.',
  'Klik in de 3D-wereld om je muis te vergrendelen. Lopen: WASD of pijltjes · kijken: muis · sprinten: Shift. Esc geeft de muis vrij of sluit een paneel.',
  'Toetsen: E = bedienen · B = IED-relais openen · F = SLD tonen/verbergen · Z = labels aan/uit · Esc = sluiten.',
  'Links staat het SLD/Status-paneel met de status van elk veld (groen = ingeschakeld, grijs = open, rood = getript). Klik op een rij om een veld te selecteren zonder ernaartoe te lopen.',
  'Loop naar een schakelkast, vermogenschakelaar, scheider of aardschakelaar tot er een hint bij het kruisje verschijnt en druk op E om te bedienen.',
  'Probeer daarna het schakelscenario: veld Buitenvaart — open de vermogenschakelaar, dan de scheider, en sluit dan de aardschakelaar (in die volgorde).',
];

export function TutorialOverlay() {
  const showTutorial = useSubstationStore((s) => s.showTutorial);
  const setShowTutorial = useSubstationStore((s) => s.setShowTutorial);
  if (!showTutorial) return null;

  return (
    <div className="modal-backdrop">
      <div className="panel tutorial-overlay">
        <h2>Handover briefing</h2>
        <ol>
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button onClick={() => setShowTutorial(false)}>Start shift</button>
      </div>
    </div>
  );
}
