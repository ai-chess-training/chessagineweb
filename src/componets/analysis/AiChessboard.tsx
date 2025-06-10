import React, { CSSProperties } from "react";
import {
  Stack,
  Button,
  TextField,
  Paper,
  FormControlLabel,
  Switch,
  Slider,
  Typography,
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

interface AiChessboardPanelProps {
  fen: string;
  moveSquares: { [square: string]: string };
  llmLoading: boolean;
  engine: UciEngine | undefined;
  analyzePosition: () => void;
  analyzeWithStockfish: () => void;
  stockfishLoading: boolean;
  fetchOpeningData: () => void;
  openingLoading: boolean;
  setGame: (chess: Chess) => void;
  setFen: (fen: string) => void;
  setLlmAnalysisResult: (result: string | null) => void;
  setStockfishAnalysisResult: (result: PositionEval | null) => void;
  setOpeningData: (result: MasterGames | null) => void;
  puzzleMode?: boolean;
  onDropPuzzle?: (source: string, target: string) => boolean;
  handleSquarePuzzleClick?: (square: string) => void;
  puzzleCustomSquareStyle?: {
    [square: string]: CSSProperties;
  };
  game: Chess;
  side?: BoardOrientation;
  moves?: string[];
  stockfishAnalysisResult?: PositionEval | null;
  setMoveSquares: (square: { [square: string]: string }) => void;
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
  side,
}: AiChessboardPanelProps) {
  const [customFen, setCustomFen] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [showArrows, setShowArrows] = useState(puzzleMode ? false : true);
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
    setCurrentMoveIndex(0);
  }, [gameHistory, setGame, setFen]);

  // Memoized function to safely mutate game state
  const safeGameMutate = useCallback(
    (modify: (game: Chess) => void) => {
      const baseFen = moveHistory[currentMoveIndex];
      if (!baseFen) return;

      const newGame = new Chess(baseFen);
      modify(newGame);

      const newFen = newGame.fen();
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
    [moveHistory, currentMoveIndex, setGame, setFen, setOpeningData]
  );

  // Memoized clear analysis callback
  const clearAnalysis = useCallback(() => {
    setLlmAnalysisResult(null);
    setStockfishAnalysisResult(null);
    setOpeningData(null);
  }, [setLlmAnalysisResult, setStockfishAnalysisResult, setOpeningData]);

  // Optimized onDrop handler
  const onDrop = useCallback(
    (source: string, target: string) => {
      let moveMade = false;
      safeGameMutate((game) => {
        const move = game.move({ from: source, to: target, promotion: "q" });
        if (move) {
          moveMade = true;
          clearAnalysis();
        }
      });
      setMoveSquares({});
      return moveMade;
    },
    [safeGameMutate, clearAnalysis, setMoveSquares]
  );

  // Memoized arrows calculation
  const customArrows = useMemo((): Arrow[] => {
    if (!showArrows || !stockfishAnalysisResult?.lines) {
      return [];
    }

    const bestLine = stockfishAnalysisResult.lines[0]?.pv;
    if (!bestLine || bestLine.length === 0) {
      return [];
    }

    const move = bestLine[0];
    if (move && move.length >= 4) {
      const from = move.substring(0, 2);
      const to = move.substring(2, 4);
      return [[from as Square, to as Square, "#4caf50"]];
    }

    return [];
  }, [showArrows, stockfishAnalysisResult]);

  // Optimized square click handler
  const handleSquareClick = useCallback(
    (square: string) => {
      // If clicking on the same square, deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      // If a square is already selected and clicking on a legal move target
      if (selectedSquare && legalMoves.includes(square)) {
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

      // Get legal moves for this piece
      const moves = game.moves({ square: square as Square, verbose: true });
      const targetSquares = moves.map((move) => move.to);

      setSelectedSquare(square);
      setLegalMoves(targetSquares);
    },
    [selectedSquare, legalMoves, game, safeGameMutate, clearAnalysis]
  );

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

  return (
    <Stack spacing={2} alignItems="center">
      <Chessboard
        position={fen}
        onPieceDrop={puzzleMode ? onDropPuzzle : onDrop}
        onSquareClick={puzzleMode ? handleSquarePuzzleClick : handleSquareClick}
        allowDragOutsideBoard={false}
        customSquareStyles={
          puzzleMode ? puzzleCustomSquareStyle : customSquareStyles
        }
        customArrows={customArrows}
        boardWidth={boardSize}
        boardOrientation={puzzleMode ? side : isFlipped ? "black" : "white"}
      />

      {/* Board Size Control */}
      <Box sx={{ width: "100%", px: 2 }}>
        <Typography variant="body2" sx={{ color: "wheat", mb: 1 }} gutterBottom>
          Board Size: {boardSize}px
        </Typography>
        <Slider
          value={boardSize}
          onChange={handleBoardSizeChange}
          min={300}
          max={800}
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

      {!puzzleMode ? (
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
          </Paper>{" "}
        </>
      ) : (
        <Divider />
      )}
    </Stack>
  );
}
