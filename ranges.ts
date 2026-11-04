export const RANKS = [
  "A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2",
] as const;
export type Rank = (typeof RANKS)[number];

export type Hand = string;
export type Action = "raise" | "call" | "fold" | "3bet" | "4bet" | "jam";

export type RangeEntry = { action: Action; range: string };
export type ResolvedChart = Record<Hand, Action>;

const RANK_RE = "[AKQJT2-9]";
const rankIdx = (r: string) => RANKS.indexOf(r as Rank);

export function handAt(row: number, col: number): Hand {
  if (row === col) return RANKS[row] + RANKS[col];
  if (row < col) return RANKS[row] + RANKS[col] + "s";
  return RANKS[col] + RANKS[row] + "o";
}

export function allHands(): Hand[] {
  const out: Hand[] = [];
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) out.push(handAt(r, c));
  return out;
}

export function combos(hand: Hand): number {
  if (hand.length === 2) return 6;
  return hand[2] === "s" ? 4 : 12;
}

function expandToken(token: string): Hand[] {
  let m: RegExpMatchArray | null;

  if ((m = token.match(new RegExp(`^(${RANK_RE})\\1(\\+)?$`)))) {
    const from = rankIdx(m[1]);
    const to = m[2] ? 0 : from;
    const out: Hand[] = [];
    for (let i = from; i >= to; i--) out.push(RANKS[i] + RANKS[i]);
    return out;
  }
  if ((m = token.match(new RegExp(`^(${RANK_RE})\\1-(${RANK_RE})\\2$`)))) {
    const a = rankIdx(m[1]);
    const b = rankIdx(m[2]);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const out: Hand[] = [];
    for (let i = lo; i <= hi; i++) out.push(RANKS[i] + RANKS[i]);
    return out;
  }
  if ((m = token.match(new RegExp(`^(${RANK_RE})(${RANK_RE})([so])(\\+)?$`)))) {
    const hi = rankIdx(m[1]);
    const kick = rankIdx(m[2]);
    if (kick <= hi) throw new Error(`Bad hand token: ${token}`);
    const top = m[4] ? hi + 1 : kick;
    const out: Hand[] = [];
    for (let k = kick; k >= top; k--) out.push(RANKS[hi] + RANKS[k] + m[3]);
    return out;
  }
  if ((m = token.match(new RegExp(`^(${RANK_RE})(${RANK_RE})([so])-\\1(${RANK_RE})\\3$`)))) {
    const hi = rankIdx(m[1]);
    const a = rankIdx(m[2]);
    const b = rankIdx(m[4]);
    const [lo, up] = a < b ? [a, b] : [b, a];
    const out: Hand[] = [];
    for (let k = lo; k <= up; k++) out.push(RANKS[hi] + RANKS[k] + m[3]);
    return out;
  }
  throw new Error(`Unknown range token: ${token}`);
}

export function expandRange(spec: string): Hand[] {
  return spec
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .flatMap(expandToken);
}

export function resolveChart(entries: RangeEntry[]): ResolvedChart {
  const out: ResolvedChart = {};
  for (const h of allHands()) out[h] = "fold";
  for (const { action, range } of entries) {
    for (const h of expandRange(range)) out[h] = action;
  }
  return out;
}

export function rangePercent(chart: ResolvedChart, action?: Action): number {
  let total = 0;
  let n = 0;
  for (const [h, a] of Object.entries(chart)) {
    const c = combos(h);
    total += c;
    if (action ? a === action : a !== "fold") n += c;
  }
  return (100 * n) / total;
}

export function pickRandomHand(rng: () => number = Math.random): Hand {
  const hands = allHands();
  const total = 1326;
  let x = rng() * total;
  for (const h of hands) {
    x -= combos(h);
    if (x <= 0) return h;
  }
  return hands[hands.length - 1];
}
