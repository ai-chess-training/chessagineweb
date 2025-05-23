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
  Tabs,
  Tab,
  Chip,
  Link,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import ReactMarkdown from "react-markdown";
import { RiRobot2Line } from "react-icons/ri";
import { FaArrowRotateLeft } from "react-icons/fa6";
import { FaRegArrowAltCircleUp } from "react-icons/fa";
import { GiChessKing } from "react-icons/gi";
import { BiBookOpen } from "react-icons/bi";
import { useSession } from "@clerk/nextjs";
import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName, PositionEval, LineEval } from "@/stockfish/engine/engine";

// Opening Explorer Types
interface Opening {
  eco: string;
  name: string;
}

interface Side {
  name: string;
  rating: number;
}

interface Game {
  uci: string;
  id: string;
  black: Side;
  white: Side;
  year: number;
  month: string;
}

interface Moves {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
  game: Game;
  opening: Opening;
}

interface MasterGames {
  opening: Opening;
  white: number;
  draws: number;
  black: number;
  moves: Moves[];
  topGames: Game[];
}

// Opening Explorer Functions
const getOpeningStats = async (fen: string): Promise<MasterGames | null> => {
  try {
    const masterEndpoint = `https://explorer.lichess.ovh/masters?fen=${fen}&moves=5&topGames=5`;
    const response = await fetch(masterEndpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const masterData = (await response.json()) as MasterGames;
    return masterData;
  } catch (error) {
    console.error("Error fetching opening stats:", error);
    return null;
  }
};

const getOpeningStatSpeech = (masterData: MasterGames): string => {
  const { opening, white, draws, black, moves, topGames } = masterData;

  const totalGames = (white ?? 0) + (draws ?? 0) + (black ?? 0);
  if (totalGames === 0) {
    return "There is no game data available for this opening.";
  }

  const whiteWinRate = ((white / totalGames) * 100 || 0).toFixed(2);
  const drawRate = ((draws / totalGames) * 100 || 0).toFixed(2);
  const blackWinRate = ((black / totalGames) * 100 || 0).toFixed(2);

  let speech = `Opening: ${opening?.name ?? "Unknown"} (${opening?.eco ?? "N/A"}). `;
  speech += `Out of ${totalGames} master-level games, White wins ${whiteWinRate} percent, draws occur ${drawRate} percent, and Black wins ${blackWinRate} percent. `;

  if (moves?.length) {
    speech += "The most common next moves are: ";
    moves.slice(0, 3).forEach((move, index) => {
      const moveTotal = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
      const moveWhite = ((move.white / moveTotal) * 100 || 0).toFixed(2);
      const moveDraw = ((move.draws / moveTotal) * 100 || 0).toFixed(2);
      const moveBlack = ((move.black / moveTotal) * 100 || 0).toFixed(2);
      speech += `Move ${index + 1}: ${move.san ?? "Unknown"}, played in games with average rating ${move.averageRating ?? 0}. White wins ${moveWhite} percent, draws ${moveDraw} percent, Black wins ${moveBlack} percent. `;
    });
  }

  if (topGames?.length) {
    speech += "Some notable games include: ";
    topGames.slice(0, 3).forEach((game, index) => {
      speech += `Game ${index + 1}: Game URL: https://lichess.org/${game.id} ${game.white?.name ?? "Unknown"} (rating ${game.white?.rating ?? "N/A"}) versus ${game.black?.name ?? "Unknown"} (rating ${game.black?.rating ?? "N/A"}), played in ${game.month ?? "N/A"} ${game.year ?? "N/A"}. `;
    });
  }

  return speech.trim();
};

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
  const [openingData, setOpeningData] = useState<MasterGames | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [stockfishLoading, setStockfishLoading] = useState(false);
  const [openingLoading, setOpeningLoading] = useState(false);
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: string }>({});
  const [isFlipped, setIsFlipped] = useState(false);
  const [analysisTab, setAnalysisTab] = useState(0);
  const { session } = useSession();

  // Engine settings - Fixed to Stockfish 11 only
  // const [engineEnabled, setEngineEnabled] = useState(true);
  const [engineDepth, setEngineDepth] = useState(20);
  const [engineLines, setEngineLines] = useState(3);
  
  // Use only Stockfish 11
  const engine = useEngine(true, EngineName.Stockfish16);

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

  // Fetch opening explorer data
  const fetchOpeningData = async () => {
    setOpeningLoading(true);
    try {
      const data = await getOpeningStats(fen);
      setOpeningData(data);
    } catch (error) {
      console.error("Error fetching opening data:", error);
      setOpeningData(null);
    } finally {
      setOpeningLoading(false);
    }
  };

  const analyzePosition = async (customQuery?: string) => {
    const token = await session?.getToken();
    setLlmLoading(true);
    setLlmAnalysisResult(null);

    let query = customQuery;
    
    // If no custom query provided, run Stockfish analysis first and format it for LLM
    if (!customQuery) {
      if (!engine) {
        setLlmAnalysisResult("Stockfish engine not ready. Please wait for initialization.");
        setLlmLoading(false);
        return;
      }

      try {
        // Run Stockfish analysis and wait for completion
        console.log("=== Running Stockfish Analysis for LLM ===");
        console.log("Depth:", engineDepth, "Lines:", engineLines);
        
        const stockfishResult = await engine.evaluatePositionWithUpdate({
          fen,
          depth: engineDepth,
          multiPv: engineLines,
          setPartialEval: (partialEval: PositionEval) => {
            // Update the Stockfish display in real-time if user is on that tab
            setStockfishAnalysisResult(partialEval);
          },
        });

        // Update final Stockfish result
        setStockfishAnalysisResult(stockfishResult);

        // Fetch opening data if not already available
        let currentOpeningData = openingData;
        if (!currentOpeningData) {
          try {
            currentOpeningData = await getOpeningStats(fen);
            setOpeningData(currentOpeningData);
          } catch (error) {
            console.error("Error fetching opening data for analysis:", error);
          }
        }

        // Format all engine lines for LLM
        const formattedEngineLines = stockfishResult.lines.map((line, index) => {
          const evaluation = formatEvaluation(line);
          const moves = formatPrincipalVariation(line.pv, line.fen);
          let formattedLine = `Line ${index + 1}: ${evaluation} - ${moves}`;
          
          if (line.resultPercentages) {
            formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
          }
          
          formattedLine += ` [Depth: ${line.depth}]`;
          return formattedLine;
        }).join('\n');

        // Create comprehensive query with engine analysis and opening data
        query = `Analyze this chess position in detail using the Stockfish engine analysis and opening database information provided:

Position FEN: ${fen}
Best Move: ${stockfishResult.bestMove || 'Not available'}

Engine Analysis (Depth ${engineDepth}, ${engineLines} line${engineLines > 1 ? 's' : ''}):
${formattedEngineLines}`;

        // Add opening data if available
        if (currentOpeningData) {
          const openingSpeech = getOpeningStatSpeech(currentOpeningData);
          query += `\n\nOpening Database Information:
${openingSpeech}`;
        }

        query += `\n\nPlease provide a comprehensive analysis including:
1. Overall position evaluation and who stands better
2. Detailed explanation of the best line(s) and key moves
3. Main strategic and tactical themes
4. Opening context and theoretical considerations (if applicable)
5. Historical precedent from master games (if opening data available)
6. Critical variations and what to watch out for
7. Practical advice for both sides
8. Any important alternative moves not shown in the engine lines

Make your analysis accessible for players of different skill levels and integrate both the engine evaluation and opening theory context.`;

      } catch (error) {
        console.error("Error running Stockfish analysis:", error);
        setLlmAnalysisResult("Error running Stockfish analysis. Please try again.");
        setLlmLoading(false);
        return;
      }
    }
    
    // Log the query for local testing
    console.log("=== LLM Query ===");
    console.log("Query:", query);
    console.log("FEN:", fen);
    console.log("================");

    try {
      const response = await fetch(`/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
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
      setOpeningData(null);
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

  // New function to format a single line for LLM analysis
  const formatLineForLLM = (line: LineEval, lineIndex: number) => {
    const evaluation = formatEvaluation(line);
    const moves = formatPrincipalVariation(line.pv, line.fen);
    
    let formattedLine = `Line ${lineIndex + 1}: ${evaluation} - ${moves}`;
    
    if (line.resultPercentages) {
      formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
    }
    
    return formattedLine;
  };

  // New function to handle clicking on engine lines
  const handleEngineLineClick = (line: LineEval, lineIndex: number) => {
    if (llmLoading) return; // Prevent clicking while loading
    
    const formattedLine = formatLineForLLM(line, lineIndex);
    let query = `Analyze this chess position and explain the following engine line in detail:

Position: ${fen}
Engine Line: ${formattedLine}`;

    // Add opening context if available
    if (openingData) {
      const openingSpeech = getOpeningStatSpeech(openingData);
      query += `\n\nOpening Context:
${openingSpeech}`;
    }

    query += `\n\nPlease explain:
1. Why this line is recommended
2. The key tactical and strategic ideas
3. What happens after these moves
4. Opening theoretical considerations (if applicable)
5. Any important variations or alternatives`;

    // Switch to AI Analysis tab and analyze
    setAnalysisTab(0);
    analyzePosition(query);
  };

  // Function to handle clicking on opening moves
  const handleOpeningMoveClick = (move: Moves) => {
    if (llmLoading) return;

    const totalGames = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
    const whiteWinRate = ((move.white / totalGames) * 100 || 0).toFixed(1);
    const drawRate = ((move.draws / totalGames) * 100 || 0).toFixed(1);
    const blackWinRate = ((move.black / totalGames) * 100 || 0).toFixed(1);

    const query = `Analyze the chess move ${move.san} in this position:

Position: ${fen}
Opening: ${openingData?.opening?.name || "Unknown"} (${openingData?.opening?.eco || "N/A"})

Move Statistics from Master Games:
- Move: ${move.san}
- Games played: ${totalGames}
- Average rating: ${move.averageRating}
- White wins: ${whiteWinRate}%
- Draws: ${drawRate}%
- Black wins: ${blackWinRate}%

Please explain:
1. Why ${move.san} is played in this opening
2. The strategic and tactical ideas behind this move
3. How the statistics reflect the move's strength
4. What typical plans and themes arise after this move
5. Any important alternatives to consider

Provide both theoretical background and practical advice.`;

    setAnalysisTab(0);
    analyzePosition(query);
  };

  const renderOpeningExplorer = () => {
    if (openingLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
          <CircularProgress size={20} />
          <Typography sx={{ ml: 2, color: "wheat" }}>Loading opening data...</Typography>
        </Box>
      );
    }

    if (!openingData) {
      return (
        <Typography sx={{ color: "wheat", py: 2 }}>
          Click Opening Explorer to load master game statistics for this position.
        </Typography>
      );
    }

    const totalGames = (openingData.white ?? 0) + (openingData.draws ?? 0) + (openingData.black ?? 0);

    if (totalGames === 0) {
      return (
        <Typography sx={{ color: "wheat", py: 2 }}>
          No master games found for this position.
        </Typography>
      );
    }

    const whiteWinRate = ((openingData.white / totalGames) * 100).toFixed(1);
    const drawRate = ((openingData.draws / totalGames) * 100).toFixed(1);
    const blackWinRate = ((openingData.black / totalGames) * 100).toFixed(1);

    return (
      <Stack spacing={3}>
        {/* Opening Info */}
        {openingData.opening && (
          <Box>
            <Typography variant="h6" sx={{ color: "white", mb: 1 }}>
              {openingData.opening.name}
            </Typography>
            <Chip label={openingData.opening.eco} color="primary" size="small" />
          </Box>
        )}

        {/* Overall Statistics */}
        <Paper sx={{ p: 2, backgroundColor: grey[700] }}>
          <Typography variant="subtitle2" sx={{ color: "white", mb: 2 }}>
            Master Games: {totalGames.toLocaleString()}
          </Typography>
            <Stack direction="row" spacing={2} justifyContent="space-between">
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography variant="h6" sx={{ color: "#4caf50" }}>
              {whiteWinRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: "wheat" }}>
              White wins
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography variant="h6" sx={{ color: "#ff9800" }}>
              {drawRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: "wheat" }}>
              Draws
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography variant="h6" sx={{ color: "#f44336" }}>
              {blackWinRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: "wheat" }}>
              Black wins
              </Typography>
            </Box>
            </Stack>
        </Paper>

        {/* Popular Moves */}
        {openingData.moves && openingData.moves.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "white", mb: 2 }}>
              Popular Moves
            </Typography>
            <Typography variant="caption" sx={{ color: "wheat", fontStyle: "italic", mb: 2, display: "block" }}>
              💡 Click on any move below to get AI analysis of that continuation
            </Typography>
            <Stack spacing={1}>
              {openingData.moves.slice(0, 5).map((move, index) => {
                const moveTotal = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
                const moveWhite = ((move.white / moveTotal) * 100).toFixed(1);
                const moveDraw = ((move.draws / moveTotal) * 100).toFixed(1);
                const moveBlack = ((move.black / moveTotal) * 100).toFixed(1);
                const playedPercentage = ((moveTotal / totalGames) * 100).toFixed(1);

                return (
                  <Paper
                    key={`${move.uci}-${index}`}
                    onClick={() => handleOpeningMoveClick(move)}
                    sx={{
                      p: 2,
                      backgroundColor: grey[600],
                      cursor: llmLoading ? "not-allowed" : "pointer",
                      "&:hover": {
                        backgroundColor: llmLoading ? grey[600] : grey[500],
                        transform: llmLoading ? "none" : "translateY(-1px)",
                      },
                      filter: llmLoading ? "grayscale(50%)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body1" sx={{ color: "white", fontWeight: "bold" }}>
                          {move.san}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "wheat" }}>
                          {moveTotal.toLocaleString()} games ({playedPercentage}%) • Avg rating: {move.averageRating}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip label={`W: ${moveWhite}%`} size="small" sx={{ backgroundColor: "#4caf50", color: "white" }} />
                        <Chip label={`D: ${moveDraw}%`} size="small" sx={{ backgroundColor: "#ff9800", color: "white" }} />
                        <Chip label={`B: ${moveBlack}%`} size="small" sx={{ backgroundColor: "#f44336", color: "white" }} />
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Top Games */}
        {openingData.topGames && openingData.topGames.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "white", mb: 2 }}>
              Notable Games
            </Typography>
            <Stack spacing={1}>
              {openingData.topGames.slice(0, 3).map((game, index) => (
                <Paper key={`${game.id}-${index}`} sx={{ p: 2, backgroundColor: grey[700] }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" sx={{ color: "white" }}>
                        {game.white?.name} ({game.white?.rating}) vs {game.black?.name} ({game.black?.rating})
                      </Typography>
                      <Typography variant="caption" sx={{ color: "wheat" }}>
                        {game.month} {game.year}
                      </Typography>
                    </Box>
                    <Link
                      href={`https://lichess.org/${game.id}`}
                      target="_blank"
                      rel="noopener"
                      sx={{ color: "#64b5f6", textDecoration: "none" }}
                    >
                      View Game
                    </Link>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    );
  };

  const renderStockfishAnalysis = () => {
    if (!stockfishAnalysisResult) return null;

    return (
      <Stack spacing={2}>
        <Paper
              sx={{
                p: 2,
                width: "100%",
                backgroundColor: grey[800],
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "wheat", mb: 2 }}>
                Stockfish Settings (Used by AI Analysis)
              </Typography>
              
              <Stack spacing={2}>
                
                
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
                    max={25}
                    step={1}
                    sx={{ color: "wheat" }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ color: "wheat" }}>
                    Lines: {engineLines} (AI will analyze all {engineLines} line{engineLines > 1 ? 's' : ''})
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
                    max={4}
                    step={1}
                    sx={{ color: "wheat" }}
                  />
                </Box>
              </Stack>
            </Paper>

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

        <Typography variant="caption" sx={{ color: "wheat", fontStyle: "italic" }}>
          💡 Click on any line below to get AI analysis of that specific variation
        </Typography>

        <Stack spacing={1}>
          {stockfishAnalysisResult.lines.map((line, index) => (
            <Paper
              key={`line-${index}-${line.depth}-${line.cp || line.mate}`}
              onClick={() => handleEngineLineClick(line, index)}
              sx={{
                p: 2,
                backgroundColor: grey[700],
                borderLeft: `3px solid ${index === 0 ? "#4caf50" : "#2196f3"}`,
                // Visual indicator for updating data
                opacity: stockfishLoading && line.depth < engineDepth ? 0.8 : 1,
                transition: "opacity 0.3s ease, transform 0.2s ease",
                // Add a subtle animation for real-time updates
                animation: stockfishLoading ? "pulse 2s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { opacity: 0.8 },
                  "50%": { opacity: 1 },
                  "100%": { opacity: 0.8 },
                },
                // Hover effects to indicate clickability
                cursor: llmLoading ? "not-allowed" : "pointer",
                "&:hover": {
                  backgroundColor: llmLoading ? grey[700] : grey[600],
                  transform: llmLoading ? "none" : "translateY(-2px)",
                  boxShadow: llmLoading ? "none" : "0 4px 8px rgba(0,0,0,0.3)",
                },
                // Disabled state when LLM is loading
                filter: llmLoading ? "grayscale(50%)" : "none",
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
                onClick={() => analyzePosition()}
                disabled={llmLoading || !engine}
                startIcon={<RiRobot2Line />}
                fullWidth
                sx={{ backgroundColor: "#9c27b0" }}
              >
                {llmLoading ? "AI + Engine Analyzing..." : engine ? "AI Analysis" : "Engine Loading..."}
              </Button>

              <Button
                variant="contained"
                onClick={analyzeWithStockfish}
                disabled={stockfishLoading || !engine}
                startIcon={<GiChessKing />}
                fullWidth
                sx={{ backgroundColor: "#2e7d32" }}
              >
                {stockfishLoading ? "Stockfish Running..." : engine ? "Stockfish Only" : "SF Loading..."}
              </Button>
            </Stack>

            {/* Opening Explorer Button */}
            <Button
              variant="contained"
              onClick={fetchOpeningData}
              disabled={openingLoading}
              startIcon={<BiBookOpen />}
              fullWidth
              sx={{ backgroundColor: "#1976d2" }}
            >
              {openingLoading ? "Loading Opening Data..." : "Lichess Opening Explorer"}
            </Button>

        
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
                <Tab label="Opening Explorer" />
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
                  Click AI Analysis to get comprehensive analysis powered by Stockfish engine data and opening theory, or click Stockfish Only for raw engine evaluation. You can also click individual engine lines or opening moves for specific analysis.
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

            <TabPanel value={analysisTab} index={2}>
              <Typography variant="h6" gutterBottom>
                Opening Explorer
              </Typography>
              {renderOpeningExplorer()}
            </TabPanel>
          </Paper>
        </Stack>
      </Box>
    </>
  );
}