"use client";

import { useState, useEffect } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import { grey, purple } from "@mui/material/colors";
import { Chess } from "chess.js";
import { TabPanel } from "@/componets/tabs/tab";
import ChatTab from "@/componets/tabs/ChatTab";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/componets/agine/useAgine";
import { useSession } from "@clerk/nextjs";
import { PositionEval } from "@/stockfish/engine/engine";

export default function PlayStockfishPage() {
  const session = useSession();

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [playerSide, setPlayerSide] = useState("white");
  const [gameStatus, setGameStatus] = useState<"setup" | "playing" | "finished">("setup");
  const [engineThinking, setEngineThinking] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [pgnCopiedOpen, setPgnCopiedOpen] = useState(false);

  const {
    setLlmAnalysisResult,
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    setOpeningData,
    llmLoading,
    stockfishLoading,
    openingLoading,
    moveSquares,
    setMoveSquares,
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
    engine,
    fetchOpeningData,
    sendChatMessage,
    handleChatKeyPress,
    abortChatMessage,
    clearChatHistory,
    analyzeWithStockfish,
  } = useAgine(fen);

  // Effects and game logic unchanged (same as your original code)...
  useEffect(() => {
    if (gameStatus === "playing" && game.isGameOver()) {
      let result = "Draw";
      if (game.isCheckmate()) {
        result = game.turn() === "w" ? "Black wins" : "White wins";
      } else if (game.isStalemate()) {
        result = "Stalemate - Draw";
      } else if (game.isThreefoldRepetition()) {
        result = "Draw by repetition";
      } else if (game.isInsufficientMaterial()) {
        result = "Draw by insufficient material";
      }
      setGameResult(result);
      setGameStatus("finished");
    }
  }, [fen, game, gameStatus]);

  useEffect(() => {
    if (gameStatus === "playing" && !game.isGameOver()) {
      const currentTurn = game.turn();
      const shouldEngineMove =
        (playerSide === "white" && currentTurn === "b") ||
        (playerSide === "black" && currentTurn === "w");

      if (shouldEngineMove && !engineThinking) {
        makeEngineMove();
      }
    }
  }, [fen, gameStatus, playerSide, engineThinking]);

  const makeEngineMove = async () => {
    setEngineThinking(true);
    try {
      if (!engine) return;

      const currentFen = game.fen();

      const result = await engine.evaluatePositionWithUpdate({
        fen: currentFen,
        depth: engineDepth,
        multiPv: engineLines,
        setPartialEval: (partialEval: PositionEval) => {
          if (game.fen() === currentFen) {
            setStockfishAnalysisResult(partialEval);
          }
        },
      });

      if (game.fen() === currentFen && result?.lines?.[0]?.pv?.[0]) {
        const bestMove = result.lines[0].pv[0];
        const newGame = new Chess(game.fen());
        const move = newGame.move({
          from: bestMove.slice(0, 2),
          to: bestMove.slice(2, 4),
          promotion: bestMove.length === 5 ? bestMove[4] : undefined,
        });
        if (move) {
          setGame(newGame);
          setFen(newGame.fen());
          
        }
      }
    } catch (error) {
      console.error("Engine move error:", error);
    } finally {
      setEngineThinking(false);
    }
  };

  const startNewGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setGameStatus("playing");
    setGameResult(null);
    setEngineThinking(false);
    setMoveSquares({});
    setLlmAnalysisResult(null);
    setStockfishAnalysisResult(null);
    
  };

  const resetToSetup = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setGameStatus("setup");
    setGameResult(null);
    setEngineThinking(false);
    setMoveSquares({});
  };

  const resignGame = () => {
    setGameStatus("finished");
    setGameResult(
      playerSide === "white"
        ? "Black wins by resignation"
        : "White wins by resignation"
    );
  };

  const offerDraw = () => {
    setGameStatus("finished");
    setGameResult("Draw by agreement");
  };

  

  const renderGameStatus = () => {
    if (gameStatus === "finished") {
      return (
        <Alert severity="info" sx={{ mt: 1 }}>
          Game finished: {gameResult}
        </Alert>
      );
    }
    if (engineThinking) {
      return (
        <Chip
          label="Stockfish is thinking..."
          color="info"
          size="small"
          sx={{ mr: 1, mt: 1 }}
        />
      );
    }
    return (
      <Chip
        label={game.turn() === "w" ? "White to move" : "Black to move"}
        color="primary"
        size="small"
        sx={{ mt: 1 }}
      />
    );
  };

  if (!session.isLoaded) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session.isSignedIn) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
        <Typography variant="h6" color={purple[200]}>
          Please sign in to view this page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        minHeight: "90vh",
        backgroundColor: grey[900],
        color: "white",
        display: "flex",
        justifyContent: "center", // horizontally center stack horizontally in viewport
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        sx={{
          width: { xs: "100%", md: "100%", lg: "1100px" }, // max container width for large screens
          flexGrow: 1,
          height: { xs: "auto", md: "90vh" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        {/* Left Panel: Game & Board */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            gap: 2,
          }}
        >
          {/* Chessboard and engine thinking overlay */}
          <Box
            sx={{
              flexGrow: 1,
              width: "100%",
              maxWidth: { xs: "100%", md: 600, lg: 700 },
              height: { xs: "60vw", sm: "50vw", md: "70vh" },
              maxHeight: "80vh",
              position: "relative",
              borderRadius: 2,
              overflow: "hidden",
              boxShadow: `0 0 10px ${purple[700]}`,
              backgroundColor: grey[900],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mt: 1,
            }}
          >
            {engineThinking && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: "rgba(0, 0, 0, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                <CircularProgress color="inherit" />
              </Box>
            )}
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AiChessboardPanel
                game={game}
                fen={fen}
                moveSquares={moveSquares}
                setMoveSquares={setMoveSquares}
                engine={engine}
                setFen={setFen}
                setGame={setGame}
                llmLoading={llmLoading}
                stockfishLoading={stockfishLoading}
                fetchOpeningData={fetchOpeningData}
                openingLoading={openingLoading}
                setOpeningData={setOpeningData}
                setLlmAnalysisResult={setLlmAnalysisResult}
                setStockfishAnalysisResult={setStockfishAnalysisResult}
                analyzeWithStockfish={analyzeWithStockfish}
                stockfishAnalysisResult={stockfishAnalysisResult}
                side={playerSide === "black" ? "black" : "white"}
                engineThinking={engineThinking}
                gameStatus={gameStatus}
                playMode={true}
              />
            </Box>
          </Box>
        </Box>

        {/* Right Panel: Chat and Analysis */}
        <Paper
          elevation={5}
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            backgroundColor: grey[900],
            borderRadius: 2,
            color: "white",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={analysisTab}
            onChange={(_, val) => setAnalysisTab(val)}
            sx={{
              borderBottom: `1px solid ${grey[700]}`,
              "& .MuiTab-root": { color: purple[200], textTransform: "none" },
              "& .Mui-selected": { color: "white", fontWeight: "bold" },
              backgroundColor: grey[800],
            }}
          > 
            <Tab label="Game Menu" />
            <Tab label="Agine Chat" />
          </Tabs>

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              p: 2,
              height: "100%",
            }}
          >
            
            <TabPanel value={analysisTab} index={0}>
              <Box
                sx={{
                  height: "100%",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  p: 3,
                  boxSizing: "border-box",
                }}
              >
                <Typography variant="h6" gutterBottom color={purple[300]}>
                  {gameStatus === "setup"
                    ? "Game Setup"
                    : `Playing as ${playerSide.toUpperCase()} vs Stockfish 17 Lite`}
                </Typography>
                {gameStatus === "setup" ? (
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    justifyContent="flex-start"
                    sx={{ width: "100%", mb: 2 }}
                  >
                    <FormControl fullWidth={false} sx={{ minWidth: 140 }} size="small">
                      <InputLabel sx={{ color: purple[200] }}>Play as</InputLabel>
                      <Select
                        value={playerSide}
                        onChange={(e) => setPlayerSide(e.target.value)}
                        sx={{
                          color: "white",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: purple[300],
                          },
                        }}
                        label="Play as"
                      >
                        <MenuItem value="white">White</MenuItem>
                        <MenuItem value="black">Black</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth={false} sx={{ minWidth: 140 }} size="small">
                      <InputLabel sx={{ color: purple[200] }}>Depth</InputLabel>
                      <Select
                        value={engineDepth}
                        onChange={(e) => setEngineDepth(e.target.value)}
                        sx={{
                          color: "white",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: purple[300],
                          },
                        }}
                        label="Depth"
                      >
                        <MenuItem value={8}>Easy (8)</MenuItem>
                        <MenuItem value={12}>Medium (12)</MenuItem>
                        <MenuItem value={16}>Hard (16)</MenuItem>
                        <MenuItem value={20}>Expert (20)</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                ) : (
                  <>
                    {renderGameStatus()}
                  </>
                )}

                <Stack
                  direction="row"
                  spacing={2}
                  mt={2}
                  flexWrap="wrap"
                  gap={1}
                  justifyContent="center"
                  sx={{ width: "100%" }}
                >
                  {gameStatus === "setup" ? (
                    <Button
                      variant="contained"
                      onClick={startNewGame}
                      sx={{
                        backgroundColor: purple[600],
                        ":hover": { backgroundColor: purple[700] },
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      Start Game
                    </Button>
                  ) : (
                    <>
                      {gameStatus === "playing" && (
                        <>
                          <Button onClick={resignGame} color="error" variant="outlined">
                            Resign
                          </Button>
                          <Button
                            onClick={offerDraw}
                            variant="outlined"
                            sx={{
                              color: "#ffb74d",
                              borderColor: "#ffb74d",
                              "&:hover": {
                                backgroundColor: "rgba(255, 183, 77, 0.15)",
                                borderColor: "#ffb74d",
                              },
                            }}
                          >
                            Offer Draw
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={startNewGame}
                        variant="outlined"
                        sx={{
                          color: purple[200],
                          borderColor: purple[200],
                          "&:hover": {
                            backgroundColor: "rgba(0, 128, 128, 0.15)",
                            borderColor: purple[300],
                          },
                        }}
                      >
                        New Game
                      </Button>
                      <Button
                        onClick={resetToSetup}
                        variant="outlined"
                        sx={{
                          color: purple[200],
                          borderColor: purple[200],
                          "&:hover": {
                            backgroundColor: "rgba(0, 128, 128, 0.15)",
                            borderColor: purple[300],
                          },
                        }}
                      >
                        Setup
                      </Button>
                    </>
                  )}
                </Stack>
              </Box>
            </TabPanel>
            <TabPanel value={analysisTab} index={1}>
              <ChatTab
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMessage={sendChatMessage}
                chatLoading={chatLoading}
                abortChatMessage={abortChatMessage}
                puzzleMode={false}
                handleChatKeyPress={handleChatKeyPress}
                clearChatHistory={clearChatHistory}
                playMode={true}
                sessionMode={sessionMode}
                setSessionMode={setSessionMode}
              />
                {/* Setup or Game Info */}
          
            </TabPanel>
          </Box>
        </Paper>
      </Stack>

      {/* Snackbar for PGN copied */}
      <Snackbar
        open={pgnCopiedOpen}
        autoHideDuration={3000}
        onClose={() => setPgnCopiedOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          PGN copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
}
