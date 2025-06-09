import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { openings } from "./opening";
import { LineEval, PositionEval } from "@/stockfish/engine/engine";
import { Color } from "chess.js";

export type MoveQuality =
  | "Best"
  | "Very Good"
  | "Good"
  | "Dubious"
  | "Mistake"
  | "Blunder"
  | "Book";

export interface MoveAnalysis {
  plyNumber: number;
  notation: string;
  quality: MoveQuality;
  fen: string;
  player: "w" | "b";
}

const useGameReview = (stockfishEngine: UciEngine | undefined, searchDepth: number) => {

  if (!stockfishEngine) {
     console.log("invalid engine waiting for it to start");
    }

  const [gameReview, setGameReview] = useState<MoveAnalysis[]>([]);
  const [gameReviewLoading, setGameReviewLoading] = useState(false);

  // Check if a move deserves special recognition
  const isExceptionalMove = (
    preMoveAdvantage: number,
    postMoveAdvantage: number,
    isWhiteTurn: boolean,
    secondBestAdvantage: number | undefined
  ): boolean => {
    if (!secondBestAdvantage) return false;

    const advantageChange = (postMoveAdvantage - preMoveAdvantage) * (isWhiteTurn ? 1 : -1);
    
    // Move must not lose significant advantage
    if (advantageChange < -2) return false;

    // Don't award points for moves in hopeless positions
    if (isInHopelessPosition(postMoveAdvantage, secondBestAdvantage, isWhiteTurn)) {
      return false;
    }

    const reversedGameOutcome = hasReversedOutcome(preMoveAdvantage, postMoveAdvantage, isWhiteTurn);
    const wasCriticalChoice = wasOnlyViableOption(postMoveAdvantage, secondBestAdvantage, isWhiteTurn);

    return reversedGameOutcome || wasCriticalChoice;
  };

  const hasReversedOutcome = (
    before: number,
    after: number,
    whiteToMove: boolean
  ): boolean => {
    const improvement = (after - before) * (whiteToMove ? 1 : -1);
    const crossedEquality = (before < 50 && after > 50) || (before > 50 && after < 50);
    return improvement > 10 && crossedEquality;
  };

  const wasOnlyViableOption = (
    chosenAdvantage: number,
    alternativeAdvantage: number,
    whiteToMove: boolean
  ): boolean => {
    const qualityGap = (chosenAdvantage - alternativeAdvantage) * (whiteToMove ? 1 : -1);
    return qualityGap > 10;
  };

  // Convert centipawn evaluation to win probability
  const centipawnToWinRate = (centipawn: number): number => {
    const clampedCp = Math.max(-1100, Math.min(centipawn, 1100));
    const conversionFactor = -0.0038988;
    const probability = 2 / (1 + Math.exp(conversionFactor * clampedCp)) - 1;
    return 55 + 55 * probability;
  };

  const mateToWinRate = (mateDistance: number): number => {
    if (mateDistance === 0) return 55;
    return mateDistance > 0 ? 100 : 0;
  };

  const evaluationToWinRate = (evaluation: LineEval | undefined): number => {
    if (!evaluation) return 55;

    if (evaluation.cp !== undefined) {
      return centipawnToWinRate(evaluation.cp);
    }

    if (evaluation.mate !== undefined) {
      return mateToWinRate(evaluation.mate);
    }

    return 50;
  };

  // Determine move quality based on advantage loss
  const assessMoveQuality = (
    previousAdvantage: number,
    currentAdvantage: number,
    whiteToMove: boolean
  ): MoveQuality => {
    const advantageLoss = (currentAdvantage - previousAdvantage) * (whiteToMove ? 1 : -1);

    if (advantageLoss < -22.2) return "Blunder";
    if (advantageLoss < -11.1) return "Mistake";
    if (advantageLoss < -5.5) return "Dubious";
    if (advantageLoss < -2.2) return "Good";
    return "Very Good";
  };

  const isInHopelessPosition = (
    currentAdvantage: number,
    fallbackAdvantage: number,
    whiteToMove: boolean
  ): boolean => {
    const isBehind = whiteToMove ? currentAdvantage < 55 : currentAdvantage > 55;
    const alternativeIsWinning = whiteToMove ? fallbackAdvantage > 99 : fallbackAdvantage < 4;
    return isBehind || alternativeIsWinning;
  };

  const generateGameReview = useCallback(
    async (gameNotation: string[]): Promise<void> => {
      setGameReviewLoading(true);

      if (!stockfishEngine) {
        console.warn("Chess engine unavailable");
        setGameReviewLoading(false);
        return;
      }

      interface GameState {
        evaluation: PositionEval;
        preMovefen: string; // FEN before the move
        postMovefen: string;
        activePlayer: Color;
        moveNotation: string;
        plyIndex: number;
      }

      try {
        const gameBoard = new Chess();
        const moveEvaluations: MoveAnalysis[] = [];
        const analysisDepth = searchDepth;
        const gameStates: GameState[] = [];
        const moveHistory: string[] = [];

        // Phase 1: Collect all positions and their evaluations
        for (let ply = 0; ply < gameNotation.length; ply++) {
          const preMovefen = gameBoard.fen(); // Capture FEN before making the move
          const activePlayer = gameBoard.turn();
          const moveNotation = gameNotation[ply];

          const moveObject = gameBoard.move(moveNotation);

          const postMovefen = gameBoard.fen();
          if (!moveObject) {
            console.error(`Illegal move detected: ${moveNotation} at ply ${ply}`);
            continue;
          }

          const uciNotation = moveObject.from + moveObject.to + (moveObject.promotion || "");
          moveHistory.push(uciNotation);

          // Analyze position before move execution (using preMovefen)
          const positionAnalysis = await stockfishEngine.evaluatePositionWithUpdate({
            fen: preMovefen,
            depth: analysisDepth,
            multiPv: 3,
          });

          gameStates.push({
            evaluation: positionAnalysis,
            activePlayer: activePlayer,
            preMovefen: preMovefen, // This is the FEN before the move
            postMovefen: postMovefen,
            moveNotation: moveNotation,
            plyIndex: ply,
          });
        }

        // Phase 2: Classify each move with complete context
        for (let ply = 0; ply < gameStates.length; ply++) {
          const currentState = gameStates[ply];
          const { activePlayer, moveNotation, plyIndex, evaluation, preMovefen, postMovefen } = currentState;

          // Check opening book
          const boardPosition = postMovefen.split(" ")[0];
          const openingMatch = openings.find(
            (entry) => entry.fen.trim() === boardPosition.trim()
          );

          if (openingMatch) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              fen: preMovefen, // FEN before the move
              notation: moveNotation,
              quality: "Book",
              player: activePlayer,
            });
            continue;
          }

          // Calculate win probabilities
          const preMoveWinRate = evaluationToWinRate(evaluation.lines?.[0]);
          const nextState = ply < gameStates.length - 1 ? gameStates[ply + 1] : null;
          const postMoveWinRate = nextState
            ? evaluationToWinRate(nextState.evaluation.lines?.[0])
            : preMoveWinRate;

          // Get second-best option evaluation
          const secondBestEval = evaluation.lines?.[1];
          const secondBestWinRate = secondBestEval ? evaluationToWinRate(secondBestEval) : undefined;

          const isWhitePlaying = activePlayer === "w";
          const playedMove = moveHistory[ply];
          const engineChoice = evaluation.bestMove;

          // Check for brilliant moves
          if (
            isExceptionalMove(preMoveWinRate, postMoveWinRate, isWhitePlaying, secondBestWinRate)
          ) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              notation: moveNotation,
              fen: preMovefen, // FEN before the move
              quality: "Very Good",
              player: activePlayer,
            });
            continue;
          }

          // Check if engine's top choice was played
          if (playedMove === engineChoice) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              notation: moveNotation,
              fen: preMovefen, // FEN before the move
              quality: "Best",
              player: activePlayer,
            });
            continue;
          }

          // Standard quality assessment
          const qualityRating = assessMoveQuality(preMoveWinRate, postMoveWinRate, isWhitePlaying);

          moveEvaluations.push({
            plyNumber: plyIndex,
            notation: moveNotation,
            quality: qualityRating,
            fen: preMovefen, // FEN before the move
            player: activePlayer,
          });
        }

        console.log("Analysis Complete:", moveEvaluations);
        setGameReview(moveEvaluations);
      } catch (error) {
        console.error("Analysis failed:", error);
      } finally {
        setGameReviewLoading(false);
      }
    },
    [stockfishEngine, searchDepth]
  );

  return { 
    gameReview,
    gameReviewLoading,
    setGameReview,
    setGameReviewLoading,
    generateGameReview,
};

}

export default useGameReview;