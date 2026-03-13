import { describe, it, expect } from 'vitest';
import {
  startNewRound,
  processPlayerAction,
  processCpuAction,
  type RoundConfig,
  type EngineState,
} from './gameEngine';
import { decideAction, PRESET_DEFAULT, type CpuStrategyOptions } from './cpuStrategy';
import { createInitialStats, recordResult } from './statsTracker';
import type { Deck } from './deck';

// ========== テストヘルパー ==========

const DEFAULT_CONFIG: RoundConfig = {
  playerStack: 1000,
  cpuStack: 1000,
  ante: 10,
  betSize: 20,
};

const INITIAL_TOTAL_CHIPS = DEFAULT_CONFIG.playerStack + DEFAULT_CONFIG.cpuStack;

function assertChipConservation(state: EngineState): void {
  const total = state.playerStack + state.cpuStack + state.pot;
  expect(total).toBe(INITIAL_TOTAL_CHIPS);
}

function playPlayerCheck(
  engineState: EngineState,
  deck: Deck,
): { engineState: EngineState; deck: Deck } {
  return processPlayerAction(engineState, deck, { type: 'check' });
}

function playCpuTurn(
  engineState: EngineState,
  deck: Deck,
  options: CpuStrategyOptions,
  random: () => number,
): { engineState: EngineState; deck: Deck } {
  const action = decideAction(engineState, options, random);
  return processCpuAction(engineState, deck, action);
}

// ========== GameEngine + CpuStrategy 統合: check-check パス ==========

describe('GameEngine + CpuStrategy 統合: check-check パス', () => {
  it('CPU が全ストリートで check を選択し、ショーダウンまで完走する', () => {
    // Given: random = 0.99 → CPU は常に check を返す（betProb を超える値）
    const fixedRandom = () => 0.99;
    let { engineState, deck } = startNewRound(DEFAULT_CONFIG);

    // When: third → seventh まで player check → CPU check
    for (let i = 0; i < 4; i++) {
      const afterPlayer = playPlayerCheck(engineState, deck);
      const afterCpu = playCpuTurn(afterPlayer.engineState, afterPlayer.deck, PRESET_DEFAULT, fixedRandom);
      engineState = afterCpu.engineState;
      deck = afterCpu.deck;
      assertChipConservation(engineState);
    }

    // seventh ストリートの最終アクション
    const finalPlayer = playPlayerCheck(engineState, deck);
    const finalCpu = playCpuTurn(finalPlayer.engineState, finalPlayer.deck, PRESET_DEFAULT, fixedRandom);

    // Then
    expect(finalCpu.engineState.phase).toBe('round-over');
    expect(finalCpu.engineState.roundResult).toBeDefined();
    expect(finalCpu.engineState.street).toBe('showdown');
    expect(['player', 'cpu', 'draw']).toContain(finalCpu.engineState.roundResult!.winner);
    assertChipConservation(finalCpu.engineState);
  });
});

// ========== GameEngine + CpuStrategy 統合: bet-call パス ==========

describe('GameEngine + CpuStrategy 統合: bet-call パス', () => {
  it('プレイヤー bet に対して CPU が call し、次ストリートへ進行する', () => {
    // Given: random = 0.0 → CPU は call を返す（callProb 内の値）
    const fixedRandom = () => 0.0;
    let { engineState, deck } = startNewRound(DEFAULT_CONFIG);

    // When: プレイヤー bet → CPU decideAction（call）
    const afterBet = processPlayerAction(engineState, deck, { type: 'bet' });
    const afterCpu = playCpuTurn(afterBet.engineState, afterBet.deck, PRESET_DEFAULT, fixedRandom);

    // Then: ラウンド継続、次ストリートに進行
    expect(afterCpu.engineState.phase).not.toBe('round-over');
    expect(afterCpu.engineState.street).toBe('fourth');
    assertChipConservation(afterCpu.engineState);
  });
});

// ========== GameEngine + CpuStrategy 統合: CPU fold パス ==========

