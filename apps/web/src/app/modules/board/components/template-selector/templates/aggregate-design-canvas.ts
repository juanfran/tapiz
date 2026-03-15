import { TuNode } from '@tapiz/board-commons';
import { TemplaNode } from '../template-node.model';

// Aggregate Design Canvas — by Nick Tune & Virtual DDD community
// Sections: Name, Description, State, Commands, Domain Events, Invariants,
// Handled Events, External Dependencies

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
  w = 220,
  h = 110,
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

const GAP = 20;

export function getTemplate(): TuNode<TemplaNode>[] {
  const COL = 700;
  const ROW = 360;
  const TOTAL_W = COL * 3 + GAP * 4;

  return [
    // ── Header ────────────────────────────────────────────────────────────────
    panel(
      0,
      0,
      TOTAL_W,
      100,
      `<h2 style="text-align:center">Aggregate Design Canvas</h2>
       <p style="text-align:center;color:#adb5bd">Design an aggregate by exploring its state, behaviour, and invariants — Nick Tune &amp; Virtual DDD</p>`,
      '#1e1e2e',
    ),

    // ── Row 1 – Name | Description | State ───────────────────────────────────
    panel(
      GAP,
      120,
      COL,
      200,
      `<h3>Aggregate Name</h3>
       <p style="color:#adb5bd">What is this aggregate called in the ubiquitous language?</p>`,
      '#dde8ff',
    ),
    panel(
      GAP + (COL + GAP),
      120,
      COL,
      200,
      `<h3>Description</h3>
       <p style="color:#adb5bd">What is the purpose of this aggregate? What business capability does it own?</p>`,
      '#dde8ff',
    ),
    panel(
      GAP + (COL + GAP) * 2,
      120,
      COL,
      200,
      `<h3>State (Properties)</h3>
       <p style="color:#adb5bd">What data does this aggregate hold? List key properties and their types.</p>`,
      '#fff9db',
    ),
    note(GAP + (COL + GAP) * 2 + GAP, 120 + 90, 'orderId: OrderId', '#ffd60a', 200, 80),
    note(GAP + (COL + GAP) * 2 + GAP + 220, 120 + 90, 'status: OrderStatus', '#ffd60a', 200, 80),

    // ── Row 2 – Commands ──────────────────────────────────────────────────────
    panel(
      GAP,
      120 + 200 + GAP,
      COL,
      ROW,
      `<h3>Commands</h3>
       <p style="color:#adb5bd">What commands does this aggregate handle? (Verb + Noun, imperative)</p>`,
      '#d4e6ff',
    ),
    note(GAP * 2, 120 + 200 + GAP + 90, 'PlaceOrder', '#3a86ff', 200, 100),
    note(GAP * 2 + 220, 120 + 200 + GAP + 90, 'CancelOrder', '#3a86ff', 200, 100),
    note(GAP * 2, 120 + 200 + GAP + 90 + 120, 'ConfirmOrder', '#3a86ff', 200, 100),

    // ── Row 2 – Domain Events ─────────────────────────────────────────────────
    panel(
      GAP + (COL + GAP),
      120 + 200 + GAP,
      COL,
      ROW,
      `<h3>Domain Events</h3>
       <p style="color:#adb5bd">What domain events does this aggregate emit? (Noun + past-tense Verb)</p>`,
      '#fff0d4',
    ),
    note(GAP + (COL + GAP) + GAP, 120 + 200 + GAP + 90, 'OrderPlaced', '#ffa500', 200, 100),
    note(GAP + (COL + GAP) + GAP + 220, 120 + 200 + GAP + 90, 'OrderCancelled', '#ffa500', 200, 100),
    note(GAP + (COL + GAP) + GAP, 120 + 200 + GAP + 90 + 120, 'OrderConfirmed', '#ffa500', 200, 100),

    // ── Row 2 – Invariants ────────────────────────────────────────────────────
    panel(
      GAP + (COL + GAP) * 2,
      120 + 200 + GAP,
      COL,
      ROW,
      `<h3>Invariants &amp; Business Rules</h3>
       <p style="color:#adb5bd">What rules must ALWAYS hold true for this aggregate? Violations are impossible.</p>`,
      '#ffe8f0',
    ),
    note(GAP + (COL + GAP) * 2 + GAP, 120 + 200 + GAP + 90, 'Order total must be > 0', '#ef233c', 220, 100),
    note(GAP + (COL + GAP) * 2 + GAP + 240, 120 + 200 + GAP + 90, 'Cannot cancel a DELIVERED order', '#ef233c', 220, 100),

    // ── Row 3 – Handled Events | Dependencies | Concerns ─────────────────────
    panel(
      GAP,
      120 + 200 + GAP + ROW + GAP,
      COL,
      ROW,
      `<h3>Handled Events</h3>
       <p style="color:#adb5bd">Events from other contexts that this aggregate reacts to.</p>`,
      '#edfcf2',
    ),
    note(GAP * 2, 120 + 200 + GAP + ROW + GAP + 90, 'PaymentReceived', '#52b788', 200, 100),

    panel(
      GAP + (COL + GAP),
      120 + 200 + GAP + ROW + GAP,
      COL,
      ROW,
      `<h3>External Dependencies</h3>
       <p style="color:#adb5bd">What external systems or services does this aggregate depend on?</p>`,
      '#fff9f0',
    ),
    note(GAP + (COL + GAP) + GAP, 120 + 200 + GAP + ROW + GAP + 90, 'Payment Service', '#ffb3c6', 200, 100),
    note(GAP + (COL + GAP) + GAP + 220, 120 + 200 + GAP + ROW + GAP + 90, 'Inventory Service', '#ffb3c6', 200, 100),

    panel(
      GAP + (COL + GAP) * 2,
      120 + 200 + GAP + ROW + GAP,
      COL,
      ROW,
      `<h3>Open Questions &amp; Concerns</h3>
       <p style="color:#adb5bd">Unresolved design questions, performance concerns, or team debates.</p>`,
      '#fafafa',
    ),
    note(GAP + (COL + GAP) * 2 + GAP, 120 + 200 + GAP + ROW + GAP + 90, '⚠️ Event sourcing needed?', '#c77dff', 220, 100),
  ];
}
