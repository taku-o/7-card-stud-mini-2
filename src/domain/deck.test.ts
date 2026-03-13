import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCard, type Deck } from './deck';
import { SUITS, RANKS } from './card';

describe('createDeck', () => {
  it('52枚のカードを生成する', () => {
    // Given: デッキ生成
    // When
    const deck = createDeck();
    // Then
    expect(deck.cards).toHaveLength(52);
  });

  it('全スート×全ランクの組み合わせを含む（重複なし）', () => {
    const deck = createDeck();
    const expectedCount = SUITS.length * RANKS.length;
    expect(deck.cards).toHaveLength(expectedCount);

    // 全組み合わせが存在することを確認
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const found = deck.cards.find((c) => c.suit === suit && c.rank === rank);
        expect(found).toBeDefined();
      }
    }
  });

  it('全カードはfaceUp=falseで初期化される（裏向き）', () => {
    const deck = createDeck();
    deck.cards.forEach((card) => {
      expect(card.faceUp).toBe(false);
    });
  });

  it('呼び出すたびに新しいDeckオブジェクトを返す', () => {
    const deck1 = createDeck();
    const deck2 = createDeck();
    expect(deck1).not.toBe(deck2);
  });
});

describe('shuffleDeck', () => {
  it('シャッフル後も52枚のカードを保持する', () => {
    // Given
    const deck = createDeck();
    // When
    const shuffled = shuffleDeck(deck);
    // Then
    expect(shuffled.cards).toHaveLength(52);
  });

  it('シャッフル後も同じカードセットを含む（全組み合わせ存在）', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);

    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const found = shuffled.cards.find((c) => c.suit === suit && c.rank === rank);
        expect(found).toBeDefined();
      }
    }
  });

  it('元のDeckを変更せず新しいDeckを返す（immutable）', () => {
    const deck = createDeck();
    const originalCards = [...deck.cards];
    shuffleDeck(deck);

    // 元のdeckが変更されていないことを確認
    expect(deck.cards).toHaveLength(52);
    expect(deck.cards[0]).toEqual(originalCards[0]);
  });

  it('シャッフル後のDeckは元のDeckと異なるオブジェクトである', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).not.toBe(deck);
  });

  it('複数回シャッフルしても52枚を保持する', () => {
    let deck = createDeck();
    for (let i = 0; i < 5; i++) {
      deck = shuffleDeck(deck);
      expect(deck.cards).toHaveLength(52);
    }
  });
});

describe('dealCard', () => {
  it('faceUp=trueでカードを配る: 取り出したカードはfaceUp=true', () => {
    // Given
    const deck = createDeck();
    // When
    const { card } = dealCard(deck, true);
    // Then
    expect(card.faceUp).toBe(true);
  });

  it('faceUp=falseでカードを配る: 取り出したカードはfaceUp=false（ホールカード）', () => {
    const deck = createDeck();
    const { card } = dealCard(deck, false);
    expect(card.faceUp).toBe(false);
  });

  it('カードを1枚配るとデッキが51枚になる', () => {
    // Given
    const deck = createDeck();
    // When
    const { deck: remaining } = dealCard(deck, true);
    // Then
    expect(remaining.cards).toHaveLength(51);
  });

  it('元のDeckを変更せず新しいDeckを返す（immutable）', () => {
    const deck = createDeck();
    dealCard(deck, true);
    // 元のデッキは変更されていない
    expect(deck.cards).toHaveLength(52);
  });

  it('配ったカードはデッキに含まれていない', () => {
    const deck = createDeck();
    const { card, deck: remaining } = dealCard(deck, true);
    const stillInDeck = remaining.cards.find(
      (c) => c.suit === card.suit && c.rank === card.rank
    );
    expect(stillInDeck).toBeUndefined();
  });

  it('52枚連続で配るとデッキが空になる', () => {
    let deck = createDeck();
    for (let i = 0; i < 52; i++) {
      const result = dealCard(deck, true);
      deck = result.deck;
    }
    expect(deck.cards).toHaveLength(0);
  });

  it('空のデッキからカードを引こうとするとエラーをスローする', () => {
    // Given: 全カードを引き切った空のデッキ
    let deck = createDeck();
    for (let i = 0; i < 52; i++) {
      deck = dealCard(deck, true).deck;
    }

    // When/Then: 空のデッキからdealCardするとエラー
    expect(() => dealCard(deck, true)).toThrow();
  });

  it('連続でカードを配るとデッキの枚数が順に減る', () => {
    let deck = createDeck();
    for (let i = 52; i > 0; i--) {
      expect(deck.cards).toHaveLength(i);
      const result = dealCard(deck, false);
      deck = result.deck;
    }
  });
});
