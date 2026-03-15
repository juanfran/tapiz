# TAPIZ MASTERPLAN: Konkurrenzloses Collaborative Infinite Whiteboard

> Ziel: Tapiz wird zur performantesten, robustesten und modernsten Open-Source-Whiteboard-Loesung am Markt.
> 50+ gleichzeitige User, <16ms Frame Time, funktioniert bei 2G-Netz und 4GB RAM.

---

## Status Quo (IST-Analyse)

### Architektur

| Schicht | Technologie | Bewertung |
|---------|-------------|-----------|
| Frontend | Angular 21 + NgRx Signals | Solide, aber DOM-basiertes Rendering limitiert bei >500 Nodes |
| Rendering | DOM-Elemente (tapiz-node) | Kein Viewport-Culling, kein LOD, 9000x9000px Canvas |
| State Sync | Custom syncNodeBox (Action-Based) | Kein CRDT/OT, Last-Write-Wins bei Konflikten |
| Transport | Socket.io + MsgPack | Gut, aber kein Delta-Sync, Full-State bei Join |
| Backend | Node.js/Fastify 5 + tRPC | Single-Thread, ~10-20k msg/sec Limit |
| Persistence | PostgreSQL + Drizzle 0.45 | Board als JSON-Blob, Full-Rewrite alle 2s |
| Auth | Better Auth 1.5 (Google OAuth) | Funktional |

### Identifizierte Engpaesse

1. **Kein CRDT**: Concurrent Edits koennen verloren gehen (KRITISCHSTER BUG)
2. **Kein Viewport-Culling**: Off-Screen Nodes werden gerendert
3. **Rendering**: Alle Nodes im DOM = Layout-Thrashing bei >200 Nodes
4. **Full-State Dump**: Neuer Client bekommt gesamten Board-State
5. **JSON-Blob Persistence**: 2s Durability-Gap via throttleTime(2000)
6. **Kein Offline-Support**: Disconnect = Arbeitsverlust

### DOM-Abhaengigkeiten (Kritischer Kontext)

Die aktuelle App ist tief DOM-basiert. Ein Canvas-Renderer kann diese Features NICHT direkt ersetzen:

| Feature | DOM-Abhaengigkeit | Canvas-Impact |
|---------|-------------------|---------------|
| TipTap Rich-Text (15+ Extensions) | contenteditable, ProseMirror | DOM-Overlay noetig |
| Drawing (perfect-freehand) | Canvas pro Note | Globales Canvas neu implementieren |
| CDK Drag-Drop | HostListener, DOM Events | Hit-Testing + eigenes Drag |
| Angular Material Dialoge | Overlay-Container | Bleibt DOM (kein Problem) |
| 12 Node-Typen | ViewContainerRef, dynamisch | Jeder braucht Canvas-Renderer |
| File-Drop | @HostListener('drop') | Canvas kennt kein Drop-Event |
| Context Menus | cdk-overlay | Bleibt DOM (kein Problem) |

---

## Wettbewerbsanalyse

| Feature | Miro | FigJam | Excalidraw | tldraw | **Tapiz (Ziel)** |
|---------|------|--------|------------|--------|-----------------|
| Rendering | WebGL + LOD | Wasm/WebGL | Canvas 2D | Canvas + DOM-Overlay | **DOM-Culling -> Canvas Hybrid** |
| Sync | Custom WS | OT/CRDT Hybrid | WebRTC E2EE | Yjs CRDT | **Yjs CRDT** |
| Max Concurrent | ~200 | ~100 | ~20 (P2P) | ~50 | **50-100** |
| Offline | Nein | Nein | Ja (lokal) | Ja | **Ja (CRDT + IndexedDB)** |
| Open Source | Nein | Nein | Ja | Ja | **Ja** |
| Self-Hosted | Enterprise | Nein | Ja | Ja | **Ja** |
| Spatial Index | Quadtree | Custom | Viewport | R-Tree | **R-Tree (rbush)** |
| Rich Text | Eigener Editor | Eigener Editor | Plain Text | tldraw Editor | **TipTap/ProseMirror** |

