import { useSubstationStore } from '../simulation/store/useSubstationStore';
import { findDataObject, findLogicalNode } from '../simulation/model';

/**
 * IED front-panel detail view: LEDs, a simplified measurement/display readout, this IED's
 * events, and a disturbance-record placeholder — the instrument the protection-trip scenario
 * asks the player to read (docs/scenarios.md, Scenario 3).
 */
export function IedFrontPanel() {
  const state = useSubstationStore((s) => s.state);
  const selectedIedId = useSubstationStore((s) => s.selectedIedId);
  const selectIed = useSubstationStore((s) => s.selectIed);
  const selectBay = useSubstationStore((s) => s.selectBay);

  if (!selectedIedId) return null;

  let ied;
  let parentBayId: string | undefined;
  for (const vl of state.substation.voltageLevels) {
    for (const bay of vl.bays) {
      if (bay.ied?.id === selectedIedId) {
        ied = bay.ied;
        parentBayId = bay.id;
      }
    }
  }
  if (!ied) return null;

  const mmxu = findLogicalNode(ied, 'MMXU');
  const measured = findDataObject(mmxu, 'A');
  const relatedEvents = state.events.filter((e) => e.source === ied!.id);

  return (
    <div className="modal-backdrop" onClick={() => selectIed(undefined)}>
      <div className="panel ied-front-panel" onClick={(e) => e.stopPropagation()}>
        <div className="bay-control-header">
          <h2>{ied.name}</h2>
          <button className="close-button" onClick={() => selectIed(undefined)}>
            ✕
          </button>
        </div>

        <div className="ied-leds">
          {ied.leds.map((led) => (
            <div key={led.id} className={`led led-${led.mode}`} style={{ borderColor: ledBorderColor(led.color) }}>
              <span className="led-dot" style={{ backgroundColor: ledBorderColor(led.color) }} />
              {led.label}
            </div>
          ))}
        </div>

        <div className="ied-display">Measured current (MMXU): {typeof measured?.value === 'number' ? measured.value : '—'} A</div>

        <h3>Event list</h3>
        {relatedEvents.length === 0 && <p className="muted">No events recorded.</p>}
        <ul className="event-log">
          {relatedEvents
            .slice()
            .reverse()
            .map((evt) => (
              <li key={evt.id}>
                <span className="muted small">{new Date(evt.timestamp).toLocaleTimeString()}</span>{' '}
                <strong>{evt.description}</strong>
                <div className="muted small">{evt.cause}</div>
              </li>
            ))}
        </ul>

        <h3>Disturbance records</h3>
        {ied.disturbanceRecords.length === 0 && <p className="muted">None.</p>}
        <ul className="event-log">
          {ied.disturbanceRecords.map((dr) => (
            <li key={dr.id}>
              <span className="muted small">{new Date(dr.timestamp).toLocaleTimeString()}</span>{' '}
              <strong>{dr.faultType}</strong> — peak {dr.peakMeasuredValueA} A
            </li>
          ))}
        </ul>

        {parentBayId && (
          <button
            onClick={() => {
              selectBay(parentBayId);
              selectIed(undefined);
            }}
          >
            Go to bay controls
          </button>
        )}
        <div className="close-hint">Press Esc to close</div>
      </div>
    </div>
  );
}

function ledBorderColor(color: 'green' | 'amber' | 'red'): string {
  switch (color) {
    case 'green':
      return '#2ecc71';
    case 'amber':
      return '#f1c40f';
    case 'red':
      return '#e74c3c';
  }
}
