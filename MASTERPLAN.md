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

1. **Rendering**: Alle Nodes im DOM = Layout-Thrashing bei >200 Nodes
2. **Kein Viewport-Culling**: Off-Screen Nodes werden gerendert
3. **Kein CRDT**: Concurrent Edits koennen verloren gehen
4. **Full-State Dump**: Neuer Client bekommt gesamten Board-State
5. **Node.js Throughput**: Event-Loop Blocking bei 50+ aktiven Usern
6. **JSON-Blob Persistence**: 2s Durability-Gap, kein Append-Only-Log
7. **Kein Offline-Support**: Disconnect = Arbeitsverlust

---

## Wettbewerbsanalyse

| Feature | Miro | FigJam | Excalidraw | tldraw | **Tapiz (Ziel)** |
|---------|------|--------|------------|--------|-----------------|
| Rendering | WebGL + LOD | Wasm/WebGL | Canvas 2D | DOM/SVG/Canvas | **Canvas 2D + WebGL-Fallback** |
| Sync | Custom WS | OT/CRDT Hybrid | WebRTC E2EE | Yjs CRDT | **Yjs CRDT + Rust Backend** |
| Max Concurrent | ~200 | ~100 | ~20 (P2P) | ~50 | **500+** |
| Offline | Nein | Nein | Ja (lokal) | Ja | **Ja (CRDT)** |
| Open Source | Nein | Nein | Ja | Ja | **Ja** |
| Self-Hosted | Enterprise | Nein | Ja | Ja | **Ja** |
| Spatial Index | Quadtree | Custom | Viewport | R-Tree | **R-Tree (rbush)** |
| Protocol | JSON/WS | Binary/WS | JSON/WebRTC | Binary/WS | **FlatBuffers/WS** |
| Backend | Java/Node.js | C++/Wasm | Relay only | Node.js | **Rust (Axum)** |

---

## Architektur-Ziel

```
                    +------------------+
                    |   CDN / Edge     |
                    |  (Static Assets) |
                    +--------+---------+
                             |
              +--------------+--------------+
              |        Load Balancer        |
              |    (Sticky WS Sessions)     |
              +---------+--------+----------+
                        |        |
            +-----------+--+  +--+-----------+
            | Rust WS Node |  | Rust WS Node |   <- Axum + yrs (Yjs CRDT)
            | (Axum/Tokio) |  | (Axum/Tokio) |      100k+ conn/node
            +------+-------+  +-------+------+
                   |                   |
            +------+-------------------+------+
            |       PostgreSQL + Redis        |
            |  (Yjs Snapshots + Pub/Sub)      |
            +---------------------------------+

  Frontend:
  +----------------------------------------------------+
  |  Angular 21 + Signals                              |
  |  +----------------------------------------------+  |
  |  |  Canvas 2D Renderer (OffscreenCanvas)        |  |
  |  |  +--------+  +--------+  +---------+        |  |
  |  |  | R-Tree |  | Tiling |  | LOD Mgr |        |  |
  |  |  +--------+  +--------+  +---------+        |  |
  |  +----------------------------------------------+  |
  |  +----------------------------------------------+  |
  |  |  Yjs Document (CRDT State)                   |  |
  |  |  y-websocket <-> Rust Axum Backend           |  |
  |  +----------------------------------------------+  |
  +----------------------------------------------------+
```

---

## Phasen-Plan

### Phase 1: Foundation (Wochen 1-4)
**Ziel: Rendering-Revolution + Viewport-Culling**

#### 1.1 Canvas 2D Renderer
- [ ] Neuen `CanvasRenderer` Service erstellen
- [ ] Nodes auf `<canvas>` zeichnen statt DOM-Elemente
- [ ] OffscreenCanvas fuer Worker-Thread Rendering
- [ ] Text-Rendering mit Canvas measureText + line wrapping
- [ ] Hit-Testing via Color-Picking oder geometrische Berechnung
- [ ] Smooth 60fps Pan/Zoom via requestAnimationFrame

**Warum Canvas 2D statt WebGL:**
- 10.000+ Elemente performant (bewiesen durch Excalidraw)
- Kein Shader-Code, kein SDF-Text-Rendering noetig
- Einfacher zu maintainen als WebGL Pipeline
- WebGL als optionaler Fallback fuer >50.000 Nodes spaeter

#### 1.2 Spatial Indexing (R-Tree)
- [ ] `rbush` Library integrieren
- [ ] Alle Nodes in R-Tree indizieren (x, y, width, height)
- [ ] Viewport-Query: Nur sichtbare Nodes rendern
- [ ] R-Tree Update bei Node-Move (bulk-reinsert)
- [ ] Proximity-Queries fuer Snap-to-Grid und Grouping