> Anmerkung: Realistische Ziele statt Marketing-Zahlen. 50-100 concurrent Users ist
> fuer ein Open-Source Self-Hosted Tool ein hervorragender Wert. Excalidraw schafft ~20 (P2P).

---

## Architektur-Ziel

```
                    +------------------+
                    |   CDN / Edge     |
                    |  (Static Assets) |
                    +--------+---------+
                             |
                    +--------+---------+
                    |   Node.js/Fastify |
                    |   tRPC API +      |
                    |   y-websocket     |   <- Yjs CRDT Sync Provider
                    |   (yrs via WASM)  |      50-100 concurrent Users
                    +--------+---------+
                             |
                    +--------+---------+
                    |    PostgreSQL     |
                    | (Yjs Snapshots)   |
                    +------------------+

  Frontend:
  +----------------------------------------------------+
  |  Angular 21 + Signals                              |
  |  +----------------------------------------------+  |
  |  |  Rendering: DOM + Viewport-Culling (Phase 0)  |  |
  |  |  -> Canvas Hybrid (Phase 2, wenn noetig)      |  |
  |  |  +--------+  +---------+                      |  |
  |  |  | R-Tree |  | LOD Mgr |                      |  |
  |  |  +--------+  +---------+                      |  |
  |  +----------------------------------------------+  |
  |  +----------------------------------------------+  |
  |  |  Yjs Document (CRDT State)                   |  |
  |  |  y-websocket <-> Node.js y-websocket Server  |  |
  |  +----------------------------------------------+  |
  +----------------------------------------------------+
```

### Architektur-Entscheidungen nach Review

| Entscheidung | Urspruenglich | Nach Review | Begruendung |
|-------------|---------------|-------------|-------------|
| Rendering Phase 1 | Canvas 2D sofort | DOM-Culling zuerst | TipTap/ProseMirror benoetigt DOM. Quick Win mit 20-40 LOC |
| Canvas-Ansatz | Full Canvas 2D | Canvas Hybrid (wie tldraw) | DOM-Overlay fuer TipTap, Canvas fuer Board-Layer |
| Backend | Rust/Axum | Node.js + y-websocket + yrs/WASM | 2 Wochen statt 6 Wochen. Node.js reicht fuer 50-100 User |
| Binary Protocol | FlatBuffers | Yjs Binary Encoding (y-protocols) | Yjs hat eigenes optimiertes Binary Protocol. FlatBuffers redundant |
| Migration | Dual-Write | Feature-Flag Cutover | Dual-Write ist Anti-Pattern: CRDT vs LWW haben unterschiedliche Merge-Semantik |
| Tiling | Phase 1 | Backlog (wenn >5000 Nodes) | Premature Optimization. Dirty-Tile-Invalidierung negiert Cache bei aktivem Board |

---

## Phasen-Plan

### Phase 0: Baseline + Quick Wins (Wochen 1-2)
**Ziel: Sofortige Verbesserungen, Messgrundlage schaffen**

#### 0.1 Performance-Baseline
- [ ] FPS-Counter via requestAnimationFrame (Client)
- [ ] Memory-Logging via performance.memory (Chrome)
- [ ] WebSocket-Latenz Messung (RTT)
- [ ] Benchmark-Board mit 500 generierten Nodes erstellen
- [ ] IST-Werte dokumentieren als Referenz fuer alle Optimierungen

#### 0.2 DOM-Viewport-Culling (Quick Win)
- [ ] rbush Library integrieren fuer O(log n) Viewport-Queries
- [ ] Alle Nodes in R-Tree indizieren (x, y, width, height)
- [ ] NodesComponent.nodes() computed signal: Nur sichtbare Nodes rendern
- [ ] R-Tree Update bei Node-Move (bulk-reinsert)

```typescript
// Quick Win in nodes.component.ts (~30 LOC)
nodes = computed(() => {
  const allNodes = this.#boardFacade.filterBoardNodes(this.#boardFacade.nodes());
  const viewport = this.#getViewportBounds(); // position + zoom + window.innerWidth/Height
  return allNodes.filter(node => this.#rtree.search(viewport).includes(node));
});
```

