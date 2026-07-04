# Scenarios

All five scenarios run against one demo topology so they can share state and IDs. This section fixes that
topology, then scripts each scenario as preconditions → steps → success/failure branches → learning notes,
in a shape the `scenarios/runner.ts` engine (see `technical-design.md` §2) can drive directly.

## Demo topology ("Meadow Creek Substation")

- `sub-1` **Meadow Creek Substation**
  - `vl-120` **120 kV level**
    - `bay-l1` Line bay "120 kV Line L1" — breaker `QA-L1`
    - `bay-t1-hv` Transformer bay (HV side) "120 kV Transformer T1" — breaker `QA-T1H`
  - `tx-1` Transformer T1, ratio 120/20 kV
  - `vl-20` **20 kV level** — busbar `bb-20-1`
    - `bay-t1-mv` Transformer incomer bay (MV side) — breaker `QA1`, disconnector `QS1`, earthing switch `QE1`
    - `bay-f1` Feeder bay "20 kV Feeder F1" — breaker `QA2`, disconnector `QS2`, earthing switch `QE2`,
      merging unit `mu-f1`, IED `ied-f1` ("Greyhart Sentinel-610", PTOC + PIOC + PTRC + RDRE + XCBR + CSWI)
    - `bay-f2` Feeder bay "20 kV Feeder F2" — breaker `QA3`, disconnector `QS3`, earthing switch `QE3`,
      merging unit `mu-f2`, IED `ied-f2` (same class as `ied-f1`)

Normal operating state: everything closed except earthing switches (all open), busbar energized, no active
alarms.

---

## Scenario 1 — Introduction / tutorial

**Preconditions:** normal operating state, no prior player actions.

**Steps:**
1. Player spawns in the 120 kV yard; a briefing panel introduces the station and the objective (learn to
   read status, not to operate anything yet).
2. Player is guided to identify: the yard bay (`bay-l1`/`bay-t1-hv`), the transformer (`tx-1`), the MV room
   (`bay-t1-mv`, `bay-f1`, `bay-f2`), and the PAC room (`ied-f1`, `ied-f2`).
3. Player opens the SLD/SCADA overlay and is asked to report the current status of: `QA1`, `QA2`, `QA3`,
   `tx-1` loading, and busbar `bb-20-1` energization.
4. Player opens `ied-f1`'s front panel and identifies: which LEDs are lit, current measured values, and
   that the event list is currently empty.

**Success:** all four status values reported correctly via a simple UI confirmation (multiple choice or
click-to-confirm on the SLD) plus the IED panel opened at least once.

**Failure/blocking:** none — this scenario has no unsafe actions available; it is read-only by design.

**Learning notes:** "Before you touch anything, know what state the station is in and why." Establishes SLD
and IED panel as the two instruments used throughout every later scenario.

---

## Scenario 2 — Switching operation

**Preconditions:** normal operating state. Player has completed Scenario 1 (recommended, not enforced).

**Given task:** "Isolate Feeder F1 (`bay-f1`) for maintenance" — a switching schedule presented as an
ordered checklist the player must satisfy (order enforced by interlocking, not by the checklist UI itself,
so the player must reason about *why* the order matters).

**Correct sequence:**
1. Open breaker `QA2` (load-break — safe while under interlock-checked conditions).
2. Open disconnector `QS2` (only permitted now that `QA2` is `open` — creates the visible isolating gap).
3. (Simulated) verify absence of voltage at the point of work — a UI confirmation step standing in for a
   real voltage-detector check.
4. Close earthing switch `QE2` (only permitted once `QA2` open and `QS2` open — bonds the isolated section
   to earth).

**Failure branches (each blocked with a specific reason, per `technical-design.md` §5):**
- Attempting to open `QS2` while `QA2` is still `closed` → blocked: "Disconnector QS2 cannot open: breaker
  QA2 is still closed — opening a disconnector under load will cause a sustained arc."
- Attempting to close `QE2` before `QA2`/`QS2` are open → blocked: "Earthing switch QE2 cannot close: feeder
  F1 is not yet verified de-energized."
- Attempting to close `QA2` after `QE2` is closed (trying to "undo" out of order) → blocked: "Breaker QA2
  cannot close while earthing switch QE2 is closed."

**Success:** all four steps completed in valid order; a switching log entry is created for each action with
a timestamp, forming the "switching log" deliverable.

**Learning notes:** ties directly to `research.md` §3 (interlocking) and §11 (five safety rules) — the
sequence *is* the safety procedure, not an arbitrary puzzle order.

---

## Scenario 3 — Protection trip

**Preconditions:** normal operating state (feeder F1 in service, `QA2` closed, `QS2` closed, `QE2` open).

**Steps (mostly automatic, then player-driven investigation):**
1. Scenario injects an earth fault on `bay-f1` (`InjectFault('bay-f1', 'earth-fault')`).
2. `mu-f1` publishes the fault current; `ied-f1`'s `PTOC`/`PIOC` logical node picks up, `PTRC` issues a
   trip, `QA2` transitions to `tripped` automatically — the player does not act during this phase.
