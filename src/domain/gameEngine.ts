import { createDeck, shuffleDeck, type Deck } from './deck';
import {
  type GameState,
  type RoundResult,
  createInitialGameState,
  advanceToNextStreet,
} from './gameState';
import { evaluateHand, compareHandRanks } from './handEvaluator';

export type RoundConfig = {
  playerStack: number;
  cpuStack: number;
  ante: number;
  betSize: number;
};

export type PlayerActionType = 'bet' | 'call' | 'fold' | 'check';

export type PlayerAction = { type: PlayerActionType };

export type GamePhase = 'player-turn' | 'cpu-turn' | 'round-over';

export type EngineState = GameState & {
  phase: GamePhase;
  currentBet: number;
  playerBetInStreet: number;
  cpuBetInStreet: number;
  betSize: number;
};

type EngineResult = { engineState: EngineState; deck: Deck };

export function startNewRound(config: RoundConfig): EngineResult {
  const deck = shuffleDeck(createDeck());
  const pot = config.ante * 2;

  const { state, deck: remainingDeck } = createInitialGameState(
    config.playerStack - config.ante,
    config.cpuStack - config.ante,
    deck,
  );

  const engineState: EngineState = {
    ...state,
    pot,
    phase: 'player-turn',
    currentBet: 0,
    playerBetInStreet: 0,
    cpuBetInStreet: 0,
    betSize: config.betSize,
  };

  return { engineState, deck: remainingDeck };
}

export function getAvailableActions(state: EngineState): PlayerActionType[] {
  if (state.phase !== 'player-turn') return [];
  if (state.currentBet === 0) return ['bet', 'check', 'fold'];
  return ['call', 'fold'];
}

export function processPlayerAction(
  engineState: EngineState,
  deck: Deck,
  action: PlayerAction,
): EngineResult {
  const newState = applyBettingAction(engineState, 'player', action);
  return { engineState: newState, deck: { cards: [...deck.cards] } };
}

export function processCpuAction(
  engineState: EngineState,
  deck: Deck,
  action: PlayerAction,
): EngineResult {
  const afterAction = applyBettingAction(engineState, 'cpu', action);

  if (afterAction.phase === 'round-over') {
    return { engineState: afterAction, deck: { cards: [...deck.cards] } };
  }

  if (afterAction.street === 'seventh') {
    const { state: advancedState, deck: newDeck } = advanceToNextStreet(
      afterAction,
      deck,
    );
    const showdownState: EngineState = {
      ...afterAction,
      ...advancedState,
      currentBet: 0,
      playerBetInStreet: 0,
      cpuBetInStreet: 0,
    };
    const { engineState: resolvedState } = resolveShowdown(showdownState);
    return { engineState: resolvedState, deck: newDeck };
  }

  const { state: advancedState, deck: newDeck } = advanceToNextStreet(
    afterAction,
    deck,
  );
  const nextState: EngineState = {
    ...afterAction,
    ...advancedState,
    phase: 'player-turn',
    currentBet: 0,
    playerBetInStreet: 0,
    cpuBetInStreet: 0,
  };

  return { engineState: nextState, deck: newDeck };
}

export function resolveShowdown(
  engineState: EngineState,
): { engineState: EngineState } {
  const playerRank = evaluateHand(engineState.playerCards);
  const cpuRank = evaluateHand(engineState.cpuCards);
  const comparison = compareHandRanks(playerRank, cpuRank);

  const roundResult = buildRoundResult(
    comparison,
    playerRank.type,
    cpuRank.type,
    engineState.pot,
  );
  const stacks = distributeWinnings(
    comparison,
    engineState.playerStack,
    engineState.cpuStack,
    engineState.pot,
  );

  return {
    engineState: {
      ...engineState,
      ...stacks,
      pot: 0,
      phase: 'round-over',
      roundResult,
    },
  };
}

function applyBettingAction(
  state: EngineState,
  actor: 'player' | 'cpu',
  action: PlayerAction,
): EngineState {
  const isPlayer = actor === 'player';
  const nextPhase: GamePhase = isPlayer ? 'cpu-turn' : 'player-turn';

  switch (action.type) {
    case 'fold':
      return applyFold(state, isPlayer);
    case 'bet':
      return applyBet(state, isPlayer, nextPhase);
    case 'call':
      return applyCall(state, isPlayer, nextPhase);
    case 'check':
      return { ...state, phase: nextPhase };
  }
}

function applyFold(
  state: EngineState,
  isPlayerFolding: boolean,
): EngineState {
  const winner = isPlayerFolding ? 'cpu' : 'player';
  const chipDelta = isPlayerFolding ? -state.pot : state.pot;
  return {
    ...state,
    playerStack: isPlayerFolding
      ? state.playerStack
      : state.playerStack + state.pot,
    cpuStack: isPlayerFolding
      ? state.cpuStack + state.pot
      : state.cpuStack,
    pot: 0,
    phase: 'round-over',
    roundResult: { winner, playerHandType: '', cpuHandType: '', chipDelta },
  };
}

function applyBet(
  state: EngineState,
  isPlayer: boolean,
  nextPhase: GamePhase,
): EngineState {
  return {
    ...state,
    playerStack: isPlayer
      ? state.playerStack - state.betSize
      : state.playerStack,
    cpuStack: isPlayer ? state.cpuStack : state.cpuStack - state.betSize,
    pot: state.pot + state.betSize,
    currentBet: state.betSize,
    playerBetInStreet: isPlayer ? state.betSize : state.playerBetInStreet,
    cpuBetInStreet: isPlayer ? state.cpuBetInStreet : state.betSize,
    phase: nextPhase,
  };
}

function applyCall(
  state: EngineState,
  isPlayer: boolean,
  nextPhase: GamePhase,
): EngineState {
  const betInStreet = isPlayer
    ? state.playerBetInStreet
    : state.cpuBetInStreet;
  const callAmount = state.currentBet - betInStreet;
  return {
    ...state,
    playerStack: isPlayer
      ? state.playerStack - callAmount
      : state.playerStack,
    cpuStack: isPlayer ? state.cpuStack : state.cpuStack - callAmount,
    pot: state.pot + callAmount,
    playerBetInStreet: isPlayer ? state.currentBet : state.playerBetInStreet,
    cpuBetInStreet: isPlayer ? state.cpuBetInStreet : state.currentBet,
    phase: nextPhase,
  };
}

function buildRoundResult(
  comparison: number,
  playerHandType: string,
  cpuHandType: string,
  pot: number,
): RoundResult {
  if (comparison > 0) {
    return { winner: 'player', playerHandType, cpuHandType, chipDelta: pot };
  }
  if (comparison < 0) {
    return { winner: 'cpu', playerHandType, cpuHandType, chipDelta: -pot };
  }
  return { winner: 'draw', playerHandType, cpuHandType, chipDelta: 0 };
}

function distributeWinnings(
  comparison: number,
  playerStack: number,
  cpuStack: number,
  pot: number,
): { playerStack: number; cpuStack: number } {
  if (comparison > 0) {
    return { playerStack: playerStack + pot, cpuStack };
  }
  if (comparison < 0) {
    return { playerStack, cpuStack: cpuStack + pot };
  }
  const halfPot = Math.floor(pot / 2);
  return {
    playerStack: playerStack + halfPot,
    cpuStack: cpuStack + (pot - halfPot),
  };
}