**Performance-Ziel:**
```
Vorher:  500 Nodes = 500 DOM-Elemente = ~15fps
Nachher: 500 Nodes, 50 sichtbar = 50 Canvas-Draws = 60fps
```

#### 1.3 Level of Detail (LOD) - Google Maps Prinzip
- [ ] 3 Detail-Stufen definieren:
  - **LOD 0** (zoom > 0.5): Volle Details, Text, Schatten, Borders
  - **LOD 1** (zoom 0.2-0.5): Vereinfachte Shapes, kein Text, Label als Placeholder
  - **LOD 2** (zoom < 0.2): Farbige Rechtecke, keine Details
- [ ] Dynamischer LOD-Wechsel basierend auf Zoom-Level
- [ ] Text-Rendering erst ab bestimmter Pixel-Groesse (>8px)

#### 1.4 Tiling (Google Maps Pattern)
- [ ] Canvas in 512x512 Tiles aufteilen
- [ ] Tile-Cache als OffscreenCanvas/ImageBitmap
- [ ] Pan: Cached Tiles verschieben (ctx.drawImage = sehr schnell)
- [ ] Dirty-Tile Invalidation bei Node-Aenderung
- [ ] Tile-Prefetch fuer benachbarte Viewport-Bereiche

**E2E Tests Phase 1:**
- [ ] Canvas-Renderer rendert alle Node-Typen korrekt
- [ ] Viewport-Culling: Off-Screen Nodes nicht im Render-Zyklus
- [ ] LOD-Wechsel bei Zoom visuell korrekt
- [ ] 500-Node Board: 60fps sustained
- [ ] Touch-Pan/Zoom funktioniert auf Canvas

---

### Phase 2: CRDT-Revolution (Wochen 5-8)
**Ziel: Konfliktfreie Echtzeit-Kollaboration mit Offline-Support**

#### 2.1 Yjs Integration (Frontend)
- [ ] Yjs als State-Management Layer einfuehren
- [ ] `Y.Map` fuer Board-Settings
- [ ] `Y.Array` fuer Node-Liste mit `Y.Map` pro Node
- [ ] `Y.XmlFragment` fuer TipTap/ProseMirror Text (native Yjs-Integration)
- [ ] Awareness Protocol fuer Cursor-Sharing
- [ ] UndoManager fuer Undo/Redo (ersetzt syncNodeBox History)

**Migration syncNodeBox -> Yjs:**
```
syncNodeBox.actions()  ->  yDoc.getArray('nodes').push([node])
syncNodeBox.patch()    ->  yNodeMap.set('content', newContent)
syncNodeBox.undo()     ->  undoManager.undo()
```

#### 2.2 Offline-First Architecture
- [ ] IndexedDB Persistence via `y-indexeddb`
- [ ] Aenderungen lokal speichern, bei Reconnect CRDT-Merge
- [ ] Offline-Indikator im UI
- [ ] Conflict-Free: Yjs CRDT garantiert automatische Merge
- [ ] Snapshot-basierte State Recovery

#### 2.3 Awareness & Presence
- [ ] Live Cursor Positions via Yjs Awareness
- [ ] User-Selection Highlighting (wer bearbeitet was)
- [ ] Follow-User Feature (Viewport synchronisieren)
- [ ] Typing-Indicator in Notes
- [ ] Connection-Status Badge pro User

#### 2.4 Fractional Indexing
- [ ] Node-Reihenfolge via Fractional Indices statt Array-Position
- [ ] Concurrent Inserts ohne Konflikte
- [ ] Z-Index Management ueber Fractional Keys

**E2E Tests Phase 2:**
- [ ] 2 Browser-Tabs: Note in Tab A erstellen, erscheint in Tab B
- [ ] Offline: Note erstellen, Netz trennen, Note bearbeiten, Netz wieder da -> Sync
- [ ] Concurrent Edit: 2 User editieren gleiche Note -> kein Datenverlust
- [ ] Cursor von User B sichtbar in Tab A
- [ ] Undo/Redo funktioniert mit Yjs UndoManager

---

### Phase 3: Rust Backend (Wochen 9-14)
**Ziel: 100x Throughput-Steigerung, Sub-Millisekunde Latenz**

