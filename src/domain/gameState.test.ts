import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  advanceToNextStreet,
  getNextStreet,
  type Street,
} from './gameState';
import { createDeck, shuffleDeck } from './deck';

// ========== getNextStreet ==========

describe('getNextStreet: ストリート遷移順序', () => {
  it('third → fourth', () => {
    expect(getNextStreet('third')).toBe('fourth');
  });

  it('fourth → fifth', () => {
    expect(getNextStreet('fourth')).toBe('fifth');
  });

  it('fifth → sixth', () => {
    expect(getNextStreet('fifth')).toBe('sixth');
  });

  it('sixth → seventh', () => {
    expect(getNextStreet('sixth')).toBe('seventh');
  });

  it('seventh → showdown', () => {
    expect(getNextStreet('seventh')).toBe('showdown');
  });

  it('showdown からさらに遷移しようとするとエラーをスローする', () => {
    // showdownが終端ストリートのためエラーが期待される
    expect(() => getNextStreet('showdown')).toThrow();
  });
});

// ========== createInitialGameState ==========

describe('createInitialGameState: 初期状態生成', () => {
  it('thirdストリートから開始する', () => {
    // Given
    const deck = shuffleDeck(createDeck());
    // When
    const { state } = createInitialGameState(1000, 1000, deck);
    // Then
    expect(state.street).toBe('third');
  });

  it('プレイヤーに3枚のカードを配る（2枚 down + 1枚 up）', () => {
    const deck = shuffleDeck(createDeck());
    const { state } = createInitialGameState(1000, 1000, deck);

    expect(state.playerCards).toHaveLength(3);
    const downCards = state.playerCards.filter((c) => !c.faceUp);
    const upCards = state.playerCards.filter((c) => c.faceUp);
    expect(downCards).toHaveLength(2);
    expect(upCards).toHaveLength(1);
  });

  it('CPUに3枚のカードを配る（2枚 down + 1枚 up）', () => {
    const deck = shuffleDeck(createDeck());
    const { state } = createInitialGameState(1000, 1000, deck);

    expect(state.cpuCards).toHaveLength(3);
    const downCards = state.cpuCards.filter((c) => !c.faceUp);
    const upCards = state.cpuCards.filter((c) => c.faceUp);
    expect(downCards).toHaveLength(2);
    expect(upCards).toHaveLength(1);
  });

  it('playerStackが正しく設定される', () => {
    const deck = createDeck();
    const { state } = createInitialGameState(1500, 800, deck);
    expect(state.playerStack).toBe(1500);
  });

  it('cpuStackが正しく設定される', () => {
    const deck = createDeck();
    const { state } = createInitialGameState(1500, 800, deck);
    expect(state.cpuStack).toBe(800);
  });

  it('初期potは0である', () => {
    const deck = createDeck();
    const { state } = createInitialGameState(1000, 1000, deck);
    expect(state.pot).toBe(0);
  });

  it('roundResultは未設定（undefined）', () => {
    const deck = createDeck();
    const { state } = createInitialGameState(1000, 1000, deck);
    expect(state.roundResult).toBeUndefined();
  });

  it('6枚配布後のデッキは46枚（52 - 6）', () => {
    const deck = createDeck();
    const { deck: remaining } = createInitialGameState(1000, 1000, deck);
    expect(remaining.cards).toHaveLength(46);
  });

  it('プレイヤーとCPUに配られたカードは重複しない', () => {
    const deck = shuffleDeck(createDeck());
    const { state } = createInitialGameState(1000, 1000, deck);

    const allDealtCards = [...state.playerCards, ...state.cpuCards];
    const uniqueCards = new Set(
      allDealtCards.map((c) => `${c.suit}-${c.rank}`)
    );
    expect(uniqueCards.size).toBe(6);
  });

  it('元のDeckを変更しない（immutable）', () => {
    const deck = createDeck();
    const originalLength = deck.cards.length;
    createInitialGameState(1000, 1000, deck);
    expect(deck.cards).toHaveLength(originalLength);
  });
});

// ========== advanceToNextStreet ==========

