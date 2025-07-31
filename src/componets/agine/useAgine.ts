import { useEngine } from "@/stockfish/hooks/useEngine";
import { EngineName, PositionEval, LineEval } from "@/stockfish/engine/engine";
import {
  MasterGames,
  getOpeningStatSpeech,
  getOpeningStats,
  Moves,
  getLichessOpeningStats,
} from "@/componets/opening/helper";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "@clerk/nextjs";
import { Chess } from "chess.js";
import { CandidateMove, getChessDBSpeech, useChessDB } from "../tabs/Chessdb";
import { useLocalStorage } from "usehooks-ts";
import useGameReview, { MoveAnalysis, MoveQuality } from "./useGameReview";

export default function useAgine(fen: string) {
  // Analysis Results State
  const [llmAnalysisResult, setLlmAnalysisResult] = useState<string | null>(
    null
  );
  const [stockfishAnalysisResult, setStockfishAnalysisResult] =
    useState<PositionEval | null>(null);
  const [openingData, setOpeningData] = useState<MasterGames | null>(null);
  const [lichessOpeningData, setLichessOpeningData] =
    useState<MasterGames | null>(null);

  // Loading States
  const [llmLoading, setLlmLoading] = useState(false);
  const [stockfishLoading, setStockfishLoading] = useState(false);
  const [openingLoading, setOpeningLoading] = useState(false);
  const [lichessOpeningLoading, setLichessOpeningLoading] = useState(false);

  // UI State
  const [moveSquares, setMoveSquares] = useState<{ [square: string]: string }>(
    {}
  );
  const [analysisTab, setAnalysisTab] = useState(0);

  // Chat State
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionMode, setSessionMode] = useState(true);

  // Engine Settings (using usehooks-ts for localStorage)
  const [engineDepth, setEngineDepth] = useLocalStorage<number>(
    "engineDepth",
    15
  );
  const [engineLines, setEngineLines] = useLocalStorage<number>(
    "engineLines",
    3
  );

  // Hooks
  const { session } = useSession();
  const engine = useEngine(true, EngineName.Stockfish16);

  const { data, loading, error, queueing, refetch, requestAnalysis } =
    useChessDB(fen);
  const chessdbdata = data;

  const isValidFEN = (fen: string): boolean => {
  if (!fen || typeof fen !== 'string') return false;
  const parts = fen.trim().split(' ');
  return parts.length === 6;
};


  const legalMoves = isValidFEN(fen) ? new Chess(fen).moves() : [];

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

  const formatPrincipalVariation = useCallback(
    (pv: string[], startFen: string): string => {
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
    },
    []
  );

  const formatLineForLLM = useCallback(
    (line: LineEval, lineIndex: number): string => {
      const evaluation = formatEvaluation(line);
      const moves = formatPrincipalVariation(line.pv, line.fen);

      let formattedLine = `Line ${lineIndex + 1}: ${evaluation} - ${moves}`;

      if (line.resultPercentages) {
        formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
      }

      return formattedLine;
    },
    [formatEvaluation, formatPrincipalVariation]
  );

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

  const fetchLichessOpeningData = useCallback(async (): Promise<void> => {
    const currentFen = currentFenRef.current;
    setLichessOpeningLoading(true);

    try {
      const data = await getLichessOpeningStats(currentFen);
      // Only update if we're still analyzing the same position
      if (currentFenRef.current === currentFen) {
        setLichessOpeningData(data);
      }
    } catch (error) {
      console.error("Error fetching opening data:", error);
      if (currentFenRef.current === currentFen) {
        setLichessOpeningData(null);
      }
    } finally {
      if (currentFenRef.current === currentFen) {
        setLichessOpeningLoading(false);
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

  const {
    gameReview,
    setGameReview,
    gameReviewLoading,
    gameReviewProgress,
    setGameReviewLoading,
    generateGameReview,
  } = useGameReview(engine, engineDepth);

  const makeApiRequest = useCallback(
    async (fen: string, query: string, mode: string): Promise<string> => {
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
          body: JSON.stringify({ fen, query, mode }),
          signal: controller.signal,
        });

        const data = await response.json();
        return data.message;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request cancelled");
        }
        throw error;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [session]
  );

  // ==================== ABORT CHAT MESSAGE FUNCTION ====================

  const abortChatMessage = useCallback((): void => {
    if (abortControllerRef.current) {
      console.log("Aborting chat message...");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      // Reset loading state
      setChatLoading(false);

      // Optionally add a message indicating the request was cancelled
      const cancelMessage = {
        id: Date.now().toString(),
        role: "assistant" as const,
        content: "Message generation was cancelled.",
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, cancelMessage]);
    }
  }, []);

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
        fetchLichessOpeningData();
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    fen,
    engine,
    engineDepth,
    engineLines,
    analyzeWithStockfish,
    fetchOpeningData,
  ]);

  // ==================== OPTIMIZED CHAT FUNCTIONS ====================

  const sendChatMessage = useCallback(
    async (
      gameInfo?: string,
      currentMove?: string,
      puzzleMode?: boolean,
      puzzleQuery?: string,
      playMode?: boolean
    ): Promise<void> => {
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
        let query = `USER PROMPT: ${currentInput}\n\n Current FEN: ${currentFen}\n Side to Move: ${sideToMove}`;

        if (puzzleMode === true) {
          query += `\n\n Puzzle Mode: Active
          1. Act as an interactive chess puzzle coach.
          2. Do not reveal the solution immediately.
          3. Guide the user through the puzzle one step at a time.
          4. If the user asks for a hint, provide a subtle clue about the best move or tactical idea.
          5. If the user requests the solution directly, explain the correct sequence of moves and the reasoning behind them.
          6. Encourage the user to consider candidate moves, threats, and tactical motifs in the position.
          7. Always wait for the user's input before revealing the next step or answer, unless the user explicitly asks for the solution.
          `;
        } else if (playMode === true) {
          query += `\n\n Play Mode: Active
          1. Act as a supportive chess coach during live gameplay.
          2. Provide real-time strategic advice and tactical guidance.
          3. Help identify threats and opportunities in the current position.
          4. Suggest candidate moves and explain their benefits.
          5. Focus on practical, actionable advice for the current game situation.
          6. Be encouraging and supportive while providing accurate analysis.
          `;
        } else {
          query += `\n\n
          `;
        }

        if (puzzleQuery) {
          query += `\n\n Puzzle Info: ${puzzleQuery}`;
        }

        if (gameInfo) {
          query += `\n\n Game PGN \n ${gameInfo}`;
        }

        if (currentMove) {
          query += `\n Current Game Move: \n ${currentMove}`;
        }

        if (sessionMode && !playMode) {
          // Don't auto-add engine analysis in play mode to keep responses faster
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
                let formattedLine = `Line ${
                  index + 1
                }: ${evaluation} - ${moves}`;

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

          if (chessdbdata) {
            const candiateMoves = getChessDBSpeech(chessdbdata);
            query += `${candiateMoves}`;
          }
        }

        const mode =
          puzzleMode === true || puzzleQuery
            ? "puzzle"
            : playMode
            ? "play"
            : "position";
        const result = await makeApiRequest(currentFen, query, mode);

        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: result,
          timestamp: new Date(),
        };

        setChatMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Error sending chat message:", error);
        if (
          !(error instanceof Error && error.message === "Request cancelled")
        ) {
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content:
              "Sorry, there was an error processing your message. Please try again.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setChatLoading(false);
      }
    },
    [
      chatInput,
      sessionMode,
      stockfishAnalysisResult,
      engine,
      engineDepth,
      engineLines,
      openingData,
      chessdbdata,
      formatEvaluation,
      formatPrincipalVariation,
      makeApiRequest,
    ]
  );

  const handleChatKeyPress = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    },
    [sendChatMessage]
  );

  const clearChatHistory = useCallback((): void => {
    setChatMessages([]);
  }, []);

  // ==================== OPTIMIZED CLICK HANDLERS ====================

  const handleEngineLineClick = useCallback(
    async (line: LineEval, lineIndex: number): Promise<void> => {
      if (llmLoading) return;

      const currentFen = currentFenRef.current;
      const chessInstance = new Chess(currentFen);
      const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";
      const formattedLine = formatLineForLLM(line, lineIndex);

      let query = `Analyze this chess position and explain the following engine line in detail:

Position: ${currentFen}
Engine Line: ${formattedLine}
Side To Move ${sideToMove}

Please follow this structure in your analysis:
 1. First, describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
 2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
 3. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
 4. Take account of 1, 2, 3, 4 and provide the analysis for this engine line.
  
 Be concise but thorough, and use clear chess language.


`;

      // Add opening data
      if (openingData) {
        const openingSpeech = getOpeningStatSpeech(openingData);
        query += `\n\nOpening Information:\n${openingSpeech}`;
      }

      if (chessdbdata) {
        const candiateMoves = getChessDBSpeech(chessdbdata);
        query += `${candiateMoves}`;
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
        const result = await makeApiRequest(currentFen, query, "position");

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
        if (
          !(error instanceof Error && error.message === "Request cancelled")
        ) {
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content:
              "Sorry, there was an error analyzing the engine line. Please try again.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setChatLoading(false);
      }
    },
    [llmLoading, formatLineForLLM, openingData, makeApiRequest]
  );

  const handleOpeningMoveClick = useCallback(
    async (move: Moves): Promise<void> => {
      if (llmLoading) return;

      const currentFen = currentFenRef.current;
      const chessInstance = new Chess(currentFen);
      const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";

      const totalGames =
        (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
      const whiteWinRate = ((move.white / totalGames) * 100 || 0).toFixed(1);
      const drawRate = ((move.draws / totalGames) * 100 || 0).toFixed(1);
      const blackWinRate = ((move.black / totalGames) * 100 || 0).toFixed(1);

      const query = `Analyze the chess move ${move.san} in this position:

Position: ${currentFen}
Opening: ${openingData?.opening?.name || "Unknown"} (${
        openingData?.opening?.eco || "N/A"
      })
Side To Move ${sideToMove}

Move Statistics from Master Games:
- Move: ${move.san}
- Games played: ${totalGames}
- Average rating: ${move.averageRating}
- White wins: ${whiteWinRate}%
- Draws: ${drawRate}%
- Black wins: ${blackWinRate}%

Please follow this structure in your analysis:
 1. First, describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
 2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
 3. Then, understand the opening stats, the win, draw, loss rates and amount of games that were played by masters.
 4. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
 5. Take account of 1, 2, 3, 4 and provide the analysis for this move.
  
 Be concise but thorough, and use clear chess language.


 `;

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
        const result = await makeApiRequest(currentFen, query, "position");

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
        if (
          !(error instanceof Error && error.message === "Request cancelled")
        ) {
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content:
              "Sorry, there was an error analyzing the opening move. Please try again.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setChatLoading(false);
      }
    },
    [llmLoading, openingData, makeApiRequest]
  );

  const handleMoveClick = useCallback(
    async (move: CandidateMove): Promise<void> => {
      if (llmLoading) return;

      setChatLoading(true);

      const currentFen = currentFenRef.current;
      const chessInstance = new Chess(currentFen);
      const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";

      let query = `Analyze the chess move ${move.san} (${move.uci}) in this position:

Position: ${currentFen}
Side To Move: ${sideToMove}
ChessDb Score For Move ${move.score} the higher the postive score the better white is, the negative the score is better black is
ChessDb Winrate: ${move.winrate}

Please follow this structure in your analysis:
1. First, understand and describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
3. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
4. Take account of 1, 2, 3 and provide analysis of the candidate move and how it impacts the position
Be concise but thorough, and use clear chess language.

`;

      // Add opening data
      if (openingData) {
        const openingSpeech = getOpeningStatSpeech(openingData);
        query += `\n\nOpening Information:\n${openingSpeech}`;
      }

      if (chessdbdata) {
        const candiateMoves = getChessDBSpeech(chessdbdata);
        query += `${candiateMoves}`;
      }

      if (stockfishAnalysisResult) {
        const formattedEngineLines = stockfishAnalysisResult.lines
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

        query += `\n\nStockfish Analysis:\n${formattedEngineLines}`;
      } else {
        if (engine) {
          const engineResult = await engine.evaluatePositionWithUpdate({
            fen: currentFen,
            depth: engineDepth,
            multiPv: engineLines,
            setPartialEval: () => {},
          });

          if (engineResult) {
            const formattedEngineLines = engineResult.lines
              .map((line, index) => {
                const evaluation = formatEvaluation(line);
                const moves = formatPrincipalVariation(line.pv, line.fen);
                let formattedLine = `Line ${
                  index + 1
                }: ${evaluation} - ${moves}`;

                if (line.resultPercentages) {
                  formattedLine += ` (Win: ${line.resultPercentages.win}%, Draw: ${line.resultPercentages.draw}%, Loss: ${line.resultPercentages.loss}%)`;
                }

                return formattedLine;
              })
              .join("\n");

            query += `\n\nStockfish Analysis:\n${formattedEngineLines}`;
          }
        }
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

      try {
        const result = await makeApiRequest(currentFen, query, "position");

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
        if (
          !(error instanceof Error && error.message === "Request cancelled")
        ) {
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content:
              "Sorry, there was an error analyzing the move. Please try again.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setChatLoading(false);
      }
    },
    [llmLoading, openingData, makeApiRequest]
  );

  const handleFutureMoveLegalClick = useCallback(
    async (move: string): Promise<void> => {
      if (llmLoading) return;

      setChatLoading(true);

      const currentFen = currentFenRef.current;
      const chessInstance = new Chess(currentFen);
      chessInstance.move(move);
      const futureFen = chessInstance.fen();
      const sideToMove = chessInstance.turn() === "w" ? "White" : "Black";
      const newOpeningData = await getOpeningStats(futureFen);

      let query = `Analyze the chess move ${move} in this position:

Position: ${futureFen}
Side To Move: ${sideToMove}

Please follow this structure in your analysis:
1. First, understand and describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
3. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
4. Take account of 1, 2, 3 and provide analysis of the candidate move and how it impacts the position
Be concise but thorough, and use clear chess language.

`;

      // Add opening data
      if (newOpeningData) {
        const openingSpeech = getOpeningStatSpeech(newOpeningData);
        query += `\n\nOpening Information:\n${openingSpeech}`;
      }

      if (engine) {
        const engineResult = await engine.evaluatePositionWithUpdate({
          fen: futureFen,
          depth: engineDepth,
          multiPv: engineLines,
          setPartialEval: () => {},
        });

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

          query += `\n\nStockfish Analysis:\n${formattedEngineLines}`;
        }
      }

      query += `\n\nAnalyze this move from different points of view.`;

      setAnalysisTab(1);

      // Add user message to chat
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: `Analyze move: ${move}`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMessage]);

      try {
        const result = await makeApiRequest(futureFen, query, "position");

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
        if (
          !(error instanceof Error && error.message === "Request cancelled")
        ) {
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content:
              "Sorry, there was an error analyzing the move. Please try again.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setChatLoading(false);
      }
    },
    [llmLoading, makeApiRequest]
  );

  const handleMoveCoachClick = useCallback(
    async (review: MoveAnalysis): Promise<void> => {
      if (
        !setChatMessages ||
        !setChatLoading ||
        !setAnalysisTab ||
        !makeApiRequest ||
        !currentFenRef
      ) {
        console.warn("Chat functionality not properly configured");
        return;
      }

      if (chatLoading) return;

      setChatLoading(true);

      const pastFen = review.fen;
      const sideToMove = review.player === "w" ? "White" : "Black";

      const moveNumber = Math.floor(review.plyNumber / 2) + 1;
      const isWhiteMove = review.plyNumber % 2 === 0;
      const moveNotation = isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`;

      let query = `As a chess buddy, analyze this move from the game review:

    Move: ${moveNotation} ${review.notation}
    Classification: ${review.quality}
    Side: ${sideToMove}
    Position FEN: ${pastFen}

    Please follow this structure in your analysis:
    1. First, understand and describe the board state and key features of the position before the move (pawn structure, piece activity, king safety, imbalances, threats, etc).
    2. Next, analyze the move itself: what does it change in the position, and what are its immediate tactical or strategic consequences?
    3. Then, consider the engine lines and candidate moves: what alternatives were available, and how do they compare to the move played?
    4. Take account of 1, 2, 3 and explain why this move is classified as a ${review.quality} move.
  

    Be concise but thorough, and use clear chess language.
    `;
      // Add opening data
      if (openingData) {
        const openingSpeech = getOpeningStatSpeech(openingData);
        query += `\n\nOpening Information:\n${openingSpeech}`;
      }

      if (chessdbdata) {
        const candiateMoves = getChessDBSpeech(chessdbdata);
        query += `Candidate Moves:\n ${candiateMoves}`;
      }

      if (engine) {
        const engineResult = await engine.evaluatePositionWithUpdate({
          fen: pastFen,
          depth: engineDepth,
          multiPv: engineLines,
          setPartialEval: () => {},
        });

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

          query += `\n\nStockfish Analysis:\n${formattedEngineLines}`;
        }
      }

      // Switch to analysis tab (assuming tab 1 is for chat)
      setAnalysisTab(1);

      // Add user message to chat
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: `Agine, analyze move: ${moveNotation} ${review.notation} (${review.quality}) for ${sideToMove}`,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, userMessage]);

      try {
        const result = await makeApiRequest(pastFen, query, "position");

        // Add assistant response to chat
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: result,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Error getting coach analysis:", error);
        if (
          !(error instanceof Error && error.message === "Request cancelled")
        ) {
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content:
              "Sorry, I couldn't analyze that move right now. Please try again.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setChatLoading(false);
      }
    },
    [
      chatLoading,
      setChatMessages,
      setChatLoading,
      setAnalysisTab,
      makeApiRequest,
      currentFenRef,
      openingData,
    ]
  );

  const handleGameReviewSummaryClick = useCallback(
    async (review: MoveAnalysis[], gameInfo: string): Promise<void> => {
      if (
        !setChatMessages ||
        !setChatLoading ||
        !setAnalysisTab ||
        !makeApiRequest ||
        !currentFenRef
      ) {
        console.warn("Chat functionality not properly configured");
        return;
      }

      if (chatLoading) return;

      // Helper function to find moves by quality and player
      const findMovesByQuality = (quality: MoveQuality, player: "w" | "b") => {
        return review.filter(
          (move) => move.quality === quality && move.player === player
        );
      };

      // Collect the first key move of each type for each player
      const keyMoves: MoveAnalysis[] = [];

      // Add first blunder for each player (most important)
      const whiteBlunder = findMovesByQuality("Blunder", "w")[0];
      const blackBlunder = findMovesByQuality("Blunder", "b")[0];
      if (whiteBlunder) keyMoves.push(whiteBlunder);
      if (blackBlunder) keyMoves.push(blackBlunder);

      // Add first mistake for each player
      const whiteMistake = findMovesByQuality("Mistake", "w")[0];
      const blackMistake = findMovesByQuality("Mistake", "b")[0];
      if (whiteMistake) keyMoves.push(whiteMistake);
      if (blackMistake) keyMoves.push(blackMistake);

      // Add first dubious move for each player
      const whiteDubious = findMovesByQuality("Dubious", "w")[0];
      const blackDubious = findMovesByQuality("Dubious", "b")[0];
      if (whiteDubious) keyMoves.push(whiteDubious);
      if (blackDubious) keyMoves.push(blackDubious);

      // Sort by ply number to maintain game order
      keyMoves.sort((a, b) => a.plyNumber - b.plyNumber);

      // Switch to analysis tab first
      setAnalysisTab(1);

      // Add initial summary message
      const summaryMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: `Starting game review analysis for ${keyMoves.length} key moves from: ${gameInfo}`,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, summaryMessage]);

      // Process each key move sequentially
      for (let i = 0; i < keyMoves.length; i++) {
        const move = keyMoves[i];

        // Add a small delay between moves to prevent overwhelming the UI
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        try {
          await handleMoveCoachClick(move);
        } catch (error) {
          console.error(`Error analyzing move ${i + 1}:`, error);
          // Continue with next move even if one fails
        }
      }

      // Add final summary message
      const finalMessage = {
        id: (Date.now() + keyMoves.length + 1).toString(),
        role: "assistant" as const,
        content: `Game review complete! Analyzed ${keyMoves.length} key moves. The analysis above covers the most important moments in your game, focusing on critical mistakes and excellent moves. Review each analysis to understand the key concepts and improve your play.`,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, finalMessage]);
    },
    [
      chatLoading,
      setChatMessages,
      setChatLoading,
      setAnalysisTab,
      makeApiRequest,
      currentFenRef,
      handleMoveCoachClick,
    ]
  );

  const handleMoveAnnontateClick = useCallback(
    async (review: MoveAnalysis, customQuery?: string): Promise<void> => {
      if (
        !setChatMessages ||
        !setChatLoading ||
        !setAnalysisTab ||
        !makeApiRequest ||
        !currentFenRef
      ) {
        console.warn("Chat functionality not properly configured");
        return;
      }

      if (chatLoading) return;

      const currentFen = currentFenRef.current;
      const pastFen = review.fen;
      const sideToMove = review.player === "w" ? "White" : "Black";

      let query = `As a chess buddy, annontate this move from the game review:
  
  Move: ${review.notation}
  Classification: ${review.quality}
  Side: ${sideToMove}
  Position FEN: ${pastFen}
  Current FEN: ${currentFen}
  
  Please provide annontation about this move:
  1. Talk about how/why the move is ${review.quality} based on the NEXT ply engine anlysis
  2. Talk about candidates in this position using the CURRENT ply engine analysis
  3. How the move can impact the game


  Start the response with Agine Annotation:
  
  `;

      if (customQuery) {
        query += `\n Consider user thoughts/comments ${customQuery}`;
      }

      if (engine) {
        const engineResult = await engine.evaluatePositionWithUpdate({
          fen: pastFen,
          depth: engineDepth,
          multiPv: engineLines,
          setPartialEval: () => {},
        });

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

          query += `\n\nStockfish Analysis For CURRENT Ply:\n${formattedEngineLines}`;
        }
      }

      if (engine) {
        const engineResult = await engine.evaluatePositionWithUpdate({
          fen: currentFen,
          depth: engineDepth,
          multiPv: engineLines,
          setPartialEval: () => {},
        });

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

          query += `\n\nStockfish Analysis For NEXT Ply:\n${formattedEngineLines}`;
        }
      }

      // Switch to analysis tab (assuming tab 1 is for chat)
      setAnalysisTab(1);

      // Add user message to chat
      const userMessage = {
        id: Date.now().toString(),
        role: "user" as const,
        content: `Agine, annotate this move: ${review.notation} (${review.quality})`,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, userMessage]);

      setChatLoading(true);

      try {
        const result = await makeApiRequest(pastFen, query, "annotation");

        // Add assistant response to chat
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content: result,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("Error getting coach analysis:", error);
        if (
          !(error instanceof Error && error.message === "Request cancelled")
        ) {
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant" as const,
            content:
              "Sorry, I couldn't annotate that move right now. Please try again later.",
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setChatLoading(false);
      }
    },
    [
      chatLoading,
      setChatMessages,
      setChatLoading,
      setAnalysisTab,
      makeApiRequest,
      currentFenRef,
      openingData,
    ]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ==================== MEMOIZED RETURN OBJECT ====================
  //const {data, loading, error, queueing, refetch, requestAnalysis} = useChessDB(fen);
  return useMemo(
    () => ({
      // Analysis Results
      llmAnalysisResult,
      setLlmAnalysisResult,
      stockfishAnalysisResult,
      setStockfishAnalysisResult,
      openingData,
      setOpeningData,
      chessdbdata,
      loading,
      error,
      queueing,
      legalMoves,
      refetch,
      requestAnalysis,
      handleFutureMoveLegalClick,
      // Loading States
      llmLoading,
      setLlmLoading,
      stockfishLoading,
      setStockfishLoading,
      openingLoading,
      setOpeningLoading,
      lichessOpeningData,
      lichessOpeningLoading,
      fetchLichessOpeningData,
      setLichessOpeningLoading,

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

      // Game Review
      gameReview,
      gameReviewProgress,
      setGameReview,
      gameReviewLoading,
      setGameReviewLoading,

      // Functions
      fetchOpeningData,
      analyzeWithStockfish,
      generateGameReview,
      sendChatMessage,
      abortChatMessage, // New abort function
      handleChatKeyPress,
      clearChatHistory,
      handleEngineLineClick,
      handleOpeningMoveClick,
      handleMoveClick,
      handleMoveCoachClick,
      handleMoveAnnontateClick,
      handleGameReviewSummaryClick,

      // Utility Functions
      formatEvaluation,
      formatPrincipalVariation,
      formatLineForLLM,
    }),
    [
      llmAnalysisResult,
      stockfishAnalysisResult,
      openingData,
      lichessOpeningData,
      lichessOpeningLoading,
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
      gameReview,
      gameReviewLoading,
      gameReviewProgress,
      loading,
      error,
      queueing,
      legalMoves,
      refetch,
      requestAnalysis,
      setEngineDepth,
      setEngineLines,
      generateGameReview,
      fetchOpeningData,
      fetchLichessOpeningData,
      analyzeWithStockfish,
      sendChatMessage,
      abortChatMessage,
      handleChatKeyPress,
      clearChatHistory,
      handleEngineLineClick,
      handleOpeningMoveClick,
      handleMoveClick,
      handleMoveCoachClick,
      handleFutureMoveLegalClick,
      handleGameReviewSummaryClick,
      formatEvaluation,
      formatPrincipalVariation,
      formatLineForLLM,
    ]
  );
}