#### 3.1 Axum WebSocket Server
- [ ] Neues Rust-Projekt: `apps/collab-server/`
- [ ] Axum + Tokio async Runtime
- [ ] WebSocket Upgrade Handler
- [ ] Room-Management (Board = Room)
- [ ] Connection Pool mit Backpressure
- [ ] Graceful Shutdown mit State Flush

**Performance-Ziele:**
```
Node.js:  10.000-20.000 msg/sec, ~2-5MB/Connection
Rust:     100.000-500.000 msg/sec, ~100KB/Connection
          = 50x Throughput, 20x Memory-Effizienz
```

#### 3.2 yrs (Yjs Rust Port) Integration
- [ ] `yrs` Crate fuer Server-Side CRDT
- [ ] Y-Sync Protocol Handler (y-websocket kompatibel)
- [ ] Server als Authoritative CRDT Peer
- [ ] Automatic Garbage Collection alter CRDT-Tombstones
- [ ] Snapshot-Persistierung nach PostgreSQL

#### 3.3 Binary Protocol (FlatBuffers)
- [ ] FlatBuffers Schema fuer Board-Operations definieren
- [ ] Zero-Copy Deserialization auf Server
- [ ] Delta-Sync: Nur Aenderungen senden, nicht Full-State
- [ ] Kompression: LZ4 fuer grosse Payloads

**Bandwidth-Reduktion:**
```
Vorher:  JSON Full-State = ~50KB pro Board-Join
Nachher: FlatBuffers Delta = ~200 Bytes pro Operation
         = 99.6% Reduktion
```

#### 3.4 Adaptive Quality
- [ ] Network-Quality Detection (RTT, Bandwidth Estimation)
- [ ] High BW (>5Mbps): Volle Updates, Assets, hoher LOD
- [ ] Medium BW (1-5Mbps): Reduzierte Asset-Qualitaet, LOD-Culling
- [ ] Low BW (<1Mbps): Text-Only, Spatial Index Only, Asset-Defer
- [ ] Automatic Quality Downgrade bei Latenz-Spike

#### 3.5 Horizontal Scaling
- [ ] Redis Pub/Sub fuer Multi-Node Broadcast
- [ ] Sticky Sessions via Load Balancer (Board-ID Hash)
- [ ] State Migration bei Node-Failover
- [ ] Health-Check Endpoints

**E2E Tests Phase 3:**
- [ ] Rust-Server: 50 concurrent Connections, alle sehen Updates
- [ ] Latenz-Test: Aenderung < 50ms Round-Trip
- [ ] Failover: Server-Restart, Clients reconnecten, State intakt
- [ ] Bandwidth-Test: Delta-Sync < 500 Bytes pro Note-Move

---

### Phase 4: UX-Exzellenz (Wochen 15-18)
**Ziel: Awwwards-Level UX, barrierefreie Bedienung**

#### 4.1 Design-System Konsolidierung
- [ ] Einheitliches Token-System (Spacing, Colors, Typography)
- [ ] Dark Mode via CSS Custom Properties + prefers-color-scheme
- [ ] Responsive Breakpoints: 480, 768, 1024, 1440px
- [ ] Component Library Dokumentation (Storybook)

#### 4.2 Accessibility (WCAG 2.1 AA)
- [ ] Keyboard Navigation fuer alle Board-Elemente (Tab, Arrow, Enter)
- [ ] Screen Reader: aria-live fuer kollaborative Events
- [ ] Focus Management: Sichtbare Focus-Ringe (bereits implementiert)
- [ ] Farbkontrast: Automatische Text-Farbe (bereits implementiert)
- [ ] Reduced Motion: prefers-reduced-motion Respektierung

#### 4.3 Mobile-First Board
- [ ] Responsive Toolbar (Bottom-Sheet auf Mobile)
- [ ] Touch-Gesten: 1-Finger Pan, 2-Finger Zoom (bereits implementiert)
- [ ] Context-Menu via Long-Press
- [ ] Mobile Keyboard Handling fuer Note-Editing
- [ ] PWA: Installierbar, Offline-faehig

#### 4.4 Micro-Interactions & Animations
- [ ] Note-Erzeugung: Scale-In Animation (0 -> 1)
- [ ] Note-Loeschung: Fade-Out + Scale-Down
- [ ] Cursor-Smoothing: Interpolation zwischen Updates
- [ ] Vote-Animation: Number Pop + Color Pulse
- [ ] Route-Transitions: Fade zwischen Board-Liste und Board

