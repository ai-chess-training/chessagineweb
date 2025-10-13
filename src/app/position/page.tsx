"use client";

import { useState } from "react";
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  Tabs,
  Tab,
  Card,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  Chat as ChatIcon,
} from "@mui/icons-material";
import { Chess } from "chess.js";
import { TabPanel } from "@/componets/tabs/tab";
import OpeningExplorer from "@/componets/tabs/OpeningTab";
import StockfishAnalysisTab from "@/componets/tabs/StockfishTab";
import ChatTab from "@/componets/tabs/ChatTab";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/hooks/useAgine";
import { useSession } from "@clerk/nextjs";
import { ChessDBDisplay } from "@/componets/tabs/Chessdb";
import LegalMoveTab from "@/componets/tabs/LegalMoveTab";
import { purpleTheme } from "@/theme/theme";
import Loader from "@/componets/loading/Loader";
import Warning from "@/componets/loading/SignUpWarning";

export default function PositionPage() {
  const session = useSession();
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [activeAnalysisTab, setActiveAnalysisTab] = useState(0);

  const {
    setLlmAnalysisResult,
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    openingData,
    setOpeningData,
    llmLoading,
    stockfishLoading,
    openingLoading,
    legalMoves,
    handleFutureMoveLegalClick,
    moveSquares,
    setMoveSquares,
    analysisTab,
    setAnalysisTab,
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    sessionMode,
    lichessOpeningData,
    lichessOpeningLoading,
    setSessionMode,
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    engine,
    fetchOpeningData,
    sendChatMessage,
    handleChatKeyPress,
    clearChatHistory,
    analyzeWithStockfish,
    formatEvaluation,
    formatPrincipalVariation,
    handleEngineLineClick,
    abortChatMessage,
    handleOpeningMoveClick,
    handleMoveClick,
    chessdbdata,
    loading,
    queueing,
    error,
    refetch,
    requestAnalysis,
  } = useAgine(fen);

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
      {/* Header Section */}

      <Stack direction={{ xs: "column", lg: "row" }} spacing={4}>
        {/* Chessboard Section */}
        <Box sx={{ flex: "0 0 auto" }}>
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
            analyzeWithStockfish={analyzeWithStockfish}
            llmLoading={llmLoading}
            stockfishLoading={stockfishLoading}
            stockfishAnalysisResult={stockfishAnalysisResult}
            openingLoading={openingLoading}
          />
        </Box>

        {/* Analysis Panel */}
        <Box sx={{ flex: 1 }}>
          <Card
            sx={{
              backgroundColor: purpleTheme.background.paper,
              borderRadius: 3,
              boxShadow: `0 8px 32px rgba(138, 43, 226, 0.15)`,
              minHeight: 600,
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
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
                <Tab icon={<ChatIcon />} iconPosition="start" label="AI Chat" />
              </Tabs>
            </Box>

            <Box
              sx={{
                p: 3,
                flex: 1,
                overflow: "auto",
              }}
            >
              <TabPanel value={analysisTab} index={0}>
                <Stack spacing={3}>
                  {/* Stockfish Analysis */}
                  <Accordion
                    expanded={activeAnalysisTab === 0}
                    onChange={() =>
                      setActiveAnalysisTab(activeAnalysisTab === 0 ? -1 : 0)
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
                          Stockfish Analysis
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{ backgroundColor: purpleTheme.background.paper }}
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
                        formatPrincipalVariation={formatPrincipalVariation}
                        setEngineDepth={setEngineDepth}
                        setEngineLines={setEngineLines}
                      />
                    </AccordionDetails>
                  </Accordion>

                  {/* Opening Explorer */}
                  <Accordion
                    expanded={activeAnalysisTab === 1}
                    onChange={() =>
                      setActiveAnalysisTab(activeAnalysisTab === 1 ? -1 : 1)
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
                          Opening Explorer
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{ backgroundColor: purpleTheme.background.paper }}
                    >
                      <OpeningExplorer
                        openingLoading={openingLoading}
                        openingData={openingData}
                        lichessOpeningData={lichessOpeningData}
                        lichessOpeningLoading={lichessOpeningLoading}
                        llmLoading={llmLoading}
                        handleOpeningMoveClick={handleOpeningMoveClick}
                      />
                    </AccordionDetails>
                  </Accordion>

                  {/* ChessDB */}
                  <Accordion
                    expanded={activeAnalysisTab === 2}
                    onChange={() =>
                      setActiveAnalysisTab(activeAnalysisTab === 2 ? -1 : 2)
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
                          Chess Database
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{ backgroundColor: purpleTheme.background.paper }}
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
                    expanded={activeAnalysisTab === 3}
                    onChange={() =>
                      setActiveAnalysisTab(activeAnalysisTab === 3 ? -1 : 3)
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
                      sx={{ backgroundColor: purpleTheme.background.paper }}
                    >
                      <LegalMoveTab
                        legalMoves={legalMoves}
                        handleFutureMoveLegalClick={handleFutureMoveLegalClick}
                      />
                    </AccordionDetails>
                  </Accordion>
                </Stack>
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
                  sessionMode={sessionMode}
                  setSessionMode={setSessionMode}
                />
              </TabPanel>
            </Box>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
