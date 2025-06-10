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
    handleMoveClick,
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

  return (
    <>
      <Box sx={{ p: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
          <AiChessboardPanel
            game={game}
            fen={fen}
            moveSquares={moveSquares}
            setMoveSquares={setMoveSquares}
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
                <Tab label="Stockfish Analysis" />
                <Tab label="AI Chat" />
                <Tab label="Opening Explorer" />
                <Tab label="Chess DB" />
              </Tabs>
            </Box>

            

            <TabPanel value={analysisTab} index={0}>
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

            <TabPanel value={analysisTab} index={1}>
              <ChatTab
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMessage={sendChatMessage}
                chatLoading={chatLoading}
                puzzleMode={false}
                handleChatKeyPress={handleChatKeyPress}
                clearChatHistory={clearChatHistory}
                sessionMode={sessionMode}
                setSessionMode={setSessionMode}
              />
            </TabPanel>

            <TabPanel value={analysisTab} index={2}>
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

            <TabPanel value={analysisTab} index={3}>
              <ChessDBDisplay data={chessdbdata} analyzeMove={handleMoveClick}/>
            </TabPanel>
          </Paper>
        </Stack>
      </Box>
    </>
  );
}
