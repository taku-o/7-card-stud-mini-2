import type { Card } from './card';

export type HandType =
  | 'royal-flush'
  | 'straight-flush'
  | 'four-of-a-kind'
  | 'full-house'
  | 'flush'
  | 'straight'
  | 'three-of-a-kind'
  | 'two-pair'
  | 'one-pair'
  | 'high-card';

export type HandRank = {
  type: HandType;
  bestCards: Card[];
  tiebreakers: number[];
};

const HAND_TYPE_ORDER: HandType[] = [
  'royal-flush',
  'straight-flush',
  'four-of-a-kind',
  'full-house',
  'flush',
  'straight',
  'three-of-a-kind',
  'two-pair',
  'one-pair',
  'high-card',
];

function handTypeScore(type: HandType): number {
  return HAND_TYPE_ORDER.length - HAND_TYPE_ORDER.indexOf(type);
}

type RankGroup = { rank: number; count: number; rankCards: Card[] };

function buildRankGroups(cards: Card[]): RankGroup[] {
  const map = new Map<number, Card[]>();
  for (const card of cards) {
    const group = map.get(card.rank) ?? [];
    group.push(card);
    map.set(card.rank, group);
  }
  return [...map.entries()]
    .map(([rank, rankCards]) => ({ rank, count: rankCards.length, rankCards }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
}

function groupBySuit(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  for (const card of cards) {
    const group = groups.get(card.suit) ?? [];
    group.push(card);
    groups.set(card.suit, group);
  }
  return groups;
}

function sortByRankDesc(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => b.rank - a.rank);
}

function findFlushCards(cards: Card[]): Card[] | null {
  const bySuit = groupBySuit(cards);
  for (const suitCards of bySuit.values()) {
    if (suitCards.length >= 5) {
      return sortByRankDesc(suitCards).slice(0, 5);
    }
  }
  return null;
}

function findStraightTopRank(ranks: number[]): number | null {
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);

  const hasAce = uniqueRanks.includes(14);
  const withLowAce = hasAce ? [...uniqueRanks, 1] : uniqueRanks;
  const sorted = [...new Set(withLowAce)].sort((a, b) => b - a);

  for (let i = 0; i <= sorted.length - 5; i++) {
    const top = sorted[i]!;
    const needed = [top, top - 1, top - 2, top - 3, top - 4];
    if (needed.every((r) => sorted.includes(r))) {
      return top;
    }
  }
  return null;
}

function pickStraightCards(cards: Card[], topRank: number): Card[] {
  const isWheel = topRank === 5 && cards.some((c) => c.rank === 14);
  const needed = isWheel
    ? [5, 4, 3, 2, 14]
    : [topRank, topRank - 1, topRank - 2, topRank - 3, topRank - 4];

  const result: Card[] = [];
  for (const rank of needed) {
    const card = cards.find((c) => c.rank === rank && !result.includes(c));
    if (card) result.push(card);
  }
  return result;
}

function findStraightFlushResult(cards: Card[]): { cards: Card[]; isRoyal: boolean } | null {
  const bySuit = groupBySuit(cards);
  let best: { cards: Card[]; topRank: number } | null = null;

  for (const suitCards of bySuit.values()) {
    if (suitCards.length < 5) continue;
    const ranks = suitCards.map((c) => c.rank);
    const topRank = findStraightTopRank(ranks);
    if (topRank === null) continue;
    if (best === null || topRank > best.topRank) {
      best = { cards: pickStraightCards(suitCards, topRank), topRank };
    }
  }

  if (best === null) return null;
  const isRoyal = best.topRank === 14;
  return { cards: best.cards, isRoyal };
}

export function evaluateHand(cards: Card[]): HandRank {
  const sfResult = findStraightFlushResult(cards);
  if (sfResult !== null) {
    const type: HandType = sfResult.isRoyal ? 'royal-flush' : 'straight-flush';
    const tiebreakers = sfResult.cards.map((c) => c.rank).sort((a, b) => b - a);
    return { type, bestCards: sfResult.cards, tiebreakers };
  }

  const rankGroups = buildRankGroups(cards);
  const fours = rankGroups.filter((g) => g.count === 4);
  const threes = rankGroups.filter((g) => g.count === 3);
  const pairs = rankGroups.filter((g) => g.count === 2);

  if (fours.length >= 1) {
    const four = fours[0]!;
    const kicker = sortByRankDesc(cards.filter((c) => c.rank !== four.rank))[0]!;
    return {
      type: 'four-of-a-kind',
      bestCards: [...four.rankCards, kicker],
      tiebreakers: [four.rank, kicker.rank],
    };
  }

  if (threes.length >= 1) {
    const pairCandidates = rankGroups.filter(
      (g) => g.rank !== threes[0]!.rank && g.count >= 2
    );
    if (pairCandidates.length >= 1) {
      const three = threes[0]!;
      const pair = pairCandidates[0]!;
      return {
        type: 'full-house',
        bestCards: [...three.rankCards, ...pair.rankCards.slice(0, 2)],
        tiebreakers: [three.rank, pair.rank],
      };
    }
  }

  const flushCards = findFlushCards(cards);
  if (flushCards !== null) {
    return {
      type: 'flush',
      bestCards: flushCards,
      tiebreakers: flushCards.map((c) => c.rank),
    };
  }

  const straightTop = findStraightTopRank(cards.map((c) => c.rank));
  if (straightTop !== null) {
    const straightCards = pickStraightCards(cards, straightTop);
    return {
      type: 'straight',
      bestCards: straightCards,
      tiebreakers: [straightTop],
    };
  }

  if (threes.length >= 1) {
    const three = threes[0]!;
    const kickers = sortByRankDesc(cards.filter((c) => c.rank !== three.rank)).slice(0, 2);
    return {
      type: 'three-of-a-kind',
      bestCards: [...three.rankCards, ...kickers],
      tiebreakers: [three.rank, ...kickers.map((c) => c.rank)],
    };
  }

  if (pairs.length >= 2) {
    const topPairs = pairs.slice(0, 2);
    const usedRanks = new Set(topPairs.map((p) => p.rank));
    const kicker = sortByRankDesc(cards.filter((c) => !usedRanks.has(c.rank)))[0]!;
    return {
      type: 'two-pair',
      bestCards: [...topPairs[0]!.rankCards, ...topPairs[1]!.rankCards, kicker],
      tiebreakers: [topPairs[0]!.rank, topPairs[1]!.rank, kicker.rank],
    };
  }

  if (pairs.length === 1) {
    const pair = pairs[0]!;
    const kickers = sortByRankDesc(cards.filter((c) => c.rank !== pair.rank)).slice(0, 3);
    return {
      type: 'one-pair',
      bestCards: [...pair.rankCards, ...kickers],
      tiebreakers: [pair.rank, ...kickers.map((c) => c.rank)],
    };
  }

  const bestCards = sortByRankDesc(cards).slice(0, 5);
  return {
    type: 'high-card',
    bestCards,
    tiebreakers: bestCards.map((c) => c.rank),
  };
}

export function compareHandRanks(a: HandRank, b: HandRank): number {
  const scoreDiff = handTypeScore(a.type) - handTypeScore(b.type);
  if (scoreDiff !== 0) return scoreDiff;

  const len = a.tiebreakers.length;
  for (let i = 0; i < len; i++) {
    const av = a.tiebreakers[i]!;
    const bv = b.tiebreakers[i]!;
    if (av !== bv) return av - bv;
  }
  return 0;
}
