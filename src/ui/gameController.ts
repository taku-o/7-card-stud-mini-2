import type { Deck } from '../domain/deck';
import type { EngineState, PlayerActionType } from '../domain/gameEngine';
import {
  startNewRound,
  getAvailableActions,
  processPlayerAction,
  processCpuAction,
} from '../domain/gameEngine';
import { decideAction, PRESET_DEFAULT } from '../domain/cpuStrategy';
import { createGameView } from './gameView';

const INITIAL_STACK = 1000;
const ANTE = 10;
const BET_SIZE = 20;
const CPU_THINK_DELAY_MS = 1000;

export type GameController = {
  startNewGame(): void;
  startNextRound(): void;
  handlePlayerAction(action: PlayerActionType): void;
};

export function createGameController(container: HTMLElement): GameController {
  const view = createGameView(container);

  let engineState: EngineState;
  let deck: Deck;
  let playerStack = INITIAL_STACK;
  let cpuStack = INITIAL_STACK;
  let cpuThinking = false;

  function renderCurrentState(): void {
    const actions = getAvailableActions(engineState);
    view.render(engineState, actions);
  }

  function revealAllCpuCards(): void {
    view.render(
      {
        ...engineState,
        cpuCards: engineState.cpuCards.map((c) => ({ ...c, faceUp: true })),
      },
      [],
    );
  }

  function handleRoundOver(): void {
    if (engineState.roundResult) {
      const isFoldResult =
        engineState.roundResult.playerHandType === '' &&
        engineState.roundResult.cpuHandType === '';

      if (!isFoldResult) {
        revealAllCpuCards();
      }

      playerStack = engineState.playerStack;
      cpuStack = engineState.cpuStack;
      view.showRoundResult(engineState.roundResult);
    }
  }

  function executeCpuTurn(): void {
    cpuThinking = true;
    view.showCpuThinking();

    setTimeout(() => {
      cpuThinking = false;
      const cpuAction = decideAction(engineState, PRESET_DEFAULT, Math.random);
      const result = processCpuAction(engineState, deck, cpuAction);
      engineState = result.engineState;
      deck = result.deck;

      if (engineState.phase === 'round-over') {
        handleRoundOver();
      } else {
        renderCurrentState();
      }
    }, CPU_THINK_DELAY_MS);
  }

  function startNewGame(): void {
    playerStack = INITIAL_STACK;
    cpuStack = INITIAL_STACK;
    startRound();
  }

  function startNextRound(): void {
    startRound();
  }

  function startRound(): void {
    const result = startNewRound({
      playerStack,
      cpuStack,
      ante: ANTE,
      betSize: BET_SIZE,
    });
    engineState = result.engineState;
    deck = result.deck;
    renderCurrentState();
  }

  function handlePlayerAction(action: PlayerActionType): void {
    if (cpuThinking) return;

    const result = processPlayerAction(engineState, deck, { type: action });
    engineState = result.engineState;
    deck = result.deck;

    if (engineState.phase === 'round-over') {
      handleRoundOver();
      return;
    }

    executeCpuTurn();
  }

  view.onAction(handlePlayerAction);
  view.onNewGame(startNewGame);
  view.onNextRound(startNextRound);

  return { startNewGame, startNextRound, handlePlayerAction };
}
