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
  IconButton,
  Divider,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import {
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  User,
  Clock,
  Calendar,
  Trophy,
} from "lucide-react";
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

// Game Info Tab Component (renamed from MovesTab)
function GameInfoTab({
  moves,
  currentMoveIndex,
  goToMove,
  comment,
  gameInfo,
}: {
  moves: string[];
  currentMoveIndex: number;
  goToMove: (index: number) => void;
  comment: string;
  gameInfo: Record<string, string>;
}) {
  const formatTimeControl = (timeControl: string) => {
    const tc = timeControl.split("+");
    const time = tc[0];
    const inc = tc[1];
    const numberTime = parseInt(time);

    return `${Math.round(numberTime / 60)}+${inc}`;
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

      <Divider sx={{ bgcolor: grey[600] }} />

      <Typography variant="h6">Game Navigation</Typography>

      {/* Navigation Controls */}
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="center"
      >
        <IconButton
          onClick={() => goToMove(0)}
          disabled={currentMoveIndex === 0}
          sx={{ color: "wheat" }}
          title="Go to start"
        >
          <SkipBack size={20} />
        </IconButton>

        <IconButton
          onClick={() => goToMove(Math.max(0, currentMoveIndex - 1))}
          disabled={currentMoveIndex === 0}
          sx={{ color: "wheat" }}
          title="Previous move"
        >
          <ChevronLeft size={20} />
        </IconButton>

        <Typography
          variant="body2"
          sx={{ color: "wheat", minWidth: 120, textAlign: "center" }}
        >
          Move {currentMoveIndex} of {moves.length}
        </Typography>

        <IconButton
          onClick={() => goToMove(Math.min(moves.length, currentMoveIndex + 1))}
          disabled={currentMoveIndex === moves.length}
          sx={{ color: "wheat" }}
          title="Next move"
        >
          <ChevronRight size={20} />
        </IconButton>

        <IconButton
          onClick={() => goToMove(moves.length)}
          disabled={currentMoveIndex === moves.length}
          sx={{ color: "wheat" }}
          title="Go to end"
        >
          <SkipForward size={20} />
        </IconButton>
      </Stack>

      {/* Moves List */}
      <Paper
        sx={{
          p: 2,
          maxHeight: 300,
          overflowY: "auto",
          borderRadius: 2,
          backgroundColor: grey[900],
          color: "white",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Moves
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            mt: 1,
          }}
        >
          {moves.map((move, i) => (
            <Box key={i}>
              <Button
                size="small"
                variant={i === currentMoveIndex - 1 ? "contained" : "outlined"}
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
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Comments */}
      <Paper
        sx={{
          p: 2,
          bgcolor: grey[800],
          color: "white",
          borderRadius: 2,
          minHeight: 80,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Comments
        </Typography>
        <Typography>{comment || "Select a move to see comments."}</Typography>
      </Paper>
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
  const [inputsVisible, setInputsVisible] = useState(true);
  const [chapters, setChapters] = useState<
    { title: string; url: string; pgn: string }[]
  >([]);
  const [comment, setComment] = useState("");
  const [gameInfo, setGameInfo] = useState<Record<string, string>>({});

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
    setGameReview,
    generateGameReview,
    gameReviewLoading,
    fetchOpeningData,
    analyzePosition,
    sendChatMessage,
    handleChatKeyPress,
    setMoveSquares,
    clearChatHistory,
    analyzeWithStockfish,
    formatEvaluation,
    formatPrincipalVariation,
    handleEngineLineClick,
    handleOpeningMoveClick,
    handleMoveClick,
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

  return (
    <Box sx={{ p: 4 }}>
      {inputsVisible && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Analyze Your Chess Game with Agine
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "wheat", mb: 1 }}>
            Paste a Lichess Study URL or PGN to load your game and get instant
            move-by-move AI analysis and comments.
          </Typography>
        </Box>
      )}

      {inputsVisible && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
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
                if (!idMatch) return alert("Invalid URL");

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
          </Stack>

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
              analyzePosition={analyzePosition}
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
                  <Tab label="Stockfish Analysis" />
                  <Tab label="AI Chat" />
                  <Tab label="Opening Explorer" />
                  <Tab label="Chess DB" />
                  <Tab label="Game Review" />
                </Tabs>
              </Box>

              <TabPanel value={analysisTab} index={0}>
                <GameInfoTab
                  moves={moves}
                  currentMoveIndex={currentMoveIndex}
                  goToMove={goToMove}
                  comment={comment}
                  gameInfo={gameInfo}
                />
              </TabPanel>

              <TabPanel value={analysisTab} index={1}>
                <Typography variant="h6" gutterBottom>
                  Stockfish Analysis
                </Typography>

                {!stockfishLoading && !stockfishAnalysisResult ? (
                  <Typography sx={{ color: "wheat" }}>
                    Make some moves or paste a FEN and click Stockfish to see
                    engine evaluation with real-time updates.
                  </Typography>
                ) : (
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
                )}
              </TabPanel>

              <TabPanel value={analysisTab} index={2}>
                <ChatTab
                  chatMessages={chatMessages}
                  chatInput={chatInput}
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

              <TabPanel value={analysisTab} index={5}>
                <GameReviewTab
                  gameReview={gameReview}
                  generateGameReview={generateGameReview}
                  moves={moves}
                  gameReviewLoading={gameReviewLoading} // You might want to add this to your useAgine hook
                  goToMove={goToMove}
                  currentMoveIndex={currentMoveIndex}
                />
              </TabPanel>
            </Paper>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