describe('GameEngine + CpuStrategy 統合: CPU fold パス', () => {
  it('プレイヤー bet に対して CPU が fold し、ラウンドが即終了する', () => {
    // Given: random = 0.99 → CPU は fold を返す（callProb を超える値）
    const fixedRandom = () => 0.99;
    let { engineState, deck } = startNewRound(DEFAULT_CONFIG);

    // When: プレイヤー bet → CPU decideAction（fold）
    const afterBet = processPlayerAction(engineState, deck, { type: 'bet' });
    const afterCpu = playCpuTurn(afterBet.engineState, afterBet.deck, PRESET_DEFAULT, fixedRandom);

    // Then: ラウンド即終了、プレイヤー勝利
    expect(afterCpu.engineState.phase).toBe('round-over');
    expect(afterCpu.engineState.roundResult!.winner).toBe('player');
    assertChipConservation(afterCpu.engineState);
  });
});

// ========== GameEngine + CpuStrategy + StatsTracker 統合: 複数ラウンド統計 ==========

describe('GameEngine + CpuStrategy + StatsTracker 統合: 複数ラウンド統計', () => {
  it('3ラウンド実行し、統計が正しく累積される', () => {
    // Given
    let stats = createInitialStats();
    const fixedRandom = () => 0.99;
    let playerStack = DEFAULT_CONFIG.playerStack;
    let cpuStack = DEFAULT_CONFIG.cpuStack;

    // When: 3ラウンドをプレイヤー fold で実行
    for (let round = 0; round < 3; round++) {
      const config: RoundConfig = {
        playerStack,
        cpuStack,
        ante: DEFAULT_CONFIG.ante,
        betSize: DEFAULT_CONFIG.betSize,
      };
      const { engineState, deck } = startNewRound(config);
      const afterFold = processPlayerAction(engineState, deck, { type: 'fold' });

      stats = recordResult(stats, afterFold.engineState.roundResult!.winner);
      playerStack = afterFold.engineState.playerStack;
      cpuStack = afterFold.engineState.cpuStack;
    }

    // Then: 統計が累積されている
    expect(stats.games).toBe(3);
    expect(stats.losses).toBe(3);
    expect(stats.wins).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it('ショーダウンまで完走したラウンドの統計が正しく記録される', () => {
    // Given
    let stats = createInitialStats();
    const fixedRandom = () => 0.99;
    let playerStack = DEFAULT_CONFIG.playerStack;
    let cpuStack = DEFAULT_CONFIG.cpuStack;

    // When: 2ラウンドを check-check で完走
    for (let round = 0; round < 2; round++) {
      const config: RoundConfig = {
        playerStack,
        cpuStack,
        ante: DEFAULT_CONFIG.ante,
        betSize: DEFAULT_CONFIG.betSize,
      };
      let { engineState, deck } = startNewRound(config);

      for (let street = 0; street < 4; street++) {
        const afterPlayer = playPlayerCheck(engineState, deck);
        const afterCpu = playCpuTurn(afterPlayer.engineState, afterPlayer.deck, PRESET_DEFAULT, fixedRandom);
        engineState = afterCpu.engineState;
        deck = afterCpu.deck;
      }

      const finalPlayer = playPlayerCheck(engineState, deck);
      const finalCpu = playCpuTurn(finalPlayer.engineState, finalPlayer.deck, PRESET_DEFAULT, fixedRandom);

      stats = recordResult(stats, finalCpu.engineState.roundResult!.winner);
      playerStack = finalCpu.engineState.playerStack;
      cpuStack = finalCpu.engineState.cpuStack;
    }

    // Then: 2ラウンド分の統計が記録されている
    expect(stats.games).toBe(2);
    expect(stats.wins + stats.losses + stats.draws).toBe(2);
    expect(playerStack + cpuStack).toBe(INITIAL_TOTAL_CHIPS);
  });
});

// ========== 不変性: 入力状態が変更されない ==========

describe('不変性: 統合テストで入力状態が変更されない', () => {
  it('playCpuTurn が元の EngineState を変更しない', () => {
    // Given
    const { engineState, deck } = startNewRound(DEFAULT_CONFIG);
    const afterPlayer = playPlayerCheck(engineState, deck);
    const originalState = JSON.parse(JSON.stringify(afterPlayer.engineState));
    const originalDeck = JSON.parse(JSON.stringify(afterPlayer.deck));

    // When
    playCpuTurn(afterPlayer.engineState, afterPlayer.deck, PRESET_DEFAULT, () => 0.99);

    // Then
    expect(afterPlayer.engineState).toEqual(originalState);
    expect(afterPlayer.deck).toEqual(originalDeck);
  });
});
