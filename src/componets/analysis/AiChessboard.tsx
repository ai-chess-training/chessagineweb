import React, { CSSProperties } from "react";
import {
  Stack,
  Button,
  TextField,
  Paper,
  FormControlLabel,
  Switch,
  Slider,
  Box,
  Divider,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { FaArrowRotateLeft } from "react-icons/fa6";
import { FaRegArrowAltCircleUp } from "react-icons/fa";
import { BsArrowsMove } from "react-icons/bs";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";
import { Chessboard } from "react-chessboard";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Chess, Square } from "chess.js";
import { PositionEval } from "@/stockfish/engine/engine";
import { MasterGames } from "../opening/helper";
import {
  Arrow,
  BoardOrientation,
} from "react-chessboard/dist/chessboard/types";
import { MoveAnalysis } from "../agine/useGameReview";
import { getMoveClassificationStyle } from "../tabs/GameReviewTab";

interface AiChessboardPanelProps {
  fen: string;
  moveSquares: { [square: string]: string };
  llmLoading: boolean;
  engine: UciEngine | undefined;
  analyzeWithStockfish: () => void;
  stockfishLoading: boolean;
  fetchOpeningData: () => void;
  openingLoading: boolean;
  setGame: (chess: Chess) => void;
  setFen: (fen: string) => void;
  setLlmAnalysisResult: (result: string | null) => void;
  setStockfishAnalysisResult: (result: PositionEval | null) => void;
  gameReviewMoveIndex?: number;
  setOpeningData: (result: MasterGames | null) => void;
  puzzleMode?: boolean;
  playMode?: boolean;
  onDropPuzzle?: (source: string, target: string) => boolean;
  handleSquarePuzzleClick?: (square: string) => void;
  reviewMove?: MoveAnalysis;
  puzzleCustomSquareStyle?: {
    [square: string]: CSSProperties;
  };
  game: Chess;
  side?: BoardOrientation;
  moves?: string[];
  stockfishAnalysisResult?: PositionEval | null;
  setMoveSquares: (square: { [square: string]: string }) => void;
  // Play mode specific props
  gameStatus?: string;
  playerSide?: "white" | "black";
  engineThinking?: boolean;
}

