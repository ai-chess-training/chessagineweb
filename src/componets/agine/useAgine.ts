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

  // Loading States
  const [llmLoading, setLlmLoading] = useState(false);
  const [stockfishLoading, setStockfishLoading] = useState(false);
  const [openingLoading, setOpeningLoading] = useState(false);

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
  }, [
    fen,
    engine,
    engineDepth,
    engineLines,
    analyzeWithStockfish,
    fetchOpeningData,
  ]);

  // ==================== OPTIMIZED ANALYSIS FUNCTION ====================


  // ==================== OPTIMIZED CHAT FUNCTIONS ====================

  const sendChatMessage = useCallback(
    async (gameInfo?: string, currentMove?: string, puzzleMode?: boolean, puzzleQuery?: string): Promise<void> => {
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

        if(puzzleMode === true){
          query += `\n\n Puzzle Mode: Active`
        }

        if(puzzleQuery){
          query += `\n\n Puzzle Info: ${puzzleQuery}`
        }

        if (gameInfo) {
          query += `\n\n Game PGN \n ${gameInfo}`;
        }

        if (currentMove) {
          query += `\n Current Game Move: \n ${currentMove}`;
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

        const result = await makeApiRequest(currentFen, query, puzzleMode === true || puzzleQuery ? "puzzle" : "position");

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
      }else{
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

      const currentFen = currentFenRef.current;
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
  Current FEN: ${currentFen}
  
  Please provide coaching insights about this move:
  1. Why was this move classified as "${review.quality}"?
  2. What were the key strategic or tactical considerations?
  3. If this was a mistake or blunder, what would have been better alternatives?
  4. What can be learned from this move for future games?
  
  Provide practical advice that would help improve understanding of similar positions.`;

      // Add opening data
      // if (openingData) {
      //   const openingSpeech = getOpeningStatSpeech(openingData);
      //   query += `\n\nOpening Information:\n${openingSpeech}`;
      // }

      // if (chessdbdata) {
      //   const candiateMoves = getChessDBSpeech(chessdbdata);
      //   query += `Candidate Moves:\n ${candiateMoves}`;
      // }

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
        content: `Agine, analyze move: ${moveNotation} ${review.notation} (${review.quality})`,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, userMessage]);

      setChatLoading(true);

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

     setChatLoading(true);

    // Helper function to find moves by quality and player
    const findMovesByQuality = (quality: MoveQuality, player: 'w' | 'b') => {
      return review.filter(move => 
        move.quality === quality && move.player === player
      );
    };

    const whiteBook = findMovesByQuality('Book', 'w')[0];
    const whiteGood = findMovesByQuality('Good', 'w')[0];
    const whiteVeryGood = findMovesByQuality('Very Good', 'w')[0];
    const whiteDubious = findMovesByQuality('Dubious', 'w')[0];
    const whiteMistake = findMovesByQuality('Mistake', 'w')[0];
    const whiteBlunder = findMovesByQuality('Blunder', 'w')[0];
    
    const blackBook = findMovesByQuality('Book', 'b')[0];
    const blackGood = findMovesByQuality('Good', 'b')[0];
    const blackVeryGood = findMovesByQuality('Very Good', 'b')[0];
    const blackDubious = findMovesByQuality('Dubious', 'b')[0];
    const blackMistake = findMovesByQuality('Mistake', 'b')[0];
    const blackBlunder = findMovesByQuality('Blunder', 'b')[0];

    // Helper function to format move notation
    const formatMove = (move: MoveAnalysis) => {
      if (!move) return null;
      
      const moveNumber = Math.floor(move.plyNumber / 2) + 1;
      const isWhiteMove = move.plyNumber % 2 === 0;
      const moveNotation = isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`;
      
      return {
        notation: `${moveNotation} ${move.notation}`,
        bestSanNotation: move.sanNotation,
        fen: move.fen,
        quality: move.quality,
        player: move.player === "w" ? "White" : "Black"
      };
    };

    // Format the found moves
    const keyMoves = {
      white: {
        book: formatMove(whiteBook),
        good: formatMove(whiteGood),
        very: formatMove(whiteVeryGood),
        dubious: formatMove(whiteDubious),
        mistake: formatMove(whiteMistake),
        blunder: formatMove(whiteBlunder)
      },
      black: {
        book: formatMove(blackBook),
        good: formatMove(blackGood),
        very: formatMove(blackVeryGood),
        dubious: formatMove(blackDubious),
        mistake: formatMove(blackMistake),
        blunder: formatMove(blackBlunder)
      }
    };

    
    
    let query = `As a chess coach, generate a comprehensive game review report based on these key moves from the analysis:

GAME REVIEW SUMMARY:

GAME INFO

${gameInfo}

WHITE'S KEY MOVES:`;

    // WHITE'S KEY MOVES
    if (keyMoves.white.book) {
      query += `\n- Book Move: ${keyMoves.white.book.notation} Best Move: ${keyMoves.white.book.bestSanNotation} (Position: ${keyMoves.white.book.fen})`;
    }
    if (keyMoves.white.good) {
      query += `\n- Good Move: ${keyMoves.white.good.notation} Best Move: ${keyMoves.white.good.bestSanNotation} (Position: ${keyMoves.white.good.fen})`;
    }
    if (keyMoves.white.very) {
      query += `\n- Very Good Move: ${keyMoves.white.very.notation} Best Move: ${keyMoves.white.very.bestSanNotation} (Position: ${keyMoves.white.very.fen})`;
    }
    if (keyMoves.white.dubious) {
      query += `\n- Dubious Move: ${keyMoves.white.dubious.notation} Best Move: ${keyMoves.white.dubious.bestSanNotation} (Position: ${keyMoves.white.dubious.fen})`;
    }
    if (keyMoves.white.mistake) {
      query += `\n- Mistake: ${keyMoves.white.mistake.notation} Best Move: ${keyMoves.white.mistake.bestSanNotation} (Position: ${keyMoves.white.mistake.fen})`;
    }
    if (keyMoves.white.blunder) {
      query += `\n- Blunder: ${keyMoves.white.blunder.notation} Best Move: ${keyMoves.white.blunder.bestSanNotation} (Position: ${keyMoves.white.blunder.fen})`;
    }

    query += `\n\nBLACK'S KEY MOVES:`;

    if (keyMoves.black.book) {
      query += `\n- Book Move: ${keyMoves.black.book.notation} Best Move: ${keyMoves.black.book.bestSanNotation} (Position: ${keyMoves.black.book.fen})`;
    }
    if (keyMoves.black.good) {
      query += `\n- Good Move: ${keyMoves.black.good.notation} Best Move: ${keyMoves.black.good.bestSanNotation} (Position: ${keyMoves.black.good.fen})`;
    }
    if (keyMoves.black.very) {
      query += `\n- Very Good Move: ${keyMoves.black.very.notation} Best Move: ${keyMoves.black.very.bestSanNotation} (Position: ${keyMoves.black.very.fen})`;
    }
    if (keyMoves.black.dubious) {
      query += `\n- Dubious Move: ${keyMoves.black.dubious.notation} Best Move: ${keyMoves.black.dubious.bestSanNotation} (Position: ${keyMoves.black.dubious.fen})`;
    }
    if (keyMoves.black.mistake) {
      query += `\n- Mistake: ${keyMoves.black.mistake.notation} Best Move: ${keyMoves.black.mistake.bestSanNotation} (Position: ${keyMoves.black.mistake.fen})`;
    }
    if (keyMoves.black.blunder) {
      query += `\n- Blunder: ${keyMoves.black.blunder.notation} Best Move: ${keyMoves.black.blunder.bestSanNotation} (Position: ${keyMoves.black.blunder.fen})`;
    }

    query += `\n\nPlease provide a detailed game review report covering:

1. OVERALL GAME ASSESSMENT
   - General performance evaluation for both players
   - Key turning points in the game

2. DETAILED MOVE ANALYSIS
   - For each identified move above, explain:
     * Why it was problematic
     * What the player should have played instead
     * The strategic/tactical concepts involved

3. LEARNING POINTS
   - Main lessons from this game
   - Specific areas for improvement for both players
   - Patterns to watch for in future games

4. RECOMMENDATIONS
   - Study suggestions based on the mistakes made
   - Training exercises that would help avoid similar errors

Format this as a comprehensive coaching report that would help both players improve their game.`;

    // Switch to analysis tab
    setAnalysisTab(1);

    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: "Agine generate game review report",
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
   

    try {
      // Use the FEN of the first key move found, or current position as fallback
      const firstKeyMoveFen = keyMoves.white.dubious?.fen || 
                             keyMoves.white.mistake?.fen || 
                             keyMoves.white.blunder?.fen || 
                             keyMoves.black.dubious?.fen || 
                             keyMoves.black.mistake?.fen || 
                             keyMoves.black.blunder?.fen || 
                             currentFenRef.current;

      const result = await makeApiRequest(firstKeyMoveFen, query, "review");

      // Add assistant response to chat
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant" as const,
        content: result,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error generating game review report:", error);
      if (
        !(error instanceof Error && error.message === "Request cancelled")
      ) {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant" as const,
          content:
            "Sorry, I couldn't generate the game review report right now. Please try again.",
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
    engine,
    engineDepth,
    engineLines,
    formatEvaluation,
    formatPrincipalVariation,
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

  if(customQuery){
    query += `\n Consider user thoughts/comments ${customQuery}`
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
      setEngineDepth,
      setEngineLines,
      generateGameReview,
      fetchOpeningData,
      analyzeWithStockfish,
      sendChatMessage,
      handleChatKeyPress,
      clearChatHistory,
      handleEngineLineClick,
      handleOpeningMoveClick,
      handleMoveClick,
      handleMoveCoachClick,
      handleGameReviewSummaryClick,
      formatEvaluation,
      formatPrincipalVariation,
      formatLineForLLM,
    ]
  );
}
