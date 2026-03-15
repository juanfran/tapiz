import { TuNode } from '@tapiz/board-commons';
import { TemplaNode } from '../template-node.model';

// Colors follow the Event Storming legend:
// Orange  = Domain Event
// Blue    = Command
// Yellow  = Actor / Aggregate
// Green   = Read Model
// Purple  = Policy
// Red     = Hot Spot / Problem
// Pink    = External System
const COLORS = {
  event: '#ffa500',
  command: '#3a86ff',
  actor: '#ffd60a',
  aggregate: '#ffe066',
  policy: '#c77dff',
  readModel: '#52b788',
  hotspot: '#ef233c',
  external: '#ffb3c6',
  panel: '#1a1a2e',
  legend: '#f8f9fa',
};

const NOTE_W = 220;
const NOTE_H = 140;
const GAP = 30;

function note(
  x: number,
  y: number,
  text: string,
  color: string,
): TuNode<TemplaNode> {
  return {
    id: '',
    type: 'note',
    content: {
      position: { x, y },
      layer: 1,
      text: `<p>${text}</p>`,
      width: NOTE_W,
      height: NOTE_H,
      color,
      votes: [],
      emojis: [],
      drawing: [],
      ownerId: '',
    },
  };
}

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

export function getTemplate(): TuNode<TemplaNode>[] {
  const SW = 980; // swimlane width
  const SH = 340; // swimlane height
  const SY_START = 160;

  return [
    // ── Header panel ─────────────────────────────────────────────────────────
    panel(
      0,
      0,
      SW * 6 + GAP * 5,
      130,
      `<h2 style="text-align:center;color:#fff">Event Storming Board</h2>
       <p style="text-align:center;color:#adb5bd">Read the board left → right: Actors send Commands → Aggregates emit Events → Policies react → more Commands</p>`,
      '#1a1a2e',
    ),

    // ── Swimlane 1 – Actors & Commands ───────────────────────────────────────
    panel(
      0,
      SY_START,
      SW,
      SH,
      `<h3 style="color:#fff">1 · Actors &amp; Commands</h3>
       <p style="color:#adb5bd">Who does what? Yellow = Actor · Blue = Command</p>`,
      '#14213d',
    ),
    note(GAP, SY_START + 80, 'Customer', COLORS.actor),
    note(GAP + NOTE_W + GAP, SY_START + 80, 'Place Order', COLORS.command),

    // ── Swimlane 2 – Domain Events ───────────────────────────────────────────
    panel(
      SW + GAP,
      SY_START,
      SW,
      SH,
      `<h3 style="color:#fff">2 · Domain Events</h3>
       <p style="color:#adb5bd">Things that happened. Past tense. Orange = Domain Event</p>`,
      '#14213d',
    ),
    note(SW + GAP * 2, SY_START + 80, 'Order Placed', COLORS.event),
    note(SW + GAP * 2 + NOTE_W + GAP, SY_START + 80, 'Order Confirmed', COLORS.event),

    // ── Swimlane 3 – Aggregates ──────────────────────────────────────────────
    panel(
      (SW + GAP) * 2,
      SY_START,
      SW,
      SH,
      `<h3 style="color:#fff">3 · Aggregates</h3>
       <p style="color:#adb5bd">Domain objects handling commands. Yellow = Aggregate</p>`,
      '#14213d',
    ),
    note((SW + GAP) * 2 + GAP, SY_START + 80, 'Order Aggregate', COLORS.aggregate),
    note((SW + GAP) * 2 + GAP + NOTE_W + GAP, SY_START + 80, 'Inventory Aggregate', COLORS.aggregate),

    // ── Swimlane 4 – Policies ────────────────────────────────────────────────
    panel(
      (SW + GAP) * 3,
      SY_START,
      SW,
      SH,
      `<h3 style="color:#fff">4 · Policies</h3>
       <p style="color:#adb5bd">Automation rules. "Whenever X, then Y". Purple = Policy</p>`,
      '#14213d',
    ),
    note((SW + GAP) * 3 + GAP, SY_START + 80, 'Whenever Order Placed → Reserve Inventory', COLORS.policy),

    // ── Swimlane 5 – Read Models ─────────────────────────────────────────────
    panel(
      (SW + GAP) * 4,
      SY_START,
      SW,
      SH,
      `<h3 style="color:#fff">5 · Read Models &amp; External Systems</h3>
       <p style="color:#adb5bd">Green = Read Model · Pink = External System</p>`,
      '#14213d',
    ),
    note((SW + GAP) * 4 + GAP, SY_START + 80, 'Order Status View', COLORS.readModel),
    note((SW + GAP) * 4 + GAP + NOTE_W + GAP, SY_START + 80, 'Payment Gateway', COLORS.external),

    // ── Swimlane 6 – Hot Spots ───────────────────────────────────────────────
    panel(
      (SW + GAP) * 5,
      SY_START,
      SW,
      SH,
      `<h3 style="color:#fff">6 · Hot Spots &amp; Questions</h3>
       <p style="color:#adb5bd">Problems, unknowns, debates. Red = Hot Spot</p>`,
      '#14213d',
    ),
    note((SW + GAP) * 5 + GAP, SY_START + 80, '⚠️ Who owns order cancellation?', COLORS.hotspot),

    // ── Legend ────────────────────────────────────────────────────────────────
    panel(
      0,
      SY_START + SH + GAP,
      NOTE_W * 8 + GAP * 9,
      180,
      `<h4>Legend</h4>
       <p>
         <span style="background:${COLORS.event};padding:2px 8px;border-radius:4px;margin-right:6px">Domain Event</span>
         <span style="background:${COLORS.command};color:#fff;padding:2px 8px;border-radius:4px;margin-right:6px">Command</span>
         <span style="background:${COLORS.actor};padding:2px 8px;border-radius:4px;margin-right:6px">Actor</span>
         <span style="background:${COLORS.aggregate};padding:2px 8px;border-radius:4px;margin-right:6px">Aggregate</span>
         <span style="background:${COLORS.policy};color:#fff;padding:2px 8px;border-radius:4px;margin-right:6px">Policy</span>
         <span style="background:${COLORS.readModel};color:#fff;padding:2px 8px;border-radius:4px;margin-right:6px">Read Model</span>
         <span style="background:${COLORS.external};padding:2px 8px;border-radius:4px;margin-right:6px">External System</span>
         <span style="background:${COLORS.hotspot};color:#fff;padding:2px 8px;border-radius:4px">Hot Spot</span>
       </p>`,
    ),
  ];
}
