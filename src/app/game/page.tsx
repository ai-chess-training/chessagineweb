"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import ReactMarkdown from "react-markdown";
import NavBar from "@/componets/Navbar";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { FaRegArrowAltCircleLeft } from "react-icons/fa";
import { RiRobot2Line } from "react-icons/ri";

export default function PGNUploaderPage() {
  const [pgnText, setPgnText] = useState("");
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentMoveIndex > 0) {
        goToMove(currentMoveIndex - 1);
      }
      if (e.key === "ArrowRight" && currentMoveIndex < moves.length) {
        goToMove(currentMoveIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMoveIndex, moves]);

  const loadPGN = () => {
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgnText);

      const moveList = tempGame.history();
      setMoves(moveList);
      setCurrentMoveIndex(0);

      const resetGame = new Chess();
      setGame(resetGame);
      setFen(resetGame.fen());
      setAnalysis(null);
    } catch (err) {
        console.log(err)
      alert("Invalid PGN input");
    }
  };

  const goToMove = (index: number) => {
    const tempGame = new Chess();
    for (let i = 0; i < index; i++) {
      tempGame.move(moves[i]);
    }
    setGame(tempGame);
    setFen(tempGame.fen());
    setCurrentMoveIndex(index);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/Prod/agent/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: `Analyze this ${fen}` }),
        }
      );

      const data = await response.json();
      setAnalysis(data.message);
    } catch (err) {
      console.log(err);
      setAnalysis("Error analyzing position.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavBar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Analyze Game with Agine
        </Typography>

        <TextField
          multiline
          minRows={4}
          label="Paste PGN Here"
          fullWidth
          value={pgnText}
          onChange={(e) => setPgnText(e.target.value)}
          sx={{
            mb: 2,
            backgroundColor: grey[900],
            borderRadius: 1,
          }}
          placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
          slotProps={{
            input: { sx: { color: "wheat" } },
            inputLabel: { sx: { color: "wheat" } },
          }}
        />

        <Button variant="contained" onClick={loadPGN}>
          Load PGN
        </Button>

        {moves.length > 0 && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
            sx={{ mt: 4 }}
          >
            <Stack spacing={2} alignItems="center">
              <Chessboard position={fen} boardWidth={500} />
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={loading}
                startIcon={<RiRobot2Line />}
                fullWidth
              >
                {loading ? "Analyzing..." : "Analyze"}
              </Button>

              <Stack direction="row" spacing={2}>
                <Button
                  onClick={() => goToMove(currentMoveIndex - 1)}
                  disabled={currentMoveIndex === 0}
                  startIcon={<FaRegArrowAltCircleLeft />}
                >
                  Prev
                </Button>
                <Button
                  onClick={() => goToMove(currentMoveIndex + 1)}
                  disabled={currentMoveIndex >= moves.length}
                  endIcon={<FaRegArrowAltCircleRight />}
                >
                  Next
                </Button>
              </Stack>

              <Paper
                sx={{
                  p: 1,
                  backgroundColor: grey[800],
                  color: "wheat",
                  fontFamily: "monospace",
                }}
              >
                {fen}
              </Paper>
            </Stack>

            {/* Right: Move list and analysis */}
            <Stack spacing={2} sx={{ flex: 1 }}>
              <Paper
                sx={{
                  p: 2,
                  maxHeight: 300,
                  overflowY: "auto",
                  backgroundColor: grey[900],
                  color: "white",
                }}
              >
                <Typography variant="h6">Moves</Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mt: 1,
                    maxWidth: "100%",
                    overflowX: "hidden",
                  }}
                >
                  {moves.map((move, i) => (
                    <Button
                      key={i}
                      size="small"
                      variant={
                        i === currentMoveIndex - 1 ? "contained" : "outlined"
                      }
                      onClick={() => goToMove(i + 1)}
                      sx={{
                        minWidth: 50,
                        maxWidth: 80,
                        whiteSpace: "nowrap",
                        px: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${move}` : move}
                    </Button>
                  ))}
                </Box>
              </Paper>

              <Paper
                sx={{
                  p: 2,
                  minHeight: 150,
                  backgroundColor: grey[800],
                  color: "wheat",
                }}
              >
                <Typography variant="h6">AI Analysis</Typography>
                {loading ? (
                  <CircularProgress sx={{ mt: 2 }} />
                ) : analysis ? (
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                ) : (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Click Analyze to get evaluation of this position.
                  </Typography>
                )}
              </Paper>
            </Stack>
          </Stack>
        )}
      </Box>
    </>
  );
}
