import type { Card, Suit, Rank } from '../domain/card';

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const FACE_RANKS: Partial<Record<Rank, string>> = {
  14: 'A',
  13: 'K',
  12: 'Q',
  11: 'J',
};

const RED_SUITS: ReadonlySet<Suit> = new Set(['hearts', 'diamonds']);

function formatRank(rank: Rank): string {
  return FACE_RANKS[rank] ?? String(rank);
}

export function renderCard(card: Card): HTMLElement {
  const el = document.createElement('div');
  el.className = 'card';

  if (!card.faceUp) {
    el.classList.add('card--face-down');
    el.textContent = '?';
    return el;
  }

  const symbol = SUIT_SYMBOLS[card.suit];
  const rankText = formatRank(card.rank);

  if (RED_SUITS.has(card.suit)) {
    el.classList.add('card--red');
  }

  el.textContent = `${rankText}${symbol}`;
  return el;
}

export function renderCards(cards: Card[]): HTMLElement {
  const container = document.createElement('div');
  container.className = 'cards-container';
  for (const card of cards) {
    container.appendChild(renderCard(card));
  }
  return container;
}
