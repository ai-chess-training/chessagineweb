import React, { CSSProperties } from "react";
import {
  Stack,
  Button,
  TextField,
  Paper,
  Switch,
  Slider,
  Box,
  Divider,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from "@mui/material";
import {
  Settings as SettingsIcon,
  NavigateBefore,
  NavigateNext,
  RotateLeft,
  Upload,
  Gamepad,
} from "@mui/icons-material";
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { Chessboard } from "react-chessboard";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Chess, Square } from "chess.js";
import { PositionEval } from "@/stockfish/engine/engine";
import { MasterGames } from "../opening/helper";
import {
  Arrow,
  BoardOrientation,
} from "react-chessboard/dist/chessboard/types";
import { MoveAnalysis } from "../agine/useGameReview";
import { getMoveClassificationStyle } from "../tabs/GameReviewTab";
import PGNView from "../tabs/PgnView";

interface AiChessboardPanelProps {
  fen: string;
  moveSquares: { [square: string]: string };
  llmLoading: boolean;
  engine: UciEngine | undefined;
  analyzeWithStockfish: () => void;
  stockfishLoading: boolean;
  fetchOpeningData: () => void;
  openingLoading: boolean;
  setGame: (chess: Chess) => void;
  setFen: (fen: string) => void;
  setLlmAnalysisResult: (result: string | null) => void;
  setStockfishAnalysisResult: (result: PositionEval | null) => void;
  setOpeningData: (result: MasterGames | null) => void;
  puzzleMode?: boolean;
  playMode?: boolean;
  gameReviewMode?: boolean;
  onDropPuzzle?: (source: string, target: string) => boolean;
  handleSquarePuzzleClick?: (square: string) => void;
  reviewMove?: MoveAnalysis;
  puzzleCustomSquareStyle?: {
    [square: string]: CSSProperties;
  };
  game: Chess;
  side?: BoardOrientation;
  moves?: string[];
  stockfishAnalysisResult?: PositionEval | null;
  setMoveSquares: (square: { [square: string]: string }) => void;
  // Play mode specific props
  gameStatus?: string;
  playerSide?: "white" | "black";
  engineThinking?: boolean;
}

