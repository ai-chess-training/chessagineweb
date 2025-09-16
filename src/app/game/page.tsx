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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Alert,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import { useLocalStorage } from "usehooks-ts";
import useAgine from "@/hooks/useAgine";
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
import LegalMoveTab from "@/componets/tabs/LegalMoveTab";
import ResizableChapterSelector from "@/componets/tabs/ChaptersTab";
import {
  extractMovesWithComments,
  extractGameInfo,
  getValidGameId,
  fetchLichessGame,
  parsePgnChapters,
} from "@/libs/game/helper";
import { purpleTheme } from "@/theme/theme";
import { MoveAnalysis } from "@/hooks/useGameReview";

// Types for game review history
interface SavedGameReview {
  id: string;
  gameInfo: Record<string, string>;
  pgn: string;
  gameReview: MoveAnalysis[];
  moves: string[];
  savedAt: string;
  title?: string;
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

  // Game review history state
  const [gameReviewHistory, setGameReviewHistory] = useLocalStorage<
    SavedGameReview[]
  >("chess-game-review-history", []);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

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
    handleMovePGNAnnotateClick,
    chessdbdata,
    loading,
    queueing,
    error,
    refetch,
    requestAnalysis,
    legalMoves,
    handleFutureMoveLegalClick,
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

  // Game review history functions
  const saveGameReview = () => {
    if (!gameReview.length) {
      alert("No game review to save. Please generate a review first.");
      return;
    }
    setSaveDialogOpen(true);
  };

  const handleSaveConfirm = () => {
    const gameTitle = saveTitle.trim() || generateGameTitle();
    const savedGame: SavedGameReview = {
      id: Date.now().toString(),
      gameInfo,
      pgn: pgnText,
      gameReview,
      moves,
      savedAt: new Date().toISOString(),
      title: gameTitle,
    };

    setGameReviewHistory((prev) => [savedGame, ...prev]);
    setSaveDialogOpen(false);
    setSaveTitle("");
    alert("Game review saved successfully!");
  };

  const generateGameTitle = () => {
    const white = gameInfo.White || "Unknown";
    const black = gameInfo.Black || "Unknown";
    const date = gameInfo.Date || new Date().toLocaleDateString();
    return `${white} vs ${black} - ${date}`;
  };

  const loadFromHistory = (savedGame: SavedGameReview) => {
    try {
      setPgnText(savedGame.pgn);
      setMoves(savedGame.moves);
      setGameInfo(savedGame.gameInfo);
      setGameReview(savedGame.gameReview);

      const parsed = extractMovesWithComments(savedGame.pgn);
      setParsedMovesWithComments(parsed);
      setCurrentMoveIndex(0);

      const resetGame = new Chess();
      setGame(resetGame);
      setFen(resetGame.fen());
      setLlmAnalysisResult(null);
      setComment("");

      setHistoryDialogOpen(false);
      setInputsVisible(false);
    } catch (err) {
      console.error("Error loading game from history:", err);
      alert("Error loading saved game");
    }
  };

  const deleteFromHistory = (id: string) => {
    setGameReviewHistory((prev) => prev.filter((game) => game.id !== id));
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  // Function to clean PGN by removing advanced annotations
  const cleanPGN = (pgnText: string) => {
    let cleaned = pgnText;

    // Remove all content within curly braces (annotations like {[%clk 1:00:00]})
    cleaned = cleaned.replace(/\{[^}]*\}/g, "");

    // Remove extra whitespace that might be left behind
    cleaned = cleaned.replace(/\s+/g, " ");

    // Clean up any double spaces around moves
    cleaned = cleaned.replace(/\s+(\d+\.)/g, " $1");

    // Remove any trailing whitespace from lines
    cleaned = cleaned
      .split("\n")
      .map((line: string) => line.trim())
      .join("\n");

    // Remove empty lines between moves (but keep header spacing)
    const lines = cleaned.split("\n");
    let inHeader = true;
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if we're still in the header section
      if (line.startsWith("[") && line.endsWith("]")) {
        result.push(line);
        inHeader = true;
      } else if (line.trim() === "" && inHeader) {
        // Keep empty lines in header section
        result.push(line);
      } else if (line.trim() !== "") {
        // We're in the moves section now
        inHeader = false;
        result.push(line);
      }
      // Skip empty lines in moves section
    }

