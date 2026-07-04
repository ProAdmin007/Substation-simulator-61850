import { useSubstationStore } from '../simulation/store/useSubstationStore';

export function EventAlarmList() {
  const state = useSubstationStore((s) => s.state);
  const dispatch = useSubstationStore((s) => s.dispatch);

  const alarms = [...state.alarms].reverse();
  const events = [...state.events].reverse();

  return (
    <div className="panel event-alarm-list">
      <h2>Alarms</h2>
      {alarms.length === 0 && <p className="muted">No active alarms.</p>}
      <ul>
        {alarms.map((alarm) => (
          <li key={alarm.id} className={`alarm-row severity-${alarm.severity}`}>
            <div>
              <strong>{alarm.message}</strong>
              <div className="muted small">{new Date(alarm.timestamp).toLocaleTimeString()}</div>
            </div>
            {!alarm.acknowledged ? (
              <button onClick={() => dispatch({ type: 'AcknowledgeAlarm', alarmId: alarm.id })}>Ack</button>
            ) : (
              <span className="muted small">Acknowledged</span>
            )}
          </li>
        ))}
      </ul>

      <h2>Event log</h2>
      <ul className="event-log">
        {events.map((evt) => (
          <li key={evt.id}>
            <span className="muted small">{new Date(evt.timestamp).toLocaleTimeString()}</span>{' '}
            <strong>{evt.description}</strong>
            <div className="muted small">{evt.cause}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