**Performance-Ziel:**
```
Vorher:  500 Nodes = 500 DOM-Elemente = ~15fps (zu messen!)
Nachher: 500 Nodes, ~50 sichtbar = 50 DOM-Elemente = 60fps
```

#### 0.3 Dark Mode (Quick Win)
- [ ] CSS Custom Properties fuer alle Farben
- [ ] prefers-color-scheme Media Query
- [ ] Toggle-Button im Settings-Panel
- [ ] Alle Komponenten pruefen (besonders Note, Panel, Toolbar)

#### 0.4 DB-Persist Optimierung
- [ ] throttleTime(2000) durch debounce + dirty-check ersetzen
- [ ] Nur geaenderte Boards persisten (nicht alle aktiven)

**E2E Tests Phase 0:**
- [ ] Viewport-Culling: Off-Screen Nodes nicht im DOM
- [ ] Dark Mode: Toggle schaltet korrekt, alle Komponenten lesbar
- [ ] Performance: FPS-Counter zeigt >30fps bei 200 Nodes

---

### Phase 1: CRDT-Revolution (Wochen 3-8)
**Ziel: Konfliktfreie Echtzeit-Kollaboration, Offline-Support, Datenverlust eliminieren**

> Dies ist die Phase mit dem HOECHSTEN Business Value. Datenverlust durch
> Last-Write-Wins ist der schlimmste Bug eines Collaboration-Tools.

#### 1.1 Yjs Integration (Frontend)
- [ ] Yjs als State-Management Layer einfuehren
- [ ] `Y.Map` fuer Board-Settings
- [ ] `Y.Array` fuer Node-Liste mit `Y.Map` pro Node
- [ ] `Y.XmlFragment` fuer TipTap/ProseMirror Text (native Yjs-Integration via y-prosemirror)
- [ ] Angular Signals Bridge: yMapToSignal() Helper fuer Yjs -> Signal Sync
- [ ] UndoManager fuer Undo/Redo (ersetzt syncNodeBox History)

**Yjs-Angular Bridge (selbst zu bauen, ~100 LOC):**
```typescript
function yMapToSignal<T>(yMap: Y.Map<T>): Signal<Map<string, T>> {
  const sig = signal(new Map(yMap.entries()));
  yMap.observe(() => sig.set(new Map(yMap.entries())));
  return sig;
}
```
> Hinweis: yMap.observe() feuert ausserhalb von Angulars Zone.
> Bei zoneless Angular 21 muss ChangeDetectorRef.markForCheck()
> oder der Effekt-Scheduler manuell angestossen werden.

#### 1.2 y-websocket Backend (Node.js)
- [ ] y-websocket Provider auf bestehendem Fastify-Server
- [ ] Optional: yrs via WASM fuer Server-Side CRDT (bessere GC, weniger Memory)
- [ ] Y-Sync Protocol Handler
- [ ] Snapshot-Persistierung nach PostgreSQL (Binary-Blob statt JSON)
- [ ] Automatic Garbage Collection alter CRDT-Tombstones

#### 1.3 syncNodeBox Migration (Feature-Flag Cutover)
- [ ] Yjs komplett parallel implementieren (neuer Code-Pfad)
- [ ] Feature-Flag pro Board: `useYjs: boolean`
- [ ] Bestehende Boards bei Oeffnen einmalig nach Yjs importieren
- [ ] Kein Dual-Write (CRDT vs LWW haben unterschiedliche Merge-Semantik)
- [ ] Rollback = Feature-Flag zurueck + Board aus PostgreSQL-Backup

> WICHTIG: Dual-Write (syncNodeBox + Yjs parallel) ist ein Anti-Pattern.
> Bei concurrent Edits produzieren CRDT und Last-Write-Wins UNTERSCHIEDLICHE
> Ergebnisse. Ein State-Vergleich ist daher grundsaetzlich fragwuerdig.
> Feature-Flag Cutover ist sicherer und einfacher.

#### 1.4 Offline-First Architecture
- [ ] IndexedDB Persistence via y-indexeddb
- [ ] Aenderungen lokal speichern, bei Reconnect CRDT-Merge
- [ ] Offline-Indikator im UI (nutzt bestehende ReconnectionComponent)
- [ ] Conflict-Free: Yjs CRDT garantiert automatische Merge

