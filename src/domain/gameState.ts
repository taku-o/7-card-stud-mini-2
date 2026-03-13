import type { Card } from './card';
import { type Deck, dealCard } from './deck';

export type Street = 'third' | 'fourth' | 'fifth' | 'sixth' | 'seventh' | 'showdown';

export type RoundResult = {
  winner: 'player' | 'cpu' | 'draw';
  playerHandType: string;
  cpuHandType: string;
  chipDelta: number;
};

export type GameState = {
  playerStack: number;
  cpuStack: number;
  pot: number;
  street: Street;
  playerCards: Card[];
  cpuCards: Card[];
  roundResult?: RoundResult;
};

const STREET_ORDER: Street[] = [
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'showdown',
];

export function getNextStreet(street: Street): Street {
  const index = STREET_ORDER.indexOf(street);
  if (index === STREET_ORDER.length - 1) {
    throw new Error(`No next street after '${street}'`);
  }
  return STREET_ORDER[index + 1]!;
}

export function createInitialGameState(
  playerStack: number,
  cpuStack: number,
  deck: Deck
): { state: GameState; deck: Deck } {
  let currentDeck = deck;

  const dealDown = (d: Deck) => dealCard(d, false);
  const dealUp = (d: Deck) => dealCard(d, true);

  const p1 = dealDown(currentDeck);
  currentDeck = p1.deck;

  const p2 = dealDown(currentDeck);
  currentDeck = p2.deck;

  const p3 = dealUp(currentDeck);
  currentDeck = p3.deck;

  const c1 = dealDown(currentDeck);
  currentDeck = c1.deck;

  const c2 = dealDown(currentDeck);
  currentDeck = c2.deck;

  const c3 = dealUp(currentDeck);
  currentDeck = c3.deck;

  const state: GameState = {
    playerStack,
    cpuStack,
    pot: 0,
    street: 'third',
    playerCards: [p1.card, p2.card, p3.card],
    cpuCards: [c1.card, c2.card, c3.card],
  };

  return { state, deck: currentDeck };
}

export function advanceToNextStreet(
  state: GameState,
  deck: Deck
): { state: GameState; deck: Deck } {
  const nextStreet = getNextStreet(state.street);

  if (nextStreet === 'showdown') {
    return {
      state: { ...state, street: nextStreet },
      deck,
    };
  }

  const faceUp = nextStreet !== 'seventh';

  const playerResult = dealCard(deck, faceUp);
  const cpuResult = dealCard(playerResult.deck, faceUp);

  return {
    state: {
      ...state,
      street: nextStreet,
      playerCards: [...state.playerCards, playerResult.card],
      cpuCards: [...state.cpuCards, cpuResult.card],
    },
    deck: cpuResult.deck,
  };
}
