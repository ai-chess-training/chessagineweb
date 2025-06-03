import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName, PositionEval, LineEval } from "@/stockfish/engine/engine";
import {
  MasterGames,
  getOpeningStatSpeech,
  getOpeningStats,
  Moves,
} from "@/componets/opening/helper";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "@clerk/nextjs";
import { Chess } from "chess.js";
import { CandidateMove, getChessDBSpeech, useChessDB} from "../tabs/Chessdb";
import { useLocalStorage } from "usehooks-ts";

export default function useAgine(fen: string) {
  // Analysis Results State
  const [llmAnalysisResult, setLlmAnalysisResult] = useState<string | null>(null);
  const [stockfishAnalysisResult, setStockfishAnalysisResult] = useState<PositionEval | null>(null);
  const [openingData, setOpeningData] = useState<MasterGames | null>(null);

  // Loading States
  const [llmLoading, setLlmLoading] = useState(false);
  const [stockfishLoading, setStockfishLoading] = useState(false);
  const [openingLoading, setOpeningLoading] = useState(false);

  // UI State
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: string }>({});
  const [analysisTab, setAnalysisTab] = useState(0);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionMode, setSessionMode] = useState(true);

  // Engine Settings (using usehooks-ts for localStorage)
  const [engineDepth, setEngineDepth] = useLocalStorage<number>("engineDepth", 15);
  const [engineLines, setEngineLines] = useLocalStorage<number>("engineLines", 3);

  // Hooks
  const { session } = useSession();
  const engine = useEngine(true, EngineName.Stockfish16);
  const chessdbdata = useChessDB(fen).data;

  // Use ref to track current analysis to avoid stale closures
  const currentFenRef = useRef(fen);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update ref when fen changes
  useEffect(() => {
    currentFenRef.current = fen;
  }, [fen]);

  // ==================== MEMOIZED UTILITY FUNCTIONS ====================

  const formatEvaluation = useCallback((line: LineEval): string => {
    if (line.mate !== undefined) {
      return `M${line.mate}`;
    }
    if (line.cp !== undefined) {
      const eval1 = line.cp / 100;
      return eval1 > 0 ? `+${eval1.toFixed(2)}` : eval1.toFixed(2);
    }
    return "0.00";
  }, []);

  const formatPrincipalVariation = useCallback((pv: string[], startFen: string): string => {
    const tempGame = new Chess(startFen);
    const moves: string[] = [];

    for (const uciMove of pv.slice(0, 6)) {
      try {
        const move = tempGame.move({
          from: uciMove.slice(0, 2),
          to: uciMove.slice(2, 4),
          promotion: uciMove.length > 4 ? (uciMove[4] as string) : undefined,
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
  }, []);

  const formatLineForLLM = useCallback((line: LineEval, lineIndex: number): string => {
    const evaluation = formatEvaluation(line);
    const moves = formatPrincipalVariation(line.pv, line.fen);

    let formattedLine = `Line ${lineIndex + 1}: ${evaluation} - ${moves}`;

    if (line.resultPercentages) {
      formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
    }

    return formattedLine;
  }, [formatEvaluation, formatPrincipalVariation]);

  // ==================== MEMOIZED API FUNCTIONS ====================

  const fetchOpeningData = useCallback(async (): Promise<void> => {
    const currentFen = currentFenRef.current;
    setOpeningLoading(true);
    
    try {
      const data = await getOpeningStats(currentFen);
      // Only update if we're still analyzing the same position
      if (currentFenRef.current === currentFen) {
        setOpeningData(data);
      }
    } catch (error) {
      console.error("Error fetching opening data:", error);
      if (currentFenRef.current === currentFen) {
        setOpeningData(null);
      }
    } finally {
      if (currentFenRef.current === currentFen) {
        setOpeningLoading(false);
      }
    }
  }, []);

  const analyzeWithStockfish = useCallback(async (): Promise<void> => {
    if (!engine) {
      console.warn("Stockfish engine not ready");
      return;
    }

    const currentFen = currentFenRef.current;
    setStockfishLoading(true);

    try {
      const result = await engine.evaluatePositionWithUpdate({
        fen: currentFen,
        depth: engineDepth,
        multiPv: engineLines,
        setPartialEval: (partialEval: PositionEval) => {
          // Only update if we're still analyzing the same position
          if (currentFenRef.current === currentFen) {
            setStockfishAnalysisResult(partialEval);
          }
        },
      });

      // Only update if we're still analyzing the same position
      if (currentFenRef.current === currentFen) {
        setStockfishAnalysisResult(result);
      }
    } catch (error) {
      console.error("Error analyzing position with Stockfish:", error);
      if (currentFenRef.current === currentFen) {
        setStockfishAnalysisResult(null);
      }
    } finally {
      if (currentFenRef.current === currentFen) {
        setStockfishLoading(false);
      }
    }
  }, [engine, engineDepth, engineLines]);

  const makeApiRequest = useCallback(async (fen: string, query: string): Promise<string> => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = await session?.getToken();
      const response = await fetch(`/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fen, query }),
        signal: controller.signal,
      });

      const data = await response.json();
      return data.message;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [session]);

  // Auto-recalculate engine results when FEN changes
  useEffect(() => {
    if (!engine || !fen) return;

    // Clear previous results
    setStockfishAnalysisResult(null);
    setLlmAnalysisResult(null);
    setOpeningData(null);
    
    // Cancel any pending API requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Auto-analyze with slight delay to avoid rapid fire requests
    const timeoutId = setTimeout(() => {
      // Double-check that we're still analyzing the same position
      if (currentFenRef.current === fen) {
        analyzeWithStockfish();
        fetchOpeningData();
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [fen, engine, engineDepth, engineLines, analyzeWithStockfish, fetchOpeningData]);

  // ==================== OPTIMIZED ANALYSIS FUNCTION ====================

  const analyzePosition = useCallback(async (customQuery?: string): Promise<void> => {
    setLlmLoading(true);
    setLlmAnalysisResult(null);

    const currentFen = currentFenRef.current;
    let query = customQuery;

    try {
      // If no custom query, build comprehensive analysis query
      if (!customQuery) {
        if (!engine) {
          setLlmAnalysisResult("Stockfish engine not ready. Please wait for initialization.");
          return;
        }

        // Get fresh Stockfish analysis
        const stockfishResult = await engine.evaluatePositionWithUpdate({
          fen: currentFen,
          depth: engineDepth,
          multiPv: engineLines,
          setPartialEval: (partialEval: PositionEval) => {
            if (currentFenRef.current === currentFen) {
              setStockfishAnalysisResult(partialEval);
            }
          },
        });

        if (currentFenRef.current === currentFen) {
          setStockfishAnalysisResult(stockfishResult);
        }

        // Get opening data if not available
        let currentOpeningData = openingData;
        if (!currentOpeningData) {
          try {
            currentOpeningData = await getOpeningStats(currentFen);
            if (currentFenRef.current === currentFen) {
              setOpeningData(currentOpeningData);
            }
          } catch (error) {
            console.error("Error fetching opening data for analysis:", error);
          }
        }

        // Format engine analysis for LLM
        const formattedEngineLines = stockfishResult.lines
          .map((line, index) => {
            const evaluation = formatEvaluation(line);
            const moves = formatPrincipalVariation(line.pv, line.fen);
            let formattedLine = `Line ${index + 1}: ${evaluation} - ${moves}`;

            if (line.resultPercentages) {
              formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
            }

            formattedLine += ` [Depth: ${line.depth}]`;
            return formattedLine;
          })
          .join("\n");

        // Build comprehensive query
        query = `Analyze this chess position in detail using the Stockfish engine analysis and opening database information provided:

Position FEN: ${currentFen}
Best Move: ${stockfishResult.bestMove || "Not available"}

Engine Analysis (Depth ${engineDepth}, ${engineLines} line${engineLines > 1 ? "s" : ""}):
${formattedEngineLines}`;

        // Add opening data if available
        if (currentOpeningData) {
          const openingSpeech = getOpeningStatSpeech(currentOpeningData);
          query += `\n\nOpening Database Information:\n${openingSpeech}`;
        }

        query += `\n\n1. Describe the key features of the position in terms of Silman's imbalances from the book "Reassess Your Chess" below:

- Superior minor piece
- Pawn structure
- Space
- Material
- Control of a key file
- Control of a hole/weak square
- Lead in development
- Initiative (and Tempo)
- King safety
- Statics vs. Dynamics

2. To this list add a summary of piece activity and coordination, and weaknesses for both sides

3. Answer the following "ChessMood 7Q" seven questions:
   a. What problems does the opponent have?
   b. What problems do I have?
   c. Where am I strong?
   d. Which of my pieces can be happier?
   e. Which pieces do I want to trade?
   f. What is the opponent's next move or plan?
   g. How can I advance (if none of the other six questions have compelling answers)

4. Based on the features and the seven questions summarize the goals for both sides
5. Using the engine analysis in the PGN, please explain the candidate moves. Assess the candidate moves in terms of the features, seven questions, and goals. How do the candidates further our goals or stop the opponent goals. Which candidate is more practical and which entails the most risk. Recommend a strategy or alternative strategies explaining which are more tactical and which are more positional. Use games from the master or lichess database as model games when relevant.
6. Consider Fine's 30 chess principles below and supplementary additional principles identified below. In your explanation of the candidate moves, include reference and quote any of the principles which are clearly relevant and how that makes the candidate move a "principled move" because it follows one or more principles below:`;
      }

      const result = await makeApiRequest(currentFen, query!);
      
      // Only update if we're still analyzing the same position
      if (currentFenRef.current === currentFen) {
        setLlmAnalysisResult(result);
      }
    } catch (error) {
      console.error("Error analyzing position:", error);
      if (currentFenRef.current === currentFen) {
        if (error instanceof Error && error.message === 'Request cancelled') {
          // Don't show error for cancelled requests
          return;
        }
        setLlmAnalysisResult("Error analyzing position. Please try again.");
      }
    } finally {
      if (currentFenRef.current === currentFen) {
        setLlmLoading(false);
      }
    }
  }, [engine, engineDepth, engineLines, openingData, formatEvaluation, formatPrincipalVariation, makeApiRequest]);

  // ==================== OPTIMIZED CHAT FUNCTIONS ====================

  const sendChatMessage = useCallback(async (gameInfo?: string, currentMove?: string): Promise<void> => {

   
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: chatInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput("");
    setChatLoading(true);

    const currentFen = currentFenRef.current;

    try {
      const chessInstance = new Chess(currentFen);
      const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";
      let query = `USER PROMPT: ${currentInput}\n\nCurrent Position: ${currentFen}\nSide to Move: ${sideToMove}`;

      if(gameInfo){
        query += `\n\n Game PGN \n ${gameInfo}`;
      }

      if(currentMove){
        query += `\n Current Game Move: \n ${currentMove}`
      }

      if (sessionMode) {
        // Get engine analysis if not available
        let engineResult = stockfishAnalysisResult;
        if (!engineResult && engine) {
          engineResult = await engine.evaluatePositionWithUpdate({
            fen: currentFen,
            depth: engineDepth,
            multiPv: engineLines,
            setPartialEval: () => {},
          });
          if (currentFenRef.current === currentFen) {
            setStockfishAnalysisResult(engineResult);
          }
        }

        // Add engine analysis
        if (engineResult) {
          const formattedEngineLines = engineResult.lines
            .map((line, index) => {
              const evaluation = formatEvaluation(line);
              const moves = formatPrincipalVariation(line.pv, line.fen);
              let formattedLine = `Line ${index + 1}: ${evaluation} - ${moves}`;

              if (line.resultPercentages) {
                formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
              }

              return formattedLine;
            })
            .join("\n");

          query += `\nEngine Analysis:\n${formattedEngineLines}`;
        }

        // Add opening data
        if (openingData) {
          const openingSpeech = getOpeningStatSpeech(openingData);
          query += `\n\nOpening Information:\n${openingSpeech}`;
        }

        if(chessdbdata){
           const candiateMoves = getChessDBSpeech(chessdbdata);
           query += `${candiateMoves}`
        }

      }

      const result = await makeApiRequest(currentFen, query);

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: result,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending chat message:", error);
      if (!(error instanceof Error && error.message === 'Request cancelled')) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: "Sorry, there was an error processing your message. Please try again.",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, sessionMode, stockfishAnalysisResult, engine, engineDepth, engineLines, openingData, chessdbdata, formatEvaluation, formatPrincipalVariation, makeApiRequest]);

  const handleChatKeyPress = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }, [sendChatMessage]);

  const clearChatHistory = useCallback((): void => {
    setChatMessages([]);
  }, []);

  // ==================== OPTIMIZED CLICK HANDLERS ====================

  const handleEngineLineClick = useCallback(async (line: LineEval, lineIndex: number): Promise<void> => {
    if (llmLoading) return;
    
    const currentFen = currentFenRef.current;
    const chessInstance = new Chess(currentFen);
    const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";
    const formattedLine = formatLineForLLM(line, lineIndex);
    
    let query = `Analyze this chess position and explain the following engine line in detail:

Position: ${currentFen}
Engine Line: ${formattedLine}
Side To Move ${sideToMove}
`;

    if (openingData) {
      const openingSpeech = getOpeningStatSpeech(openingData);
      query += `\n\nOpening Context:\n${openingSpeech}`;
    }

    query += `\n\n Analyze this from different point of views.`;

    setAnalysisTab(1);
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: `Analyze engine line: ${formattedLine}`,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    
    setChatLoading(true);
    
    try {
      const result = await makeApiRequest(currentFen, query);
      
      // Add assistant response to chat
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: result,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error("Error analyzing engine line:", error);
      if (!(error instanceof Error && error.message === 'Request cancelled')) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: "Sorry, there was an error analyzing the engine line. Please try again.",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setChatLoading(false);
    }
  }, [llmLoading, formatLineForLLM, openingData, makeApiRequest]);

  const handleOpeningMoveClick = useCallback(async (move: Moves): Promise<void> => {
    if (llmLoading) return;

    const currentFen = currentFenRef.current;
    const chessInstance = new Chess(currentFen);
    const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";

    const totalGames = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
    const whiteWinRate = ((move.white / totalGames) * 100 || 0).toFixed(1);
    const drawRate = ((move.draws / totalGames) * 100 || 0).toFixed(1);
    const blackWinRate = ((move.black / totalGames) * 100 || 0).toFixed(1);

    const query = `Analyze the chess move ${move.san} in this position:

Position: ${currentFen}
Opening: ${openingData?.opening?.name || "Unknown"} (${openingData?.opening?.eco || "N/A"})
Side To Move ${sideToMove}

Move Statistics from Master Games:
- Move: ${move.san}
- Games played: ${totalGames}
- Average rating: ${move.averageRating}
- White wins: ${whiteWinRate}%
- Draws: ${drawRate}%
- Black wins: ${blackWinRate}%

 Analyze this from different point of views.

Provide both theoretical background and practical advice.`;

    setAnalysisTab(1);
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: `Analyze opening move: ${move.san}`,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    
    setChatLoading(true);
    
    try {
      const result = await makeApiRequest(currentFen, query);
      
      // Add assistant response to chat
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: result,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error("Error analyzing opening move:", error);
      if (!(error instanceof Error && error.message === 'Request cancelled')) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: "Sorry, there was an error analyzing the opening move. Please try again.",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setChatLoading(false);
    }
  }, [llmLoading, openingData, makeApiRequest]);

  const handleMoveClick = useCallback(async (move: CandidateMove): Promise<void> => {
    if (llmLoading) return;

    const currentFen = currentFenRef.current;
    const chessInstance = new Chess(currentFen);
    const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";
    const updatedFen = chessInstance.fen();

    let query = `Analyze the chess move ${move.san} (${move.uci}) in this position:

Position: ${currentFen}
Side To Move: ${sideToMove}
ChessDb Score For Move ${move.score} the higher the postive score the better white is, the negative the score is better black is
ChessDb Winrate: ${move.winrate}

Move leads to FEN: ${updatedFen}

Discuss the strategic and tactical implications of this move. Provide both theoretical background and practical advice.`;

    if (openingData) {
      const openingSpeech = getOpeningStatSpeech(openingData);
      query += `\n\nOpening Context:\n${openingSpeech}`;
    }

    query += `\n\nAnalyze this move from different points of view.`;

    setAnalysisTab(1);
    
    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: `Analyze move: ${move.san}`,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    
    setChatLoading(true);
    
    try {
      const result = await makeApiRequest(currentFen, query);
      
      // Add assistant response to chat
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: result,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error("Error analyzing move:", error);
      if (!(error instanceof Error && error.message === 'Request cancelled')) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: "Sorry, there was an error analyzing the move. Please try again.",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setChatLoading(false);
    }
  }, [llmLoading, openingData, makeApiRequest]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ==================== MEMOIZED RETURN OBJECT ====================

  return useMemo(() => ({
    // Analysis Results
    llmAnalysisResult,
    setLlmAnalysisResult,
    stockfishAnalysisResult,
    setStockfishAnalysisResult,
    openingData,
    setOpeningData,
    chessdbdata,

    // Loading States
    llmLoading,
    setLlmLoading,
    stockfishLoading,
    setStockfishLoading,
    openingLoading,
    setOpeningLoading,

    // UI State
    moveSquares,
    setMoveSquares,
    analysisTab,
    setAnalysisTab,

    // Chat State
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    setChatLoading,
    sessionMode,
    setSessionMode,

    // Engine Settings
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    engine,

    // Functions
    fetchOpeningData,
    analyzePosition,
    analyzeWithStockfish,
    sendChatMessage,
    handleChatKeyPress,
    clearChatHistory,
    handleEngineLineClick,
    handleOpeningMoveClick,
    handleMoveClick,

    // Utility Functions
    formatEvaluation,
    formatPrincipalVariation,
    formatLineForLLM,
  }), [
    llmAnalysisResult,
    stockfishAnalysisResult,
    openingData,
    chessdbdata,
    llmLoading,
    stockfishLoading,
    openingLoading,
    moveSquares,
    analysisTab,
    chatMessages,
    chatInput,
    chatLoading,
    sessionMode,
    engineDepth,
    engineLines,
    engine,
    fetchOpeningData,
    analyzePosition,
    analyzeWithStockfish,
    sendChatMessage,
    handleChatKeyPress,
    clearChatHistory,
    handleEngineLineClick,
    handleOpeningMoveClick,
    handleMoveClick,
    formatEvaluation,
    formatPrincipalVariation,
    formatLineForLLM,
  ]);
}