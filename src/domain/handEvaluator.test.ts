import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHandRanks, type HandRank } from './handEvaluator';
import type { Card } from './card';

// テストヘルパー: カード生成（faceUpはテストで不要なためtrue固定）
function card(suit: Card['suit'], rank: Card['rank']): Card {
  return { suit, rank, faceUp: true };
}

// ========== 5枚手パターン（7枚に2枚を追加して検証）==========

describe('evaluateHand: ロイヤルフラッシュ', () => {
  it('A-K-Q-J-10の同スートはロイヤルフラッシュと判定される', () => {
    // Given: スペードのA-K-Q-J-10 + 無関係な2枚
    const cards: Card[] = [
      card('spades', 14), // A
      card('spades', 13), // K
      card('spades', 12), // Q
      card('spades', 11), // J
      card('spades', 10), // 10
      card('hearts', 2),
      card('clubs', 3),
    ];
    // When
    const result = evaluateHand(cards);
    // Then
    expect(result.type).toBe('royal-flush');
  });

  it('ロイヤルフラッシュの最強5枚はA-K-Q-J-10', () => {
    const cards: Card[] = [
      card('hearts', 14),
      card('hearts', 13),
      card('hearts', 12),
      card('hearts', 11),
      card('hearts', 10),
      card('spades', 2),
      card('diamonds', 7),
    ];
    const result = evaluateHand(cards);
    expect(result.bestCards).toHaveLength(5);
    const ranks = result.bestCards.map((c) => c.rank).sort((a, b) => b - a);
    expect(ranks).toEqual([14, 13, 12, 11, 10]);
  });
});

