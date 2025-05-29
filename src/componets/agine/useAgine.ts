import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName, PositionEval, LineEval } from "@/stockfish/engine/engine";
import {
  MasterGames,
  getOpeningStatSpeech,
  getOpeningStats,
  Moves,
} from "@/componets/opening/helper";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "@clerk/nextjs";
import { Chess } from "chess.js";
import { useChessDB } from "../tabs/Chessdb";

// Types
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AnalysisState {
  llmResult: string | null;
  stockfishResult: PositionEval | null;
  openingData: MasterGames | null;
  error: string | null;
}

interface LoadingState {
  llm: boolean;
  stockfish: boolean;
  opening: boolean;
  chat: boolean;
}

// Constants
const DEFAULT_ENGINE_DEPTH = 15;
const DEFAULT_ENGINE_LINES = 3;
const ANALYSIS_DEBOUNCE_DELAY = 300;
const MAX_PV_MOVES = 6;

export default function useAgine(fen: string) {
  // ==================== STATE ====================
  
  // Analysis Results
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    llmResult: null,
    stockfishResult: null,
    openingData: null,
    error: null,
  });

  // Loading States
  const [loadingState, setLoadingState] = useState<LoadingState>({
    llm: false,
    stockfish: false,
    opening: false,
    chat: false,
  });

  // UI State
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: string }>({});
  const [analysisTab, setAnalysisTab] = useState(0);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sessionMode, setSessionMode] = useState(true);

  // Engine Settings
  const [engineDepth, setEngineDepth] = useState(DEFAULT_ENGINE_DEPTH);
  const [engineLines, setEngineLines] = useState(DEFAULT_ENGINE_LINES);

  // Hooks
  const { session } = useSession();
  const engine = useEngine(true, EngineName.Stockfish16);
  const chessdbData = useChessDB(fen).data;

  // ==================== UTILITY FUNCTIONS ====================

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

    for (const uciMove of pv.slice(0, MAX_PV_MOVES)) {
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

  const getSideToMove = useCallback((fen: string): string => {
    try {
      const chessInstance = new Chess(fen);
      return chessInstance.turn() === "w" ? "White" : "Black";
    } catch {
      return "Unknown";
    }
  }, []);

  // ==================== API FUNCTIONS ====================

  const updateLoadingState = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateAnalysisState = useCallback((updates: Partial<AnalysisState>) => {
    setAnalysisState(prev => ({ ...prev, ...updates }));
  }, []);

  const makeApiRequest = useCallback(async (query: string, fen: string): Promise<string> => {
    const token = await session?.getToken();
    
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        query,
        fen, // Send FEN in body as requested
        engineDepth,
        engineLines,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.message;
  }, [session, engineDepth, engineLines]);

  const fetchOpeningData = useCallback(async (): Promise<void> => {
    if (!fen) return;
    
    updateLoadingState('opening', true);
    updateAnalysisState({ error: null });

    try {
      const data = await getOpeningStats(fen);
      updateAnalysisState({ openingData: data });
    } catch (error) {
      console.error("Error fetching opening data:", error);
      updateAnalysisState({ 
        openingData: null, 
        error: error instanceof Error ? error.message : 'Failed to fetch opening data'
      });
    } finally {
      updateLoadingState('opening', false);
    }
  }, [fen, updateLoadingState, updateAnalysisState]);

  const analyzeWithStockfish = useCallback(async (): Promise<PositionEval | null> => {
    if (!engine || !fen) {
      console.warn("Stockfish engine not ready or FEN not provided");
      return null;
    }

    updateLoadingState('stockfish', true);
    updateAnalysisState({ error: null });

    try {
      const result = await engine.evaluatePositionWithUpdate({
        fen,
        depth: engineDepth,
        multiPv: engineLines,
        setPartialEval: (partialEval: PositionEval) => {
          updateAnalysisState({ stockfishResult: partialEval });
        },
      });

      updateAnalysisState({ stockfishResult: result });
      return result;
    } catch (error) {
      console.error("Error analyzing position with Stockfish:", error);
      updateAnalysisState({ 
        stockfishResult: null,
        error: error instanceof Error ? error.message : 'Stockfish analysis failed'
      });
      return null;
    } finally {
      updateLoadingState('stockfish', false);
    }
  }, [engine, fen, engineDepth, engineLines, updateLoadingState, updateAnalysisState]);

  const buildComprehensiveQuery = useCallback((customQuery?: string): string => {
    if (customQuery) return customQuery;

    const { stockfishResult, openingData } = analysisState;
    
    if (!stockfishResult) {
      return "Please wait for Stockfish analysis to complete.";
    }

    // Format engine analysis
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

    let query = `Analyze this chess position in detail using the Stockfish engine analysis and opening database information provided:

Position FEN: ${fen}
Side to Move: ${getSideToMove(fen)}
Best Move: ${stockfishResult.bestMove || "Not available"}

Engine Analysis (Depth ${engineDepth}, ${engineLines} line${engineLines > 1 ? "s" : ""}):
${formattedEngineLines}`;

    // Add opening data if available
    if (openingData) {
      const openingSpeech = getOpeningStatSpeech(openingData);
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

    return query;
  }, [analysisState, fen, engineDepth, engineLines, formatEvaluation, formatPrincipalVariation, getSideToMove]);

  const analyzePosition = useCallback(async (customQuery?: string): Promise<void> => {
    if (!fen) return;

    updateLoadingState('llm', true);
    updateAnalysisState({ llmResult: null, error: null });

    try {
      // Ensure we have fresh Stockfish analysis if no custom query
      if (!customQuery && !analysisState.stockfishResult) {
        await analyzeWithStockfish();
      }

      // Ensure we have opening data if not available
      if (!analysisState.openingData) {
        await fetchOpeningData();
      }

      const query = buildComprehensiveQuery(customQuery);
      const result = await makeApiRequest(query, fen);
      
      updateAnalysisState({ llmResult: result });
    } catch (error) {
      console.error("Error analyzing position:", error);
      updateAnalysisState({ 
        llmResult: null,
        error: error instanceof Error ? error.message : 'Analysis failed'
      });
    } finally {
      updateLoadingState('llm', false);
    }
  }, [fen, analysisState, analyzeWithStockfish, fetchOpeningData, buildComprehensiveQuery, makeApiRequest, updateLoadingState, updateAnalysisState]);

  // ==================== CHAT FUNCTIONS ====================

  const addChatMessage = useCallback((role: "user" | "assistant", content: string): ChatMessage => {
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, message]);
    return message;
  }, []);

  const sendChatMessage = useCallback(async (): Promise<void> => {
    if (!chatInput.trim() || !fen) return;

    addChatMessage("user", chatInput);
    setChatInput("");
    updateLoadingState('chat', true);

    try {
      const sideToMove = getSideToMove(fen);
      let query = `USER PROMPT: ${chatInput}\n\nCurrent Position: ${fen}\nSide to Move: ${sideToMove}`;

      if (sessionMode) {
        // Get engine analysis if not available
        let engineResult = analysisState.stockfishResult;
        if (!engineResult && engine) {
          engineResult = await analyzeWithStockfish();
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
        if (analysisState.openingData) {
          const openingSpeech = getOpeningStatSpeech(analysisState.openingData);
          query += `\n\nOpening Information:\n${openingSpeech}`;
        }
      }

      const result = await makeApiRequest(query, fen);
      addChatMessage("assistant", result);
    } catch (error) {
      console.error("Error sending chat message:", error);
      addChatMessage("assistant", "Sorry, there was an error processing your message. Please try again.");
    } finally {
      updateLoadingState('chat', false);
    }
  }, [chatInput, fen, sessionMode, analysisState, engine, analyzeWithStockfish, getSideToMove, formatEvaluation, formatPrincipalVariation, makeApiRequest, addChatMessage, updateLoadingState]);

  const handleChatKeyPress = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  }, [sendChatMessage]);

  const clearChatHistory = useCallback((): void => {
    setChatMessages([]);
  }, []);

  // ==================== CLICK HANDLERS ====================

  const handleEngineLineClick = useCallback((line: LineEval, lineIndex: number): void => {
    if (loadingState.llm || !fen) return;

    const sideToMove = getSideToMove(fen);
    const formattedLine = formatLineForLLM(line, lineIndex);
    
    let query = `Analyze this chess position and explain the following engine line in detail:

Position: ${fen}
Engine Line: ${formattedLine}
Side To Move: ${sideToMove}`;

    if (analysisState.openingData) {
      const openingSpeech = getOpeningStatSpeech(analysisState.openingData);
      query += `\n\nOpening Context:\n${openingSpeech}`;
    }

    query += `\n\nAnalyze this from different point of views.`;

    setAnalysisTab(0);
    analyzePosition(query);
  }, [loadingState.llm, fen, getSideToMove, formatLineForLLM, analysisState.openingData, analyzePosition]);

  const handleOpeningMoveClick = useCallback((move: Moves): void => {
    if (loadingState.llm || !fen) return;

    const sideToMove = getSideToMove(fen);
    const totalGames = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
    
    if (totalGames === 0) return;
    
    const whiteWinRate = ((move.white / totalGames) * 100 || 0).toFixed(1);
    const drawRate = ((move.draws / totalGames) * 100 || 0).toFixed(1);
    const blackWinRate = ((move.black / totalGames) * 100 || 0).toFixed(1);

    const query = `Analyze the chess move ${move.san} in this position:

Position: ${fen}
Opening: ${analysisState.openingData?.opening?.name || "Unknown"} (${analysisState.openingData?.opening?.eco || "N/A"})
Side To Move: ${sideToMove}

Move Statistics from Master Games:
- Move: ${move.san}
- Games played: ${totalGames}
- Average rating: ${move.averageRating}
- White wins: ${whiteWinRate}%
- Draws: ${drawRate}%
- Black wins: ${blackWinRate}%

Analyze this from different point of views.

Provide both theoretical background and practical advice.`;

    setAnalysisTab(0);
    analyzePosition(query);
  }, [loadingState.llm, fen, getSideToMove, analysisState.openingData, analyzePosition]);

  // ==================== EFFECTS ====================

  // Auto-recalculate when FEN or engine settings change
  useEffect(() => {
    if (!engine || !fen) return;

    // Clear previous results
    updateAnalysisState({
      stockfishResult: null,
      llmResult: null,
      openingData: null,
      error: null,
    });

    // Debounce analysis to avoid rapid fire requests
    const timeoutId = setTimeout(() => {
      analyzeWithStockfish();
      fetchOpeningData();
    }, ANALYSIS_DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [fen, engine, engineDepth, engineLines]); // Only depend on actual changing values

  // ==================== MEMOIZED VALUES ====================

  const returnValue = useMemo(() => ({
    // Analysis Results
    llmAnalysisResult: analysisState.llmResult,
    setLlmAnalysisResult: (result: string | null) => updateAnalysisState({ llmResult: result }),
    stockfishAnalysisResult: analysisState.stockfishResult,
    setStockfishAnalysisResult: (result: PositionEval | null) => updateAnalysisState({ stockfishResult: result }),
    openingData: analysisState.openingData,
    setOpeningData: (data: MasterGames | null) => updateAnalysisState({ openingData: data }),
    chessdbdata: chessdbData,
    error: analysisState.error,

    // Loading States
    llmLoading: loadingState.llm,
    setLlmLoading: (loading: boolean) => updateLoadingState('llm', loading),
    stockfishLoading: loadingState.stockfish,
    setStockfishLoading: (loading: boolean) => updateLoadingState('stockfish', loading),
    openingLoading: loadingState.opening,
    setOpeningLoading: (loading: boolean) => updateLoadingState('opening', loading),
    chatLoading: loadingState.chat,
    setChatLoading: (loading: boolean) => updateLoadingState('chat', loading),

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

    // Utility Functions
    formatEvaluation,
    formatPrincipalVariation,
    formatLineForLLM,
    getSideToMove,
  }), [
    analysisState,
    loadingState,
    chessdbData,
    moveSquares,
    analysisTab,
    chatMessages,
    chatInput,
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
    formatEvaluation,
    formatPrincipalVariation,
    formatLineForLLM,
    getSideToMove,
    updateAnalysisState,
    updateLoadingState,
  ]);

  return returnValue;
}