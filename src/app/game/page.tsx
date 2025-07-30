"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Tabs,
  Tab,
  TextField,
  Typography,
  Divider,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { deepPurple, purple, indigo } from "@mui/material/colors";
import {
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
  Info as InfoIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import useAgine from "@/componets/agine/useAgine";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import { TabPanel } from "@/componets/tabs/tab";
import OpeningExplorer from "@/componets/tabs/OpeningTab";
import StockfishAnalysisTab from "@/componets/tabs/StockfishTab";
import ChatTab from "@/componets/tabs/ChatTab";
import { useSession } from "@clerk/nextjs";
import { ChessDBDisplay } from "@/componets/tabs/Chessdb";
import UserGameSelect from "@/componets/lichess/UserGameSelect";
import UserPGNUploader from "@/componets/lichess/UserPGNUpload";
import GameInfoTab from "@/componets/tabs/GameInfoTab";
import PGNView from "@/componets/tabs/PgnView";

// Custom theme colors
const purpleTheme = {
  primary: deepPurple[500],
  primaryDark: deepPurple[700],
  secondary: purple[400],
  accent: indigo[300],
  background: {
    main: "#1a0d2e",
    paper: "#2d1b3d",
    card: "#3e2463",
    input: "#4a2c5a",
  },
  text: {
    primary: "#e1d5f0",
    secondary: "#b39ddb",
    accent: "#ce93d8",
  },
};

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
  const strippedHeaders = pgn.replace(/\[.*?\]\s*/g, "");
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

function getValidGameId(url: string): string {
  if (!url) return "";

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const gameIdMatch = pathname.match(/^\/([a-zA-Z0-9]{8,12})(?:\/|$)/);

    if (gameIdMatch) {
      let gameId = gameIdMatch[1];
      if (gameId.length > 8) {
        gameId = gameId.substring(0, 8);
      }
      return gameId;
    }

    return "";
  } catch (error) {
    console.log(error);
    const parts = url.split("/");
    if (parts.length >= 4) {
      const gameId = parts[3];
      const cleanGameId = gameId.split(/[?#]/)[0];
      return cleanGameId.substring(0, 8);
    }

    return "";
  }
}

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
  const [activeAnalysisTab, setActiveAnalysisTab] = useState(0);

  const {
    setLlmAnalysisResult,
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    openingData,
    setOpeningData,
    llmLoading,
    stockfishLoading,
    lichessOpeningData,
    lichessOpeningLoading,
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
    abortChatMessage,
    handleMoveCoachClick,
    handleGameReviewSummaryClick,
    chessdbdata,
  } = useAgine(fen);

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

  if (!session.isLoaded) {
    return (
      <Box
        sx={{
          p: 4,
          display: "flex",
          justifyContent: "center",
          backgroundColor: purpleTheme.background.main,
          minHeight: "100vh",
        }}
      >
        <CircularProgress sx={{ color: purpleTheme.accent }} />
      </Box>
    );
  }

  if (!session.isSignedIn) {
    return (
      <Box
        sx={{
          p: 4,
          display: "flex",
          justifyContent: "center",
          backgroundColor: purpleTheme.background.main,
          minHeight: "100vh",
        }}
      >
        <Typography variant="h6" sx={{ color: purpleTheme.text.primary }}>
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
    setStockfishAnalysisResult(null);
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
    <Box
      sx={{
        p: 4,
        backgroundColor: purpleTheme.background.main,
        minHeight: "100vh",
      }}
    >
      {inputsVisible && (
        <Card
          sx={{
            mb: 4,
            backgroundColor: purpleTheme.background.paper,
            borderRadius: 3,
            boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Typography
                variant="h3"
                gutterBottom
                sx={{
                  color: purpleTheme.text.primary,
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${purpleTheme.accent}, ${purpleTheme.secondary})`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Chess Analysis with Agine
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: purpleTheme.text.secondary,
                  mb: 3,
                  maxWidth: 600,
                  mx: "auto",
                }}
              >
                Get detailed AI insights on your games! Paste your PGN, Lichess
                game URL, or study URL to begin analysis.
              </Typography>
            </Box>

            <Stack spacing={3}>
              {/* Lichess Study Section */}
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
                  <AnalyticsIcon sx={{ mr: 1 }} />
                  Lichess Study
                </Typography>
                <TextField
                  fullWidth
                  label="Paste Lichess Study URL"
                  value={studyUrl}
                  onChange={(e) => setStudyUrl(e.target.value)}
                  placeholder="https://lichess.org/study/GuglnqGD"
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
                  sx={{
                    backgroundColor: purpleTheme.primary,
                    "&:hover": { backgroundColor: purpleTheme.primaryDark },
                    borderRadius: 2,
                    py: 1.5,
                    textTransform: "none",
                    fontSize: "1rem",
                  }}
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
                    setPgnText(parsed[0].pgn);
                    setTimeout(() => loadPGN(), 0);
                    setInputsVisible(false);
                  }}
                >
                  Load Study
                </Button>
              </Box>

              <Divider sx={{ borderColor: purpleTheme.secondary }} />

              {/* Lichess Game Section */}
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
                  <PlayIcon sx={{ mr: 1 }} />
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
                  startIcon={
                    loadingGame ? <CircularProgress size={20} /> : null
                  }
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

              <Divider sx={{ borderColor: purpleTheme.secondary }} />

              {/* PGN Section */}
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
                  <UploadIcon sx={{ mr: 1 }} />
                  Direct PGN Input
                </Typography>
                <TextField
                  multiline
                  minRows={4}
                  label="Paste PGN Here"
                  fullWidth
                  value={pgnText}
                  onChange={(e) => setPgnText(e.target.value)}
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
                  placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
                  slotProps={{
                    input: { sx: { color: purpleTheme.text.primary } },
                    inputLabel: { sx: { color: purpleTheme.text.secondary } },
                  }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    loadPGN();
                    setInputsVisible(false);
                  }}
                  sx={{
                    backgroundColor: purpleTheme.primary,
                    "&:hover": { backgroundColor: purpleTheme.primaryDark },
                    borderRadius: 2,
                    py: 1.5,
                    textTransform: "none",
                    fontSize: "1rem",
                  }}
                >
                  Load PGN
                </Button>
              </Box>

              <Divider sx={{ borderColor: purpleTheme.secondary }} />

              {/* User Games Section */}
              <Box>
                <Typography
                  variant="h6"
                  sx={{ color: purpleTheme.text.accent, mb: 2 }}
                >
                  Your Lichess Games
                </Typography>
                <UserGameSelect loadPGN={loadUserPGN} />
                <Box sx={{ mt: 2 }}>
                  <UserPGNUploader loadPGN={loadUserPGN} />
                </Box>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={4}>
        {!inputsVisible && (
          <Box sx={{ flex: "0 0 auto" }}>
            <Stack spacing={3} alignItems="center">
              <AiChessboardPanel
                game={game}
                fen={fen}
                moveSquares={moveSquares}
                engine={engine}
                setMoveSquares={setMoveSquares}
                setFen={setFen}
                setGame={setGame}
                reviewMove={gameReview[currentMoveIndex]}
                gameReviewMode={true}
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

              <PGNView
                moves={moves}
                moveAnalysis={gameReview}
                goToMove={goToMove}
                currentMoveIndex={currentMoveIndex}
              />

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
                startIcon={<RefreshIcon />}
                sx={{
                  borderColor: purpleTheme.secondary,
                  color: purpleTheme.text.primary,
                  "&:hover": {
                    borderColor: purpleTheme.accent,
                    backgroundColor: `${purpleTheme.accent}20`,
                  },
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  textTransform: "none",
                }}
              >
                Load New Game
              </Button>
            </Stack>
          </Box>
        )}

        {!inputsVisible && (
          <Box sx={{ flex: 1 }}>
            <Stack spacing={3}>
              {chapters.length > 0 && (
                <Card
                  sx={{
                    backgroundColor: purpleTheme.background.paper,
                    borderRadius: 3,
                    boxShadow: `0 4px 20px rgba(138, 43, 226, 0.1)`,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{ color: purpleTheme.text.primary, mb: 2 }}
                    >
                      Study Chapters
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {chapters.map((ch, index) => (
                        <Chip
                          key={index}
                          label={ch.title}
                          onClick={() => {
                            setPgnText(ch.pgn);
                            setTimeout(() => loadPGN(), 0);
                          }}
                          sx={{
                            backgroundColor: purpleTheme.background.card,
                            color: purpleTheme.text.primary,
                            "&:hover": {
                              backgroundColor: purpleTheme.secondary,
                            },
                            borderRadius: 2,
                            mb: 1,
                          }}
                        />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {moves.length > 0 && (
                <Card
                  sx={{
                    backgroundColor: purpleTheme.background.paper,
                    borderRadius: 3,
                    boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
                    minHeight: 500,
                  }}
                >
                  <Box
                    sx={{
                      borderBottom: `1px solid ${purpleTheme.secondary}40`,
                      px: 3,
                      pt: 2,
                    }}
                  >
                    <Tabs
                      value={analysisTab}
                      onChange={(_, newValue) => setAnalysisTab(newValue)}
                      sx={{
                        "& .MuiTab-root": {
                          color: purpleTheme.text.secondary,
                          textTransform: "none",
                          fontSize: "1rem",
                          fontWeight: 500,
                          minHeight: 48,
                        },
                        "& .Mui-selected": {
                          color: `${purpleTheme.accent} !important`,
                          fontWeight: 600,
                        },
                        "& .MuiTabs-indicator": {
                          backgroundColor: purpleTheme.accent,
                          height: 3,
                          borderRadius: 2,
                        },
                      }}
                    >
                      <Tab
                        icon={<AnalyticsIcon />}
                        iconPosition="start"
                        label="Analysis"
                      />
                      <Tab
                        icon={<ChatIcon />}
                        iconPosition="start"
                        label="AI Chat"
                      />
                      
                    </Tabs>
                  </Box>

                  <Box sx={{ p: 3 }}>
                    <TabPanel value={analysisTab} index={0}>
                      <Stack spacing={3}>
                        {/* Stockfish Analysis */}
                        <Accordion
                          expanded={activeAnalysisTab === 0}
                          onChange={() =>
                            setActiveAnalysisTab(
                              activeAnalysisTab === 0 ? -1 : 0
                            )
                          }
                          sx={{
                            backgroundColor: purpleTheme.background.card,
                            "&:before": { display: "none" },
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          <AccordionSummary
                            expandIcon={
                              <ExpandMoreIcon
                                sx={{ color: purpleTheme.text.primary }}
                              />
                            }
                            sx={{
                              backgroundColor: purpleTheme.background.card,
                              "&:hover": {
                                backgroundColor: `${purpleTheme.secondary}20`,
                              },
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                color: purpleTheme.text.primary,
                                fontWeight: 600,
                              }}
                            >
                              Game Review
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails
                            sx={{
                              backgroundColor: purpleTheme.background.paper,
                            }}
                          >
                            <GameInfoTab
                              moves={moves}
                              currentMoveIndex={currentMoveIndex}
                              goToMove={goToMove}
                              comment={comment}
                              gameInfo={gameInfo}
                              generateGameReview={generateGameReview}
                              gameReviewLoading={gameReviewLoading}
                              gameReviewProgress={gameReviewProgress}
                              handleGameReviewClick={
                                handleGameReviewSummaryClick
                              }
                              handleMoveAnnontateClick={
                                handleMoveAnnontateClick
                              }
                              handleMoveCoachClick={handleMoveCoachClick}
                              chatLoading={chatLoading}
                              gameReview={gameReview}
                            />
                          </AccordionDetails>
                        </Accordion>
                        <Accordion
                          expanded={activeAnalysisTab === 1}
                          onChange={() =>
                            setActiveAnalysisTab(
                              activeAnalysisTab === 1 ? -1 : 1
                            )
                          }
                          sx={{
                            backgroundColor: purpleTheme.background.card,
                            "&:before": { display: "none" },
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          <AccordionSummary
                            expandIcon={
                              <ExpandMoreIcon
                                sx={{ color: purpleTheme.text.primary }}
                              />
                            }
                            sx={{
                              backgroundColor: purpleTheme.background.card,
                              "&:hover": {
                                backgroundColor: `${purpleTheme.secondary}20`,
                              },
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                color: purpleTheme.text.primary,
                                fontWeight: 600,
                              }}
                            >
                              Stockfish 17 NNUE Analysis
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails
                            sx={{
                              backgroundColor: purpleTheme.background.paper,
                            }}
                          >
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
                              formatPrincipalVariation={
                                formatPrincipalVariation
                              }
                              setEngineDepth={setEngineDepth}
                              setEngineLines={setEngineLines}
                            />
                          </AccordionDetails>
                        </Accordion>

                        {/* Opening Explorer */}
                        <Accordion
                          expanded={activeAnalysisTab === 2}
                          onChange={() =>
                            setActiveAnalysisTab(
                              activeAnalysisTab === 2 ? -1 : 2
                            )
                          }
                          sx={{
                            backgroundColor: purpleTheme.background.card,
                            "&:before": { display: "none" },
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          <AccordionSummary
                            expandIcon={
                              <ExpandMoreIcon
                                sx={{ color: purpleTheme.text.primary }}
                              />
                            }
                            sx={{
                              backgroundColor: purpleTheme.background.card,
                              "&:hover": {
                                backgroundColor: `${purpleTheme.secondary}20`,
                              },
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                color: purpleTheme.text.primary,
                                fontWeight: 600,
                              }}
                            >
                              Opening Explorer
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails
                            sx={{
                              backgroundColor: purpleTheme.background.paper,
                            }}
                          >
                            <OpeningExplorer
                              openingLoading={openingLoading}
                              openingData={openingData}
                              llmLoading={llmLoading}
                              lichessOpeningData={lichessOpeningData}
                              lichessOpeningLoading={lichessOpeningLoading}
                              handleOpeningMoveClick={handleOpeningMoveClick}
                            />
                          </AccordionDetails>
                        </Accordion>

                        {/* Chess DB */}
                        <Accordion
                          expanded={activeAnalysisTab === 3}
                          onChange={() =>
                            setActiveAnalysisTab(
                              activeAnalysisTab === 3 ? -1 : 3
                            )
                          }
                          sx={{
                            backgroundColor: purpleTheme.background.card,
                            "&:before": { display: "none" },
                            borderRadius: 2,
                            overflow: "hidden",
                          }}
                        >
                          <AccordionSummary
                            expandIcon={
                              <ExpandMoreIcon
                                sx={{ color: purpleTheme.text.primary }}
                              />
                            }
                            sx={{
                              backgroundColor: purpleTheme.background.card,
                              "&:hover": {
                                backgroundColor: `${purpleTheme.secondary}20`,
                              },
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{
                                color: purpleTheme.text.primary,
                                fontWeight: 600,
                              }}
                            >
                              Chess Database
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails
                            sx={{
                              backgroundColor: purpleTheme.background.paper,
                            }}
                          >
                            <ChessDBDisplay
                              data={chessdbdata}
                              analyzeMove={handleMoveClick}
                            />
                          </AccordionDetails>
                        </Accordion>
                      </Stack>
                    </TabPanel>

                    <TabPanel value={analysisTab} index={1}>
                      <ChatTab
                        chatMessages={chatMessages}
                        chatInput={chatInput}
                        puzzleMode={false}
                        setChatInput={setChatInput}
                        gameInfo={pgnText}
                        abortChatMessage={abortChatMessage}
                        currentMove={moves[currentMoveIndex]}
                        sendChatMessage={sendChatMessage}
                        chatLoading={chatLoading}
                        handleChatKeyPress={handleChatKeyPress}
                        clearChatHistory={clearChatHistory}
                        sessionMode={sessionMode}
                        setSessionMode={setSessionMode}
                      />
                    </TabPanel>
                  </Box>
                </Card>
              )}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
