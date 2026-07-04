import { useSubstationStore } from '../simulation/store/useSubstationStore';
import { breakerColor } from '../scene3d/statusColors';

/**
 * SCADA/SLD overlay: a simplified single-line-diagram-style status list rather than a full
 * graphical mimic diagram, per docs/technical-design.md §8/§10 prototype scope.
 */
export function HmiOverlay() {
  const state = useSubstationStore((s) => s.state);
  const selectBay = useSubstationStore((s) => s.selectBay);
  const selectedBayId = useSubstationStore((s) => s.selectedBayId);
  const selectIed = useSubstationStore((s) => s.selectIed);
  const showSld = useSubstationStore((s) => s.showSld);

  const ieds = state.substation.voltageLevels.flatMap((vl) => vl.bays.map((bay) => bay.ied).filter(Boolean));

  if (!showSld) return null;

  return (
    <div className="panel hmi-overlay">
      <h2>SLD / Status</h2>
      {state.substation.voltageLevels.map((vl) => (
        <div key={vl.id} className="hmi-voltage-level">
          <div className="hmi-busbar">
            Busbar {vl.kv} kV — {vl.busbars.map((b) => b.status).join(', ')}
          </div>
          <ul className="hmi-bay-list">
            {vl.bays.map((bay) => (
              <li
                key={bay.id}
                className={bay.id === selectedBayId ? 'hmi-bay-row selected' : 'hmi-bay-row'}
                onClick={() => selectBay(bay.id)}
              >
                <span className="status-dot" style={{ backgroundColor: breakerColor(bay.breaker.status) }} />
                <span className="hmi-bay-name">{bay.name}</span>
                <span className="hmi-bay-status">{bay.breaker.status}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {state.transformers.map((tx) => (
        <div key={tx.id} className="hmi-transformer">
          {tx.name}: {tx.ratioKv[0]}/{tx.ratioKv[1]} kV — {tx.loadingPercent}% loaded — {tx.status}
        </div>
      ))}

      <h2 style={{ marginTop: 12 }}>IEDs</h2>
      <ul className="hmi-bay-list">
        {ieds.map((ied) => (
          <li key={ied!.id} className="hmi-bay-row" onClick={() => selectIed(ied!.id)}>
            <span
              className="status-dot"
              style={{ backgroundColor: ied!.leds.find((l) => l.id === 'trip')?.mode !== 'off' ? '#e74c3c' : '#2ecc71' }}
            />
            <span className="hmi-bay-name">{ied!.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
