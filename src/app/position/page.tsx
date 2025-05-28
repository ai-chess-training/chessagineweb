"use client";

import { useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import ReactMarkdown from "react-markdown";
import { TabPanel } from "@/componets/tabs/tab";
import OpeningExplorer from "@/componets/tabs/OpeningTab";
import StockfishAnalysisTab from "@/componets/tabs/StockfishTab";
import ChatTab from "@/componets/tabs/ChatTab";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/componets/agine/useAgine";
import { useSession } from "@clerk/nextjs";
import { ChessDBDisplay } from "@/componets/tabs/Chessdb";

export default function PositionPage() {
  
  const session = useSession();

  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());

  
  const {
    llmAnalysisResult,
    setLlmAnalysisResult,
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    openingData,
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
    setEngineLines,
    engine,
    fetchOpeningData,
    analyzePosition,
    sendChatMessage,
    handleChatKeyPress,
    clearChatHistory,
    analyzeWithStockfish,
    formatEvaluation,
    formatPrincipalVariation,
    handleEngineLineClick,
    handleOpeningMoveClick,
    chessdbdata
  } = useAgine(fen);

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
    )
  }


  const safeGameMutate = (modify: (game: Chess) => void) => {
    const newGame = new Chess(game.fen());
    modify(newGame);
    setGame(newGame);
    setFen(newGame.fen());
    // Clear opening data when position changes
    setOpeningData(null);
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

  return (
    <>
      <Box sx={{ p: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
          <AiChessboardPanel
            game={game}
            fen={fen}
            onDrop={onDrop}
            moveSquares={moveSquares}
            engine={engine}
            setFen={setFen}
            setGame={setGame}
            setLlmAnalysisResult={setLlmAnalysisResult}
            setOpeningData={setOpeningData}
            setStockfishAnalysisResult={setStockfishAnalysisResult}
            fetchOpeningData={fetchOpeningData}
            analyzePosition={analyzePosition}
            analyzeWithStockfish={analyzeWithStockfish}
            llmLoading={llmLoading}
            stockfishLoading={stockfishLoading}
            stockfishAnalysisResult={stockfishAnalysisResult}
            openingLoading={openingLoading}
          />

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
                <Tab label="AI Analysis" />
                <Tab label="Stockfish Analysis" />
                <Tab label="AI Chat" />
                <Tab label="Opening Explorer" />
                <Tab label="Chess DB" />
              </Tabs>
            </Box>

            <TabPanel value={analysisTab} index={0}>
              <Typography variant="h6" gutterBottom>
                AI Analysis
              </Typography>

              {llmLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                  <CircularProgress />
                </Box>
              ) : llmAnalysisResult ? (
                <Box sx={{ color: "wheat", fontSize: "0.95rem" }}>
                  <ReactMarkdown>{llmAnalysisResult}</ReactMarkdown>
                </Box>
              ) : (
                <Typography sx={{ color: "wheat" }}>
                  Click on individual
                  engine lines or opening moves for specific Agine analysis.
                </Typography>
              )}
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
              <ChessDBDisplay data={chessdbdata} />
            </TabPanel>
          </Paper>
        </Stack>
      </Box>
    </>
  );
}