    return result.join("\n").trim();
  };

  const loadPGN = () => {
    try {
      const tempGame = new Chess();
      const cleanedPGN = cleanPGN(pgnText);
      tempGame.loadPgn(cleanedPGN);
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
              {/* Game Review History Section */}
              {gameReviewHistory.length > 0 && (
                <>
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
                      <HistoryIcon sx={{ mr: 1 }} />
                      Saved Game Reviews
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setHistoryDialogOpen(true)}
                      startIcon={<HistoryIcon />}
                      sx={{
                        borderColor: purpleTheme.secondary,
                        color: purpleTheme.text.primary,
                        "&:hover": {
                          borderColor: purpleTheme.accent,
                          backgroundColor: `${purpleTheme.accent}20`,
                        },
                        borderRadius: 2,
                        py: 1.5,
                        textTransform: "none",
                        fontSize: "1rem",
                      }}
                    >
                      Load from History ({gameReviewHistory.length} saved)
                    </Button>
                  </Box>
                  <Divider sx={{ borderColor: purpleTheme.secondary }} />
                </>
              )}

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
                    if(pgnText !== ''){
                      loadPGN();
                      setInputsVisible(false);
                    }else{
                      alert("Invalid PGN input!")
                    }
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
                gameInfo={gameInfo}
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
                onAnnotateMove={handleMovePGNAnnotateClick}
                gamePgn={pgnText}
                goToMove={goToMove}
                gameResult={gameInfo.Result}
                currentMoveIndex={currentMoveIndex}
              />

              <Stack direction="row" spacing={2}>
                {/* Save Game Review Button */}
                <Button
                  variant="contained"
                  onClick={saveGameReview}
                  startIcon={<SaveIcon />}
                  disabled={!gameReview.length}
                  sx={{
                    backgroundColor: purpleTheme.accent,
                    "&:hover": {
                      backgroundColor: `${purpleTheme.accent}dd`,
                    },
                    "&:disabled": {
                      backgroundColor: purpleTheme.secondary,
                      color: purpleTheme.text.secondary,
                    },
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    textTransform: "none",
                  }}
                >
                  Save Game
                </Button>

                {/* Load New Game Button */}
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
            </Stack>
          </Box>
        )}

        {!inputsVisible && (
          <Box sx={{ flex: 1 }}>
            <Stack spacing={3}>
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
                        {/* Game Review */}
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
                              Stockfish Analysis
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
                              queueing={queueing}
                              error={error}
                              loading={loading}
                              onRefresh={refetch}
                              onRequestAnalysis={requestAnalysis}
                            />
                          </AccordionDetails>
                        </Accordion>

                        <Accordion
                          expanded={activeAnalysisTab === 4}
                          onChange={() =>
                            setActiveAnalysisTab(
                              activeAnalysisTab === 4 ? -1 : 4
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
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Typography
                                variant="h6"
                                sx={{
                                  color: purpleTheme.text.primary,
                                  fontWeight: 600,
                                }}
                              >
                                Legal Move Analysis
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails
                            sx={{
                              backgroundColor: purpleTheme.background.paper,
                            }}
                          >
                            <LegalMoveTab
                              legalMoves={legalMoves}
                              handleFutureMoveLegalClick={
                                handleFutureMoveLegalClick
                              }
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
              {chapters.length > 0 && (
                <ResizableChapterSelector
                  chapters={chapters}
                  onChapterSelect={(pgn) => {
                    setPgnText(pgn);
                    setTimeout(() => loadPGN(), 0);
                  }}
                />
              )}
            </Stack>
          </Box>
        )}
      </Stack>

      {/* Save Game Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: purpleTheme.background.paper,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ color: purpleTheme.text.primary }}>
          Save Game Review
        </DialogTitle>
        <DialogContent>
          <div>
            <Typography
            variant="body2"
            component="div"
            sx={{ color: purpleTheme.text.secondary, mb: 2 }}
          >
            Give your game review a title for easy identification
          </Typography>
          </div>
          
          
          <TextField
            autoFocus
            fullWidth
            label="Game Title"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder={generateGameTitle()}
            sx={{
              mt: 1,
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
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSaveDialogOpen(false)}
            sx={{ color: purpleTheme.text.secondary }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveConfirm}
            variant="contained"
            sx={{
              backgroundColor: purpleTheme.accent,
              "&:hover": { backgroundColor: `${purpleTheme.accent}dd` },
            }}
          >
            Save Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: purpleTheme.background.paper,
              borderRadius: 3,
              maxHeight: "80vh",
            },
          },
        }}
      >
        <DialogTitle sx={{ color: purpleTheme.text.primary }}>
          Saved Game Reviews
        </DialogTitle>
        <DialogContent>
          {gameReviewHistory.length === 0 ? (
            <Alert
              severity="info"
              sx={{
                backgroundColor: `${purpleTheme.accent}20`,
                color: purpleTheme.text.primary,
                "& .MuiAlert-icon": {
                  color: purpleTheme.accent,
                },
              }}
            >
              No saved game reviews yet. Analyze a game and save the review to
              build your history!
            </Alert>
          ) : (
            <List sx={{ width: "100%" }}>
              {gameReviewHistory.map((savedGame) => (
                <ListItem
                  key={savedGame.id}
                  sx={{
                    backgroundColor: purpleTheme.background.card,
                    borderRadius: 2,
                    mb: 1,
                    "&:hover": {
                      backgroundColor: `${purpleTheme.secondary}20`,
                    },
                  }}
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        onClick={() => loadFromHistory(savedGame)}
                        sx={{
                          color: purpleTheme.accent,
                          "&:hover": {
                            backgroundColor: `${purpleTheme.accent}20`,
                          },
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => deleteFromHistory(savedGame.id)}
                        sx={{
                          color: "#f44336",
                          "&:hover": {
                            backgroundColor: "#f4433620",
                          },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <div>
                        <Typography
                        variant="h6"
                        component="div"
                        sx={{
                          color: purpleTheme.text.primary,
                          fontWeight: 600,
                        }}
                      >
                        {savedGame.title}
                      </Typography>
                      </div>
                    }
                    secondary={
                      <Box component="div">
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{ color: purpleTheme.text.secondary, display: "block" }}
                        >
                          Saved: {formatDate(savedGame.savedAt)}
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          {savedGame.gameInfo.Event && (
                            <Chip
                              label={savedGame.gameInfo.Event}
                              size="small"
                              sx={{
                                backgroundColor: `${purpleTheme.accent}30`,
                                color: purpleTheme.text.primary,
                                fontSize: "0.75rem",
                              }}
                            />
                          )}
                          <Chip
                            label={`${
                              savedGame.gameInfo.White || "unknown"
                            } vs ${savedGame.gameInfo.Black || "unknown"}`}
                            size="small"
                            sx={{
                              backgroundColor: `${purpleTheme.accent}30`,
                              color: purpleTheme.text.primary,
                              fontSize: "0.75rem",
                            }}
                          />
                          {savedGame.gameInfo.Result && (
                            <Chip
                              label={`Result: ${savedGame.gameInfo.Result}`}
                              size="small"
                              sx={{
                                backgroundColor: `${purpleTheme.secondary}30`,
                                color: purpleTheme.text.primary,
                                fontSize: "0.75rem",
                              }}
                            />
                          )}
                          <Chip
                            label={`${savedGame.moves.length} moves`}
                            size="small"
                            sx={{
                              backgroundColor: `${purpleTheme.primary}30`,
                              color: purpleTheme.text.primary,
                              fontSize: "0.75rem",
                            }}
                          />
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setHistoryDialogOpen(false)}
            sx={{ color: purpleTheme.text.secondary }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}