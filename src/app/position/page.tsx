"use client";

import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import ReactMarkdown from "react-markdown";
import { RiRobot2Line } from "react-icons/ri";
import { FaArrowRotateLeft } from "react-icons/fa6";
import { FaRegArrowAltCircleUp } from "react-icons/fa";
import { GiChessKing } from "react-icons/gi";
import { useSession } from "@clerk/nextjs";
import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName, PositionEval, LineEval } from "@/stockfish/engine/engine";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function PositionPage() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [customFen, setCustomFen] = useState("");
  const [llmAnalysisResult, setLlmAnalysisResult] = useState<string | null>(null);
  const [stockfishAnalysisResult, setStockfishAnalysisResult] = useState<PositionEval | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [stockfishLoading, setStockfishLoading] = useState(false);
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: string }>({});
  const [isFlipped, setIsFlipped] = useState(false);
  const [analysisTab, setAnalysisTab] = useState(0);
  const { session } = useSession();

  // Engine settings - Fixed to Stockfish 11 only
  const [engineEnabled, setEngineEnabled] = useState(true);
  const [engineDepth, setEngineDepth] = useState(20);
  const [engineLines, setEngineLines] = useState(3);
  
  // Use only Stockfish 11
  const engine = useEngine(engineEnabled, EngineName.Stockfish11);

  const safeGameMutate = (modify: (game: Chess) => void) => {
    const newGame = new Chess(game.fen());
    modify(newGame);
    setGame(newGame);
    setFen(newGame.fen());
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

  const analyzePosition = async () => {
    const token = await session?.getToken();
    setLlmLoading(true);
    setLlmAnalysisResult(null);

    try {
      const response = await fetch(`/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: `Analyze this ${fen}` }),
      });

      const data = await response.json();
      console.log('Response', response);
      console.log(data);
      setLlmAnalysisResult(data.message);
    } catch (error) {
      console.error("Error analyzing position:", error);
      setLlmAnalysisResult("Error analyzing position. Please try again.");
    } finally {
      setLlmLoading(false);
    }
  };

  // Modified Stockfish analysis function for real-time updates
  const analyzeWithStockfish = async () => {
    if (!engine) {
      alert("Stockfish engine not ready. Please wait for initialization.");
      return;
    }

    setStockfishLoading(true);
    // Don't clear previous results immediately - keep them visible during updates
    
    try {
      const result = await engine.evaluatePositionWithUpdate({
        fen,
        depth: engineDepth,
        multiPv: engineLines,
        setPartialEval: (partialEval: PositionEval) => {
          // Show data as it appears in real-time
          // Ensure we always show the latest partial evaluation
          setStockfishAnalysisResult(prevResult => {
            // If we have a previous result and the new one has fewer lines,
            console.log(prevResult)
            // it might be a restart - use the new one anyway
            return partialEval;
          });
        },
      });
      
      // Final result with complete data
      setStockfishAnalysisResult(result);
    } catch (error) {
      console.error("Error analyzing position:", error);
      setStockfishAnalysisResult(null);
    } finally {
      setStockfishLoading(false);
    }
  };

  const loadCustomFen = () => {
    try {
      const newGame = new Chess(customFen);
      setGame(newGame);
      setFen(newGame.fen());
      setLlmAnalysisResult(null);
      setStockfishAnalysisResult(null);
    } catch (error) {
      console.log(error);
      alert("Invalid FEN string.");
    }
  };

  const formatEvaluation = (line: LineEval) => {
    if (line.mate !== undefined) {
      return `M${line.mate}`;
    }
    if (line.cp !== undefined) {
      const eval1 = line.cp / 100;
      return eval1 > 0 ? `+${eval1.toFixed(2)}` : eval1.toFixed(2);
    }
    return "0.00";
  };

  // const showBestMoveSan = (fen: string, bestMove: string) => {
  //   const tempGame = new Chess(fen);
  //   tempGame.move(bestMove);
  //   const history = tempGame.history({verbose: true});
  //   return history[0].san;
  // }

  const formatPrincipalVariation = (pv: string[], startFen: string) => {
    const tempGame = new Chess(startFen);
    const moves: string[] = [];
    
    for (const uciMove of pv.slice(0, 6)) { // Show first 6 moves
      try {
        const move = tempGame.move({
          from: uciMove.slice(0, 2),
          to: uciMove.slice(2, 4),
          promotion: uciMove.length > 4 ? uciMove[4] as string : undefined,
        });
        if (move) {
          moves.push(move.san);
        } else {
          break;
        }
      } catch {
        break;
      }
    }
    
    return moves.join(" ");
  };

  const renderStockfishAnalysis = () => {
    if (!stockfishAnalysisResult) return null;

    return (
      <Stack spacing={2}>
        {/* Real-time analysis status indicator */}
        {stockfishLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ color: "wheat" }}>
              Analyzing... (Depth: {engineDepth}, Lines: {engineLines}) - data updates in real-time
            </Typography>
          </Box>
        )}

        {stockfishAnalysisResult.bestMove && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "wheat", fontWeight: "bold" }}>
              Best Move: {stockfishAnalysisResult.bestMove}
            </Typography>
          </Box>
        )}
        
        {stockfishAnalysisResult.opening && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "wheat" }}>
              Opening: {stockfishAnalysisResult.opening}
            </Typography>
          </Box>
        )}

        <Stack spacing={1}>
          {stockfishAnalysisResult.lines.map((line, index) => (
            <Paper
              key={`line-${index}-${line.depth}-${line.cp || line.mate}`}
              sx={{
                p: 2,
                backgroundColor: grey[700],
                borderLeft: `3px solid ${index === 0 ? "#4caf50" : "#2196f3"}`,
                // Visual indicator for updating data
                opacity: stockfishLoading && line.depth < engineDepth ? 0.8 : 1,
                transition: "opacity 0.3s ease",
                // Add a subtle animation for real-time updates
                animation: stockfishLoading ? "pulse 2s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { opacity: 0.8 },
                  "50%": { opacity: 1 },
                  "100%": { opacity: 0.8 },
                },
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                    minWidth: "60px",
                    fontFamily: "monospace",
                  }}
                >
                  {formatEvaluation(line)}
                </Typography>
                <Typography variant="caption" sx={{ color: "wheat" }}>
                  Depth {line.depth}/{engineDepth}
                  {stockfishLoading && line.depth < engineDepth && " (updating...)"}
                </Typography>
                {line.nps && (
                  <Typography variant="caption" sx={{ color: "wheat" }}>
                    {Math.round(line.nps / 1000)}k nps
                  </Typography>
                )}
              </Stack>
              
              <Typography
                variant="body2"
                sx={{ color: "wheat", fontFamily: "monospace", mb: 1 }}
              >
                {formatPrincipalVariation(line.pv, line.fen)}
              </Typography>
              
              {/* Always show win/draw/loss rates if available, or show placeholders while calculating */}
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                {line.resultPercentages ? (
                  <>
                    <Typography variant="caption" sx={{ color: "#4caf50" }}>
                      W: {line.resultPercentages.win}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#ff9800" }}>
                      D: {line.resultPercentages.draw}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#f44336" }}>
                      L: {line.resultPercentages.loss}%
                    </Typography>
                  </>
                ) : stockfishLoading ? (
                  <>
                    <Typography variant="caption" sx={{ color: "#4caf50", opacity: 0.5 }}>
                      W: ---%
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#ff9800", opacity: 0.5 }}>
                      D: ---%
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#f44336", opacity: 0.5 }}>
                      L: ---%
                    </Typography>
                  </>
                ) : null}
              </Stack>
            </Paper>
          ))}
          
          {/* Show placeholder lines if we're expecting more lines */}
          {stockfishLoading && stockfishAnalysisResult.lines.length < engineLines && (
            Array.from({ length: engineLines - stockfishAnalysisResult.lines.length }).map((_, index) => (
              <Paper
                key={`placeholder-${index}`}
                sx={{
                  p: 2,
                  backgroundColor: grey[800],
                  borderLeft: "3px solid #666",
                  opacity: 0.5,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ color: "grey", fontFamily: "monospace" }}>
                    Calculating line {stockfishAnalysisResult.lines.length + index + 1}...
                  </Typography>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Stack>
    );
  };

  return (
    <>
      <Box sx={{ p: 4 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
          {/* Left column */}
          <Stack spacing={2} alignItems="center">
            <Chessboard
              position={fen}
              onPieceDrop={onDrop}
              customSquareStyles={moveSquares}
              boardWidth={500}
              boardOrientation={isFlipped ? "black" : "white"}
            />

            {/* Analysis Buttons */}
            <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
              <Button
                variant="contained"
                onClick={analyzePosition}
                disabled={llmLoading}
                startIcon={<RiRobot2Line />}
                fullWidth
                sx={{ backgroundColor: "#9c27b0" }}
              >
                {llmLoading ? "AI Analyzing..." : "AI Analysis"}
              </Button>

              <Button
                variant="contained"
                onClick={analyzeWithStockfish}
                disabled={stockfishLoading || !engine}
                startIcon={<GiChessKing />}
                fullWidth
                sx={{ backgroundColor: "#2e7d32" }}
              >
                {stockfishLoading ? "Stockfish Running..." : engine ? "Stockfish " : "SF Loading..."}
              </Button>
            </Stack>

            {/* Simplified Engine Settings - Only Stockfish 11 */}
            <Paper
              sx={{
                p: 2,
                width: "100%",
                backgroundColor: grey[800],
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "wheat", mb: 2 }}>
                Stockfish Settings
              </Typography>
              
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={engineEnabled}
                      onChange={(e) => setEngineEnabled(e.target.checked)}
                    />
                  }
                  label="Enable Stockfish"
                  sx={{ color: "wheat" }}
                />
                
                <Box>
                  <Typography variant="caption" sx={{ color: "wheat" }}>
                    Depth: {engineDepth} {stockfishLoading && "(will update analysis)"}
                  </Typography>
                  <Slider
                    value={engineDepth}
                    onChange={(_, value) => {
                      setEngineDepth(value as number);
                      // Restart analysis if currently running
                      if (stockfishLoading && engine) {
                        analyzeWithStockfish();
                      }
                    }}
                    min={10}
                    max={30}
                    step={1}
                    sx={{ color: "wheat" }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ color: "wheat" }}>
                    Lines: {engineLines} {stockfishLoading && "(will update analysis)"}
                  </Typography>
                  <Slider
                    value={engineLines}
                    onChange={(_, value) => {
                      setEngineLines(value as number);
                      // Restart analysis if currently running
                      if (stockfishLoading && engine) {
                        analyzeWithStockfish();
                      }
                    }}
                    min={1}
                    max={5}
                    step={1}
                    sx={{ color: "wheat" }}
                  />
                </Box>
              </Stack>
            </Paper>

            <TextField
              label="Paste FEN"
              variant="outlined"
              value={customFen}
              onChange={(e) => setCustomFen(e.target.value)}
              size="small"
              sx={{
                width: "100%",
                backgroundColor: grey[900],
                borderRadius: 1,
              }}
              placeholder="e.g. rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              slotProps={{
                input: {
                  sx: {
                    color: "wheat",
                  },
                },
                inputLabel: {
                  sx: {
                    color: "wheat",
                  },
                },
              }}
            />

            <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
              <Button
                variant="outlined"
                onClick={loadCustomFen}
                startIcon={<FaRegArrowAltCircleUp />}
                fullWidth
              >
                Load FEN
              </Button>
              <Button
                variant="outlined"
                onClick={() => setIsFlipped(!isFlipped)}
                startIcon={<FaArrowRotateLeft />}
                sx={{ width: "100%" }}
              >
                Flip Board
              </Button>
            </Stack>

            <Paper
              elevation={1}
              sx={{
                p: 1,
                width: "100%",
                color: "wheat",
                backgroundColor: grey[800],
                fontFamily: "monospace",
              }}
            >
              {fen}
            </Paper>
          </Stack>

          {/* Right column */}
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
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={analysisTab} 
                onChange={(_, newValue) => setAnalysisTab(newValue)}
                sx={{
                  '& .MuiTab-root': { color: 'wheat' },
                  '& .Mui-selected': { color: 'white !important' },
                }}
              >
                <Tab label="AI Analysis" />
                <Tab label="Stockfish Analysis" />
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
                  Make some moves or paste a FEN and click AI Analysis.
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={analysisTab} index={1}>
              <Typography variant="h6" gutterBottom>
                Stockfish Analysis
              </Typography>

              {!stockfishLoading && !stockfishAnalysisResult ? (
                <Typography sx={{ color: "wheat" }}>
                  Make some moves or paste a FEN and click Stockfish to see engine evaluation with real-time updates.
                </Typography>
              ) : (
                renderStockfishAnalysis()
              )}
            </TabPanel>
          </Paper>
        </Stack>
      </Box>
    </>
  );
}