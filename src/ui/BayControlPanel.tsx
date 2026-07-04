import { useSubstationStore } from '../simulation/store/useSubstationStore';
import { findBay } from '../simulation/engine/lookup';

/**
 * Explicit 2D controls for the selected bay's breaker/disconnector/earthing switch, mirroring
 * the clickable 3D equipment — every blocked action shows the interlock's specific reason
 * (docs/game-design.md §5).
 */
export function BayControlPanel() {
  const state = useSubstationStore((s) => s.state);
  const selectedBayId = useSubstationStore((s) => s.selectedBayId);
  const selectBay = useSubstationStore((s) => s.selectBay);
  const dispatch = useSubstationStore((s) => s.dispatch);
  const lastInterlockBlock = useSubstationStore((s) => s.lastInterlockBlock);

  if (!selectedBayId) return null;
  const bay = findBay(state, selectedBayId);
  if (!bay) return null;

  const disconnector = bay.disconnectors[0];
  const earthingSwitch = bay.earthingSwitches[0];

  return (
    <div className="modal-backdrop" onClick={() => selectBay(undefined)}>
      <div className="panel bay-control-panel" onClick={(e) => e.stopPropagation()}>
      <div className="bay-control-header">
        <h2>{bay.name}</h2>
        <button className="close-button" onClick={() => selectBay(undefined)}>
          ✕
        </button>
      </div>

      <div className="bay-control-row">
        <span>Breaker {bay.breaker.id}</span>
        <span className="muted">{bay.breaker.status}</span>
        <button
          disabled={bay.breaker.status === 'closed'}
          onClick={() => dispatch({ type: 'CloseBreaker', bayId: bay.id })}
        >
          Close
        </button>
        <button
          disabled={bay.breaker.status === 'open'}
          onClick={() => dispatch({ type: 'OpenBreaker', bayId: bay.id })}
        >
          Open
        </button>
      </div>

      {disconnector && (
        <div className="bay-control-row">
          <span>Disconnector {disconnector.id}</span>
          <span className="muted">{disconnector.status}</span>
          <button
            disabled={disconnector.status === 'closed'}
            onClick={() => dispatch({ type: 'CloseDisconnector', bayId: bay.id, disconnectorId: disconnector.id })}
          >
            Close
          </button>
          <button
            disabled={disconnector.status === 'open'}
            onClick={() => dispatch({ type: 'OpenDisconnector', bayId: bay.id, disconnectorId: disconnector.id })}
          >
            Open
          </button>
        </div>
      )}

      {earthingSwitch && (
        <div className="bay-control-row">
          <span>Earthing switch {earthingSwitch.id}</span>
          <span className="muted">{earthingSwitch.status}</span>
          <button
            disabled={earthingSwitch.status === 'closed'}
            onClick={() =>
              dispatch({ type: 'CloseEarthingSwitch', bayId: bay.id, earthingSwitchId: earthingSwitch.id })
            }
          >
            Close
          </button>
          <button
            disabled={earthingSwitch.status === 'open'}
            onClick={() =>
              dispatch({ type: 'OpenEarthingSwitch', bayId: bay.id, earthingSwitchId: earthingSwitch.id })
            }
          >
            Open
          </button>
        </div>
      )}

      {lastInterlockBlock && (
        <div className="interlock-block-message">
          <strong>Blocked:</strong> {lastInterlockBlock.reason}
        </div>
      )}
      <div className="close-hint">Press Esc to close</div>
      </div>
    </div>
  );
}
