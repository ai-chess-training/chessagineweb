"use client";

import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  TextField,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import ReactMarkdown from "react-markdown";
import NavBar from "@/componets/Navbar";
import { RiRobot2Line } from "react-icons/ri";
import { FaArrowRotateLeft } from "react-icons/fa6";
import { FaRegArrowAltCircleUp } from "react-icons/fa";

export default function Home() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [customFen, setCustomFen] = useState("");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: string }>(
    {}
  );
  const [isFlipped, setIsFlipped] = useState(false); // ⬅️ NEW

  const safeGameMutate = (modify: (game: Chess) => void) => {
    const newGame = new Chess(game.fen());
    modify(newGame);
    setGame(newGame);
    setFen(newGame.fen());
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

  const analyzePosition = async () => {
    setLoading(true);
    setAnalysisResult(null);
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
      setAnalysisResult(data.message);
    } catch (error) {
      console.error("Error analyzing position:", error);
      setAnalysisResult("Error analyzing position. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomFen = () => {
    try {
      const newGame = new Chess(customFen);
      setGame(newGame);
      setFen(newGame.fen());
      setAnalysisResult(null);
    } catch (error) {
      console.log(error);
      alert("Invalid FEN string.");
    }
  };

  return (
    <>
      <NavBar />
      <Box sx={{ p: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
          {/* Left column */}
          <Stack spacing={2} alignItems="center">
            <Chessboard
              position={fen}
              onPieceDrop={onDrop}
              customSquareStyles={moveSquares}
              boardWidth={500}
              boardOrientation={isFlipped ? "black" : "white"}
            />

            <Button
              variant="contained"
              onClick={analyzePosition}
              disabled={loading}
              startIcon={<RiRobot2Line />}
              fullWidth
            >
              {loading ? "Analyzing..." : "Analyze"}
            </Button>

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

          {/* Right column */}
          <Paper
            elevation={3}
            sx={{
              p: 3,
              flex: 1,
              minHeight: 300,
              color: "white",
              backgroundColor: grey[800],
            }}
          >
            <Typography variant="h6" gutterBottom>
              AI Analysis
            </Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <CircularProgress />
              </Box>
            ) : analysisResult ? (
              <Box sx={{ color: "wheat", fontSize: "0.95rem" }}>
                <ReactMarkdown>{analysisResult}</ReactMarkdown>
              </Box>
            ) : (
              <Typography sx={{ color: "wheat" }}>
                Make some moves or paste a FEN and click Analyze.
              </Typography>
            )}
          </Paper>
        </Stack>
      </Box>
    </>
  );
}
