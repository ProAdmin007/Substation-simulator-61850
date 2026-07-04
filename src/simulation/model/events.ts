// Alarms & events. See docs/technical-design.md §3.5. Every event must state a cause —
// the event log is the audit trail the player reads to understand what happened and why.

export type AlarmSeverity = 'info' | 'warning' | 'critical';

export interface Alarm {
  id: string;
  timestamp: string;
  severity: AlarmSeverity;
  message: string;
  acknowledged: boolean;
  bayId?: string;
}

export interface SubstationEvent {
  id: string;
  timestamp: string;
  source: string;
  description: string;
  cause: string;
}
