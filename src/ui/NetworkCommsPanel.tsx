import { useSubstationStore } from '../simulation/store/useSubstationStore';
import type { Ied } from '../simulation/model';

/**
 * Station/process bus + PRP comms diagnostic view — the instrument for the PAC-fault scenario
 * (docs/scenarios.md Scenario 4). Shows, per IED: overall SCADA (station bus) status, PRP LAN A/B
 * port health, and report-control-block config validity, so the player can localize whether a
 * "SCADA not updating" symptom is a PRP-tolerated link failure (no outage) or a real config fault.
 */
export function NetworkCommsPanel() {
  const state = useSubstationStore((s) => s.state);
  const showComms = useSubstationStore((s) => s.showComms);
  const setShowComms = useSubstationStore((s) => s.setShowComms);
  const dispatch = useSubstationStore((s) => s.dispatch);

  if (!showComms) return null;

  const ieds: { ied: Ied; bayName: string }[] = [];
  for (const vl of state.substation.voltageLevels) {
    for (const bay of vl.bays) {
      if (bay.ied) ieds.push({ ied: bay.ied, bayName: bay.name });
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => setShowComms(false)}>
      <div className="panel comms-panel" onClick={(e) => e.stopPropagation()}>
        <div className="bay-control-header">
          <h2>Network / Comms — Station bus &amp; Process bus (PRP)</h2>
          <button className="close-button" onClick={() => setShowComms(false)}>
            ✕
          </button>
        </div>

        <div className="comms-legend muted small">
          Station bus: GOOSE / MMS (bay IEDs ↔ SCADA). Process bus: Sampled Values (merging units → IEDs).
          Both are redundant PRP (LAN A + LAN B) networks — a single LAN failure should not cause an outage.
        </div>

        {ieds.map(({ ied, bayName }) => {
          const configFault = ied.reportControlBlocks.some((rcb) => !rcb.configOk);
          const lanBDown = ied.prpPorts[1] === 'down';
          const stationLost = ied.commsStatus.stationBus === 'lost';

          return (
            <div key={ied.id} className="comms-ied">
              <div className="comms-ied-title">
                {ied.name} <span className="muted small">({bayName})</span>
              </div>
              <div className="comms-grid">
                <CommsCell label="Station bus (MMS)" ok={ied.commsStatus.stationBus === 'ok'} okText="OK" badText="LOST" />
                <CommsCell label="Process bus (SV)" ok={ied.commsStatus.processBus === 'ok'} okText="OK" badText="LOST" />
                <CommsCell label="PRP LAN A" ok={ied.prpPorts[0] === 'up'} okText="UP" badText="DOWN" />
                <CommsCell label="PRP LAN B" ok={ied.prpPorts[1] === 'up'} okText="UP" badText="DOWN" />
                <CommsCell label="RCB config" ok={!configFault} okText="VALID" badText="MISMATCH" />
              </div>

              {/* Contextual diagnosis + action, only for the affected IED */}
              {lanBDown && !stationLost && (
                <div className="comms-note comms-note-info">
                  Diagnosis: one PRP LAN is down but station bus is still OK — redundancy is tolerating the
                  fault, there is <strong>no communications outage</strong>. Schedule a physical link repair;
                  do not change configuration.
                  <div className="comms-actions">
                    <button onClick={() => dispatch({ type: 'RestorePrpPort', iedId: ied.id })}>Log &amp; repair LAN B link</button>
                  </div>
                </div>
              )}
              {stationLost && (
                <div className="comms-note comms-note-warn">
                  Diagnosis: station bus is LOST while both PRP LANs are healthy — this is not a network
                  hardware failure. The report control block reference is invalid (a configuration error).
                  <div className="comms-actions">
                    <button onClick={() => dispatch({ type: 'FixIedConfig', iedId: ied.id })}>Correct RCB configuration</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="close-hint">Press Esc to close</div>
      </div>
    </div>
  );
}

function CommsCell({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div className="comms-cell">
      <span className="comms-cell-label">{label}</span>
      <span className={ok ? 'comms-ok' : 'comms-bad'}>{ok ? okText : badText}</span>
    </div>
  );
}
