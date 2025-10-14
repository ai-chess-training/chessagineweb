import { Box, Typography, Button, TextField } from "@mui/material";
import { useState } from "react";
import { CircularProgress } from "@mui/material";
import { Gamepad } from "@mui/icons-material";
import { purpleTheme } from "@/theme/theme";
import {
  getValidGameId,
  fetchLichessGame,
  extractMovesWithComments,
  extractGameInfo,
} from "@/libs/game/helper";
import { Chess } from "chess.js";
import { MoveAnalysis } from "@/hooks/useGameReview";

export interface ParsedComment {
  move: string;
  comment?: string | undefined;
}

interface LoadLichessGameUrlProp {
  setPgnText: (pgn: string) => void;
  setMoves: (moves: string[]) => void;
  setParsedMovesWithComments: (comments: ParsedComment[]) => void;
  setGameInfo: (info: Record<string, string>) => void;
  setCurrentMoveIndex: (index: number) => void;
  setGame: (game: Chess) => void;
  setFen: (fen: string) => void;
  setComment: (comment: string) => void;
  setGameReview: (review: MoveAnalysis[]) => void;
  generateGameReview: (moves: string[]) => void;
  setLlmAnalysisResult: (result: string | null) => void;
  analyzeGameTheme: (pgn: string) => void;
  setInputsVisible: (view: boolean) => void;
}

function LoadLichessGameUrl({
  setPgnText,
  setMoves,
  setParsedMovesWithComments,
  setGame,
  setGameInfo,
  setGameReview,
  setComment,
  setCurrentMoveIndex,
  setFen,
  setInputsVisible,
  generateGameReview,
  analyzeGameTheme,
  setLlmAnalysisResult,
}: LoadLichessGameUrlProp) {
  const [loadingGame, setLoadingGame] = useState(false);
  const [gameUrl, setGameUrl] = useState("");

  const handleLoadLichessGame = async () => {
    if (!gameUrl.trim()) {
      alert("Please enter a Lichess game URL");
      return;
    }

    const gameId = getValidGameId(gameUrl);
    if (!gameId) {
      alert(
        "Invalid Lichess game URL. Please use a URL like: https://lichess.org/abcdefgh"
      );
      return;
    }

    setLoadingGame(true);
    try {
      const fetchedPgn = await fetchLichessGame(gameId);
      console.log("Fetched PGN:", fetchedPgn);

      try {
        const tempGame = new Chess();
        tempGame.loadPgn(fetchedPgn);
        const moveList = tempGame.history();
        const parsed = extractMovesWithComments(fetchedPgn);
        const info = extractGameInfo(fetchedPgn);

        setPgnText(fetchedPgn);
        setMoves(moveList);
        setParsedMovesWithComments(parsed);
        setGameInfo(info);
        setCurrentMoveIndex(0);

        const resetGame = new Chess();
        setGame(resetGame);
        setFen(resetGame.fen());
        setLlmAnalysisResult(null);
        setComment("");
        setGameReview([]);
        generateGameReview(moveList);
        analyzeGameTheme(fetchedPgn);
        setInputsVisible(false);

        console.log("Game loaded successfully:", {
          moves: moveList.length,
          gameInfo: info,
          white: info.White,
          black: info.Black,
        });
      } catch (pgnError) {
        console.error("Error parsing PGN:", pgnError);
        alert("Invalid PGN data received from Lichess");
      }
    } catch (error) {
      console.error("Error loading Lichess game:", error);
      alert(
        `Could not load game from Lichess: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoadingGame(false);
    }
  };

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          color: purpleTheme.text.accent,
          mb: 2,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Gamepad sx={{ mr: 1 }} />
        Lichess Game
      </Typography>
      <TextField
        fullWidth
        label="Paste Lichess Game URL"
        value={gameUrl}
        onChange={(e) => setGameUrl(e.target.value)}
        placeholder="https://lichess.org/abcdefgh or https://lichess.org/abcdefgh1234"
        sx={{
          backgroundColor: purpleTheme.background.input,
          borderRadius: 2,
          mb: 2,
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: purpleTheme.secondary,
            },
            "&:hover fieldset": {
              borderColor: purpleTheme.accent,
            },
            "&.Mui-focused fieldset": {
              borderColor: purpleTheme.accent,
            },
          },
        }}
        slotProps={{
          inputLabel: { sx: { color: purpleTheme.text.secondary } },
          input: { sx: { color: purpleTheme.text.primary } },
        }}
      />
      <Button
        variant="contained"
        fullWidth
        onClick={handleLoadLichessGame}
        disabled={loadingGame}
        startIcon={loadingGame ? <CircularProgress size={20} /> : null}
        sx={{
          backgroundColor: purpleTheme.primary,
          "&:hover": { backgroundColor: purpleTheme.primaryDark },
          borderRadius: 2,
          py: 1.5,
          textTransform: "none",
          fontSize: "1rem",
        }}
      >
        {loadingGame ? "Loading Game..." : "Load Game"}
      </Button>
    </Box>
  );
}

export default LoadLichessGameUrl;
