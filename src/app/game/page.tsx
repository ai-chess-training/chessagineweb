"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Tabs,
  Tab,
  TextField,
  Typography,
  Divider,
  IconButton,
  LinearProgress,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { User, Clock, Calendar, Trophy, Navigation, SkipBack, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { Chess } from "chess.js";
import useAgine from "@/componets/agine/useAgine";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import { TabPanel } from "@/componets/tabs/tab";
import OpeningExplorer from "@/componets/tabs/OpeningTab";
import StockfishAnalysisTab from "@/componets/tabs/StockfishTab";
import ChatTab from "@/componets/tabs/ChatTab";
import { useSession } from "@clerk/nextjs";
import { ChessDBDisplay } from "@/componets/tabs/Chessdb";
import GameReviewTab from "@/componets/tabs/GameReviewTab";
import { MoveAnalysis } from "@/componets/agine/useGameReview";
import UserGameSelect from "@/componets/lichess/UserGameSelect";
import UserPGNUploader from "@/componets/lichess/UserPGNUpload";


function parsePgnChapters(pgnText: string) {
  const chapterBlocks = pgnText.split(/\n\n(?=\[Event)/);
  return chapterBlocks.map((block) => {
    const title = block.match(/\[ChapterName "(.*)"\]/)?.[1] || "Untitled";
    const url = block.match(/\[ChapterURL "(.*)"\]/)?.[1] || "";
    return { title, url, pgn: block.trim() };
  });
}

function extractMovesWithComments(
  pgn: string
): { move: string; comment?: string }[] {
  const strippedHeaders = pgn.replace(/\[.*?\]\s*/g, ""); // remove PGN tags
  const tokenRegex = /(\{[^}]*\})|(;[^\n]*)|([^\s{};]+)/g;
  const tokens = [...strippedHeaders.matchAll(tokenRegex)];

  const result: { move: string; comment?: string }[] = [];
  let currentComment: string | undefined = undefined;

  for (const match of tokens) {
    const token = match[0];
    if (token.startsWith("{")) {
      currentComment = token.slice(1, -1).trim();
    } else if (token.startsWith(";")) {
      currentComment = token.slice(1).trim();
    } else if (/^[a-hRNBQKO0-9+#=x-]+$/.test(token)) {
      // token is a move (very rough pattern)
      result.push({ move: token, comment: currentComment });
      currentComment = undefined;
    }
  }

  return result;
}

function extractGameInfo(pgn: string) {
  const info: Record<string, string> = {};
  const lines = pgn.split("\n");

  for (const line of lines) {
    const match = line.match(/\[(\w+)\s+"(.*)"\]/);
    if (match) {
      info[match[1]] = match[2];
    }
  }

  return info;
}

// Improved function to extract game ID from Lichess URLs
function getValidGameId(url: string): string {
  if (!url) return "";

  try {
    // Handle various Lichess URL formats
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Extract game ID from different URL patterns:
    // https://lichess.org/abcdefgh
    // https://lichess.org/abcdefgh/white
    // https://lichess.org/abcdefgh/black
    // https://lichess.org/abcdefgh1234
    const gameIdMatch = pathname.match(/^\/([a-zA-Z0-9]{8,12})(?:\/|$)/);

    if (gameIdMatch) {
      let gameId = gameIdMatch[1];

      // If the ID is longer than 8 characters, it might have extra characters
      // Lichess game IDs are typically 8 characters, but can be longer
      if (gameId.length > 8) {
        // Try to extract the base game ID (first 8 characters)
        gameId = gameId.substring(0, 8);
      }

      return gameId;
    }

    return "";
  } catch (error) {
    // If URL parsing fails, try simple string manipulation
    console.log(error);
    const parts = url.split("/");
    if (parts.length >= 4) {
      const gameId = parts[3];
      // Remove any query parameters or fragments
      const cleanGameId = gameId.split(/[?#]/)[0];
      return cleanGameId.substring(0, 8);
    }

    return "";
  }
}

// Function to fetch game PGN from Lichess
async function fetchLichessGame(gameId: string): Promise<string> {
  const response = await fetch(`https://lichess.org/game/export/${gameId}`, {
    headers: {
      Accept: "application/x-chess-pgn",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch game: ${response.status} ${response.statusText}`
    );
  }

  const pgnText = await response.text();

  if (!pgnText || pgnText.trim() === "") {
    throw new Error("Empty PGN received from Lichess");
  }

  return pgnText;
}

// Game Info Tab Component (renamed from MovesTab)
function GameInfoTab({
  moves,
  currentMoveIndex,
  goToMove,
  comment,
  gameInfo,
  generateGameReview,
  gameReviewLoading,
  gameReview,
  handleMoveCoachClick,
  handleMoveAnnontateClick,
  handleGameReviewClick,
  gameReviewProgress,
  chatLoading,
}: {
  moves: string[];
  currentMoveIndex: number;
  goToMove: (index: number) => void;
  comment: string;
  generateGameReview: (moves: string[]) => void;
  gameReviewLoading: boolean;
  gameReview: MoveAnalysis[];
  gameReviewProgress: number;
  gameInfo: Record<string, string>;
  chatLoading: boolean;
  handleMoveCoachClick: (gameReview: MoveAnalysis) => void;
  handleMoveAnnontateClick: (review: MoveAnalysis, customQuery?: string) => void;
  handleGameReviewClick: (gameReview: MoveAnalysis[]) => void;

}) {
  const formatTimeControl = (timeControl: string) => {
    const tc = timeControl.split("+");
    const time = tc[0];
    const inc = tc[1];
    const numberTime = parseInt(time);

    return `${Math.round(numberTime / 60)}+${inc}`;
  };

  const handlePreviousMove = () => {
    if (currentMoveIndex > 0) {
      goToMove(currentMoveIndex - 1);
    }
  };

  const handleNextMove = () => {
    if (currentMoveIndex < moves.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const handleFirstMove = () => {
    goToMove(0);
  };

  const handleLastMove = () => {
    goToMove(moves.length - 1);
  };

  return (
    <Stack spacing={3}>
      {/* Game Information Section */}
      <Paper
        sx={{
          p: 2,
          bgcolor: grey[900],
          color: "white",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Trophy size={20} />
          Game Information
        </Typography>

        <Stack spacing={2}>
          {/* Players */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
            <Stack spacing={0.5} flex={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <User size={16} />
                <Typography variant="subtitle2" sx={{ color: "wheat" }}>
                  Players
                </Typography>
              </Box>
              <Typography variant="body2">
                <strong>White:</strong> {gameInfo.White || "Unknown"}
                {gameInfo.WhiteElo && ` (${gameInfo.WhiteElo})`}
              </Typography>
              <Typography variant="body2">
                <strong>Black:</strong> {gameInfo.Black || "Unknown"}
                {gameInfo.BlackElo && ` (${gameInfo.BlackElo})`}
              </Typography>
            </Stack>
            <Stack spacing={0.5} flex={1}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar size={16} />
                <Typography variant="subtitle2" sx={{ color: "wheat" }}>
                  Game Details
                </Typography>
              </Box>
              {gameInfo.Date && (
                <Typography variant="body2">
                  <strong>Date:</strong> {gameInfo.Date}
                </Typography>
              )}
              {gameInfo.Event && (
                <Typography variant="body2">
                  <strong>Event:</strong> {gameInfo.Event}
                </Typography>
              )}
              {gameInfo.Site && (
                <Typography variant="body2">
                  <strong>Site:</strong> {gameInfo.Site}
                </Typography>
              )}
              {gameInfo.Result && (
                <Typography variant="body2">
                  <strong>Result:</strong> {gameInfo.Result}
                </Typography>
              )}
            </Stack>
          </Stack>

          {/* Time Control */}
          {gameInfo.TimeControl && (
            <Stack spacing={0.5}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Clock size={16} />
                <Typography variant="subtitle2" sx={{ color: "wheat" }}>
                  Time Control
                </Typography>
              </Box>
              <Typography variant="body2">
                {formatTimeControl(gameInfo.TimeControl)}
              </Typography>
            </Stack>
          )}

          {/* Additional Info */}
          {(gameInfo.Opening || gameInfo.ECO) && (
            <Stack spacing={0.5}>
              <Typography variant="subtitle2" sx={{ color: "wheat" }}>
                Opening
              </Typography>
              {gameInfo.ECO && (
                <Typography variant="body2">
                  <strong>ECO:</strong> {gameInfo.ECO}
                </Typography>
              )}
              {gameInfo.Opening && (
                <Typography variant="body2">
                  <strong>Opening:</strong> {gameInfo.Opening}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Move Navigation Section */}
      <Paper
        sx={{
          p: 2,
          bgcolor: grey[900],
          color: "white",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <Navigation size={20} />
          Move Navigation
        </Typography>

        <Stack spacing={2}>
          {/* Navigation Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
            <IconButton
              onClick={handleFirstMove}
              disabled={currentMoveIndex === 0}
              sx={{ 
                color: "white",
                "&:disabled": { color: grey[600] }
              }}
              size="small"
            >
              <SkipBack size={20} />
            </IconButton>
            <IconButton
              onClick={handlePreviousMove}
              disabled={currentMoveIndex === 0}
              sx={{ 
                color: "white",
                "&:disabled": { color: grey[600] }
              }}
              size="small"
            >
              <ChevronLeft size={20} />
            </IconButton>
            <Typography variant="body2" sx={{ mx: 2, minWidth: "120px", textAlign: "center" }}>
              Move {currentMoveIndex + 1} of {moves.length}
            </Typography>
            <IconButton
              onClick={handleNextMove}
              disabled={currentMoveIndex === moves.length - 1}
              sx={{ 
                color: "white",
                "&:disabled": { color: grey[600] }
              }}
              size="small"
            >
              <ChevronRight size={20} />
            </IconButton>
            <IconButton
              onClick={handleLastMove}
              disabled={currentMoveIndex === moves.length - 1}
              sx={{ 
                color: "white",
                "&:disabled": { color: grey[600] }
              }}
              size="small"
            >
              <SkipForward size={20} />
            </IconButton>
          </Box>

          {/* Current Move Display */}
          {moves[currentMoveIndex] && (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="subtitle2" sx={{ color: "wheat", mb: 0.5 }}>
                Current Move
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
                {moves[currentMoveIndex]}
              </Typography>
            </Box>
          )}

          {/* Move Progress Bar */}
          <Box sx={{ width: "100%", px: 1 }}>
            <LinearProgress
              variant="determinate"
              value={moves.length > 0 ? ((currentMoveIndex + 1) / moves.length) * 100 : 0}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: grey[700],
                "& .MuiLinearProgress-bar": {
                  bgcolor: "wheat",
                  borderRadius: 3,
                }
              }}
            />
          </Box>
        </Stack>
      </Paper>

      <Divider sx={{ bgcolor: grey[600] }} />

      {/* Game Review Tab */}
      <GameReviewTab
        gameReview={gameReview}
        generateGameReview={async () => generateGameReview(moves)}
        moves={moves}
        handleMoveCoachClick={handleMoveCoachClick}
        chatLoading={chatLoading}
        gameReviewProgress={gameReviewProgress}
        comment={comment}
        handleMoveAnnontateClick={handleMoveAnnontateClick}
        handleGameReviewClick={handleGameReviewClick}
        gameReviewLoading={gameReviewLoading}
        goToMove={goToMove}
        currentMoveIndex={currentMoveIndex}
      />
    </Stack>
  );
}

export default function PGNUploaderPage() {
  const session = useSession();

  const [pgnText, setPgnText] = useState("");
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [parsedMovesWithComments, setParsedMovesWithComments] = useState<
    { move: string; comment?: string }[]
  >([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [studyUrl, setStudyUrl] = useState("");
  const [gameUrl, setGameUrl] = useState("");
  const [inputsVisible, setInputsVisible] = useState(true);
  const [chapters, setChapters] = useState<
    { title: string; url: string; pgn: string }[]
  >([]);
  const [comment, setComment] = useState("");
  const [gameInfo, setGameInfo] = useState<Record<string, string>>({});
  const [loadingGame, setLoadingGame] = useState(false);

  const {
    setLlmAnalysisResult,
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    openingData,
    setOpeningData,
    llmLoading,
    stockfishLoading,
    openingLoading,
    moveSquares,
    analysisTab,
    setAnalysisTab,
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    sessionMode,
    setSessionMode,
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    engine,
    gameReview,
    gameReviewProgress,
    setGameReview,
    generateGameReview,
    gameReviewLoading,
    fetchOpeningData,
    sendChatMessage,
    handleMoveAnnontateClick,
    handleChatKeyPress,
    setMoveSquares,
    clearChatHistory,
    analyzeWithStockfish,
    formatEvaluation,
    formatPrincipalVariation,
    handleEngineLineClick,
    handleOpeningMoveClick,
    handleMoveClick,
    handleMoveCoachClick,
    handleGameReviewSummaryClick,
    chessdbdata,
  } = useAgine(fen);

  // Move useEffect to before conditional returns
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

  // Show a spinner while session is loading
  if (!session.isLoaded) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // If user is not signed in, redirect them to sign-in page
  if (!session.isSignedIn) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <Typography variant="h6" color="wheat">
          Please sign in to view this page.
        </Typography>
      </Box>
    );
  }

  const loadPGN = () => {
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgnText);
      const moveList = tempGame.history();
      const parsed = extractMovesWithComments(pgnText);
      const info = extractGameInfo(pgnText);

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
    } catch (err) {
      console.log(err);
      alert("Invalid PGN input");
    }
  };

  const loadUserPGN = (pgn: string) => {
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgn);
      const moveList = tempGame.history();
      const parsed = extractMovesWithComments(pgn);
      const info = extractGameInfo(pgn);

      setMoves(moveList);
      setParsedMovesWithComments(parsed);
      setGameInfo(info);
      setCurrentMoveIndex(0);
      setPgnText(pgn);

      const resetGame = new Chess();
      setGame(resetGame);
      setFen(resetGame.fen());
      setLlmAnalysisResult(null);
      setComment("");
      setGameReview([]);
      setInputsVisible(false);
    } catch (err) {
      console.log(err);
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
    setComment(parsedMovesWithComments[index - 1]?.comment || "");
    setLlmAnalysisResult(null);
  };

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
      console.log("Fetched PGN:", fetchedPgn); // Debug log

      // Process the PGN immediately instead of relying on state update
      try {
        const tempGame = new Chess();
        tempGame.loadPgn(fetchedPgn);
        const moveList = tempGame.history();
        const parsed = extractMovesWithComments(fetchedPgn);
        const info = extractGameInfo(fetchedPgn);

        // Update all states
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

        // Hide input section
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
    <Box sx={{ p: 4 }}>
      {inputsVisible && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Analyze Your Chess Game With Agine
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "wheat", mb: 1 }}>
            Get detailed Agine insights on your game! Paste your PGN, Lichess
            game URL, or study URL to begin analysis. You can search your recent
            Lichess games!
          </Typography>
        </Box>
      )}

      {inputsVisible && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Paste Lichess Study URL"
            value={studyUrl}
            onChange={(e) => setStudyUrl(e.target.value)}
            placeholder="https://lichess.org/study/GuglnqGD"
            sx={{ backgroundColor: grey[900], borderRadius: 1 }}
            slotProps={{
              inputLabel: { sx: { color: "wheat" } },
              input: { sx: { color: "wheat" } },
            }}
          />
          <Button
            variant="contained"
            onClick={async () => {
              const idMatch = studyUrl.match(/study\/([a-zA-Z0-9]+)/);
              if (!idMatch) return alert("Invalid study URL");

              const res = await fetch(
                `https://lichess.org/api/study/${idMatch[1]}.pgn`
              );
              const text = await res.text();
              const parsed = parsePgnChapters(text);
              if (parsed.length === 0) return alert("No chapters found");

              setChapters(parsed);
              setPgnText(parsed[0].pgn); // Auto-load first chapter
              setTimeout(() => loadPGN(), 0);
              setInputsVisible(false);
            }}
          >
            Load Study
          </Button>

          <TextField
            fullWidth
            label="Paste Lichess Game URL"
            value={gameUrl}
            onChange={(e) => setGameUrl(e.target.value)}
            placeholder="https://lichess.org/abcdefgh or https://lichess.org/abcdefgh1234"
            sx={{ backgroundColor: grey[900], borderRadius: 1 }}
            slotProps={{
              inputLabel: { sx: { color: "wheat" } },
              input: { sx: { color: "wheat" } },
            }}
          />
          <Button
            variant="contained"
            onClick={handleLoadLichessGame}
            disabled={loadingGame}
            startIcon={loadingGame ? <CircularProgress size={20} /> : null}
          >
            {loadingGame ? "Loading Game..." : "Load Game"}
          </Button>

          <TextField
            multiline
            minRows={4}
            label="Paste PGN Here"
            fullWidth
            value={pgnText}
            onChange={(e) => setPgnText(e.target.value)}
            sx={{
              backgroundColor: grey[900],
              borderRadius: 1,
            }}
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
            slotProps={{
              input: { sx: { color: "wheat" } },
              inputLabel: { sx: { color: "wheat" } },
            }}
          />
          <Button
            variant="contained"
            onClick={() => {
              loadPGN();
              setInputsVisible(false);
            }}
          >
            Load PGN
          </Button>
          <Typography variant="subtitle1" sx={{ color: "wheat" }}>
            Select a game for the given Lichess username
          </Typography>
          <Divider />
          <UserGameSelect loadPGN={loadUserPGN} />
          <Divider />
          <UserPGNUploader loadPGN={loadUserPGN} />
        </Stack>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
        {!inputsVisible && (
          <Stack spacing={2} alignItems="center">
            <AiChessboardPanel
              game={game}
              fen={fen}
              moveSquares={moveSquares}
              engine={engine}
              setMoveSquares={setMoveSquares}
              setFen={setFen}
              setGame={setGame}
              setLlmAnalysisResult={setLlmAnalysisResult}
              setOpeningData={setOpeningData}
              setStockfishAnalysisResult={setStockfishAnalysisResult}
              stockfishAnalysisResult={stockfishAnalysisResult}
              fetchOpeningData={fetchOpeningData}
              analyzeWithStockfish={analyzeWithStockfish}
              llmLoading={llmLoading}
              stockfishLoading={stockfishLoading}
              openingLoading={openingLoading}
            />

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              width="100%"
            >
              <Button
                variant="outlined"
                onClick={() => {
                  setInputsVisible(true);
                  setMoves([]);
                  setPgnText("");
                  setStudyUrl("");
                  setGameUrl("");
                  setGameInfo({});
                  setLlmAnalysisResult(null);
                  setComment("");
                  const reset = new Chess();
                  setGame(reset);
                  setFen(reset.fen());
                }}
                fullWidth
              >
                Load New Game
              </Button>
            </Stack>
          </Stack>
        )}
        <Stack spacing={2} sx={{ flex: 1 }}>
          {!inputsVisible && chapters.length > 0 && (
            <Paper
              sx={{
                p: 2,
                backgroundColor: grey[900],
                borderRadius: 2,
                color: "white",
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Chapters
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {chapters.map((ch, index) => (
                  <Button
                    key={index}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setPgnText(ch.pgn);
                      setTimeout(() => loadPGN(), 0);
                    }}
                    sx={{
                      justifyContent: "start",
                      textTransform: "none",
                      color: "wheat",
                      borderColor: grey[700],
                      fontSize: "0.9rem",
                      px: 1.5,
                      py: 0.5,
                      minWidth: 80,
                    }}
                  >
                    {ch.title}
                  </Button>
                ))}
              </Stack>
            </Paper>
          )}

          {moves.length > 0 && (
            <Paper
              elevation={3}
              sx={{
                p: 3,
                flex: 1,
                minHeight: 300,
                color: "white",
                backgroundColor: grey[800],
                maxHeight: "80vh",
                overflow: "auto",
              }}
            >
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs
                  value={analysisTab}
                  onChange={(_, newValue) => setAnalysisTab(newValue)}
                  sx={{
                    "& .MuiTab-root": { color: "wheat" },
                    "& .Mui-selected": { color: "white !important" },
                  }}
                >
                  <Tab label="Game Info" />
                  <Tab label="AI Chat" />
                  <Tab label="Stockfish Analysis" />
                  <Tab label="Opening Explorer" />
                  <Tab label="Chess DB" />
                </Tabs>
              </Box>

              <TabPanel value={analysisTab} index={0}>
                <GameInfoTab
                  moves={moves}
                  currentMoveIndex={currentMoveIndex}
                  goToMove={goToMove}
                  comment={comment}
                  gameInfo={gameInfo}
                  generateGameReview={generateGameReview}
                  gameReviewLoading={gameReviewLoading}
                  gameReviewProgress={gameReviewProgress}
                  handleGameReviewClick={handleGameReviewSummaryClick}
                  handleMoveAnnontateClick={handleMoveAnnontateClick}
                  handleMoveCoachClick={handleMoveCoachClick}
                  chatLoading={chatLoading}
                  gameReview={gameReview}
                />
              </TabPanel>

              <TabPanel value={analysisTab} index={1}>
                <ChatTab
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  puzzleMode={false}
                  setChatInput={setChatInput}
                  gameInfo={pgnText}
                  currentMove={moves[currentMoveIndex]}
                  sendChatMessage={sendChatMessage}
                  chatLoading={chatLoading}
                  handleChatKeyPress={handleChatKeyPress}
                  clearChatHistory={clearChatHistory}
                  sessionMode={sessionMode}
                  setSessionMode={setSessionMode}
                />
              </TabPanel>

              <TabPanel value={analysisTab} index={2}>
                <Typography variant="h6" gutterBottom>
                  Stockfish 17 NNUE LITE Analysis
                </Typography>
                <StockfishAnalysisTab
                  stockfishAnalysisResult={stockfishAnalysisResult}
                  stockfishLoading={stockfishLoading}
                  handleEngineLineClick={handleEngineLineClick}
                  engineDepth={engineDepth}
                  engineLines={engineLines}
                  engine={engine}
                  llmLoading={llmLoading}
                  analyzeWithStockfish={analyzeWithStockfish}
                  formatEvaluation={formatEvaluation}
                  formatPrincipalVariation={formatPrincipalVariation}
                  setEngineDepth={setEngineDepth}
                  setEngineLines={setEngineLines}
                />
              </TabPanel>

              <TabPanel value={analysisTab} index={3}>
                <Typography variant="h6" gutterBottom>
                  Opening Explorer
                </Typography>
                <OpeningExplorer
                  openingLoading={openingLoading}
                  openingData={openingData}
                  llmLoading={llmLoading}
                  handleOpeningMoveClick={handleOpeningMoveClick}
                />
              </TabPanel>

              <TabPanel value={analysisTab} index={4}>
                <ChessDBDisplay
                  data={chessdbdata}
                  analyzeMove={handleMoveClick}
                />
              </TabPanel>
            </Paper>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
