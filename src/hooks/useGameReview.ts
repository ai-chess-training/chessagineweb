import { useState, useCallback } from "react";
import { Chess, Move, validateFen } from "chess.js";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { LineEval } from "@/stockfish/engine/engine";
import { Color } from "chess.js";
import { CandidateMove } from "../componets/tabs/Chessdb";
import { isFenInAllDatabases } from "../libs/openingdatabase/ecoDatabase";


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
  sanNotation: string | undefined;
  quality: MoveQuality;
  arrowMove: Move;
  evalMove: number;
  fen: string;
  currenFen: string;
  player: "w" | "b";
}

const useGameReview = (
  stockfishEngine: UciEngine | undefined,
  searchDepth: number
) => {
  if (!stockfishEngine) {
    console.log("invalid engine waiting for it to start");
  }

  const [gameReview, setGameReview] = useState<MoveAnalysis[]>([]);
  const [gameReviewLoading, setGameReviewLoading] = useState(false);
  const [gameReviewProgress, setGameReviewProgress] = useState(0);

  const isVeryGoodMove = (
    preMoveAdvantage: number,
    postMoveAdvantage: number,
    isWhiteTurn: boolean,
    secondBestAdvantage: number | undefined
  ): boolean => {
    if (!secondBestAdvantage) return false;

    const advantageChange =
      (postMoveAdvantage - preMoveAdvantage) * (isWhiteTurn ? 1 : -1);

    if (advantageChange < -2) return false;

    if (
      isInHopelessPosition(postMoveAdvantage, secondBestAdvantage, isWhiteTurn)
    ) {
      return false;
    }

    const reversedGameOutcome = hasReversedOutcome(
      preMoveAdvantage,
      postMoveAdvantage,
      isWhiteTurn
    );
    const wasCriticalChoice = wasOnlyViableOption(
      postMoveAdvantage,
      secondBestAdvantage,
      isWhiteTurn
    );

    return reversedGameOutcome || wasCriticalChoice;
  };

  const hasReversedOutcome = (
    before: number,
    after: number,
    whiteToMove: boolean
  ): boolean => {
    const improvement = (after - before) * (whiteToMove ? 1 : -1);
    const crossedEquality =
      (before < 50 && after > 50) || (before > 50 && after < 50);
    return improvement > 10 && crossedEquality;
  };

  const wasOnlyViableOption = (
    chosenAdvantage: number,
    alternativeAdvantage: number,
    whiteToMove: boolean
  ): boolean => {
    const qualityGap =
      (chosenAdvantage - alternativeAdvantage) * (whiteToMove ? 1 : -1);
    return qualityGap > 10;
  };

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

  const assessMoveQuality = (
    previousAdvantage: number,
    currentAdvantage: number,
    whiteToMove: boolean
  ): MoveQuality => {
    const advantageLoss =
      (currentAdvantage - previousAdvantage) * (whiteToMove ? 1 : -1);

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
    const isBehind = whiteToMove
      ? currentAdvantage < 55
      : currentAdvantage > 55;
    const alternativeIsWinning = whiteToMove
      ? fallbackAdvantage > 99
      : fallbackAdvantage < 4;
    return isBehind || alternativeIsWinning;
  };

  const fetchChessDBData = useCallback(async (fenString: string) => {
    if (!fenString.trim()) {
      return [];
    }

    if (!validateFen(fenString)) {
      return [];
    }

    try {
      const encodedFen = encodeURIComponent(fenString);
      const apiUrl = `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodedFen}&learn=1&json=1`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        return [];
      }

      const responseData = await response.json();

      if (responseData.status !== "ok") {
        return [];
      }

      const moves = responseData.moves;
      if (!Array.isArray(moves) || moves.length === 0) {
        return [];
      }

      const processedMoves = moves.slice(0, 5).map((move: CandidateMove) => {
        const scoreNum = Number(move.score);
        const scoreStr = isNaN(scoreNum) ? "N/A" : String(scoreNum);
        return {
          uci: move.uci || "N/A",
          san: move.san || "N/A",
          score: scoreStr || 0,
          winrate: move.winrate || "N/A",
        };
      });

      return processedMoves;
    } catch (err) {
      console.log("error!", err);
      throw err;
    }
  }, []);

  function percentToNumber(percentStr: string): number {
  return parseFloat(percentStr.replace('%', '').trim());
}

  const generateGameReview = useCallback(
    async (gameNotation: string[]): Promise<void> => {
      setGameReviewLoading(true);
      setGameReviewProgress(0);

      if (!stockfishEngine) {
        console.warn("Chess engine unavailable");
        alert("Current Stockfish unsupported, please try changing to lower Stockfish version");
        setGameReviewLoading(false);
        return;
      }

      interface GameState {
        preMovefen: string; 
        preMoveWinRate: number;
        secondOptionWinRate: number | undefined;
        sanBestMove: string | undefined;
        postMovefen: string;
        activePlayer: Color;
        evalMove: number;
        moveNotation: string;
        arrowMove: Move;
        bestMove: string | undefined;
        plyIndex: number;
        openingMatch: boolean;
      }

      try {
        const gameBoard = new Chess();
        const moveEvaluations: MoveAnalysis[] = [];
        const analysisDepth = searchDepth;
        const gameStates: GameState[] = [];
        const moveHistory: string[] = [];

        const totalMoves = gameNotation.length;

        const phase1Weight = 0.95;
        const phase2Weight = 0.05;

        for (let ply = 0; ply < gameNotation.length; ply++) {
          const preMovefen = gameBoard.fen();
          const activePlayer = gameBoard.turn();
          const moveNotation = gameNotation[ply];

          const moveObject = gameBoard.move(moveNotation);

          const postMovefen = gameBoard.fen();
          if (!moveObject) {
            console.error(
              `Illegal move detected: ${moveNotation} at ply ${ply}`
            );
            continue;
          }

          const uciNotation =
            moveObject.from + moveObject.to + (moveObject.promotion || "");
          const sanNotation = moveObject.san;
          moveHistory.push(uciNotation);

          let preMoveWinRate = 0;
          let secondBestWinRate: number | undefined = 0;
          let bestMove;
          let evalMove = 0.0;

          const openingMatch = isFenInAllDatabases(postMovefen);

          if (openingMatch) {
            gameStates.push({
              activePlayer: activePlayer,
              preMoveWinRate: preMoveWinRate,
              secondOptionWinRate: secondBestWinRate,
              preMovefen: preMovefen,
              postMovefen: postMovefen,
              moveNotation: moveNotation,
              arrowMove: moveObject,
              evalMove: evalMove,
              plyIndex: ply,
              bestMove: bestMove,
              sanBestMove: sanNotation,
              openingMatch: true,
            });

            const phase1Progress =
              ((ply + 1) / totalMoves) * phase1Weight * 100;
            setGameReviewProgress(Math.round(phase1Progress));
            continue;
          }

          const chessDbEvals = await fetchChessDBData(preMovefen);
          let sanBestMove;

          if (chessDbEvals.length == 0) {
            const positionAnalysis =
              await stockfishEngine.evaluatePositionWithUpdate({
                fen: preMovefen,
                depth: analysisDepth,
                multiPv: 3,
              });

            preMoveWinRate = evaluationToWinRate(positionAnalysis.lines?.[0]);
            const secondBestEval = positionAnalysis.lines?.[1];
            secondBestWinRate = secondBestEval
              ? evaluationToWinRate(secondBestEval)
              : undefined;
            bestMove = positionAnalysis.bestMove;
            evalMove = positionAnalysis.lines[0].cp || 0;
            const chess = new Chess(preMovefen);
            const moveObjSan = bestMove ? chess.move(bestMove) : undefined;
            sanBestMove = moveObjSan ? moveObjSan.san : undefined;
          } else {
            preMoveWinRate = percentToNumber(chessDbEvals[0].winrate);
            evalMove = Number(chessDbEvals[0].score || 0);
            secondBestWinRate = percentToNumber(chessDbEvals[0].winrate);
            bestMove = chessDbEvals[0].uci;
            sanBestMove = chessDbEvals[0].san;
          }

         
          gameStates.push({
            activePlayer: activePlayer,
            preMoveWinRate: preMoveWinRate,
            secondOptionWinRate: secondBestWinRate,
            preMovefen: preMovefen,
            postMovefen: postMovefen,
            moveNotation: moveNotation,
            plyIndex: ply,
            evalMove: evalMove,
            arrowMove: moveObject,
            bestMove: bestMove,
            sanBestMove: sanBestMove,
            openingMatch: false,
          });

          const phase1Progress = ((ply + 1) / totalMoves) * phase1Weight * 100;
          setGameReviewProgress(Math.round(phase1Progress));
        }

        for (let ply = 0; ply < gameStates.length; ply++) {
          const currentState = gameStates[ply];
          const {
            activePlayer,
            moveNotation,
            plyIndex,
            preMovefen,
            postMovefen,
            preMoveWinRate,
            secondOptionWinRate,
            bestMove,
            openingMatch,
            sanBestMove,
            arrowMove,
            evalMove
          } = currentState;

          if (openingMatch) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              fen: preMovefen,
              notation: moveNotation,
              sanNotation: sanBestMove,
              evalMove,
              currenFen: postMovefen,
              arrowMove: arrowMove,
              quality: "Book",
              player: activePlayer,
            });

            const phase2Progress =
              phase1Weight * 100 +
              ((ply + 1) / gameStates.length) * phase2Weight * 100;
            setGameReviewProgress(Math.round(phase2Progress));
            continue;
          }

          const nextState =
            ply < gameStates.length - 1 ? gameStates[ply + 1] : null;
          const postMoveWinRate = nextState
            ? nextState.preMoveWinRate
            : preMoveWinRate;

          const secondBestWinRate = secondOptionWinRate;

          const isWhitePlaying = activePlayer === "w";
          const playedMove = moveHistory[ply];
          const engineChoice = bestMove;

          if (
            isVeryGoodMove(
              preMoveWinRate,
              postMoveWinRate,
              isWhitePlaying,
              secondBestWinRate
            )
          ) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              notation: moveNotation,
              sanNotation: sanBestMove,
              fen: preMovefen,
              evalMove,
              currenFen: postMovefen,
              arrowMove: arrowMove,
              quality: "Very Good",
              player: activePlayer,
            });

            const phase2Progress =
              phase1Weight * 100 +
              ((ply + 1) / gameStates.length) * phase2Weight * 100;
            setGameReviewProgress(Math.round(phase2Progress));
            continue;
          }

          if (playedMove === engineChoice) {
            moveEvaluations.push({
              plyNumber: plyIndex,
              notation: moveNotation,
              sanNotation: sanBestMove,
              fen: preMovefen,
              quality: "Best",
              evalMove,
              arrowMove: arrowMove,
              currenFen: postMovefen,
              player: activePlayer,
            });

            const phase2Progress =
              phase1Weight * 100 +
              ((ply + 1) / gameStates.length) * phase2Weight * 100;
            setGameReviewProgress(Math.round(phase2Progress));
            continue;
          }

          const qualityRating = assessMoveQuality(
            preMoveWinRate,
            postMoveWinRate,
            isWhitePlaying
          );

          moveEvaluations.push({
            plyNumber: plyIndex,
            notation: moveNotation,
            sanNotation: sanBestMove,
            quality: qualityRating,
            arrowMove: arrowMove,
            fen: preMovefen,
            evalMove,
            currenFen: postMovefen,
            player: activePlayer,
          });

          const phase2Progress =
            phase1Weight * 100 +
            ((ply + 1) / gameStates.length) * phase2Weight * 100;
          setGameReviewProgress(Math.round(phase2Progress));
        }

        console.log("Analysis Complete:", moveEvaluations);
        setGameReview(moveEvaluations);
        setGameReviewProgress(100);
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
    gameReviewProgress,
    setGameReview,
    setGameReviewLoading,
    generateGameReview,
  };
};

export default useGameReview;
