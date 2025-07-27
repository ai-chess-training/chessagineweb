import React, { JSX, useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { grey, purple } from "@mui/material/colors";
import {
  TrendingDown,
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  PlayCircle,
  ThumbsUp,
  MessageCircle,
  BookA,
  Pen,
  Sparkles,
  TrendingUp,
  Crown,
} from "lucide-react";
import { MoveAnalysis, MoveQuality } from "../agine/useGameReview";
import { Person } from "@mui/icons-material";

export interface MoveStats {
  Best: number;
  "Very Good": number;
  Good: number;
  Dubious: number;
  Mistake: number;
  Blunder: number;
  Book: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GameReviewTabProps {
  gameReview: MoveAnalysis[] | null;
  generateGameReview: (moves: string[]) => Promise<void>;
  moves: string[];
  gameReviewLoading: boolean;
  gameReviewProgress: number;
  goToMove: (index: number) => void;
  currentMoveIndex: number;
  handleMoveCoachClick: (gameReview: MoveAnalysis) => void;
  gameInfo: string;
  whitePlayer: string;
  blackPlayer: string;
  handleMoveAnnontateClick: (review: MoveAnalysis, customQuery?: string) => void;
  handleGameReviewClick: (review: MoveAnalysis[], gameInfo: string) => void;
  chatLoading: boolean;
  comment: string;
}

export const getMoveClassificationStyle = (classification: MoveQuality) => {
  switch (classification) {
    case "Best":
      return {
        color: "#81C784", // Chess.com green for best moves
        icon: <Target size={16} />,
        bgColor: "#81C78420",
      };
    case "Very Good":
      return {
        color: "#4FC3F7", // Chess.com light blue for very good moves
        icon: <ThumbsUp size={16} />,
        bgColor: "#4FC3F720",
      };
    case "Good":
      return {
        color: "#AED581", // Chess.com light green for good moves
        icon: <CheckCircle size={16} />,
        bgColor: "#AED58120",
      };
    case "Dubious":
      return {
        color: "#FFB74D", // Chess.com orange for dubious moves
        icon: <TrendingDown size={16} />,
        bgColor: "#FFB74D20",
      };
    case "Mistake":
      return {
        color: "#FF8A65", // Chess.com light red for mistakes
        icon: <AlertTriangle size={16} />,
        bgColor: "#FF8A6520",
      };
    case "Blunder":
      return {
        color: "#E57373", // Chess.com red for blunders
        icon: <XCircle size={16} />,
        bgColor: "#E5737320",
      };
    case "Book":
      return {
        color: "#FFD54F", // Chess.com yellow for book moves
        icon: <BookA size={16} />,
        bgColor: "#FFD54F20",
      };
  }
};

const GameReviewTab: React.FC<GameReviewTabProps> = ({
  gameReview,
  generateGameReview,
  moves,
  gameReviewLoading,
  goToMove,
  currentMoveIndex,
  handleMoveCoachClick,
  handleMoveAnnontateClick,
  handleGameReviewClick,
  chatLoading,
  comment,
  whitePlayer,
  blackPlayer,
  gameReviewProgress,
  gameInfo
}) => {
  const [userThoughts, setUserThoughts] = useState<string>("");
  const [loadingStates, setLoadingStates] = useState<{
    chat: Record<number, boolean>;
    annotate: Record<number, boolean>;
    gameReport: boolean;
  }>({
    chat: {},
    annotate: {},
    gameReport: false,
  });

  useEffect(() => {
    setUserThoughts(comment || "");
  }, [comment]);

  useEffect(() => {
    if (!chatLoading) {
      setLoadingStates({
        chat: {},
        annotate: {},
        gameReport: false,
      });
    }
  }, [chatLoading]);

  const handleChatClick = (review: MoveAnalysis) => {
    setLoadingStates(prev => ({
      ...prev,
      chat: { ...prev.chat, [review.plyNumber]: true }
    }));
    handleMoveCoachClick(review);
  };

  const handleAnnotateClick = (review: MoveAnalysis, customQuery?: string) => {
    setLoadingStates(prev => ({
      ...prev,
      annotate: { ...prev.annotate, [review.plyNumber]: true }
    }));
    handleMoveAnnontateClick(review, customQuery);
  };

  const handleGameReportClick = () => {
    setLoadingStates(prev => ({
      ...prev,
      gameReport: true
    }));
    
    const stats = getStatistics();
    let newGameInfo = gameInfo;
    if (stats) {
      const { whiteStats, blackStats } = stats;
      const whiteStatsStr = `White Stats: Best: ${whiteStats.Best}, Very Good: ${whiteStats["Very Good"]}, Good: ${whiteStats.Good}, Dubious: ${whiteStats.Dubious}, Mistake: ${whiteStats.Mistake}, Blunder: ${whiteStats.Blunder}, Book: ${whiteStats.Book}, accuracy: ${calculateAccuracy(whiteStats)} `;
      const blackStatsStr = `Black Stats: Best: ${blackStats.Best}, Very Good: ${blackStats["Very Good"]}, Good: ${blackStats.Good}, Dubious: ${blackStats.Dubious}, Mistake: ${blackStats.Mistake}, Blunder: ${blackStats.Blunder}, Book: ${blackStats.Book}, accuracy: ${calculateAccuracy(blackStats)}`;
      newGameInfo = `${gameInfo}\n GAME REVIEW DETAILS${whiteStatsStr}\n${blackStatsStr}`;
    }
    handleGameReviewClick(gameReview!, newGameInfo);
  };
  
  const getStatistics = () => {
    if (!gameReview) return null;

    const whiteStats: MoveStats = {
      Best: 0,
      "Very Good": 0,
      Good: 0,
      Dubious: 0,
      Mistake: 0,
      Blunder: 0,
      Book: 0,
    };
    const blackStats: MoveStats = { ...whiteStats };

    gameReview.forEach((review) => {
      const stats = review.player === "w" ? whiteStats : blackStats;
      stats[review.quality]++;
    });

    return { whiteStats, blackStats };
  };

  const calculateAccuracy = (stats: MoveStats) => {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const goodMoves = stats.Best + stats["Very Good"] + stats.Good + stats.Book;
    return Math.round((goodMoves / total) * 100);
  };

  const StatCard = ({
    title,
    stats,
  }: {
    title: string;
    stats: MoveStats;
    side: "white" | "black";
  }) => {
    const accuracy = calculateAccuracy(stats);

    return (
      <Card
        sx={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          border: `1px solid ${purple[800]}`,
          borderRadius: 3,
          overflow: "hidden",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: `linear-gradient(90deg, ${purple[500]} 0%, ${purple[300]} 100%)`,
          }
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: "white",
                  fontWeight: 600,
                  background: `linear-gradient(45deg, ${purple[300]} 30%, ${purple[100]} 90%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {title}
              </Typography>
              <Chip
                label={`${accuracy}% Accuracy`}
                size="small"
                sx={{
                  background: accuracy >= 90
                    ? `linear-gradient(45deg, ${purple[600]} 30%, ${purple[400]} 90%)`
                    : accuracy >= 80
                    ? "linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)"
                    : "linear-gradient(45deg, #F44336 30%, #EF5350 90%)",
                  color: "white",
                  fontWeight: "bold",
                  borderRadius: 2,
                  fontSize: "0.75rem",
                }}
              />
            </Box>

            <Grid container spacing={1.5}>
              {Object.entries(stats).map(([classification, count]) => {
                const style = getMoveClassificationStyle(classification as MoveQuality);
                return (
                  <Stack key={classification}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        background: style.bgColor,
                        border: `1px solid ${style.bgColor}40`,
                        backdropFilter: "blur(10px)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 8px 25px ${style.bgColor}30`,
                        }
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box 
                          sx={{ 
                            color: style.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: `${style.color}20`,
                          }}
                        >
                          {style.icon}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ color: grey[200], flex: 1, fontWeight: 500 }}
                        >
                          {classification}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ 
                            color: style.color, 
                            fontWeight: "bold",
                            minWidth: "24px",
                            textAlign: "center",
                          }}
                        >
                          {count}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                );
              })}
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  if (!gameReview || gameReview.length === 0) {
    return (
      <Card
        sx={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          border: `1px solid ${purple[800]}`,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={4} alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
            <Box sx={{ textAlign: "center" }}>
              <Sparkles size={48} color={purple[400]} style={{ marginBottom: 16 }} />
              <Typography 
                variant="h5" 
                sx={{ 
                  color: "white",
                  fontWeight: 600,
                  mb: 2,
                  background: `linear-gradient(45deg, ${purple[300]} 30%, ${purple[100]} 90%)`,
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI-Powered Game Analysis
              </Typography>
              <Typography variant="body1" sx={{ color: grey[300], mb: 3, maxWidth: 400 }}>
                Generate detailed analysis of your game with move-by-move insights, 
                accuracy ratings, and strategic recommendations.
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={() => generateGameReview(moves)}
              disabled={gameReviewLoading || moves.length === 0}
              startIcon={!gameReviewLoading && <PlayCircle size={20} />}
              sx={{
                px: 4,
                py: 1.5,
                background: `linear-gradient(45deg, ${purple[600]} 30%, ${purple[400]} 90%)`,
                fontWeight: "bold",
                fontSize: 16,
                borderRadius: 3,
                textTransform: "none",
                boxShadow: `0 8px 25px ${purple[600]}40`,
                "&:hover": {
                  background: `linear-gradient(45deg, ${purple[700]} 30%, ${purple[500]} 90%)`,
                  transform: "translateY(-2px)",
                  boxShadow: `0 12px 35px ${purple[600]}50`,
                },
                "&:disabled": {
                  background: grey[800],
                  color: grey[500],
                  transform: "none",
                  boxShadow: "none",
                },
              }}
            >
              {gameReviewLoading ? "Analyzing Game..." : "Generate Analysis"}
            </Button>

            {gameReviewLoading && (
              <Box sx={{ width: "100%", maxWidth: 400 }}>
                <LinearProgress
                  variant="determinate"
                  value={gameReviewProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: grey[800],
                    "& .MuiLinearProgress-bar": { 
                      background: `linear-gradient(90deg, ${purple[600]} 0%, ${purple[400]} 100%)`,
                      borderRadius: 4,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: purple[300],
                    mt: 1,
                    display: "block",
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {`${Math.round(gameReviewProgress)}% Complete`}
                </Typography>
              </Box>
            )}

            {moves.length > 0 && (
              <Paper
                sx={{
                  width: "100%",
                  maxHeight: 300,
                  overflowY: "auto",
                  background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)",
                  borderRadius: 2,
                  border: `1px solid ${purple[900]}`,
                  p: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ color: purple[300], mb: 2, fontWeight: 600 }}>
                  Game Moves Preview
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {moves
                    .reduce((rows: JSX.Element[][], move, index) => {
                      const moveNumber = Math.floor(index / 2) + 1;
                      const isWhiteMove = index % 2 === 0;
                      const isCurrentMove = index === currentMoveIndex - 1;

                      if (isWhiteMove) {
                        rows.push([
                          <Typography
                            key={`move-number-${moveNumber}`}
                            variant="body2"
                            sx={{ color: purple[400], minWidth: 35, textAlign: "right", fontWeight: 600 }}
                          >
                            {`${moveNumber}.`}
                          </Typography>,
                          <Box
                            key={`white-move-${index}`}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              p: 1,
                              borderRadius: 2,
                              background: isCurrentMove 
                                ? `linear-gradient(45deg, ${purple[900]} 30%, ${purple[800]} 90%)`
                                : "transparent",
                              border: `1px solid ${isCurrentMove ? purple[600] : grey[800]}`,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                background: `linear-gradient(45deg, ${purple[900]} 30%, ${purple[800]} 90%)`,
                                transform: "translateX(4px)",
                              },
                              flex: 1,
                            }}
                            onClick={() => goToMove(index + 1)}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: grey[100],
                                fontFamily: "monospace",
                                fontWeight: 500,
                              }}
                            >
                              {move}
                            </Typography>
                          </Box>,
                        ]);
                      } else {
                        rows[rows.length - 1].push(
                          <Box
                            key={`black-move-${index}`}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              p: 1,
                              borderRadius: 2,
                              background: isCurrentMove 
                                ? `linear-gradient(45deg, ${purple[900]} 30%, ${purple[800]} 90%)`
                                : "transparent",
                              border: `1px solid ${isCurrentMove ? purple[600] : grey[800]}`,
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                background: `linear-gradient(45deg, ${purple[900]} 30%, ${purple[800]} 90%)`,
                                transform: "translateX(4px)",
                              },
                              flex: 1,
                            }}
                            onClick={() => goToMove(index + 1)}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: grey[100],
                                fontFamily: "monospace",
                                fontWeight: 500,
                              }}
                            >
                              {move}
                            </Typography>
                          </Box>
                        );
                      }
                      return rows;
                    }, [])
                    .map((row, index) => (
                      <Box
                        key={`row-${index}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        {row}
                      </Box>
                    ))}
                </Box>
              </Paper>
            )}

            {moves.length === 0 && (
              <Typography variant="body2" sx={{ color: grey[500], fontStyle: "italic" }}>
                Load a game first to enable analysis
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={4}>
      {/* Action Hints */}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${purple[900]}20 0%, ${purple[800]}20 100%)`,
          border: `1px solid ${purple[700]}`,
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <MessageCircle size={18} color={purple[400]} />
              <Typography variant="body2" sx={{ color: grey[300] }}>
                Click moves for insights
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Pen size={18} color={purple[400]} />
              <Typography variant="body2" sx={{ color: grey[300] }}>
                Generate annotations
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* User Thoughts Section */}
      <Card
        sx={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          border: `1px solid ${purple[800]}`,
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Person sx={{ color: purple[400] }} />
            <Typography 
              variant="h6" 
              sx={{ 
                color: "white",
                fontWeight: 600,
                background: `linear-gradient(45deg, ${purple[300]} 30%, ${purple[100]} 90%)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Your Analysis Notes
            </Typography>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="Share your thoughts about positions, moves you're considering, or strategic ideas. The AI will incorporate these into its analysis..."
            value={userThoughts}
            onChange={(e) => setUserThoughts(e.target.value)}
            disabled={chatLoading}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)",
                borderRadius: 2,
                color: "white",
                fontSize: "1rem",
                "& fieldset": {
                  borderColor: purple[800],
                },
                "&:hover fieldset": {
                  borderColor: purple[600],
                },
                "&.Mui-focused fieldset": {
                  borderColor: purple[500],
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: grey[400],
                opacity: 0.8,
              },
            }}
          />

          <Button
            variant="contained"
            size="large"
            sx={{
              mt: 3,
              px: 4,
              py: 1.5,
              background: `linear-gradient(45deg, ${purple[600]} 30%, ${purple[400]} 90%)`,
              fontWeight: "bold",
              borderRadius: 2,
              textTransform: "none",
              boxShadow: `0 6px 20px ${purple[600]}40`,
              "&:hover": {
                background: `linear-gradient(45deg, ${purple[700]} 30%, ${purple[500]} 90%)`,
                transform: "translateY(-2px)",
                boxShadow: `0 8px 25px ${purple[600]}50`,
              },
              "&:disabled": {
                background: grey[700],
                color: grey[500],
                transform: "none",
                boxShadow: "none",
              },
            }}
            onClick={handleGameReportClick}
            disabled={!gameReview || gameReview.length === 0 || chatLoading}
            startIcon={
              loadingStates.gameReport ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Sparkles size={20} />
              )
            }
          >
            {loadingStates.gameReport ? "Generating Report..." : "Generate Full Game Report"}
          </Button>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {getStatistics() && (
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <StatCard
            title={`${whitePlayer} (White)`}
            stats={getStatistics()!.whiteStats}
            side="white"
          />
          <StatCard
            title={`${blackPlayer} (Black)`}
            stats={getStatistics()!.blackStats}
            side="black"
          />
        </Stack>
      )}

      {/* Moves Analysis */}
      <Card
        sx={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          border: `1px solid ${purple[800]}`,
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: "white",
              fontWeight: 600,
              mb: 3,
              background: `linear-gradient(45deg, ${purple[300]} 30%, ${purple[100]} 90%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Move-by-Move Analysis
          </Typography>
          
          <Paper
            sx={{
              maxHeight: 500,
              overflowY: "auto",
              background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)",
              borderRadius: 2,
              border: `1px solid ${purple[900]}`,
              p: 2,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {gameReview
                .reduce((rows: JSX.Element[][], review, index) => {
                  const style = getMoveClassificationStyle(review.quality);
                  const moveNumber = Math.floor(review.plyNumber / 2) + 1;
                  const isWhiteMove = review.plyNumber % 2 === 0;
                  const isCurrentMove = review.plyNumber === currentMoveIndex - 1;

                  if (isWhiteMove) {
                    rows.push([
                      <Typography
                        key={`move-number-${moveNumber}`}
                        variant="body2"
                        sx={{ 
                          color: purple[400], 
                          minWidth: 40, 
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {`${moveNumber}.`}
                      </Typography>,
                      <Box
                        key={`white-move-${index}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          p: 1.5,
                          borderRadius: 2,
                          background: isCurrentMove 
                            ? `linear-gradient(45deg, ${style.color}20 0%, ${style.color}10 100%)`
                            : "transparent",
                          border: isCurrentMove
                            ? `2px solid ${style.color}`
                            : `1px solid ${grey[800]}`,
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            background: `linear-gradient(45deg, ${style.color}15 0%, ${style.color}05 100%)`,
                            transform: "translateY(-2px)",
                            boxShadow: `0 6px 20px ${style.color}30`,
                          },
                          flex: 1,
                        }}
                        onClick={() => goToMove(review.plyNumber + 1)}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: grey[100],
                            fontFamily: "monospace",
                            fontWeight: 600,
                            minWidth: 60,
                          }}
                        >
                          {review.notation}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            flex: 1,
                          }}
                        >
                          <Box 
                            sx={{ 
                              color: style.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: `${style.color}20`,
                            }}
                          >
                            {style.icon}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ color: style.color, fontWeight: "bold" }}
                          >
                            {review.quality}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          {currentMoveIndex === review.plyNumber + 1 && (
                            <Tooltip title="Ask AI about this move" arrow>
                              <IconButton
                                size="small"
                                sx={{
                                  color: purple[400],
                                  background: `${purple[400]}15`,
                                  "&:hover": { 
                                    background: `${purple[400]}25`,
                                    transform: "scale(1.1)",
                                  },
                                  "&:disabled": {
                                    color: grey[600],
                                    background: "transparent",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChatClick(review);
                                }}
                                disabled={chatLoading}
                              >
                                {loadingStates.chat[review.plyNumber] ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <MessageCircle size={16} />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {currentMoveIndex === review.plyNumber + 1 && (
                            <Tooltip title="Generate AI annotation" arrow>
                              <IconButton
                                size="small"
                                sx={{
                                  color: purple[400],
                                  background: `${purple[400]}15`,
                                  "&:hover": { 
                                    background: `${purple[400]}25`,
                                    transform: "scale(1.1)",
                                  },
                                  "&:disabled": {
                                    color: grey[600],
                                    background: "transparent",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnnotateClick(review, userThoughts);
                                }}
                                disabled={chatLoading}
                              >
                                {loadingStates.annotate[review.plyNumber] ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <Pen size={16} />
                                )}
                              </IconButton>
                            </Tooltip>   
                          )}
                          
                          <Tooltip title="Jump to this move" arrow>
                            <IconButton 
                              size="small" 
                              sx={{ 
                                color: grey[400],
                                "&:hover": {
                                  color: purple[300],
                                  transform: "scale(1.1)",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <PlayCircle size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>,
                    ]);
                  } else {
                    rows[rows.length - 1].push(
                      <Box
                        key={`black-move-${index}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          p: 1.5,
                          borderRadius: 2,
                          background: isCurrentMove 
                            ? `linear-gradient(45deg, ${style.color}20 0%, ${style.color}10 100%)`
                            : "transparent",
                          border: isCurrentMove
                            ? `2px solid ${style.color}`
                            : `1px solid ${grey[800]}`,
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            background: `linear-gradient(45deg, ${style.color}15 0%, ${style.color}05 100%)`,
                            transform: "translateY(-2px)",
                            boxShadow: `0 6px 20px ${style.color}30`,
                          },
                          flex: 1,
                        }}
                        onClick={() => goToMove(review.plyNumber + 1)}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: grey[100],
                            fontFamily: "monospace",
                            fontWeight: 600,
                            minWidth: 60,
                          }}
                        >
                          {review.notation}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            flex: 1,
                          }}
                        >
                          <Box 
                            sx={{ 
                              color: style.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: `${style.color}20`,
                            }}
                          >
                            {style.icon}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ color: style.color, fontWeight: "bold" }}
                          >
                            {review.quality}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          {currentMoveIndex === review.plyNumber + 1 && (
                            <Tooltip title="Ask AI about this move" arrow>
                              <IconButton
                                size="small"
                                sx={{
                                  color: purple[400],
                                  background: `${purple[400]}15`,
                                  "&:hover": { 
                                    background: `${purple[400]}25`,
                                    transform: "scale(1.1)",
                                  },
                                  "&:disabled": {
                                    color: grey[600],
                                    background: "transparent",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleChatClick(review);
                                }}
                                disabled={chatLoading}
                              >
                                {loadingStates.chat[review.plyNumber] ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <MessageCircle size={16} />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {currentMoveIndex === review.plyNumber + 1 && (
                            <Tooltip title="Generate AI annotation" arrow>
                              <IconButton
                                size="small"
                                sx={{
                                  color: purple[400],
                                  background: `${purple[400]}15`,
                                  "&:hover": { 
                                    background: `${purple[400]}25`,
                                    transform: "scale(1.1)",
                                  },
                                  "&:disabled": {
                                    color: grey[600],
                                    background: "transparent",
                                  },
                                  transition: "all 0.2s ease",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnnotateClick(review, userThoughts);
                                }}
                                disabled={chatLoading}
                              >
                                {loadingStates.annotate[review.plyNumber] ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <Pen size={16} />
                                )}
                              </IconButton>
                            </Tooltip>   
                          )}
                          
                          <Tooltip title="Jump to this move" arrow>
                            <IconButton 
                              size="small" 
                              sx={{ 
                                color: grey[400],
                                "&:hover": {
                                  color: purple[300],
                                  transform: "scale(1.1)",
                                },
                                transition: "all 0.2s ease",
                              }}
                            >
                              <PlayCircle size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    );
                  }

                  return rows;
                }, [])
                .map((row, index) => (
                  <Box
                    key={`row-${index}`}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    {row}
                  </Box>
                ))}
            </Box>
          </Paper>
        </CardContent>
      </Card>
    </Stack>
  );
};

export default GameReviewTab;