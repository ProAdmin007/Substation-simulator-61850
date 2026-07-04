# Research: PAC Engineering & Digital Substations

This document summarizes the research used to ground the game design and technical design in real
substation engineering practice. It covers the PAC engineer's role, substation primary/secondary
architecture, IEC 61850 (Edition 2.1) and related protocols, representative ABB/Eaton/GE equipment, and
safety procedures. Sources are public (vendor datasheets, manuals, standards bodies' public pages, and
established technical-education sites); the IEC standard texts themselves are paywalled, so wherever a
claim rests on a secondary summary rather than the primary standard, that is noted explicitly.

**Explicit assumption**: this is a simulation for learning/gameplay purposes, not a certified engineering
tool. Where sources conflicted or details were unavailable publicly, we picked the most common/representative
convention and noted it as a design assumption in `technical-design.md` rather than inventing unlabeled
"facts."

---

## 1. The PAC engineer's role

A PAC (Protection, Automation & Control) engineer designs, configures, tests, commissions, and maintains
the systems that protect, automate, and remotely control a substation. In practice this spans:

- Designing and configuring protection schemes for HV/MV substations (relay settings, protection
  coordination/selectivity studies).
- Programming and testing IEDs (Intelligent Electronic Devices) with vendor tools (e.g. ABB PCM600, Siemens
  DIGSI, SEL AcSELerator).
- Preparing protection & control panel schematics and interlocking tables for various busbar
  configurations.
- Coordinating SCADA integration, performing fault studies, and leading commissioning activities
  (factory acceptance tests, site acceptance tests, primary/secondary injection testing).
- Troubleshooting bay-level secondary equipment: communication faults, wiring errors, configuration
  mismatches.
- Working with IEC 61850 engineering (SCD/CID files, GOOSE/report subscriptions) alongside classical
  hardwired I/O.

This maps directly onto the five gameplay scenarios: inspection/tutorial, switching operations,
protection-trip analysis, PAC communication troubleshooting, and commissioning/testing.

