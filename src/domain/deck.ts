import { SUITS, RANKS, type Card } from './card';

export type Deck = {
  cards: Card[];
};

export function createDeck(): Deck {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ suit, rank, faceUp: false });
    }
  }
  return { cards };
}

export function shuffleDeck(deck: Deck): Deck {
  const cards = [...deck.cards];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = temp;
  }
  return { cards };
}

export function dealCard(deck: Deck, faceUp: boolean): { card: Card; deck: Deck } {
  if (deck.cards.length === 0) {
    throw new Error('Cannot deal from an empty deck');
  }
  const [card, ...remaining] = deck.cards;
  return {
    card: { ...card!, faceUp },
    deck: { cards: remaining },
  };
}