#### 1.5 Awareness & Presence
- [ ] Live Cursor Positions via Yjs Awareness Protocol
- [ ] User-Selection Highlighting (wer bearbeitet was)
- [ ] Follow-User Feature (Viewport synchronisieren)
- [ ] Connection-Status Badge pro User

#### 1.6 Fractional Indexing
- [ ] Node-Reihenfolge via Fractional Indices statt Array-Position
- [ ] Concurrent Inserts ohne Konflikte
- [ ] Z-Index Management ueber Fractional Keys

**E2E Tests Phase 1:**
- [ ] 2 Browser-Tabs: Note in Tab A erstellen, erscheint in Tab B (<2s)
- [ ] Offline: Note erstellen, Netz trennen, Note bearbeiten, Netz wieder da -> Sync
- [ ] Concurrent Edit: 2 User editieren gleiche Note -> kein Datenverlust
- [ ] Cursor von User B sichtbar in Tab A
- [ ] Undo/Redo funktioniert mit Yjs UndoManager
- [ ] Board-Migration: Bestehendes JSON-Board oeffnet korrekt als Yjs-Board

---

### Phase 2: Rendering-Optimierung (Wochen 9-14)
**Ziel: 60fps bei 500+ Nodes — nur wenn DOM-Culling aus Phase 0 nicht reicht**

> ENTSCHEIDUNGSPUNKT: Nach Phase 0+1 Baseline erneut messen.
> Wenn DOM-Culling + rbush bereits 60fps bei 500 Nodes liefert,
> kann Canvas Hybrid auf Phase 4+ verschoben werden.

#### 2.1 DOM-LOD (Level of Detail ohne Canvas)
- [ ] 3 CSS-basierte Detail-Stufen:
  - **LOD 0** (zoom > 0.5): Volle Details, Text, Schatten, Borders
  - **LOD 1** (zoom 0.2-0.5): Vereinfachte Darstellung, kein Text-Rendering
  - **LOD 2** (zoom < 0.2): Nur farbige Rechtecke (CSS-only)
- [ ] `content-visibility: auto` auf Nodes (Browser-natives Rendering-Culling)
- [ ] Text-Rendering erst ab bestimmter Pixel-Groesse (>8px)

#### 2.2 Canvas Hybrid Renderer (wenn DOM-LOD nicht reicht)
- [ ] Canvas fuer Board-Layer: Pan, Zoom, Node-Shapes, Verbindungen
- [ ] DOM-Overlay fuer aktive Texteditierung (TipTap bleibt DOM-basiert)
- [ ] Text-zu-Bitmap Pre-Rendering fuer Canvas (Nicht-Edit-Modus)
- [ ] Hit-Testing via geometrische Berechnung (nicht Color-Picking)
- [ ] Smooth 60fps Pan/Zoom via requestAnimationFrame

**Warum Canvas Hybrid statt Full Canvas:**
- TipTap/ProseMirror BENOETIGT den DOM (contenteditable)
- tldraw verwendet denselben Hybrid-Ansatz erfolgreich
- 12 Node-Typen muessen nicht komplett neu implementiert werden
- DOM-Overlays fuer interaktive Inhalte, Canvas nur fuer Darstellung

#### 2.3 Spatial Index Verfeinerung
- [ ] R-Tree Proximity-Queries fuer Snap-to-Grid und Grouping
- [ ] Frustum-Culling fuer rotierte Nodes
- [ ] Batch-Updates fuer Multi-Node-Moves

**E2E Tests Phase 2:**
- [ ] LOD-Wechsel bei Zoom visuell korrekt
- [ ] 500-Node Board: 60fps sustained (gemessen gegen Phase-0 Baseline)
- [ ] Touch-Pan/Zoom funktioniert
- [ ] TipTap-Editing funktioniert im Hybrid-Modus (DOM-Overlay)
- [ ] Alle 12 Node-Typen rendern korrekt

---

