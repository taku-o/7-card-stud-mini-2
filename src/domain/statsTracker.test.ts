import { describe, it, expect } from 'vitest';
import { createInitialStats, recordResult } from './statsTracker';
import type { Stats } from './statsTracker';

// ========== createInitialStats: 初期状態 ==========

describe('createInitialStats: 初期状態', () => {
  it('全てのカウンターが 0 で初期化される', () => {
    // Given / When
    const stats = createInitialStats();

    // Then
    expect(stats.games).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(0);
  });

  it('勝率が 0 で初期化される', () => {
    // Given / When
    const stats = createInitialStats();

    // Then
    expect(stats.winRate).toBe(0);
  });
});

// ========== recordResult: プレイヤー勝利 ==========

describe('recordResult: プレイヤー勝利', () => {
  it('wins と games が 1 増加する', () => {
    // Given
    const initial = createInitialStats();

    // When
    const updated = recordResult(initial, 'player');

    // Then
    expect(updated.games).toBe(1);
    expect(updated.wins).toBe(1);
    expect(updated.losses).toBe(0);
    expect(updated.draws).toBe(0);
  });

  it('勝率が 100 になる', () => {
    // Given
    const initial = createInitialStats();

    // When
    const updated = recordResult(initial, 'player');

    // Then
    expect(updated.winRate).toBe(100);
  });
});

// ========== recordResult: CPU 勝利 ==========

describe('recordResult: CPU 勝利', () => {
  it('losses と games が 1 増加する', () => {
    // Given
    const initial = createInitialStats();

    // When
    const updated = recordResult(initial, 'cpu');

    // Then
    expect(updated.games).toBe(1);
    expect(updated.wins).toBe(0);
    expect(updated.losses).toBe(1);
    expect(updated.draws).toBe(0);
  });

  it('勝率が 0 になる', () => {
    // Given
    const initial = createInitialStats();

    // When
    const updated = recordResult(initial, 'cpu');

    // Then
    expect(updated.winRate).toBe(0);
  });
});

// ========== recordResult: 引き分け ==========

describe('recordResult: 引き分け', () => {
  it('draws と games が 1 増加する', () => {
    // Given
    const initial = createInitialStats();

    // When
    const updated = recordResult(initial, 'draw');

    // Then
    expect(updated.games).toBe(1);
    expect(updated.wins).toBe(0);
    expect(updated.losses).toBe(0);
    expect(updated.draws).toBe(1);
  });

  it('勝率が 0 になる', () => {
    // Given
    const initial = createInitialStats();

    // When
    const updated = recordResult(initial, 'draw');

    // Then
    expect(updated.winRate).toBe(0);
  });
});

// ========== recordResult: 累積と勝率計算 ==========

describe('recordResult: 累積と勝率計算', () => {
  it('複数回の結果が累積される', () => {
    // Given
    const initial = createInitialStats();

    // When
    const after1 = recordResult(initial, 'player');
    const after2 = recordResult(after1, 'cpu');
    const after3 = recordResult(after2, 'player');

    // Then
    expect(after3.games).toBe(3);
    expect(after3.wins).toBe(2);
    expect(after3.losses).toBe(1);
    expect(after3.draws).toBe(0);
  });

  it('3 ゲーム中 2 勝で勝率が約 66.7% になる', () => {
    // Given
    const initial = createInitialStats();
    const after1 = recordResult(initial, 'player');
    const after2 = recordResult(after1, 'cpu');

    // When
    const after3 = recordResult(after2, 'player');

    // Then: 2/3 * 100 ≈ 66.67
    expect(after3.winRate).toBeCloseTo(66.67, 1);
  });

  it('全て引き分けで勝率が 0 になる', () => {
    // Given
    const initial = createInitialStats();

    // When
    const after1 = recordResult(initial, 'draw');
    const after2 = recordResult(after1, 'draw');

    // Then
    expect(after2.games).toBe(2);
    expect(after2.winRate).toBe(0);
  });
});

// ========== recordResult: イミュータブル性 ==========

describe('recordResult: イミュータブル性', () => {
  it('元の Stats オブジェクトが変更されない', () => {
    // Given
    const initial = createInitialStats();
    const initialCopy: Stats = { ...initial };

    // When
    recordResult(initial, 'player');

    // Then
    expect(initial).toEqual(initialCopy);
  });

  it('返されるオブジェクトが元のオブジェクトと異なる参照を持つ', () => {
    // Given
    const initial = createInitialStats();

    // When
    const updated = recordResult(initial, 'player');

    // Then
    expect(updated).not.toBe(initial);
  });
});