#### 4.5 Keyboard Shortcuts & Discoverability
- [ ] Help-Modal (? Taste) mit allen Shortcuts
- [ ] Command Palette (Ctrl+K) fuer schnelle Aktionen
- [ ] Shortcut-Badges in Tooltips (vollstaendig)
- [ ] Onboarding: Interaktives Tutorial fuer neue User

**E2E Tests Phase 4:**
- [ ] Dark Mode: Alle Komponenten korrekt gestylt
- [ ] Mobile: Touch-Pan/Zoom/Note-Creation auf 375px Viewport
- [ ] Keyboard: Tab durch alle Toolbar-Buttons, Enter aktiviert
- [ ] Animations: Note erscheint mit Animation (kein Instant-Pop)
- [ ] Help-Modal: ? oeffnet, Esc schliesst, alle Shortcuts gelistet

---

### Phase 5: Enterprise & Scale (Wochen 19-24)
**Ziel: Production-Ready fuer Teams mit 50+ gleichzeitigen Usern**

#### 5.1 Performance Monitoring
- [ ] Client-Side Performance Metrics (FPS, Memory, Render Time)
- [ ] Server-Side Metrics (Connections, Msg Throughput, Latency P99)
- [ ] Prometheus + Grafana Dashboards
- [ ] Alerting bei Performance-Degradation

#### 5.2 Load Testing
- [ ] k6 Scripts fuer WebSocket Load Tests
- [ ] 50-User Simulation: Concurrent Note Creation/Moving
- [ ] 500-Node Board: Render Performance Benchmark
- [ ] Network Degradation Simulation (tc netem)
- [ ] Memory Leak Detection (Long-Running Sessions)

#### 5.3 Security Hardening
- [ ] Rate Limiting pro Board/User
- [ ] Input Validation (XSS Prevention in Notes)
- [ ] CSRF Protection fuer tRPC Mutations
- [ ] Content Security Policy Headers
- [ ] Audit Logging (wer hat was wann geaendert)

#### 5.4 Enterprise Features
- [ ] SAML/OIDC SSO Integration
- [ ] Team-Spaces mit Berechtigungen
- [ ] Board-Templates Marketplace
- [ ] Export: PDF, PNG, SVG, JSON
- [ ] Board-Versionshistorie (Yjs Snapshots)
- [ ] Kommentar-Threads auf Nodes

#### 5.5 DevOps & Deployment
- [ ] Kubernetes Manifeste (Helm Charts)
- [ ] Auto-Scaling basierend auf WebSocket Connections
- [ ] Rolling Updates ohne Connection-Drop
- [ ] Database Migration Pipeline
- [ ] CI/CD: Build + E2E + Load Test + Deploy

---

## Technologie-Entscheidungen

### Frontend

| Entscheidung | Wahl | Begruendung |
|-------------|------|-------------|
| Rendering | Canvas 2D + OffscreenCanvas | 10k+ Nodes performant, einfacher als WebGL, Worker-Thread moeglich |
| Spatial Index | rbush (R-Tree) | Industry Standard, O(log n) Viewport-Queries, Battle-Tested |
| CRDT | Yjs | Schnellste CRDT-Lib, native TipTap-Integration, Awareness Protocol |
| State | Yjs + NgRx Signals (UI) | Yjs fuer shared State, Signals fuer lokalen UI-State |
| Offline | y-indexeddb | Yjs-native Persistence, automatischer CRDT-Merge |
| Binary | y-protocols (Yjs native) | Etabliertes Binary Sync Protocol |

### Backend

| Entscheidung | Wahl | Begruendung |
|-------------|------|-------------|
| WS Server | Rust/Axum | 50x Throughput vs Node.js, 20x Memory-Effizienz |
| CRDT Server | yrs (y-crdt) | Yjs-kompatibler Rust CRDT, y-websocket Protokoll |
| API Server | Node.js/Fastify (bestehend) | tRPC API bleibt, nur WS-Traffic zu Rust migriert |
| Persistence | PostgreSQL (Yjs Snapshots) | Bewaehrte DB, Snapshots statt Full-JSON-Blob |
| Pub/Sub | Redis | Multi-Node Broadcast, Session Store |
| Serialization | Yjs Binary Encoding | Nativ, optimiert, kein Custom-Format noetig |

### Infrastruktur

| Entscheidung | Wahl | Begruendung |
|-------------|------|-------------|
| Container | Docker + K8s | Horizontal Scaling, Rolling Updates |
| Load Balancer | Nginx/HAProxy | Sticky Sessions fuer WebSocket |
| Monitoring | Prometheus + Grafana | Standard, Self-Hosted |
| CI/CD | GitLab CI | Bestehende Pipeline |
| Load Testing | k6 | WebSocket-native, Scriptable |