export default function AiChessboardPanel({
  fen,
  moveSquares,
  setGame,
  setFen,
  setLlmAnalysisResult,
  setStockfishAnalysisResult,
  setOpeningData,
  game,
  moves,
  stockfishAnalysisResult,
  puzzleMode,
  onDropPuzzle,
  handleSquarePuzzleClick,
  setMoveSquares,
  puzzleCustomSquareStyle,
  reviewMove,
  side,
  playMode,
  gameStatus = "waiting",
  playerSide = "white",
  gameReviewMode,
  engineThinking = false,
}: AiChessboardPanelProps) {
  const [customFen, setCustomFen] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [showArrows, setShowArrows] = useState(
    puzzleMode || playMode ? false : true
  );
  const [boardSize, setBoardSize] = useState(550);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [animationDuration, setAnimationDuration] = useState(300);
  const [showFen, setShowFen] = useState(false); // Default to false (hidden)

  // Resize functionality
  const [panelDimensions, setPanelDimensions] = useState({ width: 600, height: 800 });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimensionsRef = useRef({ width: 0, height: 0 });

  // Resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startDimensionsRef.current = { ...panelDimensions };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      
      // Set min and max limits
      const minWidth = 400;
      const maxWidth = 800;
      const minHeight = 500;
      const maxHeight = 800;
      
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startDimensionsRef.current.width + deltaX));
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startDimensionsRef.current.height + deltaY));
      
      // Auto-adjust board size based on panel width
      const newBoardSize = Math.min(800, Math.max(300, newWidth - 70));
      setBoardSize(newBoardSize);
      
      setPanelDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelDimensions]);

  // Memoize the initial game setup to avoid recalculation
  const gameHistory = useMemo(() => {
    const baseGame = new Chess();
    const history: string[] = [baseGame.fen()];

    if (moves && moves.length > 0) {
      for (const move of moves) {
        try {
          baseGame.move(move);
          history.push(baseGame.fen());
        } catch (err) {
          console.log(err);
          console.warn("Invalid move in provided history:", move);
          break;
        }
      }
    }

    return history;
  }, [moves]);

  // Effect to update game state when moves change
  useEffect(() => {
    const startGame = new Chess(gameHistory[0]);

    setGame(startGame);
    setFen(gameHistory[0]);
    setMoveHistory(gameHistory);
    setCurrentMoveIndex(gameHistory.length - 1);
  }, [gameHistory, setGame, setFen]);

  // Fixed function to safely mutate game state with proper branching
  const safeGameMutate = useCallback(
    (modify: (game: Chess) => void) => {
      const currentFen = fen;
      if (!currentFen) return;

      const newGame = new Chess(currentFen);
      modify(newGame);

      const newFen = newGame.fen();

      const newHistory = [
        ...moveHistory.slice(0, currentMoveIndex + 1),
        newFen,
      ];

      setGame(newGame);
      setFen(newFen);
      setMoveHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);
      setOpeningData(null);
    },
    [fen, moveHistory, currentMoveIndex, setGame, setFen, setOpeningData]
  );

  // Memoized clear analysis callback
  const clearAnalysis = useCallback(() => {
    setLlmAnalysisResult(null);
    setStockfishAnalysisResult(null);
    setOpeningData(null);
  }, [setLlmAnalysisResult, setStockfishAnalysisResult, setOpeningData]);

  // Check if player can move in play mode
  const canPlayerMove = useCallback(() => {
    if (!playMode || gameStatus !== "playing") return true;

    const currentTurn = game.turn();
    return (
      ((side === "white" && currentTurn === "w") ||
        (side === "black" && currentTurn === "b")) &&
      !engineThinking
    );
  }, [playMode, gameStatus, game, playerSide, engineThinking]);

  // Custom onDrop handler for gameplay
  const handlePlayerMove = useCallback(
    (source: string, target: string) => {
      if (playMode) {
        if (!canPlayerMove()) return false;

        try {
          const move = game.move({
            from: source,
            to: target,
            promotion: "q",
          });

          if (move) {
            const newGame = new Chess(game.fen());
            setGame(newGame);
            setFen(newGame.fen());
            setSelectedSquare(null);
            setLegalMoves([]);
            setMoveSquares({});
            return true;
          }
        } catch (error) {
          console.log("Invalid move:", error);
        }
        return false;
      } else {
        let moveMade = false;
        safeGameMutate((gameInstance) => {
          const move = gameInstance.move({
            from: source,
            to: target,
            promotion: "q",
          });
          if (move) {
            moveMade = true;
            clearAnalysis();
          }
        });
        setMoveSquares({});
        return moveMade;
      }
    },
    [
      playMode,
      canPlayerMove,
      game,
      setGame,
      setFen,
      setMoveSquares,
      safeGameMutate,
      clearAnalysis,
    ]
  );

  const pgnMoves = useMemo(() => {
    if (moveHistory.length <= 1) return [];

    const moves: string[] = [];
    const tempGame = new Chess();

    // Start from the initial position and replay each move
    for (let i = 1; i < moveHistory.length; i++) {
      const prevFen = moveHistory[i - 1];
      const currentFen = moveHistory[i];

      tempGame.load(prevFen);
      const possibleMoves = tempGame.moves({ verbose: true });

      // Find which move leads to the current FEN
      for (const move of possibleMoves) {
        const testGame = new Chess(prevFen);
        testGame.move(move);

        if (testGame.fen() === currentFen) {
          moves.push(move.san);
          break;
        }
      }
    }

    return moves;
  }, [moveHistory]);

  const goToMoveFromPGN = useCallback(
    (moveNumber: number) => {
      // moveNumber is 1-based from PGN component
      // Convert to moveHistory index (moveHistory[0] is starting position)
      const historyIndex = moveNumber;

      if (historyIndex >= 0 && historyIndex < moveHistory.length) {
        const newFen = moveHistory[historyIndex];
        const newGame = new Chess(newFen);

        setGame(newGame);
        setFen(newFen);
        setCurrentMoveIndex(historyIndex);
        setSelectedSquare(null);
        setLegalMoves([]);
        clearAnalysis();
      }
    },
    [moveHistory, setGame, setFen, clearAnalysis]
  );

  // Optimized square click handler
  const handleSquareClick = useCallback(
    (square: string) => {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (selectedSquare && legalMoves.includes(square)) {
        if (playMode) {
          try {
            const move = game.move({
              from: selectedSquare,
              to: square,
              promotion: "q",
            });

            if (move) {
              const newGame = new Chess(game.fen());
              setGame(newGame);
              setFen(newGame.fen());
            }
          } catch (error) {
            console.log("Invalid move:", error);
          }
        } else {
          safeGameMutate((newGame) => {
            try {
              const move = newGame.move({
                from: selectedSquare,
                to: square,
                promotion: "q",
              });

              if (move) {
                clearAnalysis();
              }
            } catch (error) {
              console.log("Invalid move:", error);
            }
          });
        }

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

      if (playMode) {
        const playerColor = side === "white" ? "w" : "b";
        if (piece.color !== playerColor) {
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
      }

      const moves = game.moves({ square: square as Square, verbose: true });
      const targetSquares = moves.map((move) => move.to);

      setSelectedSquare(square);
      setLegalMoves(targetSquares);
    },
    [
      playMode,
      canPlayerMove,
      selectedSquare,
      legalMoves,
      game,
      playerSide,
      setGame,
      setFen,
      safeGameMutate,
      clearAnalysis,
    ]
  );

  const customArrows = useMemo((): Arrow[] => {
    if (!showArrows) {
      return [];
    }

    const arrows: Arrow[] = [];

    // Only show review arrow if reviewMove exists and corresponds to current position
    if (reviewMove) {
      const reviewArrow: Arrow = [
        reviewMove.arrowMove.from,
        reviewMove.arrowMove.to,
        getMoveClassificationStyle(reviewMove.quality).color,
      ];
      arrows.push(reviewArrow);

      // Only add engine arrow if reviewMove quality is not "Best"
      if (reviewMove.quality !== "Best" && stockfishAnalysisResult?.lines) {
        const bestLine = stockfishAnalysisResult.lines[0]?.pv;
        if (bestLine && bestLine.length > 0) {
          const move = bestLine[0];
          if (move && move.length >= 4) {
            const from = move.substring(0, 2);
            const to = move.substring(2, 4);

            // Avoid duplicate arrows
            const arrowKey = `${from}-${to}`;
            const reviewArrowKey = `${reviewMove.arrowMove.from}-${reviewMove.arrowMove.to}`;

            if (arrowKey !== reviewArrowKey) {
              const engineArrow: Arrow = [
                from as Square,
                to as Square,
                "#4caf50",
              ];
              arrows.push(engineArrow);
            }
          }
        }
      }
    } else if (!reviewMove && stockfishAnalysisResult?.lines) {
      // Only show engine arrow if no reviewMove is present
      const bestLine = stockfishAnalysisResult.lines[0]?.pv;
      if (bestLine && bestLine.length > 0) {
        const move = bestLine[0];
        if (move && move.length >= 4) {
          const from = move.substring(0, 2);
          const to = move.substring(2, 4);
          const engineArrow: Arrow = [from as Square, to as Square, "#4caf50"];
          arrows.push(engineArrow);
        }
      }
    }

    return arrows;
  }, [showArrows, reviewMove, stockfishAnalysisResult, currentMoveIndex]);

  // Memoized custom square styles
  const customSquareStyles = useMemo(() => {
    const styles: { [square: string]: React.CSSProperties } = {};

    Object.entries(moveSquares).forEach(([square, color]) => {
      styles[square] = { backgroundColor: color };
    });

    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(156, 39, 176, 0.6)",
        ...styles[selectedSquare],
      };
    }

    legalMoves.forEach((square) => {
      const piece = game.get(square as Square);
      const background = piece
        ? "radial-gradient(circle, rgba(156, 39, 176, 0.8) 85%, transparent 85%)"
        : "radial-gradient(circle, rgba(156, 39, 176, 0.4) 25%, transparent 25%)";

      styles[square] = {
        background,
        ...styles[square],
      };
    });

    return styles;
  }, [moveSquares, selectedSquare, legalMoves, game]);

  // Navigation callbacks
  const goToPreviousMove = useCallback(() => {
    if (currentMoveIndex > 0) {
      const newIndex = currentMoveIndex - 1;
      const newFen = moveHistory[newIndex];
      const newGame = new Chess(newFen);

      setGame(newGame);
      setFen(newFen);
      setCurrentMoveIndex(newIndex);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [currentMoveIndex, moveHistory, setGame, setFen]);

  const goToNextMove = useCallback(() => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const newIndex = currentMoveIndex + 1;
      const newFen = moveHistory[newIndex];
      const newGame = new Chess(newFen);

      setGame(newGame);
      setFen(newFen);
      setCurrentMoveIndex(newIndex);
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [currentMoveIndex, moveHistory, setGame, setFen]);

  // Load custom FEN callback
  const loadCustomFen = useCallback(() => {
    try {
      const newGame = new Chess(customFen);
      setGame(newGame);
      setFen(newGame.fen());
      setMoveHistory([newGame.fen()]);
      setCurrentMoveIndex(0);
      clearAnalysis();
      setCustomFen("");
    } catch (error) {
      console.log(error);
      alert("Invalid FEN string.");
    }
  }, [customFen, setGame, setFen, clearAnalysis]);

  // Flip board callback
  const flipBoard = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  // Settings handlers
  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const handleBoardSizeChange = useCallback(
    (_: Event, newValue: number | number[]) => {
      setBoardSize(newValue as number);
    },
    []
  );

  const handleAnimationChange = useCallback(
    (_: Event, newValue: number | number[]) => {
      setAnimationDuration(newValue as number);
    },
    []
  );

  // Navigation button disabled states
  const isPreviousDisabled = currentMoveIndex <= 0;
  const isNextDisabled = currentMoveIndex >= moveHistory.length - 1;

  // Determine board orientation
  const getBoardOrientation = useCallback(() => {
    if (puzzleMode) return side;
    if (playMode) return side;
    return isFlipped ? "black" : "white";
  }, [puzzleMode, playMode, side, playerSide, isFlipped]);

  // Get mode display info
  const getModeInfo = () => {
    if (puzzleMode) return { label: "Puzzle Mode", color: "#ff9800" };
    if (playMode) return { label: "Play Mode", color: "#4caf50" };
    return { label: "Analysis Mode", color: "#9c27b0" };
  };

  const modeInfo = getModeInfo();

  // Determine if PGN should be shown
  const shouldShowPGN = !gameReviewMode && !puzzleMode && !playMode;

  return (
    <Box
      ref={containerRef}
      sx={{
        width: `${panelDimensions.width}px`,
        height: `${panelDimensions.height}px`,
        position: 'relative',
        border: '1px solid #444',
        borderRadius: 2,
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      <Box
        sx={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 2,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#2a2a2a',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#555',
            borderRadius: '3px',
            '&:hover': {
              background: '#666',
            },
          },
        }}
      >
        {/* Header */}
        <Paper
          sx={{
            p: 1.5,
            backgroundColor: "#1a1a1a",
            borderRadius: 2,
            mb: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Gamepad sx={{ color: modeInfo.color, fontSize: '20px' }} />
              <Typography
                variant="subtitle2"
                sx={{ color: "white", fontWeight: 600 }}
              >
                Chessboard
              </Typography>
            </Box>
            <Chip
              label={modeInfo.label}
              size="small"
              sx={{
                backgroundColor: `${modeInfo.color}20`,
                color: modeInfo.color,
                fontSize: "0.65rem",
                fontWeight: 600,
              }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              onClick={() => setSettingsOpen(true)}
              sx={{ color: "white", p: 0.5 }}
              size="small"
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Board Info */}
          <Stack direction="row" alignItems="center" spacing={2}>
            {(puzzleMode || playMode) && (
              <Typography variant="caption" sx={{ color: "grey.400" }}>
                Orientation: {getBoardOrientation()}
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Chessboard */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <Chessboard
            position={fen}
            onPieceDrop={puzzleMode ? onDropPuzzle : handlePlayerMove}
            onSquareClick={
              puzzleMode ? handleSquarePuzzleClick : handleSquareClick
            }
            allowDragOutsideBoard={false}
            animationDuration={animationDuration}
            showBoardNotation={showCoordinates}
            customSquareStyles={
              puzzleMode ? puzzleCustomSquareStyle : customSquareStyles
            }
            customArrows={customArrows}
            boardWidth={boardSize}
            boardOrientation={getBoardOrientation()}
          />
        </Box>

        {/* Navigation Controls */}
        {!playMode && !gameReviewMode && !puzzleMode && (
          <Stack spacing={2}>
            {/* Navigation buttons */}
            <Stack direction="row" spacing={2}>
              <Button
                onClick={goToPreviousMove}
                variant="contained"
                disabled={isPreviousDisabled}
                startIcon={<NavigateBefore fontSize="small" />}
                fullWidth
                size="small"
                sx={{
                  backgroundColor: "#9c27b0",
                  "&:hover": {
                    backgroundColor: "#7b1fa2",
                  },
                  "&:disabled": {
                    backgroundColor: "rgba(156, 39, 176, 0.3)",
                  },
                }}
              >
                Previous
              </Button>
              <Button
                onClick={goToNextMove}
                variant="contained"
                disabled={isNextDisabled}
                endIcon={<NavigateNext fontSize="small" />}
                fullWidth
                size="small"
                sx={{
                  backgroundColor: "#9c27b0",
                  "&:hover": {
                    backgroundColor: "#7b1fa2",
                  },
                  "&:disabled": {
                    backgroundColor: "rgba(156, 39, 176, 0.3)",
                  },
                }}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        )}

        {!puzzleMode && !playMode && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {/* Current FEN Display - Only show if showFen is true */}
            {showFen && (
              <Paper
                sx={{
                  p: 1.5,
                  backgroundColor: "#1a1a1a",
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" sx={{ color: "grey.300", mb: 1 }}>
                  Current Position (FEN)
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "white",
                    fontFamily: "monospace",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    p: 1,
                    borderRadius: 1,
                    wordBreak: "break-all",
                    fontSize: "0.75rem",
                    display: "block",
                  }}
                >
                  {fen}
                </Typography>
              </Paper>
            )}

            {/* PGN View */}
            {shouldShowPGN && pgnMoves.length > 0 && (
              <PGNView
                moves={pgnMoves}
                moveAnalysis={null}
                goToMove={goToMoveFromPGN}
                currentMoveIndex={currentMoveIndex}
              />
            )}
          </Stack>
        )}

        {(puzzleMode || playMode) && <Divider sx={{ mt: 2 }} />}
      </Box>

      {/* Resize Handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '16px',
          height: '16px',
          cursor: 'nw-resize',
          backgroundColor: '#555',
          borderTopRightRadius: '3px',
          opacity: 0.7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': {
            opacity: 1,
            backgroundColor: '#666',
          },
        }}
      >
        <OpenInFullIcon 
          sx={{ 
            fontSize: '10px', 
            color: '#ccc',
            transform: 'rotate(180deg)'
          }} 
        />
      </Box>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: {
            backgroundColor: "#1a1a1a",
            color: "white",
            minWidth: 400,
          },
        }}
      >
        <DialogTitle>Chessboard Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                Board Size: {boardSize}px
              </Typography>
              <Slider
                value={boardSize}
                onChange={handleBoardSizeChange}
                min={300}
                max={800}
                step={25}
                sx={{
                  color: "#9c27b0",
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                Animation Speed: {animationDuration}ms
              </Typography>
              <Slider
                value={animationDuration}
                onChange={handleAnimationChange}
                min={0}
                max={1000}
                step={50}
                sx={{
                  color: "#9c27b0",
                }}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ color: "grey.300", mb: 2 }}>
                Display Options
              </Typography>
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Show Coordinates
                  </Typography>
                  <Switch
                    checked={showCoordinates}
                    onChange={(e) => setShowCoordinates(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#9c27b0",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        {
                          backgroundColor: "#9c27b0",
                        },
                    }}
                  />
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Show FEN String
                  </Typography>
                  <Switch
                    checked={showFen}
                    onChange={(e) => setShowFen(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": {
                        color: "#9c27b0",
                      },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                        {
                          backgroundColor: "#9c27b0",
                        },
                    }}
                  />
                </Stack>

                {!puzzleMode && !playMode && (
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography variant="body2" sx={{ color: "grey.300" }}>
                      Show Analysis Arrows
                    </Typography>
                    <Switch
                      checked={showArrows}
                      onChange={(e) => setShowArrows(e.target.checked)}
                      sx={{
                        "& .MuiSwitch-switchBase.Mui-checked": {
                          color: "#9c27b0",
                        },
                        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                          {
                            backgroundColor: "#9c27b0",
                          },
                      }}
                    />
                  </Stack>
                )}
              </Stack>
            </Box>

            {!puzzleMode && !playMode && (
              <>
                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

                <Box>
                  <Typography variant="body2" sx={{ color: "grey.300", mb: 2 }}>
                    Board Controls
                  </Typography>

                  <Stack spacing={2}>
                    {/* Flip Board Button */}
                    <Button
                      variant="outlined"
                      onClick={flipBoard}
                      startIcon={<RotateLeft />}
                      fullWidth
                      sx={{
                        color: "#9c27b0",
                        borderColor: "#9c27b0",
                        "&:hover": {
                          borderColor: "#7b1fa2",
                          backgroundColor: "rgba(156, 39, 176, 0.1)",
                        },
                      }}
                    >
                      Flip Board
                    </Button>

                    {/* FEN Input */}
                    <TextField
                      label="Load custom position (FEN)"
                      variant="outlined"
                      value={customFen}
                      onChange={(e) => setCustomFen(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: "rgba(255,255,255,0.05)",
                          "& fieldset": {
                            borderColor: "rgba(255,255,255,0.2)",
                          },
                          "&:hover fieldset": {
                            borderColor: "rgba(255,255,255,0.3)",
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#9c27b0",
                          },
                        },
                      }}
                      slotProps={{
                        input: {
                          sx: { color: "white" },
                        },
                        inputLabel: {
                          sx: { color: "grey.400" },
                        },
                      }}
                      placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    />

                    <Button
                      variant="contained"
                      onClick={loadCustomFen}
                      startIcon={<Upload />}
                      disabled={!customFen.trim()}
                      fullWidth
                      sx={{
                        backgroundColor: "#9c27b0",
                        "&:hover": {
                          backgroundColor: "#7b1fa2",
                        },
                        "&:disabled": {
                          backgroundColor: "rgba(156, 39, 176, 0.3)",
                        },
                      }}
                    >
                      Load FEN
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose} sx={{ color: "#9c27b0" }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}