Sources:
- [Centralized Substation Protection, Automation and Control System (CSPACS) — PAC World](https://www.pacw.org/centralized-substation-protection-automation-and-control-system-cspacs)
- [Test strategy for PAC functions in a fully digital substation based on IEC 61850 — CIGRE Technical Brochure](https://www.e-cigre.org/publications/detail/760-test-strategy-for-protection-automation-and-control-pac-functions-in-a-fully-digital-substation-based-on-iec-61850-applications.html)
- [The true art of control, monitoring and protection provided by Substation Automation Systems — EEP](https://electrical-engineering-portal.com/control-monitoring-protection-substation-automation-systems)
- [Protection, automation and control systems and the IEC 61850 paradigm — IEEE Xplore](https://ieeexplore.ieee.org/document/8114121)
- Job postings describing real PAC engineer responsibilities: [PowerWright Technologies](https://www.powerwrighttech.com/engineer), [Hitachi Energy](https://www.hitachienergy.com/us/en/careers/open-jobs/details/JID3-171751), [Switchgear Magazine](https://switchgear-magazine.com/careers/senior-substation-engineer-protection-and-controls-2/)

---

## 2. Substation primary architecture (120 kV → 20 kV / 10 kV)

A typical two-voltage-level substation of this kind consists of:

- **120 kV side** — either an outdoor **AIS** (Air-Insulated Switchgear) yard, with equipment mounted on
  steel/concrete structures and air as the insulating medium, or a compact **GIS** (Gas-Insulated
  Switchgear) building where breakers/disconnectors/busbars are sealed in SF₆-filled metal enclosures.
  AIS is cheaper and easier to inspect/maintain but needs much more space (GIS has ~40% smaller footprint);
  GIS is preferred where space is constrained or the environment is harsh. Typical yard equipment per bay:
  circuit breaker, disconnectors (line-side and bus-side), earthing switch(es), CTs, VTs (or CVTs), surge
  arresters, and busbar(s).
- **Power transformers** — one or more 120/20 kV or 120/10 kV units stepping down to the MV level, each
  normally protected by transformer differential protection plus overcurrent/earth-fault backup (see §6).
- **MV switchgear room (10 kV / 20 kV)** — metal-clad, compartmentalized switchgear (see §4) arranged in
  bays: incoming transformer feeder(s), outgoing distribution feeders, and typically a bus-coupler/bus-tie
  bay if there are two busbar sections.
- **Busbar configurations** — single busbar is simplest; more critical installations use double-busbar,
  ring-bus, or breaker-and-a-half arrangements so a single breaker failure doesn't de-energize the whole
  station. The prototype substation uses a single/sectionalized busbar per voltage level for clarity.
- **Cable/line and transformer bays** are functionally the same building block (breaker + disconnectors +
  earthing switch + CT/VT) with different upstream/downstream connections — a line bay connects to an
  overhead line or cable feeder, a transformer bay connects to a transformer winding.

Sources:
- [AIS vs GIS: A Complete Guide — Rugged Monitoring](https://www.ruggedmonitoring.com/air-insulated-switchgear-ais-vs-gas-insulated-switchgear-gis/)
- [Air Insulated vs Gas Insulated Switchgear — CHINT Global](https://www.chintglobal.com/global/en/about-us/news-center/blog/air-insulated-switchgear-vs-gas-insulated-switchgear.html)
- [Single line diagrams of substations — EEP](https://electrical-engineering-portal.com/single-line-diagrams-substations)
- [Seven design diagrams every HV substation engineer must understand — EEP](https://electrical-engineering-portal.com/7-design-diagrams-hv-substation-engineer)
- [Substation Components—Part 4: Isolators — EEPower](https://eepower.com/technical-articles/substation-componentspart-4-isolators/)
- [Substation Components—Part 5: Busbar Configurations — EEPower](https://eepower.com/technical-articles/substation-componentspart-5-busbar-configurations/)

---

## 3. Interlocking and safe switching sequences

Interlocking exists to prevent operations that are mechanically or electrically unsafe:

- A **disconnector must not be operated** (opened/closed) unless the associated **circuit breaker is
  open** — disconnectors have no arc-extinguishing capability, so breaking load current through one causes
  a sustained arc and equipment destruction.
- The **circuit breaker must not close** unless its disconnectors are fully in a valid position (closed
  for normal service, or open/earthed for maintenance).
- An **earthing switch must not close** onto a circuit that is still live — closing an earth switch onto an
  energized circuit produces a bolted three-phase fault. It may only close once the circuit is verified
  de-energized and isolated.
- The correct de-energization sequence is: open the breaker (under load-break conditions) → open the
  disconnector(s) to create a visible isolating gap → verify absence of voltage with an approved device →
  close the earthing switch. Reversing any of these steps is unsafe.

This directly informs the `canOpen`/`canClose` predicate functions in the simulation engine, and the
"wrong order → blocked with an explanation" requirement for the switching scenario.

Sources:
- [National Grid Substation Interlocking Schemes Technical Specification](https://www.neso.energy/document/33131/download)
- [Switchgear interlocking system and arc protection — EEP](https://electrical-engineering-portal.com/switchgear-interlocking-system-arc-protection-design)
- [Mastering Interlock Logic and Schemes for a GIS (132 kV example) — EEP](https://electrical-engineering-portal.com/mastering-interlock-logic-schemes-gas-insulated-substation)
- [Earthing Switch Basics: Making Capacity & Interlock Guide](https://xbrele.com/earthing-switch-basics-making-capacity-interlock-guide/)

---

## 4. MV switchgear: ABB- and Eaton-style physical design

Researched as **inspiration for a generic, original visual style** — the game does not reproduce any
vendor's actual panel design, logos, or trademarks (see `game-design.md` for the fictional brand
identities used instead).

- **ABB UniGear** (e.g. ZS1/ZS2/ZS3.2 range) is medium-voltage, metal-clad, air-insulated switchgear:
  metal partitions segregate compartments (busbar, breaker/circuit-breaker truck, cable, low-voltage
  instrument compartment) from each other; live parts are air-insulated; front access is used for
  maintenance; a single busbar compartment runs the length of the switchboard (optionally sectionalized).
  Panels present a front mimic diagram, position indicators, and LV compartment with protection/control
  devices.
- **Eaton Xiria** family is SF6-free MV switchgear (ring main units and switchboards) up to 24 kV, built
  around maintenance-free vacuum interrupters rated for tens of thousands of operations, emphasizing
  operator safety (e.g. clear position indication, interlocked operating mechanisms) and a compact
  extendable panel design.
- Common front-panel elements across both families that the game should reproduce generically: a
  single-line mimic diagram silkscreened/engraved on the door, breaker/disconnector/earth-switch position
  indicators ("open/closed" flags), a spring-charged/stored-energy indicator for the breaker mechanism,
  local control switches or a control panel with local/remote selector, padlockable mechanical interlocks,
  and warning/danger labels (arc-flash, high-voltage symbols).

Sources:
- [ABB UniGear ZS1 — Medium-voltage air-insulated switchgear](https://library.e.abb.com/public/40813c97d07812bdc1257b13005735d2/Guide_UNIGEAR(en)_1VLM000005%20Rev4.pdf)
- [ABB UniGear Portfolio](https://new.abb.com/medium-voltage/switchgear/air-insulated/iec-and-other-standards/unigear-portfolio)
- [ABB UniGear ZS3.2 Instruction Manual](https://library.e.abb.com/public/34f3c256e7630816c1257b1300573d08/UniGear%20ZS3.2%20Specification%20EN%20Rev.D.pdf)
- [Eaton Xiria 630 — Medium Voltage Switchgear Panel](https://www.eaton.com/gb/en-gb/catalog/medium-voltage-power-distribution-control-systems/xiria.html)
- [Eaton Xiria 630 User Manual](https://www.eaton.com/content/dam/eaton/products/medium-voltage-power-distribution-control-systems/xiria/eaton-xiria-630-user-manual-en-us.pdf)

---

## 5. IEDs: ABB- and GE-style front panels

- **ABB Relion 615 series (e.g. REF615 feeder protection IED)**: front panel has a local HMI with graphical
  display, navigation/control buttons, and up to 11 matrix-programmable LEDs for alarm indication. LEDs
  support multiple modes (steady, non-latched blinking, latched blinking after acknowledgment) so an
  operator can distinguish an active-unacknowledged alarm from an active-acknowledged one at a glance. The
  IED records disturbance/fault data (channel-configurable disturbance recorder) tied to trip events.
- **GE Multilin relays (e.g. 350/850 feeder protection series, UR platform)**: front panel typically has an
  LCD display (multi-line, tens of characters), dedicated LEDs for relay health/alarm/pickup/trip status, a
  keypad, and a local communication port. Target messages, self-test errors, and event/flash messages are
  shown on the display and logged internally.
- Common concept across both: **LED status + local display + event list + disturbance record** is the
  standard way an IED communicates "what happened and why" to a technician standing in front of the panel
  — this is exactly what the protection-trip scenario asks the player to read.

Sources:
- [ABB REF615 Operation Manual](https://library.e.abb.com/public/53a2103f6d1cbe25c1257b0c005606bc/REF615_oper_756376_ENc%20.pdf)
- [ABB REF615 Application Manual](https://library.e.abb.com/public/ee72c3dff4bcbd59c1257b130056a2d6/REF615_appl_756378_ENc.pdf)
- [ABB Relion 615 series Product Guide](https://library.e.abb.com/public/d122c8fd560175c6c1257c7b00445b0b/REF615_pg_756379_ENm.pdf)
- [GE Multilin 350 Series Instruction Manual — ManualsLib](https://www.manualslib.com/manual/2156981/Ge-Multilin-350-Series.html)
- [GE Multilin 850 Feeder Protection System Instruction Manual](https://docs.ips.us/docs/W1002150.pdf)
- [GE Vernova Multilin UR Family](https://www.gevernova.com/grid-solutions/automation/protection-control-metering/multilin-ur-family)

---

## 6. Protection functions

Core functions modeled in the sim (named per common ANSI device numbers, mapped to IEC 61850 logical node
classes in §8):

- **Overcurrent (ANSI 50/51)** — instantaneous (50) and time-delayed/inverse-time (51) phase overcurrent;
  the classic feeder-fault protection. Must be set well above maximum load current (150–200%) to avoid
  nuisance trips on overload.
- **Earth/ground fault (50N/51N)** — same principle applied to residual/neutral current, far more
  sensitive than phase overcurrent since normal load produces near-zero residual current.
- **Restricted earth fault (REF)** — a differential scheme comparing neutral CT current against the sum of
  phase CTs, giving high-sensitivity detection (as low as 5–10% of winding from neutral) of internal
  transformer earth faults; used as backup alongside differential protection.
- **Transformer differential protection (ANSI 87T)** — compares current entering vs. leaving the
  transformer (adjusted for ratio/phase shift per Kirchhoff's current law); a healthy transformer has
  ~zero differential current, so any significant difference indicates an internal fault. This is the
  primary, fast-acting transformer protection.

The prototype scenario uses an overcurrent/earth-fault trip on a 20 kV feeder as the required minimum;
87T/REF are documented for the transformer bay's protection function list even if not all are exercised in
the first playable slice.

Sources:
- [Transformer differential protection (87T) — EEP](https://electrical-engineering-portal.com/transformer-differential-protection-ansi-code-87-t)
- [REF Protection of Transformers: Principle, Settings & Operation — Wiringuru](https://wiringuru.com/restricted-earth-fault-protection-of-transformers/)
- [8 typical transformer protection schemes — EEP](https://electrical-engineering-portal.com/transformer-protection-schemes)
- [Power transformer protection relaying (overcurrent, REF & differential) — EEP](https://electrical-engineering-portal.com/power-transformer-protection-relaying-overcurrent-restricted-earth-fault-differential)

---

## 7. Digital substation communications: GOOSE, MMS, Sampled Values, merging units, PRP

- **MMS (Manufacturing Message Specification)** — client/server communication (reporting, control,
  file transfer) typically between station-level (SCADA/HMI/gateway) and bay-level IEDs.
- **GOOSE (Generic Object-Oriented Substation Event)** — fast, event-driven, publisher/subscriber
  multicast messaging on the Ethernet LAN, used for time-critical signals: trip commands, interlocking
  exchange between bay IEDs, blocking signals. This is the mechanism used in the trip flow and in
  cross-bay interlocking.
- **Sampled Values (SV, IEC 61850-9-2)** — digitized, time-stamped current/voltage measurement streams
  (typically 80 or 256 samples/cycle) published as Ethernet multicast, replacing hard-wired analog CT/VT
  wiring from the switchyard to the relay house.
- **Merging Units (MU)** — the device that digitizes CT/VT secondary signals and publishes them as SV
  (and often subscribes to/republishes GOOSE and PTP time sync) onto the **process bus**. Any IED, meter,
  or fault recorder can subscribe to a merging unit's stream instead of being hard-wired to its own CTs/VTs.
- **Station bus vs. process bus** — the *process bus* is the network between the primary yard/switchgear
  (merging units, breaker actuators) and the bay-level IEDs; the *station bus* is the network between
  bay-level IEDs, bay controllers, and the station HMI/SCADA/gateway. Both are increasingly realized as
  fully digital, all-fiber Ethernet networks in modern ("digital") substations.
- **PRP (Parallel Redundancy Protocol, IEC 62439-3)** — redundancy scheme where every source node
  (merging unit, IED) has two independent network ports (LAN A / LAN B) and sends every frame duplicated
  on both; the receiving node uses the first copy that arrives and discards the duplicate. This gives
  zero-time failover if either LAN path fails — no protocol convergence delay, unlike spanning tree — which
  is why PRP (or HSR) is the standard redundancy choice for both station bus and process bus in a modern
  IEC 61850 digital substation. This directly informs the `prpPorts` field on `MergingUnit`/`IED` in the
  data model and the PAC-fault scenario (knocking out one LAN path should not by itself cause an outage —
  only a config/logic fault or dual failure should).

Sources:
- [Technical Dive: Understanding MMS, GOOSE, and SV — MZ Automation](https://www.mz-automation.de/12960/mms-goose-and-sv-iec-61850/)
- [IEC 61850 — Wikipedia](https://en.wikipedia.org/wiki/IEC_61850)
- [RELION Substation Merging Unit SMU615 IEC 61850 Engineering Guide — ABB](https://library.e.abb.com/public/b159fe9d8ac341829d00d208b8f424ec/SMU615_iec61850eng_758409_ENc.pdf)
- [Process Bus Fundamentals: Merging Units — Hitachi ABB / NASPI](https://www.naspi.org/sites/default/files/2021-02/20210127_Hitachi_ABB_Merging_Unit.pdf)
- [Redundancy techniques in a Digital IEC 61850 substation PAC system — PAC World](https://www.pacw.org/redundancy-techniques-in-a-digital-iec-61850-substation-pac-system-2)
- [Link redundancy in the process bus per IEC 61850 Ed.2: RSTP, PRP, HSR](https://conprove.com/wp-content/uploads/2022/03/LINK_REDUNDANCY_IN_THE_PROCESS_BUS_ACCORDING_TO_IEC_61850_ED2_RSTP_PRP_HSR_PROTOCOLS.pdf)
- [Towards Latency Bypass and Scalability... IEC 62439-3 network architecture — NCBI/PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9269785/)

---

## 8. IEC 61850 Edition 2.1 and Logical Node modeling

**Edition 2.1** (published from 2020) is a *consolidation* of Edition 2 (2010) with Amendment 1: it folds
years of accumulated corrections (tracked in IEC's public Tissue Database) directly into the core parts, so
implementers no longer need to apply Edition 2 + a separate amendment document. The parts republished as
Edition 2.1 include 61850-6 (SCL configuration language), 61850-7-2 (abstract communication service
interface), 61850-7-3 (common data classes), 61850-7-4 (logical node classes), 61850-8-1 (MMS/Ethernet
mapping), and 61850-9-2 (Sampled Values over Ethernet). For this project's purposes, Edition 2.1 does not
introduce a fundamentally different logical-node vocabulary from Edition 2 — it is the same LN/CDC model,
corrected and consolidated — so modeling against the well-established Edition-2-era logical node classes is
a valid and current approach. *(Note: this synthesis relies on a secondary technical blog, not the paywalled
primary IEC text — flagged per the note at the top of this document.)*

**Logical node classes used in the data model** (per the widely documented IEC 61850-7-4/7-3 structure,
grouped by category letter):

| Class  | Category         | Meaning                                                        |
|--------|------------------|-----------------------------------------------------------------|
| LLN0   | L — System       | Logical node zero: mandatory device-level node on every Logical Device |
| LPHD   | L — System       | Physical device information (mandatory)                        |
| XCBR   | X — Switchgear   | Circuit breaker                                                 |
| XSWI   | X — Switchgear   | Disconnector / earthing switch (any non-breaker switch)         |
| CSWI   | C — Control      | Switch controller (issues the actual open/close command)        |
| MMXU   | M — Measurement  | Measurement unit (currents, voltages, power)                    |
| PTOC   | P — Protection   | Time overcurrent protection                                     |
| PIOC   | P — Protection   | Instantaneous overcurrent protection                            |
| PDIF   | P — Protection   | Differential protection (used for transformer 87T)              |
| PTRC   | P — Protection   | Protection trip conditioning (collects starts, issues the trip) |
| RBRF   | R — Protection related | Breaker failure protection                                |
| RREC   | R — Protection related | Autoreclosing                                              |
| RDRE   | R — Protection related | Disturbance recorder                                       |
| RSYN   | R — Protection related | Synchronism/synchro-check                                  |
| GGIO   | G — Generic      | Generic process I/O (used for miscellaneous binary status/alarms) |

Each Logical Node exposes **Data Objects** built from **Common Data Classes** (61850-7-3), e.g. `Pos`
(double-point controllable status — DPC — used for breaker/switch position), `Str`/`Op` (protection
start/operate, ACD/ACT), `A` (measured analogue value, MX). Communication services are attached via
**control blocks**: `GoCB` (GOOSE control block, station bus), `SvCB` (Sampled Value control block, process
bus), and buffered/unbuffered report control blocks (MMS reporting to SCADA).

Source (secondary summary; primary IEC texts are paywalled at the IEC webstore):
- [News on IEC 61850: Edition 2.1 of Core Documents Published — nettedautomation.com](https://blog.nettedautomation.com/2020/03/iec-61850-edition-21-of-core-documents.html)
- [IEC TS 61850-1-2:2020 — IEC webstore listing](https://webstore.iec.ch/en/publication/59652)
- [IEC 61850 — Wikipedia](https://en.wikipedia.org/wiki/IEC_61850)

---

## 9. SCADA-facing protocols

- **IEC 60870-5-104 ("IEC 104")** — the standard telecontrol protocol between substation RTU/gateway and a
  remote control center over TCP/IP (well-known port 2404); SCADA is the client, the substation is the
  server, supporting both polling and spontaneous event-driven reporting with sequence numbering and
  retransmission for robustness. Notably, IEC 104 has no built-in authentication/encryption — a detail worth
  reflecting in the PAC-fault scenario if network security is ever explored.
- **Modbus TCP** — simpler master/slave protocol, still common for legacy RTUs, test sets, and
  miscellaneous auxiliary devices; used in the sim for the test-set/secondary-injection simulation.

Sources:
- [IEC 60870-5-104 Protocol overview](https://scadaprotocols.com/iec-60870-5/)
- [IEC 60870-5-104 Protocol RTU/IED Server Simulator Manual — FreyrSCADA](https://www.freyrscada.com/docs/FreyrSCADA-IEC-60870-5-104-Server-Simulator-User-Manual.pdf)

---

## 10. Commissioning & secondary injection testing

Commissioning of a protection bay typically involves: comparing the as-built installation against the
design drawings (SLD, bay wiring diagrams, trip-circuit schematics); checking CT/VT wiring polarity and
ratio; performing **secondary injection testing** — injecting controlled current/voltage signals into the
relay's inputs (not the primary HV circuit) using a test set — to verify protection function pickup values,
time delays, and that the correct output contact operates the correct trip coil; verifying status inputs
(breaker position, disconnector position feedback) and output contacts (trip, close, alarm relays) match
expectations; and working through a signed-off commissioning checklist. Industry-standard tooling for this
is a multi-channel secondary-injection test set (the OMICRON CMC series is the most widely referenced
example), which can also verify GOOSE-based tripping in digital substations. This maps to the "test-set
simulation for secondary injection" and the commissioning checklist scenario.

Sources:
- [OMICRON Protection Relay Testing overview](https://www.omicronenergy.com/en/protection-relay-testing/)
- [OMICRON CMC 356 — Universal relay test set and commissioning tool](https://www.omicronenergy.com/en/products/cmc-356/)

---

## 11. Safety procedures: five safety rules, LOTO, permit-to-work

The classical **five safety rules** for working on HV/MV electrical installations (widely taught across
utilities and reflected in the sources below):

1. **Disconnect completely** (open all points of supply to the work area).
2. **Secure against re-connection** (lock-out/tag-out — physically prevent switches/breakers from being
   closed, and tag them to warn others work is in progress).
3. **Verify absence of operating voltage** at the point of work — using an approved voltage-detection
   device, following a **live-dead-live** check (test the detector on a known live source, test the
   de-energized point, re-test the detector on the known live source, to confirm the detector itself didn't
   fail).
4. **Carry out earthing and short-circuiting** — connect the isolated section to earth (and bond phases
   together) so any residual/induced voltage has a safe discharge path; this is only done *after* steps 1–3,
   never before.
5. **Provide protection against adjacent live parts** — barriers, screening, or safe clearance distances for
   any nearby equipment that remains energized.

A **permit-to-work** system formally authorizes and scopes the work, and is issued/cancelled as part of the
same procedure; safe working areas are flagged/barricaded and signed. These five rules and the switching
sequence in §3 are the backbone of the switching-scenario gameplay and the "why" text shown when the player
attempts an unsafe or out-of-order action.

Sources:
- [Work according to the five safety rules — DEHN](https://www.dehn-international.com/en/solutions/safety-equipment/safety-rules)
- [Substation Safety and Switching Rules You MUST Follow — EEP](https://electrical-engineering-portal.com/substation-safety-switching-rules-you-must-follow)
- [Electrical Safety Principles — LBL Electrical Safety Program](https://electricalsafety.lbl.gov/electrical-safety/electrical-safety-program-esp/electrical-safety-principles/)

---

## Summary of explicit assumptions carried into design

- Vendor equipment (ABB, Eaton, GE) is used strictly as **research/inspiration**; the game ships original
  "ABB-style" / "Eaton-style" / "GE-style" generic designs and fictional brand identities, not reproductions.
- IEC 61850 Edition 2.1's logical-node/CDC vocabulary is treated as equivalent to the well-documented
  Edition 2 model for modeling purposes (see §8 caveat).
- The simulation models the *shape* of real protocols (GOOSE/MMS/SV/PRP/IEC 104) and real LN-based IED
  structure, but does not implement actual wire-level encodings — it is an educational simulation, not a
  certified test tool.
- Where a primary IEC standard document could not be accessed (paywalled), synthesis relies on the
  secondary/vendor/technical-education sources listed above rather than invented detail.