### Phase 3: UX-Exzellenz (Wochen 11-16, teilweise parallel zu Phase 2)
**Ziel: Polierte, barrierefreie Bedienung**

#### 3.1 Accessibility (WCAG 2.1 AA)
- [ ] Keyboard Navigation fuer alle Board-Elemente (Tab, Arrow, Enter)
- [ ] Screen Reader: aria-live fuer kollaborative Events
- [ ] Focus Management: Sichtbare Focus-Ringe (bereits implementiert)
- [ ] Farbkontrast: Automatische Text-Farbe (bereits implementiert)
- [ ] Reduced Motion: prefers-reduced-motion Respektierung

#### 3.2 Mobile-First Board
- [ ] Responsive Toolbar (Bottom-Sheet auf Mobile)
- [ ] Touch-Gesten: 1-Finger Pan, 2-Finger Zoom (bereits implementiert)
- [ ] Context-Menu via Long-Press
- [ ] Mobile Keyboard Handling fuer Note-Editing
- [ ] PWA: Installierbar, Offline-faehig (nutzt Yjs Offline aus Phase 1)

#### 3.3 Keyboard Shortcuts & Discoverability
- [ ] Help-Modal (? Taste) mit allen Shortcuts
- [ ] Command Palette (Ctrl+K) fuer schnelle Aktionen
- [ ] Shortcut-Badges in Tooltips
- [ ] Onboarding: Interaktives Tutorial fuer neue User

#### 3.4 Micro-Interactions & Animations
- [ ] Note-Erzeugung: Scale-In Animation
- [ ] Note-Loeschung: Fade-Out + Scale-Down
- [ ] Cursor-Smoothing: Interpolation zwischen Awareness-Updates
- [ ] Vote-Animation: Number Pop + Color Pulse
- [ ] Route-Transitions: Fade zwischen Board-Liste und Board

#### 3.5 Export
- [ ] PNG Export (html2canvas oder dom-to-image)
- [ ] SVG Export
- [ ] JSON Export (Yjs Document -> JSON)
- [ ] PDF Export (via PNG + jsPDF)

**E2E Tests Phase 3:**
- [ ] Dark Mode: Alle Komponenten korrekt gestylt (bereits Phase 0)
- [ ] Mobile: Touch-Pan/Zoom/Note-Creation auf 375px Viewport
- [ ] Keyboard: Tab durch alle Toolbar-Buttons, Enter aktiviert
- [ ] Help-Modal: ? oeffnet, Esc schliesst, alle Shortcuts gelistet
- [ ] Export: PNG/SVG/JSON erzeugt valide Dateien

---

### Phase 4: Haertung & Monitoring (Wochen 17-22)
**Ziel: Production-Ready, messbar, sicher**

#### 4.1 Performance Monitoring
- [ ] Client-Side Performance Metrics (FPS, Memory, Render Time)
- [ ] Server-Side Metrics (Connections, Msg Throughput, Latency P99)
- [ ] Prometheus + Grafana Dashboards (oder einfaches /metrics Endpoint)
- [ ] Alerting bei Performance-Degradation

#### 4.2 Load Testing
- [ ] k6 Scripts fuer WebSocket Load Tests
- [ ] 50-User Simulation: Concurrent Note Creation/Moving
- [ ] 500-Node Board: Render Performance Benchmark
- [ ] Network Degradation Simulation (tc netem)
- [ ] Memory Leak Detection (Long-Running Sessions)

#### 4.3 Security Hardening
- [ ] WebSocket Rate Limiting pro Board/User (aktuell: KEIN WS Rate Limiting!)
- [ ] Input Validation (XSS Prevention in Notes)
- [ ] Content Security Policy Headers
- [ ] Audit Logging (wer hat was wann geaendert)
- [ ] CSRF Protection fuer tRPC Mutations

#### 4.4 Image Storage
- [ ] S3/MinIO Integration fuer Bild-Upload (aktuell: lokales Dateisystem)
- [ ] CDN-Integration fuer Assets
- [ ] Image-Resize Pipeline (Thumbnails fuer LOD)

#### 4.5 Observability
- [ ] Structured Logging (JSON-Format)
- [ ] Request Tracing (Correlation IDs)
- [ ] Error Tracking (Sentry oder aehnlich)