export default function AiChessboardPanel({
  fen,
  moveSquares,
  setGame,
  setFen,
  setLlmAnalysisResult,
  setStockfishAnalysisResult,
  setOpeningData,
  game,
  moves,
  stockfishAnalysisResult,
  puzzleMode,
  onDropPuzzle,
  handleSquarePuzzleClick,
  setMoveSquares,
  puzzleCustomSquareStyle,
  reviewMove,
  gameReviewMoveIndex,
  side,
  playMode,
  gameStatus = "waiting",
  playerSide = "white",
  engineThinking = false,
}: AiChessboardPanelProps) {
  const [customFen, setCustomFen] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [showArrows, setShowArrows] = useState(
    puzzleMode || playMode ? false : true
  );
  const [boardSize, setBoardSize] = useState(550);

  // Memoize the initial game setup to avoid recalculation
  const gameHistory = useMemo(() => {
    const baseGame = new Chess();
    const history: string[] = [baseGame.fen()];

    if (moves && moves.length > 0) {
      for (const move of moves) {
        try {
          baseGame.move(move);
          history.push(baseGame.fen());
        } catch (err) {
          console.log(err);
          console.warn("Invalid move in provided history:", move);
          break;
        }
      }
    }

    return history;
  }, [moves]);

  // Effect to update game state when moves change
  useEffect(() => {
    const startGame = new Chess(gameHistory[0]);

    setGame(startGame);
    setFen(gameHistory[0]);
    setMoveHistory(gameHistory);
    setCurrentMoveIndex(gameHistory.length - 1); // Start at the end of the loaded game
  }, [gameHistory, setGame, setFen]);

  // Fixed function to safely mutate game state with proper branching
  const safeGameMutate = useCallback(
    (modify: (game: Chess) => void) => {
      // Use the current FEN that's being displayed, not from moveHistory
      const currentFen = fen;
      if (!currentFen) return;

      const newGame = new Chess(currentFen);
      modify(newGame);

      const newFen = newGame.fen();
      
      // Create a new branch from the current position
      // Keep all moves up to the current position, then add the new move
      const newHistory = [
        ...moveHistory.slice(0, currentMoveIndex + 1),
        newFen,
      ];

      setGame(newGame);
      setFen(newFen);
      setMoveHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);
      setOpeningData(null);
    },
    [fen, moveHistory, currentMoveIndex, setGame, setFen, setOpeningData]
  );

  // Memoized clear analysis callback
  const clearAnalysis = useCallback(() => {
    setLlmAnalysisResult(null);
    setStockfishAnalysisResult(null);
    setOpeningData(null);
  }, [setLlmAnalysisResult, setStockfishAnalysisResult, setOpeningData]);

  // Check if player can move in play mode
  const canPlayerMove = useCallback(() => {
    if (!playMode || gameStatus !== "playing") return true;
    
    const currentTurn = game.turn();
    return (
      (side === "white" && currentTurn === "w") ||
      (side === "black" && currentTurn === "b")
    ) && !engineThinking;
  }, [playMode, gameStatus, game, playerSide, engineThinking]);

  // Custom onDrop handler for gameplay
  const handlePlayerMove = useCallback(
    (source: string, target: string) => {
      if (playMode) {
        if (!canPlayerMove()) return false;

        try {
          const move = game.move({
            from: source,
            to: target,
            promotion: "q", // Auto-promote to queen for simplicity
          });

          if (move) {
            const newGame = new Chess(game.fen());
            setGame(newGame);
            setFen(newGame.fen());
            setSelectedSquare(null);
            setLegalMoves([]);
            setMoveSquares({});
            return true;
          }
        } catch (error) {
          console.log("Invalid move:", error);
        }
        return false;
      } else {
        // Original logic for non-play mode with fixed branching
        let moveMade = false;
        safeGameMutate((gameInstance) => {
          const move = gameInstance.move({ from: source, to: target, promotion: "q" });
          if (move) {
            moveMade = true;
            clearAnalysis();
          }
        });
        setMoveSquares({});
        return moveMade;
      }
    },
    [playMode, canPlayerMove, game, setGame, setFen, setMoveSquares, safeGameMutate, clearAnalysis]
  );

  // Optimized square click handler for both play mode and regular mode
  const handleSquareClick = useCallback(
    (square: string) => {
      // // In play mode, check if player can move
      // if (playMode && !canPlayerMove()) {
      //   return;
      // }

      // If clicking on the same square, deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // If a square is already selected and clicking on a legal move target
      if (selectedSquare && legalMoves.includes(square)) {
        if (playMode) {
          // In play mode, make the move directly
          try {
            const move = game.move({
              from: selectedSquare,
              to: square,
              promotion: "q",
            });

            if (move) {
              const newGame = new Chess(game.fen());
              setGame(newGame);
              setFen(newGame.fen());
            }
          } catch (error) {
            console.log("Invalid move:", error);
          }
        } else {
          // Regular mode logic with fixed branching
          safeGameMutate((newGame) => {
            try {
              const move = newGame.move({
                from: selectedSquare,
                to: square,
                promotion: "q",
              });

              if (move) {
                clearAnalysis();
              }
            } catch (error) {
              console.log("Invalid move:", error);
            }
          });
        }

        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // Check if the clicked square has a piece
      const piece = game.get(square as Square);
      if (!piece || piece.color !== game.turn()) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // In play mode, only allow selecting player's pieces
      if (playMode) {
        const playerColor = side === "white" ? "w" : "b";
        if (piece.color !== playerColor) {
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
      }

      // Get legal moves for this piece
      const moves = game.moves({ square: square as Square, verbose: true });
      const targetSquares = moves.map((move) => move.to);

      setSelectedSquare(square);
      setLegalMoves(targetSquares);
    },
    [
      playMode,
      canPlayerMove,
      selectedSquare,
      legalMoves,
      game,
      playerSide,
      setGame,
      setFen,
      safeGameMutate,
      clearAnalysis,
    ]
  );

  // Memoized arrows calculation - FIXED VERSION
  const customArrows = useMemo((): Arrow[] => {
    if (!showArrows) {
      return [];
    }

    const arrows: Arrow[] = [];

    // Add review move arrow if present
    if (reviewMove) {
      const reviewArrow: Arrow = [
        reviewMove.arrowMove.from,
        reviewMove.arrowMove.to,
        getMoveClassificationStyle(reviewMove.quality).color,
      ];
      arrows.push(reviewArrow);

      // Only add engine arrow if reviewMove quality is not "Best"
      if (reviewMove.quality !== "Best" && stockfishAnalysisResult?.lines) {
        const bestLine = stockfishAnalysisResult.lines[0]?.pv;
        if (bestLine && bestLine.length > 0) {
          const move = bestLine[0];
          if (move && move.length >= 4) {
            const from = move.substring(0, 2);
            const to = move.substring(2, 4);
            const engineArrow: Arrow = [
              from as Square,
              to as Square,
              "#4caf50",
            ];
            arrows.push(engineArrow);
          }
        }
      }
    } else if (stockfishAnalysisResult?.lines) {
      // Only show engine arrow if no reviewMove is present
      const bestLine = stockfishAnalysisResult.lines[0]?.pv;
      if (bestLine && bestLine.length > 0) {
        const move = bestLine[0];
        if (move && move.length >= 4) {
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const engineArrow: Arrow = [from as Square, to as Square, "#4caf50"];
          arrows.push(engineArrow);
        }
      }
    }

    return arrows;
  }, [showArrows, reviewMove, stockfishAnalysisResult, gameReviewMoveIndex]);

  // Memoized custom square styles
  const customSquareStyles = useMemo(() => {
    const styles: { [square: string]: React.CSSProperties } = {};

    // Copy existing moveSquares styles
    Object.entries(moveSquares).forEach(([square, color]) => {
      styles[square] = { backgroundColor: color };
    });

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
        ...styles[selectedSquare],
      };
    }

    // Highlight legal move squares
    legalMoves.forEach((square) => {
      const piece = game.get(square as Square);
      const background = piece
        ? "radial-gradient(circle, rgba(255,0,0,0.8) 85%, transparent 85%)"
        : "radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)";

      styles[square] = {
        background,
        ...styles[square],
      };
    });

    return styles;
  }, [moveSquares, selectedSquare, legalMoves, game]);

  // Navigation callbacks
  const goToPreviousMove = useCallback(() => {
    if (currentMoveIndex > 0) {
      const newIndex = currentMoveIndex - 1;
      const newFen = moveHistory[newIndex];
      const newGame = new Chess(newFen);

      setGame(newGame);
      setFen(newFen);
      setCurrentMoveIndex(newIndex);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [currentMoveIndex, moveHistory, setGame, setFen]);

  const goToNextMove = useCallback(() => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const newIndex = currentMoveIndex + 1;
      const newFen = moveHistory[newIndex];
      const newGame = new Chess(newFen);

      setGame(newGame);
      setFen(newFen);
      setCurrentMoveIndex(newIndex);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [currentMoveIndex, moveHistory, setGame, setFen]);

  // Load custom FEN callback
  const loadCustomFen = useCallback(() => {
    try {
      const newGame = new Chess(customFen);
      setGame(newGame);
      setFen(newGame.fen());
      // Reset move history to just this position
      setMoveHistory([newGame.fen()]);
      setCurrentMoveIndex(0);
      clearAnalysis();
    } catch (error) {
      console.log(error);
      alert("Invalid FEN string.");
    }
  }, [customFen, setGame, setFen, clearAnalysis]);

  // Flip board callback
  const flipBoard = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  // Board size change callback
  const handleBoardSizeChange = useCallback(
    (_: Event, newValue: number | number[]) => {
      setBoardSize(newValue as number);
    },
    []
  );

  // Arrow toggle callback
  const toggleArrows = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShowArrows(e.target.checked);
  }, []);

  // Navigation button disabled states
  const isPreviousDisabled = currentMoveIndex <= 0;
  const isNextDisabled = currentMoveIndex >= moveHistory.length - 1;

  // Determine board orientation for play mode
  const getBoardOrientation = useCallback(() => {
    if (puzzleMode) return side;
    if (playMode) return side;
    return isFlipped ? "black" : "white";
  }, [puzzleMode, playMode, side, playerSide, isFlipped]);

  return (
    <Stack spacing={2} alignItems="center">
      <Chessboard
        position={fen}
        onPieceDrop={puzzleMode ? onDropPuzzle : handlePlayerMove}
        onSquareClick={
          puzzleMode ? handleSquarePuzzleClick : handleSquareClick
        }
        allowDragOutsideBoard={false}
        animationDuration={600}
        showBoardNotation
        customSquareStyles={
          puzzleMode ? puzzleCustomSquareStyle : customSquareStyles
        }
        customArrows={customArrows}
        boardWidth={boardSize}
        boardOrientation={getBoardOrientation()}
      />

      <Box sx={{ width: "100%", px: 2 }}>
        <Slider
          value={boardSize}
          onChange={handleBoardSizeChange}
          min={300}
          max={650}
          step={25}
          valueLabelDisplay="auto"
          sx={{
            color: "wheat",
            "& .MuiSlider-thumb": {
              backgroundColor: "wheat",
            },
            "& .MuiSlider-track": {
              backgroundColor: "wheat",
            },
            "& .MuiSlider-rail": {
              backgroundColor: grey[600],
            },
          }}
        />
      </Box>

      {/* Board Size Control */}
      {!playMode && (
        <>
          {/* Arrow Toggle Control */}
          <FormControlLabel
            control={
              <Switch
                checked={showArrows}
                onChange={toggleArrows}
                color="primary"
              />
            }
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <BsArrowsMove />
                <span style={{ color: "wheat" }}>Show Analysis Arrows</span>
              </Stack>
            }
            sx={{ alignSelf: "flex-start" }}
          />
        </>
      )}

      {/* Navigation buttons - disabled in play mode during active game */}
       {!playMode && (
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            <Button
              onClick={goToPreviousMove}
              variant="contained"
              color="primary"
              disabled={isPreviousDisabled}
              startIcon={<MdNavigateBefore />}
              fullWidth
            >
              Back
            </Button>
            <Button
              onClick={goToNextMove}
              variant="contained"
              color="primary"
              disabled={isNextDisabled}
              endIcon={<MdNavigateNext />}
              fullWidth
            >
              Forward
            </Button>
          </Stack>
        )}

      {!puzzleMode && !playMode && (
        <>
          <TextField
            label="Paste FEN"
            variant="outlined"
            value={customFen}
            onChange={(e) => setCustomFen(e.target.value)}
            size="small"
            sx={{
              width: "100%",
              backgroundColor: grey[900],
              borderRadius: 1,
            }}
            placeholder="e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            slotProps={{
              input: {
                sx: {
                  color: "wheat",
                },
              },
              inputLabel: {
                sx: {
                  color: "wheat",
                },
              },
            }}
          />
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            <Button
              variant="outlined"
              onClick={loadCustomFen}
              startIcon={<FaRegArrowAltCircleUp />}
              fullWidth
            >
              Load FEN
            </Button>
            <Button
              variant="outlined"
              onClick={flipBoard}
              startIcon={<FaArrowRotateLeft />}
              sx={{ width: "100%" }}
            >
              Flip Board
            </Button>
          </Stack>
          <Paper
            elevation={1}
            sx={{
              p: 1,
              width: "100%",
              color: "wheat",
              backgroundColor: grey[800],
              fontFamily: "monospace",
            }}
          >
            {fen}
          </Paper>
        </>
      )}

      {(puzzleMode || playMode) && <Divider />}
    </Stack>
  );
}