describe('advanceToNextStreet: ストリート進行', () => {
  it('third → fourth: 各プレイヤーに1枚upを追加', () => {
    // Given: third ストリートの状態
    const deck = shuffleDeck(createDeck());
    const { state: thirdState, deck: deckAfterThird } = createInitialGameState(
      1000, 1000, deck
    );

    // When
    const { state: fourthState } = advanceToNextStreet(thirdState, deckAfterThird);

    // Then
    expect(fourthState.street).toBe('fourth');
    expect(fourthState.playerCards).toHaveLength(4);
    expect(fourthState.cpuCards).toHaveLength(4);

    // 追加された1枚はfaceUp=true
    const newPlayerCard = fourthState.playerCards[3];
    expect(newPlayerCard.faceUp).toBe(true);
    const newCpuCard = fourthState.cpuCards[3];
    expect(newCpuCard.faceUp).toBe(true);
  });

  it('fourth → fifth: 各プレイヤーに1枚upを追加', () => {
    let deck = shuffleDeck(createDeck());
    let state;
    ({ state, deck } = createInitialGameState(1000, 1000, deck));
    ({ state, deck } = advanceToNextStreet(state, deck));  // → fourth

    const { state: fifthState } = advanceToNextStreet(state, deck);
    expect(fifthState.street).toBe('fifth');
    expect(fifthState.playerCards).toHaveLength(5);
    expect(fifthState.cpuCards).toHaveLength(5);
    expect(fifthState.playerCards[4].faceUp).toBe(true);
    expect(fifthState.cpuCards[4].faceUp).toBe(true);
  });

  it('fifth → sixth: 各プレイヤーに1枚upを追加', () => {
    let deck = shuffleDeck(createDeck());
    let state;
    ({ state, deck } = createInitialGameState(1000, 1000, deck));
    ({ state, deck } = advanceToNextStreet(state, deck));  // → fourth
    ({ state, deck } = advanceToNextStreet(state, deck));  // → fifth

    const { state: sixthState } = advanceToNextStreet(state, deck);
    expect(sixthState.street).toBe('sixth');
    expect(sixthState.playerCards).toHaveLength(6);
    expect(sixthState.cpuCards).toHaveLength(6);
    expect(sixthState.playerCards[5].faceUp).toBe(true);
    expect(sixthState.cpuCards[5].faceUp).toBe(true);
  });

  it('sixth → seventh: 各プレイヤーに1枚downを追加', () => {
    let deck = shuffleDeck(createDeck());
    let state;
    ({ state, deck } = createInitialGameState(1000, 1000, deck));
    ({ state, deck } = advanceToNextStreet(state, deck));  // → fourth
    ({ state, deck } = advanceToNextStreet(state, deck));  // → fifth
    ({ state, deck } = advanceToNextStreet(state, deck));  // → sixth

    const { state: seventhState } = advanceToNextStreet(state, deck);
    expect(seventhState.street).toBe('seventh');
    expect(seventhState.playerCards).toHaveLength(7);
    expect(seventhState.cpuCards).toHaveLength(7);

    // seventhで追加されたカードはfaceUp=false（ホールカード）
    expect(seventhState.playerCards[6].faceUp).toBe(false);
    expect(seventhState.cpuCards[6].faceUp).toBe(false);
  });

  it('seventh → showdown: カード配布なし、ストリートのみ更新', () => {
    let deck = shuffleDeck(createDeck());
    let state;
    ({ state, deck } = createInitialGameState(1000, 1000, deck));
    ({ state, deck } = advanceToNextStreet(state, deck));  // → fourth
    ({ state, deck } = advanceToNextStreet(state, deck));  // → fifth
    ({ state, deck } = advanceToNextStreet(state, deck));  // → sixth
    ({ state, deck } = advanceToNextStreet(state, deck));  // → seventh

    const { state: showdownState, deck: deckAfterShowdown } =
      advanceToNextStreet(state, deck);

    expect(showdownState.street).toBe('showdown');
    // showdownではカード配布なし（枚数変化なし）
    expect(showdownState.playerCards).toHaveLength(7);
    expect(showdownState.cpuCards).toHaveLength(7);
    // デッキの枚数も変化なし
    expect(deckAfterShowdown.cards).toHaveLength(deck.cards.length);
  });

  it('advanceToNextStreet は元のstateを変更しない（immutable）', () => {
    const deck = shuffleDeck(createDeck());
    const { state, deck: d } = createInitialGameState(1000, 1000, deck);
    const originalStreet = state.street;
    const originalPlayerCount = state.playerCards.length;

    advanceToNextStreet(state, d);

    // 元のstateが変更されていないことを確認
    expect(state.street).toBe(originalStreet);
    expect(state.playerCards).toHaveLength(originalPlayerCount);
  });

  it('advanceToNextStreet は元のdeckを変更しない（immutable）', () => {
    const deck = shuffleDeck(createDeck());
    const { state, deck: d } = createInitialGameState(1000, 1000, deck);
    const originalDeckLength = d.cards.length;

    advanceToNextStreet(state, d);

    expect(d.cards).toHaveLength(originalDeckLength);
  });

  it('third→showdownまで全ストリートを順に進行できる', () => {
    const streets: Street[] = [
      'third', 'fourth', 'fifth', 'sixth', 'seventh', 'showdown',
    ];

    let deck = shuffleDeck(createDeck());
    let state;
    ({ state, deck } = createInitialGameState(1000, 1000, deck));
    expect(state.street).toBe('third');

    for (let i = 1; i < streets.length; i++) {
      ({ state, deck } = advanceToNextStreet(state, deck));
      expect(state.street).toBe(streets[i]);
    }
  });

  it('fourth以降では配布ごとにデッキが2枚減る（プレイヤー+CPU各1枚）', () => {
    const deck = shuffleDeck(createDeck());
    const { state: thirdState, deck: deckAfterThird } =
      createInitialGameState(1000, 1000, deck);

    const deckLengthBeforeFourth = deckAfterThird.cards.length;
    const { deck: deckAfterFourth } = advanceToNextStreet(thirdState, deckAfterThird);

    expect(deckAfterFourth.cards.length).toBe(deckLengthBeforeFourth - 2);
  });
});

// ========== GameState型の整合性 ==========

describe('GameState: 型整合性', () => {
  it('playerStack / cpuStack / pot / street / playerCards / cpuCards が存在する', () => {
    const deck = createDeck();
    const { state } = createInitialGameState(1000, 1000, deck);

    expect(state).toHaveProperty('playerStack');
    expect(state).toHaveProperty('cpuStack');
    expect(state).toHaveProperty('pot');
    expect(state).toHaveProperty('street');
    expect(state).toHaveProperty('playerCards');
    expect(state).toHaveProperty('cpuCards');
  });

  it('playerCards / cpuCards は Card 型の配列', () => {
    const deck = createDeck();
    const { state } = createInitialGameState(1000, 1000, deck);

    state.playerCards.forEach((card) => {
      expect(card).toHaveProperty('suit');
      expect(card).toHaveProperty('rank');
      expect(card).toHaveProperty('faceUp');
    });
  });
});