#### 4.6 DevOps
- [ ] Docker Compose fuer einfaches Self-Hosting
- [ ] Health-Check Endpoints
- [ ] Database Migration Pipeline
- [ ] CI/CD: Build + E2E + Load Test

**E2E Tests Phase 4:**
- [ ] 50 concurrent Connections, alle sehen Updates
- [ ] Latenz-Test: Aenderung < 100ms Round-Trip
- [ ] Rate Limiting: Ueberschreitung wird korrekt abgelehnt
- [ ] Bild-Upload via S3: Upload + Anzeige funktioniert

---

## Backlog: Bedarfsgesteuert (kein fester Zeitplan)

Diese Features werden NUR implementiert wenn messbare Nachfrage besteht:

### Rust Backend (Trigger: >100 concurrent Users auf einem Node)
- [ ] Axum + Tokio WS Server mit yrs
- [ ] Auth-Bruecke (Better Auth Sessions -> JWT fuer Rust)
- [ ] Connection Pool mit Backpressure
- [ ] Graceful Shutdown mit State Flush

### Canvas Full Renderer (Trigger: >1000 Nodes, DOM-Hybrid zu langsam)
- [ ] OffscreenCanvas fuer Worker-Thread Bitmap-Caching
- [ ] Tiling Pattern fuer zoomed-out Ansicht
- [ ] Tile-Prefetch fuer benachbarte Viewport-Bereiche

### Enterprise Features (Trigger: zahlende Kunden/Teams)
- [ ] SAML/OIDC SSO Integration
- [ ] Team-Spaces mit Berechtigungen
- [ ] Board-Templates
- [ ] Board-Versionshistorie (Yjs Snapshots)
- [ ] Kommentar-Threads auf Nodes

### Weitere
- [ ] GDPR/Datenschutz: User-Daten vollstaendig loeschbar
- [ ] i18n/l10n: Mehrsprachigkeit
- [ ] Adaptive Quality: Network-Quality Detection + automatische Qualitaetsanpassung
- [ ] Horizontal Scaling: Redis Pub/Sub fuer Multi-Node

---

## Technologie-Entscheidungen

### Frontend

| Entscheidung | Wahl | Begruendung |
|-------------|------|-------------|
| Rendering Phase 0 | DOM + rbush Viewport-Culling | Quick Win, 20-40 LOC, erhaelt alle Features |
| Rendering Phase 2 | Canvas Hybrid (wie tldraw) | Canvas fuer Board-Layer, DOM-Overlay fuer TipTap |
| Spatial Index | rbush (R-Tree) | Industry Standard, O(log n) Viewport-Queries |
| CRDT | Yjs | Schnellste CRDT-Lib, native TipTap-Integration (y-prosemirror) |
| State | Yjs + Angular Signals (UI) | Yjs fuer shared State, Signals fuer lokalen UI-State |
| Offline | y-indexeddb | Yjs-native Persistence, automatischer CRDT-Merge |
| Binary | y-protocols (Yjs native) | Etabliertes Binary Sync Protocol |

### Backend

| Entscheidung | Wahl | Begruendung |
|-------------|------|-------------|
| WS Server | Node.js/Fastify + y-websocket | Bestehender Stack, reicht fuer 50-100 User |
| CRDT Server | yrs via WASM (optional) | Bessere GC als JS-Yjs, gleicher Server-Prozess |
| API Server | Node.js/Fastify (bestehend) | tRPC API bleibt unveraendert |
| Persistence | PostgreSQL (Yjs Binary Snapshots) | Binary-Blob statt JSON-Blob, inkrementell |
| Image Storage | S3/MinIO (Phase 4) | Skaliert horizontal, CDN-faehig |

### Gestrichene Technologien (nach Review)

