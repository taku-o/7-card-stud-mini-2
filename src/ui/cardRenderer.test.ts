// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderCard, renderCards } from './cardRenderer';
import type { Card } from '../domain/card';

// ========== テストヘルパー ==========

function createCard(
  suit: Card['suit'],
  rank: Card['rank'],
  faceUp: boolean,
): Card {
  return { suit, rank, faceUp };
}

// ========== renderCard: faceUp カードの表示 ==========

describe('renderCard: faceUp カードの表示', () => {
  it('スペードのカードに ♠ シンボルが含まれる', () => {
    // Given
    const card = createCard('spades', 10, true);

    // When
    const element = renderCard(card);

    // Then
    expect(element.textContent).toContain('♠');
  });

  it('ハートのカードに ♥ シンボルが含まれる', () => {
    const card = createCard('hearts', 10, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('♥');
  });

  it('ダイヤのカードに ♦ シンボルが含まれる', () => {
    const card = createCard('diamonds', 10, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('♦');
  });

  it('クラブのカードに ♣ シンボルが含まれる', () => {
    const card = createCard('clubs', 10, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('♣');
  });

  it('ランク 14 が A と表示される', () => {
    const card = createCard('spades', 14, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('A');
  });

  it('ランク 13 が K と表示される', () => {
    const card = createCard('spades', 13, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('K');
  });

  it('ランク 12 が Q と表示される', () => {
    const card = createCard('spades', 12, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('Q');
  });

  it('ランク 11 が J と表示される', () => {
    const card = createCard('spades', 11, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('J');
  });

  it('ランク 10 が 10 と表示される', () => {
    const card = createCard('spades', 10, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('10');
  });

  it('ランク 2 が 2 と表示される', () => {
    const card = createCard('spades', 2, true);

    const element = renderCard(card);

    expect(element.textContent).toContain('2');
  });
});

// ========== renderCard: faceDown カードの表示 ==========

describe('renderCard: faceDown カードの表示', () => {
  it('裏面カードはスートシンボルを含まない', () => {
    // Given
    const card = createCard('hearts', 14, false);

    // When
    const element = renderCard(card);

    // Then
    expect(element.textContent).not.toContain('♥');
  });

  it('裏面カードはランク表示を含まない', () => {
    const card = createCard('hearts', 14, false);

    const element = renderCard(card);

    expect(element.textContent).not.toContain('A');
  });

  it('裏面カードは裏面を示す表示を含む', () => {
    const card = createCard('hearts', 14, false);

    const element = renderCard(card);

    expect(element.textContent).toContain('?');
  });
});

// ========== renderCard: HTMLElement の生成 ==========

describe('renderCard: HTMLElement の生成', () => {
  it('HTMLElement を返す', () => {
    const card = createCard('spades', 10, true);

    const element = renderCard(card);

    expect(element).toBeInstanceOf(HTMLElement);
  });
});

// ========== renderCards: 複数カードのコンテナ ==========

describe('renderCards: 複数カードのコンテナ', () => {
  it('渡されたカード数と同じ数の子要素を持つ', () => {
    // Given
    const cards: Card[] = [
      createCard('spades', 14, true),
      createCard('hearts', 13, true),
      createCard('diamonds', 12, false),
    ];

    // When
    const container = renderCards(cards);

    // Then
    expect(container.children).toHaveLength(3);
  });

  it('空配列のとき子要素が 0 個のコンテナを返す', () => {
    const cards: Card[] = [];

    const container = renderCards(cards);

    expect(container.children).toHaveLength(0);
  });

  it('HTMLElement を返す', () => {
    const cards: Card[] = [createCard('spades', 10, true)];

    const container = renderCards(cards);

    expect(container).toBeInstanceOf(HTMLElement);
  });

  it('faceUp と faceDown のカードが混在しても正しい数を返す', () => {
    // Given
    const cards: Card[] = [
      createCard('spades', 14, true),
      createCard('hearts', 13, false),
      createCard('diamonds', 12, true),
      createCard('clubs', 11, false),
      createCard('spades', 10, true),
    ];

    // When
    const container = renderCards(cards);

    // Then
    expect(container.children).toHaveLength(5);
  });
});
