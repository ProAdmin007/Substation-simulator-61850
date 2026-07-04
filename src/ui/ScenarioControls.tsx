import { useSubstationStore } from '../simulation/store/useSubstationStore';
import { findBay } from '../simulation/engine/lookup';

/**
 * Scenario triggers for the prototype slice (docs/scenarios.md Scenarios 3 & 4). A real deployment
 * would trigger these from a scripted scenario runner rather than buttons; the buttons stand in for
 * that runner for now.
 */
export function ScenarioControls() {
  const state = useSubstationStore((s) => s.state);
  const dispatch = useSubstationStore((s) => s.dispatch);
  const setShowComms = useSubstationStore((s) => s.setShowComms);
  const bay = findBay(state, 'bay-f1');
  const alreadyTripped = bay?.breaker.status === 'tripped';

  const iedF2 = findBay(state, 'bay-f2')?.ied;
  const f2LanBDown = iedF2?.prpPorts[1] === 'down';
  const f2ConfigFault = iedF2?.reportControlBlocks.some((r) => !r.configOk) ?? false;

  return (
    <div className="panel scenario-controls">
      <h2>Scenario 3: Beveiligingstrip</h2>
      <p className="muted small">Injecteer een aardfout op veld Buitenvaart en onderzoek de trip via de IED.</p>
      <button disabled={alreadyTripped} onClick={() => dispatch({ type: 'InjectFault', bayId: 'bay-f1', faultType: 'earth-fault' })}>
        Aardfout op Buitenvaart injecteren
      </button>

      <h2 style={{ marginTop: 14 }}>Scenario 4: PAC-communicatiestoring</h2>
      <p className="muted small">
        Injecteer een storing op de IED van veld Wolfsbos, open dan de Network/Comms-weergave (loop naar de SCADA-gateway
        in het gebouw en druk op E) om te bepalen of het een PRP-getolereerde linkstoring of een echte config-fout is.
      </p>
      <div className="scenario-btn-row">
        <button disabled={f2LanBDown || f2ConfigFault} onClick={() => dispatch({ type: 'InjectPacFault', iedId: 'ied-f2', kind: 'prp-link' })}>
          PRP LAN-uitval
        </button>
        <button disabled={f2LanBDown || f2ConfigFault} onClick={() => dispatch({ type: 'InjectPacFault', iedId: 'ied-f2', kind: 'config' })}>
          Config-mismatch
        </button>
      </div>
      <button className="link-button" onClick={() => setShowComms(true)}>
        Network / Comms openen
      </button>
    </div>
  );
}