| Technologie | Grund fuer Streichung |
|-------------|----------------------|
| Rust/Axum Backend | Over-Engineering fuer 50 User. Node.js + y-websocket reicht. 6 Wochen gespart |
| FlatBuffers | Redundant zu Yjs Binary Encoding (y-protocols). Doppelte Serialisierung |
| Full Canvas 2D | Zerstoert TipTap, Drawing, Drag-Drop, 12 Node-Typen. Hybrid stattdessen |
| OffscreenCanvas Worker | Kein DOM-Zugang, kein Rich-Text-Rendering moeglich im Worker |
| Tiling (Phase 1) | Premature Optimization. Dirty-Tile-Invalidierung bei aktivem Board = kein Cache-Vorteil |
| Dual-Write Migration | Anti-Pattern: CRDT vs LWW produzieren unterschiedliche Merge-Ergebnisse |

---

## Migrations-Strategie: syncNodeBox -> Yjs (Feature-Flag Cutover)

```
Phase A: Yjs parallel implementieren
  1. Neuer Code-Pfad mit Yjs State-Management
  2. y-websocket Provider auf Fastify-Server
  3. Feature-Flag: board.useYjs = false (default)
  4. Alle neuen Features nur auf Yjs-Pfad

Phase B: Board-Import
  1. Migration-Script: JSON-Blob -> Yjs Document
     - TuNode[] aus PostgreSQL lesen
     - Programmatisch Y.Array.push() + Y.Map.set() fuer jede Property
     - Nested structures (children, comments) als verschachtelte Y.Maps
  2. Bei Board-Oeffnung: Automatischer Import wenn noch kein Yjs-Document
  3. Yjs Binary-Blob als neues DB-Feld (board_yjs BYTEA)

Phase C: Feature-Flag aktivieren
  1. Neue Boards: useYjs = true (default)
  2. Bestehende Boards: Bei Oeffnen automatisch migrieren
  3. Rollback: Feature-Flag zurueck + board JSON-Blob wiederherstellen

Phase D: syncNodeBox entfernen
  1. Alle Boards auf Yjs migriert (DB-Query: WHERE board_yjs IS NOT NULL)
  2. syncNodeBox Code + WsService Pooling entfernen
  3. Socket.io durch y-websocket ersetzen
  4. Cleanup: NgRx Actions fuer Board-State entfernen
```

> DB-Schema-Aenderung: Neues Feld `board_yjs BYTEA` neben bestehendem `board JSONB`.
> Beide Felder existieren waehrend der Migration. Nach vollstaendiger Migration
> kann `board JSONB` entfernt werden.

---

## Metriken & Erfolgskriterien

### Performance KPIs

| Metrik | IST (zu messen!) | ZIEL | Messung |
|--------|-------------------|------|---------|
| Frame Rate (500 Nodes) | TBD (Phase 0 Baseline) | 60fps | requestAnimationFrame Counter |
| Time to Interactive | TBD | <1.5s | Lighthouse |
| WS Latency (P99) | TBD | <50ms | Server Metrics |
| Memory (500 Nodes) | TBD | <100MB | Chrome DevTools |
| Concurrent Users | ~10 | 50+ | k6 Load Test |
| Offline Recovery | Nicht moeglich | <2s Sync | E2E Test |
| Initial Load (1000 Nodes) | TBD | <1s | Yjs Delta Sync |
| Input Latency | TBD | <16ms | Event Timing API |

> WICHTIG: Alle IST-Werte muessen in Phase 0 gemessen werden.
> Ohne Baseline ist jede Optimierung Raterei.

### Qualitaets-KPIs

| Metrik | ZIEL | Messung |
|--------|------|---------|
| E2E Test Coverage | >90% aller User Flows | Cypress |
| WCAG 2.1 AA | 100% Compliance | axe-core Audit |
| Lighthouse Performance | >80 | CI Pipeline |
| Bundle Size (Initial) | <600KB gzipped | Build Stats |
| CRDT Conflict Resolution | 100% automatisch | Integration Tests |

### Feedback-Checkpoints

| Nach Phase | Feedback-Aktion |
|------------|-----------------|
| Phase 0 | Baseline-Werte dokumentieren, Team-Review |
| Phase 1 | User-Test mit 5-10 Personen: Collaborative Editing |
| Phase 2 | Performance-Vergleich gegen Baseline |
| Phase 3 | Accessibility-Audit (axe-core), Mobile-Test auf echten Geraeten |
| Phase 4 | Load-Test-Ergebnisse, Security-Audit |

