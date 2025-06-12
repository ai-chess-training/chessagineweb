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
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import { useCallback, useEffect, useMemo } from "react";
import { Square } from "chess.js";
import { TabPanel } from "@/componets/tabs/tab";
import StockfishAnalysisTab from "@/componets/tabs/StockfishTab";
import ChatTab from "@/componets/tabs/ChatTab";
import AiChessboardPanel from "@/componets/analysis/AiChessboard";
import useAgine from "@/componets/agine/useAgine";
import { useSession } from "@clerk/nextjs";
import { Lightbulb, Star, Eye, SkipForwardIcon as SkipNextIcon, SkipBackIcon } from "lucide-react";
import { Refresh, SkipNext } from "@mui/icons-material";

interface PuzzleData {
  lichessId: string;
  previousFEN: string;
  FEN: string;
  moves: string;
  preMove: string;
  rating: number;
  themes: string[];
  gameURL: string;
}

interface PuzzleQuery {
  themes: string[];
  solution: string[];
}

interface PuzzleQueryString {
  queryString: string;
}

export default function PuzzlePage() {
  const session = useSession();

  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [puzzleQuery, setPuzzleQuery] = useState<PuzzleQuery | null>(null);
  const [puzzleQueryString, setPuzzleQueryString] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Game state
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState("");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  // Puzzle solving state
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [puzzleComplete, setPuzzleComplete] = useState(false);
  const [puzzleFailed, setPuzzleFailed] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Solution viewing state
  const [showingSolution, setShowingSolution] = useState(false);
  const [solutionViewIndex, setSolutionViewIndex] = useState(0);
  const [solutionGameState, setSolutionGameState] = useState<Chess | null>(null);

  // Helper function to convert PuzzleQuery to prompt string
  const createPuzzlePrompt = useCallback((query: PuzzleQuery): string => {
    const themesText = query.themes.length > 0 
      ? `This puzzle focuses on: ${query.themes.join(", ")}. themes` 
      : "";
    
    const solutionText = query.solution.length > 0 
      ? `The solution is: ${query.solution.join(" ")}.` 
      : "";
    
    return `Current chess puzzle context: ${themesText} ${solutionText}.`.trim();
  }, []);

  // Helper function to convert algebraic notation moves to SAN format
  const convertMovesToSAN = useCallback((moves: string[], startingFEN: string): string[] => {
    const tempGame = new Chess(startingFEN);
    const sanMoves: string[] = [];

    moves.forEach((move) => {
      try {
        const moveObj = tempGame.move({
          from: move.substring(0, 2),
          to: move.substring(2, 4),
          promotion: move.substring(4) || undefined,
        });
        
        if (moveObj) {
          sanMoves.push(moveObj.san);
        }
      } catch (error) {
        console.error("Error converting move to SAN:", move, error);
      }
    });

    return sanMoves;
  }, []);

  const fetchPuzzle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "https://api.chessgubbins.com/puzzles/random"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch puzzle");
      }
      const data: PuzzleData = await response.json();
      setPuzzleData(data);

      // Set up game
      const newGame = new Chess(data.FEN);
      setGame(newGame);
      setFen(data.FEN);

      // Parse solution moves
      const moves = data.moves.split(" ");
      setSolutionMoves(moves);
      setCurrentSolutionIndex(0);

      // Convert moves to SAN format for puzzle query
      const sanMoves = convertMovesToSAN(moves, data.FEN);
      
      // Create puzzle query object
      const newPuzzleQuery: PuzzleQuery = {
        themes: data.themes,
        solution: sanMoves,
      };
      setPuzzleQuery(newPuzzleQuery);
      
      // Create puzzle query string for ChatTab
      const queryString = createPuzzlePrompt(newPuzzleQuery);
      setPuzzleQueryString(queryString);

      // Reset puzzle state
      setPuzzleComplete(false);
      setPuzzleFailed(false);
      setHintUsed(false);
      setShowHint(false);
      setShowingSolution(false);
      setSolutionViewIndex(0);
      setSolutionGameState(null);
      setMoveSquares({});
      setSelectedSquare(null);
      setLegalMoves([]);
    } catch (err) {
      console.error("Error fetching puzzle:", err);
      setError("Failed to load puzzle. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [convertMovesToSAN, createPuzzlePrompt]);

  // Initialize with first puzzle
  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

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
  } = useAgine(fen);

  // Show solution
  const showSolution = useCallback(() => {
    if (!puzzleData) return;

    setShowingSolution(true);
    setSolutionViewIndex(0);
    
    // Create a game state from the starting position
    const solutionGame = new Chess(puzzleData.FEN);
    setSolutionGameState(solutionGame);
    setGame(solutionGame);
    setFen(solutionGame.fen());
    
    // Clear any existing move highlights
    setMoveSquares({});
  }, [puzzleData]);

  // Navigate through solution
  const navigateSolution = useCallback((direction: 'prev' | 'next') => {
    if (!puzzleData || !solutionGameState) return;

    if (direction === 'next' && solutionViewIndex < solutionMoves.length) {
      const move = solutionMoves[solutionViewIndex];
      const newGame = new Chess(solutionGameState.fen());
      
      try {
        const moveObj = newGame.move({
          from: move.substring(0, 2),
          to: move.substring(2, 4),
          promotion: move.substring(4) || undefined,
        });

        if (moveObj) {
          setSolutionGameState(newGame);
          setGame(newGame);
          setFen(newGame.fen());
          setSolutionViewIndex(solutionViewIndex + 1);
          
          // Highlight the move
          setMoveSquares({
            [moveObj.from]: "rgba(155, 199, 0, 0.41)",
            [moveObj.to]: "rgba(155, 199, 0, 0.41)",
          });
        }
      } catch (error) {
        console.error("Solution navigation error:", error);
      }
    } else if (direction === 'prev' && solutionViewIndex > 0) {
      // Rebuild game state up to previous move
      const newGame = new Chess(puzzleData.FEN);
      const targetIndex = solutionViewIndex - 1;
      
      for (let i = 0; i < targetIndex; i++) {
        const move = solutionMoves[i];
        try {
          newGame.move({
            from: move.substring(0, 2),
            to: move.substring(2, 4),
            promotion: move.substring(4) || undefined,
          });
        } catch (error) {
          console.error("Solution rebuild error:", error);
          break;
        }
      }
      
      setSolutionGameState(newGame);
      setGame(newGame);
      setFen(newGame.fen());
      setSolutionViewIndex(targetIndex);
      
      // Highlight the last move if there was one
      if (targetIndex > 0) {
        const lastMove = solutionMoves[targetIndex - 1];
        setMoveSquares({
          [lastMove.substring(0, 2)]: "rgba(155, 199, 0, 0.41)",
          [lastMove.substring(2, 4)]: "rgba(155, 199, 0, 0.41)",
        });
      } else {
        setMoveSquares({});
      }
    }
  }, [puzzleData, solutionGameState, solutionViewIndex, solutionMoves]);

  // Handle piece drop
  const onDrop = useCallback(
    (source: string, target: string) => {
      if (puzzleComplete || puzzleFailed || showingSolution) return false;

      try {
        const gameCopy = new Chess(fen);
        const move = gameCopy.move({
          from: source,
          to: target,
          promotion: "q",
        });

        if (!move) return false;

        const moveNotation = move.from + move.to + (move.promotion || "");
        const expectedMove = solutionMoves[currentSolutionIndex];

        if (moveNotation === expectedMove) {
          // Correct move
          setGame(gameCopy);
          setFen(gameCopy.fen());
          setMoveSquares({
            [source]: "rgba(155, 199, 0, 0.41)",
            [target]: "rgba(155, 199, 0, 0.41)",
          });

          if (currentSolutionIndex === solutionMoves.length - 1) {
            // Puzzle complete!
            setPuzzleComplete(true);
          } else {
            // Make opponent's move
            setTimeout(() => {
              const nextMove = solutionMoves[currentSolutionIndex + 1];
              if (nextMove) {
                const opponentMove = gameCopy.move({
                  from: nextMove.substring(0, 2),
                  to: nextMove.substring(2, 4),
                  promotion: nextMove.substring(4) || undefined,
                });

                if (opponentMove) {
                  setGame(new Chess(gameCopy.fen()));
                  setFen(gameCopy.fen());
                  setCurrentSolutionIndex(currentSolutionIndex + 2);
                }
              }
            }, 500);
          }
        } else {
          // Wrong move
          setPuzzleFailed(true);
          setMoveSquares({
            [source]: "rgba(255, 0, 0, 0.41)",
            [target]: "rgba(255, 0, 0, 0.41)",
          });
        }

        return true;
      } catch (error) {
        console.error("Move error:", error);
        return false;
      }
    },
    [fen, solutionMoves, currentSolutionIndex, puzzleComplete, puzzleFailed, showingSolution]
  );

  // Handle square click
  const handleSquareClick = useCallback(
    (square: string) => {
      if (puzzleComplete || puzzleFailed || showingSolution) return;

      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (selectedSquare && legalMoves.includes(square)) {
        onDrop(selectedSquare, square);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      const piece = game.get(square as Square);
      if (!piece || piece.color !== game.turn()) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      const moves = game.moves({ square: square as Square, verbose: true });
      const targetSquares = moves.map((move) => move.to);

      setSelectedSquare(square);
      setLegalMoves(targetSquares);
    },
    [selectedSquare, legalMoves, game, onDrop, puzzleComplete, puzzleFailed, showingSolution]
  );

  // Custom square styles - Fixed to avoid background/backgroundColor conflict
  const customSquareStyles = useMemo(() => {
    const styles: { [square: string]: React.CSSProperties } = {};

    // Apply move highlights first
    Object.entries(moveSquares).forEach(([square, color]) => {
      styles[square] = { backgroundColor: color };
    });

    // Apply selected square highlight
    if (selectedSquare && !showingSolution) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)",
      };
    }

    // Apply legal move indicators
    if (!showingSolution) {
      legalMoves.forEach((square) => {
        const piece = game.get(square as Square);
        // Use backgroundImage instead of background to avoid conflict
        const backgroundImage = piece
          ? "radial-gradient(circle, rgba(255,0,0,0.8) 85%, transparent 85%)"
          : "radial-gradient(circle, rgba(0,0,0,0.3) 25%, transparent 25%)";

        styles[square] = {
          ...styles[square],
          backgroundImage,
        };
      });
    }

    return styles;
  }, [moveSquares, selectedSquare, legalMoves, game, showingSolution]);

  // Show hint
  const showHintMove = useCallback(() => {
    if (!solutionMoves[currentSolutionIndex] || showingSolution) return;

    const move = solutionMoves[currentSolutionIndex];
    const from = move.substring(0, 2);
    const to = move.substring(2, 4);

    setMoveSquares({
      [from]: "rgba(255, 215, 0, 0.6)",
      [to]: "rgba(255, 215, 0, 0.6)",
    });

    setHintUsed(true);
    setShowHint(true);

    setTimeout(() => {
      setMoveSquares({});
      setShowHint(false);
    }, 3000);
  }, [solutionMoves, currentSolutionIndex, showingSolution]);

  // Reset puzzle
  const resetPuzzle = useCallback(() => {
    if (!puzzleData) return;

    const newGame = new Chess(puzzleData.FEN);
    setGame(newGame);
    setFen(puzzleData.FEN);
    setCurrentSolutionIndex(0);
    setPuzzleComplete(false);
    setPuzzleFailed(false);
    setHintUsed(false);
    setShowHint(false);
    setShowingSolution(false);
    setSolutionViewIndex(0);
    setSolutionGameState(null);
    setMoveSquares({});
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [puzzleData]);

  // Exit solution view
  const exitSolutionView = useCallback(() => {
    if (!puzzleData) return;
    
    setShowingSolution(false);
    setSolutionViewIndex(0);
    setSolutionGameState(null);
    
    // Return to original puzzle state
    const newGame = new Chess(puzzleData.FEN);
    setGame(newGame);
    setFen(puzzleData.FEN);
    setMoveSquares({});
  }, [puzzleData]);

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
            puzzleMode={true}
            onDropPuzzle={onDrop}
            handleSquarePuzzleClick={handleSquareClick}
            setFen={setFen}
            setGame={setGame}
            setLlmAnalysisResult={setLlmAnalysisResult}
            setOpeningData={setOpeningData}
            setStockfishAnalysisResult={setStockfishAnalysisResult}
            fetchOpeningData={fetchOpeningData}
            analyzeWithStockfish={analyzeWithStockfish}
            puzzleCustomSquareStyle={customSquareStyles}
            llmLoading={llmLoading}
            side={puzzleData ? (new Chess(puzzleData.FEN).turn() === "w" ? "white" : "black") : "white"}
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
                <Tab label="Puzzle Info" />
                <Tab label="Stockfish Analysis" />
                <Tab label="AI Chat" />
              </Tabs>
            </Box>

            <TabPanel value={analysisTab} index={0}>
              <Stack spacing={3} sx={{ px: 2, py: 3 }}>
                {/* Action Buttons Card */}
                <Card sx={{ backgroundColor: grey[900] }}>
                  <CardContent>
                    {showingSolution ? (
                      <Stack spacing={2}>
                        <Typography variant="h6" sx={{ textAlign: "center", color: "white" }}>
                          Solution View ({solutionViewIndex}/{solutionMoves.length})
                        </Typography>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                          sx={{ width: "100%" }}
                        >
                          <Button
                            variant="outlined"
                            startIcon={<SkipBackIcon />}
                            onClick={() => navigateSolution('prev')}
                            disabled={solutionViewIndex === 0}
                            fullWidth
                            color="info"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<SkipNextIcon />}
                            onClick={() => navigateSolution('next')}
                            disabled={solutionViewIndex >= solutionMoves.length}
                            fullWidth
                            color="info"
                          >
                            Next
                          </Button>
                          <Button
                            variant="contained"
                            onClick={exitSolutionView}
                            fullWidth
                            color="warning"
                          >
                            Exit Solution
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        sx={{ width: "100%" }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={<Lightbulb />}
                          onClick={showHintMove}
                          disabled={puzzleComplete || showHint}
                          fullWidth
                          color="info"
                        >
                          Hint
                        </Button>
                        {puzzleFailed && (
                          <Button
                            variant="outlined"
                            startIcon={<Eye />}
                            onClick={showSolution}
                            fullWidth
                            color="secondary"
                          >
                            Show Solution
                          </Button>
                        )}
                        <Button
                          variant="outlined"
                          startIcon={<Refresh />}
                          onClick={resetPuzzle}
                          disabled={!puzzleData}
                          fullWidth
                          color="warning"
                        >
                          Reset
                        </Button>
                        <Button
                          variant="contained"
                          startIcon={<SkipNext />}
                          onClick={fetchPuzzle}
                          disabled={loading}
                          fullWidth
                          color="success"
                        >
                          Next Puzzle
                        </Button>
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                {/* Rating & Themes Card */}
                <Card sx={{ backgroundColor: grey[900] }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        alignItems="center"
                      >
                        <Chip
                          icon={<Star />}
                          label={`Rating: ${puzzleData?.rating || "N/A"}`}
                          color="primary"
                          variant="outlined"
                          sx={{
                            fontSize: "1.2rem",
                            px: 2,
                            py: 1.5,
                            height: "auto",
                          }}
                        />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Status Alerts Card */}
                {(puzzleComplete || puzzleFailed || showHint || error || showingSolution) && (
                  <Card sx={{ backgroundColor: grey[900] }}>
                    <CardContent>
                      <Stack spacing={2}>
                        {puzzleComplete && (
                          <Alert severity="success">
                            🎉 Puzzle Complete!{" "}
                            {hintUsed ? "(Hint used)" : "Perfect solve!"}
                          </Alert>
                        )}
                        {puzzleFailed && !showingSolution && (
                          <Alert severity="error">
                            ❌ Wrong move! Use the Show Solution button to see the correct moves.
                          </Alert>
                        )}
                        {showHint && (
                          <Alert severity="info">
                            💡 Hint: The highlighted squares show the best move!
                          </Alert>
                        )}
                        {showingSolution && (
                          <Alert severity="info">
                            👁️ Viewing solution - use the navigation buttons to step through the moves.
                          </Alert>
                        )}
                        {error && <Alert severity="error">{error}</Alert>}
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </TabPanel>

            <TabPanel value={analysisTab} index={1}>
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

            <TabPanel value={analysisTab} index={2}>
              <ChatTab
                chatMessages={chatMessages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMessage={sendChatMessage}
                chatLoading={chatLoading}
                puzzleMode={true}
                puzzleQuery={puzzleQueryString}
                handleChatKeyPress={handleChatKeyPress}
                clearChatHistory={clearChatHistory}
                sessionMode={sessionMode}
                setSessionMode={setSessionMode}
              />
            </TabPanel>
          </Paper>
        </Stack>
      </Box>
    </>
  );
}