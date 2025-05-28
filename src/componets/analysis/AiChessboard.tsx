import React from "react";
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
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { FaArrowRotateLeft } from "react-icons/fa6";
import { FaRegArrowAltCircleUp } from "react-icons/fa";
import { BsArrowsMove } from "react-icons/bs";
import {
  MdNavigateBefore,
  MdNavigateNext,
  MdSkipPrevious,
  MdSkipNext,
} from "react-icons/md";
import { Chessboard } from "react-chessboard";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { useState, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { PositionEval } from "@/stockfish/engine/engine";
import { MasterGames } from "../opening/helper";
import { Arrow } from "react-chessboard/dist/chessboard/types";

interface AiChessboardPanelProps {
  fen: string;
  onDrop?: (
    sourceSquare: string,
    targetSquare: string,
    piece: string
  ) => boolean;
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
  game: Chess;
  moves?: string[];
  stockfishAnalysisResult?: PositionEval | null;
}

export default function AiChessboardPanel({
  fen,
  onDrop,
  moveSquares,
  setGame,
  setFen,
  setLlmAnalysisResult,
  setStockfishAnalysisResult,
  setOpeningData,
  game,
  moves,
  stockfishAnalysisResult,
}: AiChessboardPanelProps) {
  const [customFen, setCustomFen] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [showArrows, setShowArrows] = useState(true);
  const [boardSize, setBoardSize] = useState(500);

  // Update move history when game changes
  useEffect(() => {
    const history = game.history();
    setMoveHistory(history);
    setCurrentMoveIndex(history.length - 1);
  }, [game]);

  // Clear selection when position changes
  useEffect(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [fen]);

  // Keyboard navigation for moves
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!moves || moveHistory.length === 0) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (currentMoveIndex > -1) {
          goToMove(currentMoveIndex - 1);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (currentMoveIndex < moveHistory.length - 1) {
          goToMove(currentMoveIndex + 1);
        }
        break;
      case 'Home':
        event.preventDefault();
        goToFirstMove();
        break;
      case 'End':
        event.preventDefault();
        goToLastMove();
        break;
    }
  }, [currentMoveIndex, moveHistory.length, moves]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Convert UCI moves to arrow format for the chessboard
  const getCustomArrows = () => {
    if (!showArrows || !stockfishAnalysisResult?.lines) {
      return [];
    }

    const arrows: Arrow[] = [];
    const bestLine = stockfishAnalysisResult.lines[0]?.pv;
    if (!bestLine || bestLine.length === 0) {
      return [];
    }

    const move = bestLine[0];
    if (move && move.length >= 4) {
      const from = move.substring(0, 2);
      const to = move.substring(2, 4);

      arrows.push([from as Square, to as Square, "#4caf50"]);
    }

    return arrows;
  };

  const handleSquareClick = (square: string) => {
    // If clicking on the same square, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // If a square is already selected and clicking on a legal move target
    if (selectedSquare && legalMoves.includes(square)) {
      // Try to make the move
      try {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: "q", // Default to queen promotion, you might want to add promotion selection UI
        });

        if (move) {
          setGame(new Chess(game.fen()));
          setFen(game.fen());
          setLlmAnalysisResult(null);
          setStockfishAnalysisResult(null);
          setOpeningData(null);
        }
      } catch (error) {
        console.log("Invalid move:", error);
      }

      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Check if the clicked square has a piece
    const piece = game.get(square as Square);
    if (!piece) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Check if it's the correct player's turn
    if (piece.color !== game.turn()) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    // Get legal moves for this piece
    const moves = game.moves({ square: square as Square, verbose: true });
    const targetSquares = moves.map((move) => move.to);

    setSelectedSquare(square);
    setLegalMoves(targetSquares);
  };

  // Create custom square styles combining moveSquares with legal move highlighting
  const getCustomSquareStyles = () => {
    const styles: { [square: string]: React.CSSProperties } = {};

    // Copy existing moveSquares styles
    Object.keys(moveSquares).forEach((square) => {
      styles[square] = { backgroundColor: moveSquares[square] };
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
      if (piece) {
        // Target square has an enemy piece (capture)
        styles[square] = {
          background:
            "radial-gradient(circle, rgba(255,0,0,0.8) 85%, transparent 85%)",
          ...styles[square],
        };
      } else {
        // Empty target square
        styles[square] = {
          background:
            "radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)",
          ...styles[square],
        };
      }
    });

    return styles;
  };

  const loadCustomFen = () => {
    try {
      const newGame = new Chess(customFen);
      setGame(newGame);
      setFen(newGame.fen());
      setLlmAnalysisResult(null);
      setStockfishAnalysisResult(null);
      setOpeningData(null);
    } catch (error) {
      console.log(error);
      alert("Invalid FEN string.");
    }
  };

  const goToMove = (index: number) => {
    if (moves) {
      const tempGame = new Chess();
      for (let i = 0; i <= index; i++) {
        tempGame.move(moves[i]);
      }
      setGame(tempGame);
      setFen(tempGame.fen());
      setCurrentMoveIndex(index);
    }
  };

  const goToFirstMove = () => {
    const tempGame = new Chess();
    setGame(tempGame);
    setFen(tempGame.fen());
    setCurrentMoveIndex(-1);
  };

  const goToPreviousMove = () => {
    if (currentMoveIndex > -1) {
      goToMove(currentMoveIndex - 1);
    }
  };

  const goToNextMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const goToLastMove = () => {
    if (moveHistory.length > 0) {
      goToMove(moveHistory.length - 1);
    }
  };

  const isAtStart = currentMoveIndex === -1;
  const isAtEnd = currentMoveIndex === moveHistory.length - 1;
  const hasHistory = moveHistory.length > 0;

  return (
    <Stack spacing={2} alignItems="center">
      <Chessboard
        position={fen}
        onPieceDrop={onDrop}
        onSquareClick={handleSquareClick}
        allowDragOutsideBoard={false}
        customSquareStyles={getCustomSquareStyles()}
        customArrows={getCustomArrows()}
        boardWidth={boardSize}
        boardOrientation={isFlipped ? "black" : "white"}
      />

      {/* Board Size Control */}
      <Box sx={{ width: "100%", px: 2 }}>
        <Typography 
          variant="body2" 
          sx={{ color: "wheat", mb: 1 }}
          gutterBottom
        >
          Board Size: {boardSize}px
        </Typography>
        <Slider
          value={boardSize}
          onChange={(_, newValue) => setBoardSize(newValue as number)}
          min={300}
          max={800}
          step={25}
          valueLabelDisplay="auto"
          sx={{
            color: "wheat",
            '& .MuiSlider-thumb': {
              backgroundColor: "wheat",
            },
            '& .MuiSlider-track': {
              backgroundColor: "wheat",
            },
            '& .MuiSlider-rail': {
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
            onChange={(e) => setShowArrows(e.target.checked)}
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

      {/* Move Navigation Controls */}
      {hasHistory && moves && (
        <Stack direction="column" spacing={1} sx={{ width: "100%" }}>
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            <Button
              variant="outlined"
              onClick={goToFirstMove}
              disabled={isAtStart}
              startIcon={<MdSkipPrevious />}
              size="small"
            >
              Start
            </Button>
            <Button
              variant="outlined"
              onClick={goToPreviousMove}
              disabled={isAtStart}
              startIcon={<MdNavigateBefore />}
              size="small"
            >
              Previous
            </Button>
            <Paper
              sx={{
                px: 2,
                py: 0.5,
                display: "flex",
                alignItems: "center",
                backgroundColor: grey[700],
                color: "wheat",
                fontSize: "0.875rem",
                minWidth: "80px",
                justifyContent: "center",
              }}
            >
              {currentMoveIndex + 1} / {moveHistory.length}
            </Paper>
            <Button
              variant="outlined"
              onClick={goToNextMove}
              disabled={isAtEnd}
              endIcon={<MdNavigateNext />}
              size="small"
            >
              Next
            </Button>
            <Button
              variant="outlined"
              onClick={goToLastMove}
              disabled={isAtEnd}
              endIcon={<MdSkipNext />}
              size="small"
            >
              End
            </Button>
          </Stack>
          
          {/* Keyboard Navigation Hint */}
          <Typography 
            variant="caption" 
            sx={{ 
              color: grey[400], 
              textAlign: "center",
              fontSize: "0.75rem"
            }}
          >
            Use ← → arrow keys to navigate moves, Home/End for start/end
          </Typography>
        </Stack>
      )}

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
          onClick={() => setIsFlipped(!isFlipped)}
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
    </Stack>
  );
}
