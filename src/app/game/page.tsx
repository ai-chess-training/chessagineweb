"use client";
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Stack,
  Typography,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import { Refresh as RefreshIcon, Save as SaveIcon } from "@mui/icons-material";
import { Chess } from "chess.js";
import useAgine from "@/hooks/useAgine";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import { useSession } from "@clerk/nextjs";
import UserGameSelect from "@/componets/lichess/UserGameSelect";
import UserPGNUploader from "@/componets/lichess/UserPGNUpload";
import PGNView from "@/componets/tabs/PgnView";
import ResizableChapterSelector from "@/componets/tabs/ChaptersTab";
import { extractMovesWithComments, extractGameInfo } from "@/libs/game/helper";
import { purpleTheme } from "@/theme/theme";
import { useGameTheme } from "@/hooks/useGameTheme";
import Loader from "@/componets/loading/Loader";
import Warning from "@/componets/loading/SignUpWarning";
import SaveGameReviewDialog, {
  SavedGameReview,
} from "@/componets/game/SaveGameReviewDialog";
import GamereviewHistory from "@/componets/game/GameReviewHistory";
import LoadStudy, { Chapter } from "@/componets/game/LoadStudy";
import LoadLichessGameUrl, {
  ParsedComment,
} from "@/componets/game/LoadLichessGameUrl";
import LoadPGNGame from "@/componets/game/LoadPGNGame";
import AgineAnalysisView from "@/componets/analysis/AgineAnalysisView";

export default function PGNUploaderPage() {
  const session = useSession();

  const [pgnText, setPgnText] = useState("");
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [parsedMovesWithComments, setParsedMovesWithComments] = useState<
    ParsedComment[]
  >([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);

  const [inputsVisible, setInputsVisible] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [comment, setComment] = useState("");
  const [gameInfo, setGameInfo] = useState<Record<string, string>>({});

  // Game review history state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
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

  const { gameReviewTheme, analyzeGameTheme } = useGameTheme();

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
      generateGameReview(moveList);
      analyzeGameTheme(cleanedPGN);
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
      generateGameReview(moveList);
      analyzeGameTheme(pgn);
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

  if (!session.isLoaded) {
    return <Loader />;
  }

  if (!session.isSignedIn) {
    return <Warning />;
  }

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
              <GamereviewHistory setHistoryDialogOpen={setHistoryDialogOpen} />

              <LoadStudy
                setChapters={setChapters}
                setInputsVisible={setInputsVisible}
              />

              <Divider sx={{ borderColor: purpleTheme.secondary }} />

              <LoadLichessGameUrl
                setComment={setComment}
                setCurrentMoveIndex={setCurrentMoveIndex}
                setFen={setFen}
                setGame={setGame}
                setGameInfo={setGameInfo}
                setGameReview={setGameReview}
                setInputsVisible={setInputsVisible}
                setMoves={setMoves}
                setParsedMovesWithComments={setParsedMovesWithComments}
                setPgnText={setPgnText}
                setLlmAnalysisResult={setLlmAnalysisResult}
                generateGameReview={generateGameReview}
                analyzeGameTheme={analyzeGameTheme}
              />

              <Divider sx={{ borderColor: purpleTheme.secondary }} />

              <LoadPGNGame
                pgnText={pgnText}
                setPgnText={setPgnText}
                loadPGN={loadPGN}
                setInputsVisible={setInputsVisible}
              />

              <Divider sx={{ borderColor: purpleTheme.secondary }} />

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

                <Button
                  variant="outlined"
                  onClick={() => {
                    setInputsVisible(true);
                    setMoves([]);
                    setPgnText("");
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
                <AgineAnalysisView
                  isGameReviewMode={true}
                  stockfishAnalysisResult={stockfishAnalysisResult}
                  stockfishLoading={stockfishLoading}
                  handleEngineLineClick={handleEngineLineClick}
                  engineDepth={engineDepth}
                  engineLines={engineLines}
                  engine={engine}
                  analyzeWithStockfish={analyzeWithStockfish}
                  formatEvaluation={formatEvaluation}
                  formatPrincipalVariation={formatPrincipalVariation}
                  setEngineDepth={setEngineDepth}
                  setEngineLines={setEngineLines}
                  openingLoading={openingLoading}
                  openingData={openingData}
                  lichessOpeningData={lichessOpeningData}
                  lichessOpeningLoading={lichessOpeningLoading}
                  handleOpeningMoveClick={handleOpeningMoveClick}
                  chessdbdata={chessdbdata}
                  handleMoveClick={handleMoveClick}
                  queueing={queueing}
                  error={error}
                  loading={loading}
                  refetch={refetch}
                  requestAnalysis={requestAnalysis}
                  legalMoves={legalMoves}
                  handleFutureMoveLegalClick={handleFutureMoveLegalClick}
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  sendChatMessage={sendChatMessage}
                  chatLoading={chatLoading}
                  abortChatMessage={abortChatMessage}
                  handleChatKeyPress={handleChatKeyPress}
                  clearChatHistory={clearChatHistory}
                  sessionMode={sessionMode}
                  setSessionMode={setSessionMode}
                  llmLoading={llmLoading}
                  moves={moves}
                  currentMoveIndex={currentMoveIndex}
                  goToMove={goToMove}
                  comment={comment}
                  gameInfo={gameInfo}
                  gameReviewTheme={gameReviewTheme}
                  generateGameReview={generateGameReview}
                  gameReviewLoading={gameReviewLoading}
                  gameReviewProgress={gameReviewProgress}
                  handleGameReviewSummaryClick={handleGameReviewSummaryClick}
                  handleMoveAnnontateClick={handleMoveAnnontateClick}
                  handleMoveCoachClick={handleMoveCoachClick}
                  gameReview={gameReview}
                  pgnText={pgnText}
                  currentMove={moves[currentMoveIndex]}
                />
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

      <SaveGameReviewDialog
        saveDialogOpen={saveDialogOpen}
        setSaveDialogOpen={setSaveDialogOpen}
        historyDialogOpen={historyDialogOpen}
        setHistoryDialogOpen={setHistoryDialogOpen}
        gameInfo={gameInfo}
        gameReview={gameReview}
        moves={moves}
        pgnText={pgnText}
        loadFromHistory={loadFromHistory}
      />
    </Box>
  );
}