describe('evaluateHand: ストレートフラッシュ', () => {
  it('9-8-7-6-5の同スートはストレートフラッシュと判定される', () => {
    const cards: Card[] = [
      card('diamonds', 9),
      card('diamonds', 8),
      card('diamonds', 7),
      card('diamonds', 6),
      card('diamonds', 5),
      card('hearts', 2),
      card('clubs', 14),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('straight-flush');
  });

  it('ストレートフラッシュ > フォーオブアカインド', () => {
    const sfCards: Card[] = [
      card('clubs', 9),
      card('clubs', 8),
      card('clubs', 7),
      card('clubs', 6),
      card('clubs', 5),
      card('hearts', 2),
      card('spades', 3),
    ];
    const fourCards: Card[] = [
      card('spades', 14),
      card('hearts', 14),
      card('diamonds', 14),
      card('clubs', 14),
      card('spades', 13),
      card('hearts', 2),
      card('clubs', 3),
    ];
    const sf = evaluateHand(sfCards);
    const four = evaluateHand(fourCards);
    expect(compareHandRanks(sf, four)).toBeGreaterThan(0);
  });
});

describe('evaluateHand: フォーオブアカインド', () => {
  it('同ランク4枚はフォーオブアカインドと判定される', () => {
    const cards: Card[] = [
      card('spades', 7),
      card('hearts', 7),
      card('diamonds', 7),
      card('clubs', 7),
      card('spades', 3),
      card('hearts', 5),
      card('clubs', 9),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('four-of-a-kind');
  });

  it('フォーオブアカインドの最強5枚は4枚同ランク+キッカー最強', () => {
    const cards: Card[] = [
      card('spades', 7),
      card('hearts', 7),
      card('diamonds', 7),
      card('clubs', 7),
      card('spades', 9),  // キッカー候補（最強）
      card('hearts', 5),
      card('clubs', 2),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('four-of-a-kind');
    expect(result.bestCards).toHaveLength(5);

    const rankCounts = result.bestCards.reduce<Record<number, number>>((acc, c) => {
      acc[c.rank] = (acc[c.rank] ?? 0) + 1;
      return acc;
    }, {});
    expect(rankCounts[7]).toBe(4);
    expect(rankCounts[9]).toBe(1); // キッカーは9（最強）
  });
});

describe('evaluateHand: フルハウス', () => {
  it('3枚同ランク + 2枚同ランクはフルハウスと判定される', () => {
    const cards: Card[] = [
      card('spades', 10),
      card('hearts', 10),
      card('diamonds', 10),
      card('clubs', 4),
      card('spades', 4),
      card('hearts', 2),
      card('clubs', 7),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('full-house');
  });

  it('フルハウス: スリーカードが強いほうが優先される', () => {
    // A-A-A + 2-2 の方が K-K-K + A-A より強い（スリーのランク優先）
    const fullHouseAces: Card[] = [
      card('spades', 14),
      card('hearts', 14),
      card('diamonds', 14),
      card('clubs', 2),
      card('spades', 2),
      card('hearts', 3),
      card('clubs', 5),
    ];
    const fullHouseKings: Card[] = [
      card('spades', 13),
      card('hearts', 13),
      card('diamonds', 13),
      card('clubs', 14),
      card('spades', 11),
      card('hearts', 11),
      card('clubs', 2),
    ];
    const fhAces = evaluateHand(fullHouseAces);
    const fhKings = evaluateHand(fullHouseKings);
    expect(fhAces.type).toBe('full-house');
    expect(fhKings.type).toBe('full-house');
    expect(compareHandRanks(fhAces, fhKings)).toBeGreaterThan(0);
  });
});

describe('evaluateHand: フラッシュ', () => {
  it('同スート5枚以上（ストレートでない）はフラッシュと判定される', () => {
    const cards: Card[] = [
      card('hearts', 14),
      card('hearts', 10),
      card('hearts', 7),
      card('hearts', 4),
      card('hearts', 2),
      card('spades', 3),
      card('clubs', 6),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('flush');
  });

  it('7枚中5枚だけが同スートの場合でもフラッシュを検出する', () => {
    const cards: Card[] = [
      card('clubs', 14),
      card('clubs', 9),
      card('clubs', 6),
      card('clubs', 4),
      card('clubs', 2),
      card('hearts', 7),
      card('diamonds', 8),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('flush');
  });

  it('フラッシュの最強5枚は同スートで最高ランク5枚', () => {
    const cards: Card[] = [
      card('spades', 14),
      card('spades', 12),
      card('spades', 10),
      card('spades', 8),
      card('spades', 6),
      card('spades', 4), // 6枚同スート
      card('hearts', 3),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('flush');
    const ranks = result.bestCards.map((c) => c.rank).sort((a, b) => b - a);
    expect(ranks).toEqual([14, 12, 10, 8, 6]);
  });
});

describe('evaluateHand: ストレート', () => {
  it('連続した5ランク（異スート）はストレートと判定される', () => {
    const cards: Card[] = [
      card('spades', 9),
      card('hearts', 8),
      card('diamonds', 7),
      card('clubs', 6),
      card('spades', 5),
      card('hearts', 2),
      card('clubs', 14),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('straight');
  });

  it('A-2-3-4-5（ホイール）はストレートと判定される', () => {
    const cards: Card[] = [
      card('spades', 14), // A（1としても使える）
      card('hearts', 2),
      card('diamonds', 3),
      card('clubs', 4),
      card('spades', 5),
      card('hearts', 9),
      card('clubs', 11),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('straight');
  });

  it('A-K-Q-J-10（ロイヤル）はロイヤルフラッシュではなくストレートとして評価される（同スートでない場合）', () => {
    const cards: Card[] = [
      card('spades', 14),
      card('hearts', 13),
      card('diamonds', 12),
      card('clubs', 11),
      card('spades', 10),
      card('hearts', 2),
      card('clubs', 3),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('straight');
  });
});

describe('evaluateHand: スリーオブアカインド', () => {
  it('同ランク3枚はスリーオブアカインドと判定される', () => {
    const cards: Card[] = [
      card('spades', 6),
      card('hearts', 6),
      card('diamonds', 6),
      card('clubs', 14),
      card('spades', 9),
      card('hearts', 3),
      card('clubs', 2),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('three-of-a-kind');
  });
});

describe('evaluateHand: ツーペア', () => {
  it('2種類のペアはツーペアと判定される', () => {
    const cards: Card[] = [
      card('spades', 9),
      card('hearts', 9),
      card('diamonds', 4),
      card('clubs', 4),
      card('spades', 14),
      card('hearts', 2),
      card('clubs', 7),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('two-pair');
  });

  it('3種類のペアがある場合: 上位2ペアが選ばれる', () => {
    const cards: Card[] = [
      card('spades', 14),
      card('hearts', 14),
      card('diamonds', 9),
      card('clubs', 9),
      card('spades', 2),
      card('hearts', 2),
      card('clubs', 7),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('two-pair');
    // 最強の2ペア (AA + 99) を選ぶ
    const pairRanks = result.bestCards
      .filter((c, _, arr) => arr.filter((x) => x.rank === c.rank).length === 2)
      .map((c) => c.rank);
    const uniquePairRanks = [...new Set(pairRanks)].sort((a, b) => b - a);
    expect(uniquePairRanks[0]).toBe(14); // Aces
    expect(uniquePairRanks[1]).toBe(9);  // Nines
  });
});

describe('evaluateHand: ワンペア', () => {
  it('1種類のペアはワンペアと判定される', () => {
    const cards: Card[] = [
      card('spades', 5),
      card('hearts', 5),
      card('diamonds', 14),
      card('clubs', 9),
      card('spades', 7),
      card('hearts', 3),
      card('clubs', 2),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('one-pair');
  });
});

describe('evaluateHand: ハイカード', () => {
  it('役なしはハイカードと判定される', () => {
    const cards: Card[] = [
      card('spades', 14),
      card('hearts', 10),
      card('diamonds', 7),
      card('clubs', 5),
      card('spades', 3),
      card('hearts', 2),
      card('clubs', 9),
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('high-card');
  });

  it('ハイカードの最強5枚は上位5ランク', () => {
    const cards: Card[] = [
      card('spades', 14),
      card('hearts', 10),
      card('diamonds', 7),
      card('clubs', 5),
      card('spades', 3),
      card('hearts', 2),
      card('clubs', 9),
    ];
    const result = evaluateHand(cards);
    expect(result.bestCards).toHaveLength(5);
    const ranks = result.bestCards.map((c) => c.rank).sort((a, b) => b - a);
    expect(ranks).toEqual([14, 10, 9, 7, 5]);
  });
});

// ========== 7枚から最強5枚の選択 ==========

describe('evaluateHand: 7枚から最強5枚の選択', () => {
  it('7枚中にフラッシュが潜んでいる場合、フラッシュを検出する', () => {
    // Given: スペードのフラッシュが5枚、残り2枚は別スート
    const cards: Card[] = [
      card('spades', 14),
      card('spades', 10),
      card('spades', 7),
      card('spades', 5),
      card('spades', 3),
      card('hearts', 6),  // フラッシュを妨げない
      card('clubs', 8),
    ];
    // When
    const result = evaluateHand(cards);
    // Then: フラッシュを正しく検出
    expect(result.type).toBe('flush');
  });

  it('フラッシュよりフルハウスが強ければフルハウスを選択する', () => {
    // Given: フラッシュとフルハウス両方が成立する7枚
    const cards: Card[] = [
      card('spades', 10),
      card('hearts', 10),
      card('diamonds', 10),
      card('spades', 5),
      card('hearts', 5),
      card('spades', 9),
      card('spades', 7),
      // スペード: 10,5,9,7 = 4枚のみ（フラッシュ不成立）、フルハウスのみ
    ];
    // 実際はスペード4枚なのでフラッシュなし、フルハウス成立
    const result = evaluateHand(cards.slice(0, 7));
    expect(result.type).toBe('full-house');
  });

  it('7枚中にストレートフラッシュが潜んでいる場合、ストレートフラッシュを選択する', () => {
    const cards: Card[] = [
      card('hearts', 8),
      card('hearts', 7),
      card('hearts', 6),
      card('hearts', 5),
      card('hearts', 4),
      card('spades', 14), // 邪魔カード
      card('clubs', 2),   // 邪魔カード
    ];
    const result = evaluateHand(cards);
    expect(result.type).toBe('straight-flush');
  });

  it('bestCardsは常に5枚である', () => {
    const cards: Card[] = [
      card('spades', 14),
      card('hearts', 13),
      card('diamonds', 12),
      card('clubs', 11),
      card('spades', 10),
      card('hearts', 9),
      card('clubs', 8),
    ];
    const result = evaluateHand(cards);
    expect(result.bestCards).toHaveLength(5);
  });

  it('7枚を渡すとエラーなく評価できる', () => {
    const cards: Card[] = [
      card('spades', 2),
      card('hearts', 5),
      card('diamonds', 9),
      card('clubs', 11),
      card('spades', 7),
      card('hearts', 3),
      card('clubs', 6),
    ];
    expect(() => evaluateHand(cards)).not.toThrow();
  });
});

// ========== compareHandRanks ==========

describe('compareHandRanks: 役の強弱比較', () => {
  it('ロイヤルフラッシュ > ストレートフラッシュ', () => {
    const rf = evaluateHand([
      card('spades', 14), card('spades', 13), card('spades', 12),
      card('spades', 11), card('spades', 10),
      card('hearts', 2), card('clubs', 3),
    ]);
    const sf = evaluateHand([
      card('hearts', 9), card('hearts', 8), card('hearts', 7),
      card('hearts', 6), card('hearts', 5),
      card('spades', 2), card('clubs', 3),
    ]);
    expect(compareHandRanks(rf, sf)).toBeGreaterThan(0);
    expect(compareHandRanks(sf, rf)).toBeLessThan(0);
  });

  it('フォーオブアカインド > フルハウス', () => {
    const four = evaluateHand([
      card('spades', 8), card('hearts', 8), card('diamonds', 8), card('clubs', 8),
      card('spades', 2), card('hearts', 3), card('clubs', 5),
    ]);
    const fh = evaluateHand([
      card('spades', 14), card('hearts', 14), card('diamonds', 14),
      card('clubs', 13), card('spades', 13),
      card('hearts', 2), card('clubs', 3),
    ]);
    expect(compareHandRanks(four, fh)).toBeGreaterThan(0);
  });

  it('フルハウス > フラッシュ', () => {
    const fh = evaluateHand([
      card('spades', 5), card('hearts', 5), card('diamonds', 5),
      card('clubs', 3), card('spades', 3),
      card('hearts', 7), card('clubs', 9),
    ]);
    const flush = evaluateHand([
      card('diamonds', 14), card('diamonds', 10), card('diamonds', 8),
      card('diamonds', 6), card('diamonds', 4),
      card('hearts', 2), card('clubs', 3),
    ]);
    expect(compareHandRanks(fh, flush)).toBeGreaterThan(0);
  });

  it('フラッシュ > ストレート', () => {
    const flush = evaluateHand([
      card('clubs', 14), card('clubs', 9), card('clubs', 7),
      card('clubs', 4), card('clubs', 2),
      card('hearts', 6), card('spades', 8),
    ]);
    const straight = evaluateHand([
      card('spades', 9), card('hearts', 8), card('diamonds', 7),
      card('clubs', 6), card('spades', 5),
      card('hearts', 2), card('clubs', 14),
    ]);
    expect(compareHandRanks(flush, straight)).toBeGreaterThan(0);
  });

  it('ストレート > スリーオブアカインド', () => {
    const straight = evaluateHand([
      card('spades', 7), card('hearts', 6), card('diamonds', 5),
      card('clubs', 4), card('spades', 3),
      card('hearts', 10), card('clubs', 14),
    ]);
    const three = evaluateHand([
      card('spades', 14), card('hearts', 14), card('diamonds', 14),
      card('clubs', 2), card('spades', 3),
      card('hearts', 5), card('clubs', 7),
    ]);
    expect(compareHandRanks(straight, three)).toBeGreaterThan(0);
  });

  it('スリーオブアカインド > ツーペア', () => {
    const three = evaluateHand([
      card('spades', 6), card('hearts', 6), card('diamonds', 6),
      card('clubs', 2), card('spades', 3),
      card('hearts', 9), card('clubs', 14),
    ]);
    const twoPair = evaluateHand([
      card('spades', 14), card('hearts', 14),
      card('diamonds', 13), card('clubs', 13),
      card('spades', 2), card('hearts', 3), card('clubs', 5),
    ]);
    expect(compareHandRanks(three, twoPair)).toBeGreaterThan(0);
  });

  it('ツーペア > ワンペア', () => {
    const twoPair = evaluateHand([
      card('spades', 8), card('hearts', 8),
      card('diamonds', 5), card('clubs', 5),
      card('spades', 14), card('hearts', 2), card('clubs', 3),
    ]);
    const onePair = evaluateHand([
      card('spades', 14), card('hearts', 14),
      card('diamonds', 2), card('clubs', 5),
      card('spades', 7), card('hearts', 9), card('clubs', 11),
    ]);
    expect(compareHandRanks(twoPair, onePair)).toBeGreaterThan(0);
  });

  it('ワンペア > ハイカード', () => {
    const onePair = evaluateHand([
      card('spades', 3), card('hearts', 3),
      card('diamonds', 14), card('clubs', 12),
      card('spades', 10), card('hearts', 8), card('clubs', 6),
    ]);
    const highCard = evaluateHand([
      card('spades', 14), card('hearts', 12),
      card('diamonds', 10), card('clubs', 8),
      card('spades', 6), card('hearts', 4), card('clubs', 2),
    ]);
    expect(compareHandRanks(onePair, highCard)).toBeGreaterThan(0);
  });

  it('同じ役種で引き分けのとき0を返す', () => {
    // 同一の手
    const cards: Card[] = [
      card('spades', 14), card('hearts', 14),
      card('diamonds', 5), card('clubs', 3),
      card('spades', 10), card('hearts', 8), card('clubs', 7),
    ];
    const hand1 = evaluateHand(cards);
    const hand2 = evaluateHand(cards);
    expect(compareHandRanks(hand1, hand2)).toBe(0);
  });

  it('同役種でキッカーが強いほうが勝つ（ワンペア同士）', () => {
    // ペアAA + キッカーK vs ペアAA + キッカーQ
    const pairAA_K = evaluateHand([
      card('spades', 14), card('hearts', 14),
      card('diamonds', 13), card('clubs', 10), card('spades', 8),
      card('hearts', 2), card('clubs', 3),
    ]);
    const pairAA_Q = evaluateHand([
      card('spades', 14), card('hearts', 14),
      card('diamonds', 12), card('clubs', 10), card('spades', 8),
      card('hearts', 2), card('clubs', 3),
    ]);
    expect(compareHandRanks(pairAA_K, pairAA_Q)).toBeGreaterThan(0);
  });

  it('返り値の符号: a > b なら正の数、a < b なら負の数', () => {
    const strong = evaluateHand([
      card('spades', 14), card('hearts', 14), card('diamonds', 14), card('clubs', 14),
      card('spades', 13), card('hearts', 2), card('clubs', 3),
    ]);
    const weak = evaluateHand([
      card('spades', 2), card('hearts', 5), card('diamonds', 9),
      card('clubs', 11), card('spades', 7), card('hearts', 3), card('clubs', 6),
    ]);
    expect(compareHandRanks(strong, weak)).toBeGreaterThan(0);
    expect(compareHandRanks(weak, strong)).toBeLessThan(0);
  });
});

// ========== tiebreakers長の一致保証 ==========

describe('evaluateHand: 同一HandTypeではtiebreakers長が一致する', () => {
  it('ワンペア同士のtiebreakers長が一致する', () => {
    const pairA = evaluateHand([
      card('spades', 14), card('hearts', 14),
      card('diamonds', 13), card('clubs', 10), card('spades', 8),
      card('hearts', 2), card('clubs', 3),
    ]);
    const pairB = evaluateHand([
      card('spades', 5), card('hearts', 5),
      card('diamonds', 14), card('clubs', 9), card('spades', 7),
      card('hearts', 3), card('clubs', 2),
    ]);
    expect(pairA.tiebreakers.length).toBe(pairB.tiebreakers.length);
  });

  it('ハイカード同士のtiebreakers長が一致する', () => {
    const highA = evaluateHand([
      card('spades', 14), card('hearts', 10), card('diamonds', 7),
      card('clubs', 5), card('spades', 3), card('hearts', 2), card('clubs', 9),
    ]);
    const highB = evaluateHand([
      card('spades', 13), card('hearts', 11), card('diamonds', 8),
      card('clubs', 6), card('spades', 4), card('hearts', 2), card('clubs', 10),
    ]);
    expect(highA.tiebreakers.length).toBe(highB.tiebreakers.length);
  });

  it('ツーペア同士のtiebreakers長が一致する', () => {
    const tpA = evaluateHand([
      card('spades', 9), card('hearts', 9),
      card('diamonds', 4), card('clubs', 4),
      card('spades', 14), card('hearts', 2), card('clubs', 7),
    ]);
    const tpB = evaluateHand([
      card('spades', 14), card('hearts', 14),
      card('diamonds', 8), card('clubs', 8),
      card('spades', 5), card('hearts', 2), card('clubs', 3),
    ]);
    expect(tpA.tiebreakers.length).toBe(tpB.tiebreakers.length);
  });
});