---

## Risiken & Mitigations

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Yjs Migration bricht bestehende Boards | Mittel | Kritisch | Feature-Flag Cutover, DB-Backup, Rollback-Plan |
| Yjs Memory bei 10.000+ Nodes | Niedrig | Mittel | GC Tuning, Snapshot + Truncate, y-indexeddb |
| Yjs-Angular Signals Bridge instabil | Mittel | Mittel | Eigene Bridge testen, Zone-Handling beachten |
| DOM-Culling reicht nicht fuer 500 Nodes | Niedrig | Mittel | Canvas Hybrid als Phase 2 vorbereitet |
| Canvas Hybrid: TipTap-Overlay Positioning | Mittel | Mittel | tldraw-Ansatz studieren, Zoom-Transform beachten |
| Mobile Touch-Events Inkompatibilitaeten | Mittel | Niedrig | Pointer Events API als Alternative |
| Bundle Size ueberschreitet 600KB | Mittel | Niedrig | Lazy-Loading, Tree-Shaking, Yjs Chunks |
| Safari OffscreenCanvas Limitationen | Mittel | Niedrig | OffscreenCanvas nur fuer Bitmap-Cache, nicht kritisch |

---

## Reihenfolge der Implementierung

```
Woche  1-2:  Phase 0: Baseline messen + Quick Wins (Viewport-Culling, Dark Mode)
Woche  3-4:  Phase 1a: Yjs Integration (Y.Map, Y.Array, Signals Bridge)
Woche  5-6:  Phase 1b: y-prosemirror + y-websocket + Offline
Woche  7-8:  Phase 1c: Awareness (Cursors) + syncNodeBox Migration
Woche  9-10: Phase 2a: DOM-LOD + content-visibility (CSS-only)
Woche 11-12: Phase 2b: Canvas Hybrid (NUR WENN DOM-LOD nicht reicht)
Woche 11-14: Phase 3a: Accessibility + Keyboard Shortcuts (parallel)
Woche 13-14: Phase 2c/3b: Spatial Index + Export
Woche 15-16: Phase 3c: Mobile PWA + Animations
Woche 17-18: Phase 4a: Performance Monitoring + Load Testing
Woche 19-20: Phase 4b: Security Hardening + Image Storage (S3)
Woche 21-22: Phase 4c: Observability + DevOps + Launch Prep
```

> Anmerkung: Phase 3 laeuft teilweise parallel zu Phase 2, da UX-Arbeit
> (Keyboard Shortcuts, Accessibility, Animations) unabhaengig vom Rendering-Layer ist.

---

## Review-Protokoll

Dieser Masterplan wurde durch drei unabhaengige Experten-Reviews validiert:

1. **Technical Feasibility Review** (Architect)
   - Canvas 2D -> Hybrid-Ansatz korrigiert
   - OffscreenCanvas Worker-Limitationen identifiziert
   - Yjs-Angular Bridge Komplexitaet aufgezeigt
   - Rust Backend als Over-Engineering bewertet

2. **Prioritization & ROI Review** (Planner)
   - Phase-Reihenfolge korrigiert: Yjs vor Canvas
   - Quick Wins (DOM-Culling) als Phase 0 eingefuehrt
   - Enterprise Features in Backlog verschoben
   - User-Feedback-Checkpoints eingefuehrt

3. **Risks & Missing Aspects Review** (Devil's Advocate)
   - 12 DOM-abhaengige Features dokumentiert
   - Daten-Migration Script-Anforderung hinzugefuegt
   - Fehlende Aspekte identifiziert (S3, GDPR, Rate Limiting, Bundle Size)
   - Unrealistische Wettbewerbs-Claims korrigiert (500+ -> 50-100)

---

*Erstellt: 2026-03-15*
*Ueberarbeitet: 2026-03-15 (nach kritischem 3-Perspektiven-Review)*
*Basierend auf: Architektur-Analyse, Competitive Research (Miro, FigJam, Excalidraw, tldraw), UI/UX Review (28 Findings), 3x kritische Expert-Reviews*
