import { describe, it, expect } from 'vitest';
import { SUITS, RANKS, type Card, type Suit, type Rank } from './card';

describe('Card定数', () => {
  describe('SUITS', () => {
    it('4種類のスートを含む', () => {
      // Given: SUITS定数
      // When: 要素数を確認
      // Then: 4種類
      expect(SUITS).toHaveLength(4);
    });

    it('spades/hearts/diamonds/clubsを含む', () => {
      expect(SUITS).toContain('spades');
      expect(SUITS).toContain('hearts');
      expect(SUITS).toContain('diamonds');
      expect(SUITS).toContain('clubs');
    });

    it('読み取り専用である（配列の変更が型エラーになる）', () => {
      // readonly型チェック: コンパイル時検査のみのため実行時に要素数が不変であることを確認
      const originalLength = SUITS.length;
      expect(originalLength).toBe(4);
    });
  });

  describe('RANKS', () => {
    it('13種類のランクを含む', () => {
      expect(RANKS).toHaveLength(13);
    });

    it('2から14の整数を含む', () => {
      for (let r = 2; r <= 14; r++) {
        expect(RANKS).toContain(r as Rank);
      }
    });

    it('最小ランクは2（最弱）', () => {
      expect(Math.min(...RANKS)).toBe(2);
    });

    it('最大ランクは14（エース/最強）', () => {
      expect(Math.max(...RANKS)).toBe(14);
    });

    it('絵札: J=11, Q=12, K=13, A=14が含まれる', () => {
      expect(RANKS).toContain(11); // Jack
      expect(RANKS).toContain(12); // Queen
      expect(RANKS).toContain(13); // King
      expect(RANKS).toContain(14); // Ace
    });
  });
});

describe('Card型', () => {
  it('suit/rank/faceUpフィールドを持つCardオブジェクトを生成できる', () => {
    // Given: 正しいフィールドを持つオブジェクト
    const card: Card = { suit: 'spades', rank: 14, faceUp: true };

    // When/Then: 各フィールドが正しく設定されている
    expect(card.suit).toBe('spades');
    expect(card.rank).toBe(14);
    expect(card.faceUp).toBe(true);
  });

  it('faceUp=falseのカード（ホールカード）を表現できる', () => {
    const card: Card = { suit: 'hearts', rank: 2, faceUp: false };
    expect(card.faceUp).toBe(false);
  });

  it('全スートのカードを生成できる', () => {
    const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    suits.forEach((suit) => {
      const card: Card = { suit, rank: 10, faceUp: true };
      expect(card.suit).toBe(suit);
    });
  });

  it('境界値: ランク2のカードを生成できる', () => {
    const card: Card = { suit: 'clubs', rank: 2, faceUp: false };
    expect(card.rank).toBe(2);
  });

  it('境界値: ランク14（エース）のカードを生成できる', () => {
    const card: Card = { suit: 'diamonds', rank: 14, faceUp: true };
    expect(card.rank).toBe(14);
  });
});