3. Player is alerted (alarm banner + LED change on `ied-f1`) and must:
   a. Open `ied-f1`'s front panel and read the LED pattern (trip LED lit, blinking-unacknowledged).
   b. Open the event list and find the trip event, including its `cause` field.
   c. Open the simplified disturbance-record view for the recorded fault (fault type, timestamp, peak
      measured value).
   d. Acknowledge the alarm (`AcknowledgeAlarm`) — only after acknowledgment can the breaker be reset.
   e. Submit a short "reason for trip" report (select from the event's cause / a short free-text field).
4. Only after acknowledgment may the player attempt to close `QA2` again — interlocking should still block
   a close attempt if the earth fault condition (simulated) hasn't been cleared, teaching that resetting a
   protection trip is not the same as fixing the underlying fault.

**Failure branches:**
- Attempting to close `QA2` before acknowledging the alarm → blocked: "Breaker QA2 cannot close: an
  unacknowledged protection trip is active on feeder F1."
- Submitting an incorrect cause in the report → surfaced as feedback, not a hard fail, with the correct
  cause shown afterward (educational, not punitive).

**Success:** alarm acknowledged, correct cause identified, event log shows the complete
fault→trip→acknowledge chain with timestamps.

**Learning notes:** exercises the full IEC 61850 logical-node trip chain from `technical-design.md` §6
(`MMXU` → `PTOC`/`PIOC` → `PTRC` → `GoCb` → `XCBR` → `RDRE`) — the point is to make that abstract chain
legible as "read the LEDs, read the event, read the disturbance record."

---

## Scenario 4 — PAC fault (communications troubleshooting)

*(Implemented. Engine: `engine/commsSimulator.ts` + the `InjectPacFault`/`FixIedConfig`/`RestorePrpPort`
commands. UI: `ui/NetworkCommsPanel.tsx`, opened from the SCADA gateway in the control building.)*

**Preconditions:** normal operating state, `ied-f2` in service and reporting normally to SCADA.

**Steps:**
1. Scenario sets `ied-f2`'s `commsStatus.stationBus` to `lost` OR flips one PRP port on `mu-f2`/`ied-f2` to
   `down` (two different underlying causes, same visible symptom: SCADA stops receiving reports/GOOSE from
   `ied-f2`).
2. Player opens the network/comms view and checks, per bay/device: station bus vs. process bus status, PRP
   port A/B status, and GOOSE/MMS link state, to localize the fault.
3. Branch A — single PRP port down: player observes that comms are actually still `ok` (redundant path
   carrying traffic) and correctly concludes there is *no* outage, just a degraded-redundancy condition to
   log and schedule for repair — no "fix" action is needed, only correct diagnosis.
4. Branch B — real link/config fault (e.g. `ied-f2` subscribed to a mismatched `GoCb`/`SvCb` id): player
   identifies the mismatch in a simplified config view and corrects it (`FixConfig` command), restoring
   `commsStatus`.

**Failure branches:**
- Player "fixes" a single-PRP-port-down condition as if it were an outage (e.g. attempts a config change
  when none was needed) → feedback explains PRP redundancy tolerates exactly this failure mode.
- Player fixes the wrong config field → comms remain `lost`, with the comms view still showing the real
  mismatch.

**Success:** correct diagnosis (redundancy-tolerated vs. real fault) and, for Branch B, a restored
`commsStatus`.

**Learning notes:** exercises `research.md` §7 (PRP zero-recovery-time redundancy) — the core lesson is that
not every red indicator means an outage, and not every outage is a hardware problem.

---

## Scenario 5 — Commissioning / test

*(Designed now; implementation is a stretch goal for the first prototype slice per `technical-design.md`
§10.)*

**Preconditions:** a "new" bay (`bay-f2`) is presented as freshly installed/modified and awaiting
commissioning sign-off; its protection settings exist but are unverified.

**Steps (checklist-driven):**
1. Compare the bay drawing (a static SLD/wiring excerpt) against the modeled physical installation
   (`bay-f2`'s actual breaker/disconnector/CT/VT/IED configuration) and confirm they match.
2. Open the test-set panel, set a test current above `ied-f2`'s configured `PTOC` pickup, and "inject" —
   confirm the IED picks up and trips at approximately the expected value/time (simplified secondary
   injection, per `research.md` §10).
3. Verify status inputs (breaker/disconnector position feedback) reflect the physical state, and that the
   correct output contact (trip relay for `QA3`) operates when the test trip occurs.
4. Complete each commissioning checklist item; only once all items are checked can the bay be marked
   "in service."

**Failure branches:**
- Injecting a test current below pickup and expecting a trip → no trip occurs; feedback explains the
  measured value vs. the configured pickup setting.
- Marking the checklist complete with an unresolved mismatch (e.g. drawing vs. installation discrepancy
  left unconfirmed) → blocked: "Checklist item 'drawing matches installation' is not confirmed."

**Success:** full checklist completed, bay transitioned to "in service."

**Learning notes:** exercises `research.md` §10 (secondary injection testing, commissioning checklist
discipline) — commissioning is presented as a procedure with sign-off, not a single "test button."
