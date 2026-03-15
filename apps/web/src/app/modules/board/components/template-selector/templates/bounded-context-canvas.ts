import { TuNode } from '@tapiz/board-commons';
import { TemplaNode } from '../template-node.model';

// Bounded Context Canvas — by Nick Tune & Team Topologies community
// Sections: Name, Description, Strategic Classification, Domain Roles,
// Inbound/Outbound Communication, Ubiquitous Language, Business Decisions,
// Assumptions, Open Questions

function panel(
  x: number,
  y: number,
  w: number,
  h: number,
  html: string,
  color?: string,
): TuNode<TemplaNode> {
  return {
    id: '',
    type: 'panel',
    content: {
      position: { x, y },
      layer: 1,
      text: html,
      width: w,
      height: h,
      rotation: 0,
      drawing: [],
      ...(color ? { color } : {}),
    },
  };
}

function note(
  x: number,
  y: number,
  text: string,
  color: string,
  w = 240,
  h = 100,
): TuNode<TemplaNode> {
  return {
    id: '',
    type: 'note',
    content: {
      position: { x, y },
      layer: 1,
      text: `<p>${text}</p>`,
      width: w,
      height: h,
      color,
      votes: [],
      emojis: [],
      drawing: [],
      ownerId: '',
    },
  };
}

const COL = 820;
const ROW = 420;
const GAP = 20;

export function getTemplate(): TuNode<TemplaNode>[] {
  return [
    // ── Outer border ──────────────────────────────────────────────────────────
    panel(
      0,
      0,
      COL * 3 + GAP * 4,
      ROW * 4 + GAP * 5 + 80,
      `<h2 style="text-align:center">Bounded Context Canvas</h2>
       <p style="text-align:center;color:#adb5bd">A collaborative tool for designing and documenting a single bounded context — Nick Tune</p>`,
      '#f0f4ff',
    ),

    // ── Row 0: Name + Description + Classification ────────────────────────────
    panel(
      GAP,
      80,
      COL,
      180,
      `<h3>Context Name</h3>
       <p style="color:#adb5bd">Give this bounded context a clear, meaningful name from the domain language.</p>`,
      '#dde8ff',
    ),
    panel(
      GAP + COL + GAP,
      80,
      COL,
      180,
      `<h3>Purpose / Mission</h3>
       <p style="color:#adb5bd">Why does this context exist? What problem does it solve? What value does it deliver?</p>`,
      '#dde8ff',
    ),
    panel(
      GAP + (COL + GAP) * 2,
      80,
      COL,
      180,
      `<h3>Strategic Classification</h3>
       <p style="color:#adb5bd"><strong>Domain type:</strong> Core / Supporting / Generic<br/>
       <strong>Business model:</strong> Revenue generator / Cost reducer / Compliance<br/>
       <strong>Evolution:</strong> Genesis / Custom / Product / Commodity</p>`,
      '#dde8ff',
    ),

    // ── Row 1: Domain Roles ────────────────────────────────────────────────────
    panel(
      GAP,
      80 + 180 + GAP,
      COL * 3 + GAP * 2,
      ROW,
      `<h3>Domain Roles</h3>
       <p style="color:#adb5bd">What roles does this context play? (e.g. data owner, policy enforcer, orchestrator, gateway, translator)</p>`,
      '#fff9db',
    ),
    note(GAP * 2, 80 + 180 + GAP + 80, 'Data Owner', '#ffd60a', 200, 90),
    note(GAP * 2 + 220, 80 + 180 + GAP + 80, 'Policy Enforcer', '#ffd60a', 200, 90),
    note(GAP * 2 + 440, 80 + 180 + GAP + 80, 'Gateway / Anti-Corruption', '#ffd60a', 200, 90),

    // ── Row 2: Inbound + Outbound Communication ───────────────────────────────
    panel(
      GAP,
      80 + 180 + GAP + ROW + GAP,
      COL + 200,
      ROW * 1.5,
      `<h3>Inbound Communication</h3>
       <p style="color:#adb5bd">What does this context consume? Commands, queries, and events coming IN.</p>`,
      '#d4f4e8',
    ),
    note(
      GAP * 2,
      80 + 180 + GAP + ROW + GAP + 90,
      'CustomerRegistered (Event)',
      '#52b788',
      240,
      90,
    ),
    note(
      GAP * 2 + 260,
      80 + 180 + GAP + ROW + GAP + 90,
      'GetOrderStatus (Query)',
      '#52b788',
      240,
      90,
    ),

    panel(
      GAP + (COL + 200) + GAP,
      80 + 180 + GAP + ROW + GAP,
      COL * 2 - 200 - GAP,
      ROW * 1.5,
      `<h3>Outbound Communication</h3>
       <p style="color:#adb5bd">What does this context publish? Events, commands, and data flowing OUT.</p>`,
      '#ffe8d6',
    ),
    note(
      GAP * 2 + (COL + 200) + GAP,
      80 + 180 + GAP + ROW + GAP + 90,
      'OrderPlaced (Event)',
      '#ffa500',
      240,
      90,
    ),
    note(
      GAP * 2 + (COL + 200) + GAP + 260,
      80 + 180 + GAP + ROW + GAP + 90,
      'InventoryReserved (Event)',
      '#ffa500',
      240,
      90,
    ),

    // ── Row 3: Ubiquitous Language + Business Decisions ───────────────────────
    panel(
      GAP,
      80 + 180 + GAP + ROW + GAP + ROW * 1.5 + GAP,
      COL * 2 + GAP,
      ROW,
      `<h3>Ubiquitous Language</h3>
       <p style="color:#adb5bd">Key terms and their precise meaning within this context. Paste notes with "Term → Definition".</p>`,
      '#f3e8ff',
    ),
    note(
      GAP * 2,
      80 + 180 + GAP + ROW + GAP + ROW * 1.5 + GAP + 90,
      'Order → A customer intent to purchase items, identified by an OrderId',
      '#c77dff',
      340,
      90,
    ),

    panel(
      GAP + (COL * 2 + GAP) + GAP,
      80 + 180 + GAP + ROW + GAP + ROW * 1.5 + GAP,
      COL - GAP,
      ROW,
      `<h3>Business Decisions &amp; Assumptions</h3>
       <p style="color:#adb5bd">Key business rules and open questions / assumptions.</p>`,
      '#ffeaea',
    ),
    note(
      GAP * 2 + (COL * 2 + GAP) + GAP,
      80 + 180 + GAP + ROW + GAP + ROW * 1.5 + GAP + 90,
      '⚠️ Max 10 items per order?',
      '#ef233c',
      280,
      90,
    ),
  ];
}
