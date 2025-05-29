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
} from "react-icons/md";
import { Chessboard } from "react-chessboard";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { useState, useEffect} from "react";
import { Chess, Square } from "chess.js";
import { PositionEval } from "@/stockfish/engine/engine";
import { MasterGames } from "../opening/helper";
import { Arrow } from "react-chessboard/dist/chessboard/types";

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
  game: Chess;
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
  setMoveSquares,
}: AiChessboardPanelProps) {
  const [customFen, setCustomFen] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [showArrows, setShowArrows] = useState(true);
  const [boardSize, setBoardSize] = useState(500);

useEffect(() => {
  const baseGame = new Chess();
  const history: string[] = [baseGame.fen()];

  if (moves && moves.length > 0) {
    for (const move of moves) {
      try {
        baseGame.move(move);
        history.push(baseGame.fen());
      } catch (err) {
        console.log(err)
        console.warn("Invalid move in provided history:", move);
        break;
      }
    }
  }

  const startGame = new Chess(history[0]);

  setGame(startGame);
  setFen(history[0]);
  setMoveHistory(history);
  setCurrentMoveIndex(0);
}, [moves]);

const safeGameMutate = (modify: (game: Chess) => void) => {
  const baseFen = moveHistory[currentMoveIndex]; // always safe now
  const newGame = new Chess(baseFen);
  modify(newGame);

  const newFen = newGame.fen();

  const newHistory = [...moveHistory.slice(0, currentMoveIndex + 1), newFen];
  setGame(newGame);
  setFen(newFen);
  setMoveHistory(newHistory);
  setCurrentMoveIndex(newHistory.length - 1);
  setOpeningData(null);
};

  const onDrop = (source: string, target: string) => {
    let moveMade = false;
    safeGameMutate((game) => {
      const move = game.move({ from: source, to: target, promotion: "q" });
      if (move) moveMade = true;
    });
    setMoveSquares({});
    return moveMade;
  };

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
      // Try to make the move using safeGameMutate
      safeGameMutate((newGame) => {
        try {
          const move = newGame.move({
            from: selectedSquare,
            to: square,
            promotion: "q", // Default to queen promotion, you might want to add promotion selection UI
          });

          if (move) {
            setLlmAnalysisResult(null);
            setStockfishAnalysisResult(null);
            setOpeningData(null);
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

  const goToPreviousMove = () => {
    if (currentMoveIndex > 0) {
      const newFen = moveHistory[currentMoveIndex - 1];
      const newGame = new Chess(newFen);
      setGame(newGame);
      setFen(newFen);
      setCurrentMoveIndex(currentMoveIndex - 1);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  const goToNextMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const newFen = moveHistory[currentMoveIndex + 1];
      const newGame = new Chess(newFen);
      setGame(newGame);
      setFen(newFen);
      setCurrentMoveIndex(currentMoveIndex + 1);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
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
        <Typography variant="body2" sx={{ color: "wheat", mb: 1 }} gutterBottom>
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

      <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
        <Button
          onClick={goToPreviousMove}
          variant="contained"
          color="primary"
          disabled={currentMoveIndex <= 0}
          startIcon={<MdNavigateBefore />}
          fullWidth
        >
          Back
        </Button>
        <Button
          onClick={goToNextMove}
          variant="contained"
          color="primary"
          disabled={currentMoveIndex >= moveHistory.length - 1}
          endIcon={<MdNavigateNext />}
          fullWidth
        >
          Forward
        </Button>
      </Stack>

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