---

## Migrations-Strategie

### syncNodeBox -> Yjs (Zero-Downtime)

```
Phase A: Dual-Write
  1. Yjs Document parallel zu syncNodeBox fuehren
  2. Alle Actions schreiben in beide Systeme
  3. Lesen weiterhin aus syncNodeBox
  4. Vergleichs-Checks: Yjs-State == syncNodeBox-State?

Phase B: Yjs-Primary
  1. Lesen aus Yjs
  2. syncNodeBox als Read-Only Fallback
  3. Neue Features nur noch auf Yjs

Phase C: syncNodeBox entfernen
  1. Alle Boards auf Yjs migriert
  2. syncNodeBox Code entfernen
  3. Cleanup
```

### Node.js -> Rust WS (Graduelle Migration)

```
Phase A: Rust Server als Proxy
  1. Rust-Server vor Node.js
  2. Leitet WS-Traffic weiter
  3. Latenz-Messung, Stabilisierung

Phase B: Rust uebernimmt WS
  1. Yjs Sync Protocol in Rust
  2. Node.js nur noch fuer tRPC API
  3. Beide Server parallel

Phase C: Full Rust WS
  1. Alle Boards via Rust
  2. Node.js: Nur API + Auth
  3. Performance-Validierung
```

---

## Metriken & Erfolgskriterien

### Performance KPIs

| Metrik | IST | ZIEL | Messung |
|--------|-----|------|---------|
| Frame Rate (500 Nodes) | ~15fps | 60fps | requestAnimationFrame Counter |
| Time to Interactive | ~3s | <1s | Lighthouse |
| WS Latency (P99) | ~100ms | <20ms | Server Metrics |
| Memory (500 Nodes) | ~200MB | <80MB | Chrome DevTools |
| Concurrent Users | ~10 | 50+ | k6 Load Test |
| Offline Recovery | Nicht moeglich | <2s Sync | E2E Test |
| Initial Load (1000 Nodes) | ~5s | <500ms | Delta Sync |
| Input Latency | ~50ms | <16ms | Event Timing API |

### Qualitaets-KPIs

| Metrik | ZIEL | Messung |
|--------|------|---------|
| E2E Test Coverage | >90% aller User Flows | Cypress/Playwright |
| WCAG 2.1 AA | 100% Compliance | axe-core Audit |
| Lighthouse Performance | >90 | CI Pipeline |
| Bundle Size (Initial) | <500KB gzipped | Build Stats |
| CRDT Conflict Resolution | 100% automatisch | Integration Tests |

---

## Risiken & Mitigations

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Canvas 2D Performance reicht nicht | Niedrig | Hoch | WebGL-Fallback vorbereiten, Benchmark frueh |
| Yjs Migration bricht bestehende Boards | Mittel | Kritisch | Dual-Write Phase, Rollback-Plan, DB-Backup |
| Rust-Lernkurve verlangsamt Entwicklung | Mittel | Mittel | Axum Boilerplate, yrs Beispiele, Pair Programming |
| Mobile Touch-Events Inkompatibilitaeten | Mittel | Niedrig | Device-Lab Testing, Pointer Events API als Alternative |
| Yjs Memory bei 10.000+ Nodes | Niedrig | Mittel | Garbage Collection Tuning, Snapshot + Truncate |

---

## Reihenfolge der Implementierung

```
Woche  1-2:  Canvas Renderer Prototype (Note + Panel auf Canvas)
Woche  3-4:  R-Tree + Viewport Culling + LOD
Woche  5-6:  Yjs Integration (Y.Map, Y.Array) + TipTap y-prosemirror
Woche  7-8:  Offline Support (y-indexeddb) + Awareness (Cursors)
Woche  9-10: Rust/Axum WS Server + yrs CRDT
Woche 11-12: Binary Protocol + Delta Sync + Load Testing
Woche 13-14: Rust Server Hardening + Failover + Monitoring
Woche 15-16: Design System + Dark Mode + Responsive
Woche 17-18: Accessibility + Mobile PWA + Animations
Woche 19-20: Enterprise Features (SSO, Export, Versioning)
Woche 21-22: Load Testing 50+ Users + Performance Tuning
Woche 23-24: Security Audit + Documentation + Launch Prep
```

---

*Erstellt: 2026-03-15*
*Basierend auf: Architektur-Analyse (4 Agenten), Competitive Research (Miro, FigJam, Excalidraw, tldraw), UI/UX Review (28 Findings)*
