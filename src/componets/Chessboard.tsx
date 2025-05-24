// components/ChessBoard.tsx
"use client";

import { useState } from "react";
import { Button, TextField, Stack, Paper } from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { FaArrowRotateLeft } from "react-icons/fa6";
import { FaRegArrowAltCircleUp } from "react-icons/fa";

interface ChessBoardProps {
  game: Chess;
  fen: string;
  onPositionChange?: () => void;
}

export default function AiChessBoard({ 
  game, 
  fen, 
  onPositionChange 
}: ChessBoardProps) {
  const [customFen, setCustomFen] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: string }>({});

  const safeGameMutate = (modify: (game: Chess) => void) => {
    const newGame = new Chess(game.fen());
    modify(newGame);
    onGameChange(newGame, newGame.fen());
    onPositionChange?.();
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

  const loadCustomFen = () => {
    try {
      const newGame = new Chess(customFen);
      onPositionChange?.();
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
        customSquareStyles={moveSquares}
        boardWidth={500}
        boardOrientation={isFlipped ? "black" : "white"}
      />

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