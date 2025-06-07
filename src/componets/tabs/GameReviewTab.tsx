import React from "react";
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
  Badge,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { grey } from "@mui/material/colors";
import {
  TrendingDown,
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  PlayCircle,
  ThumbsUp,
  MessageCircle,
  Bot,
  BookA,
} from "lucide-react";
import { MoveAnalysis, MoveQuality } from "../agine/useGameReview";




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
  goToMove: (index: number) => void;
  currentMoveIndex: number;
  handleMoveCoachClick: (gameReview: MoveAnalysis) => void;
  chatLoading: boolean;
}

const getMoveClassificationStyle = (classification: MoveQuality) => {
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
  chatLoading
}) => {
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
      <Paper
        sx={{
          p: 2,
          bgcolor: grey[900],
          border: `1px solid ${grey[800]}`,
          borderRadius: 2,
        }}
      >
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" sx={{ color: grey[200] }}>
              {title}
            </Typography>
            <Chip
              label={`${accuracy}% Accuracy`}
              size="small"
              sx={{
                bgcolor:
                  accuracy >= 90
                    ? "#135415"
                    : accuracy >= 80
                    ? "#FFB74D"
                    : "#E57373",
                color: "white",
                fontWeight: "bold",
              }}
            />
          </Box>

          <Grid container spacing={1}>
            {Object.entries(stats).map(([classification, count]) => {
              const style = getMoveClassificationStyle(
                classification as MoveQuality
              );
              return (
                <Stack key={classification}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: style.bgColor,
                      border: `1px solid ${style.color}40`,
                    }}
                  >
                    <Box sx={{ color: style.color }}>{style.icon}</Box>
                    <Typography
                      variant="body2"
                      sx={{ color: grey[200], flex: 1 }}
                    >
                      {classification}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: style.color, fontWeight: "bold" }}
                    >
                      {count}
                    </Typography>
                  </Stack>
                </Stack>
              );
            })}
          </Grid>
        </Stack>
      </Paper>
    );
  };

  if (!gameReview || gameReview.length === 0) {
    return (
      <Stack
        spacing={3}
        alignItems="center"
        justifyContent="center"
        sx={{
          minHeight: 420,
          py: 6,
          bgcolor: grey[900],
          borderRadius: 3,
          border: `1px solid ${grey[800]}`,
          boxShadow: 2,
        }}
      >
        <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
          <Button
            variant="outlined"
            size="medium"
            onClick={() => generateGameReview(moves)}
            disabled={gameReviewLoading || moves.length === 0}
            startIcon={!gameReviewLoading && <PlayCircle size={18} />}
            sx={{
              px: 2,
              py: 0.8,
              bgcolor: "#2563eb10",
              fontWeight: "bold",
              fontSize: 14,
              borderRadius: 2,
              minWidth: 120,
              boxShadow: 0,
              color: "wheat",
              borderColor: "wheat",
              "&:hover": {
                bgcolor: "#2563eb20",
                borderColor: "wheat",
                color: "wheat",
              },
              "&:disabled": {
                bgcolor: grey[800],
                color: grey[500],
                borderColor: grey[800],
              },
            }}
          >
            {gameReviewLoading ? (
              <Typography
                variant="body2"
                sx={{ color: grey[200], fontSize: 12 }}
              >
                Analyzing...
              </Typography>
            ) : (
              "Generate Agine Review"
            )}
          </Button>
          {!gameReviewLoading && (
            <Typography
              variant="body2"
              sx={{
                color: grey[500],
                fontStyle: "italic",
                mt: 1,
                letterSpacing: 0.2,
              }}
            >
              Click on Generate Agine Review to get a detailed analysis of the game and chat with Agine.
            </Typography>
          )}
          {gameReviewLoading && (
            <LinearProgress
              sx={{
                width: 550,
                height: 6,
                borderRadius: 5,
                bgcolor: grey[800],
                "& .MuiLinearProgress-bar": { bgcolor: "#2563eb" },
              }}
            />
          )}
        </Stack>
        <Paper
          sx={{
            width: "100%",
            maxWidth: "none",
            maxHeight: 320,
            overflowY: "auto",
            bgcolor: grey[900],
            borderRadius: 2,
            border: `1px solid ${grey[800]}`,
            boxShadow: 0,
            p: 2,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {moves.map((_move, index) => {
              const moveNumber = Math.floor(index / 2) + 1;
              const isWhiteMove = index % 2 === 0;
              const isCurrentMove = index === currentMoveIndex - 1;

              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: isCurrentMove ? grey[800] : "transparent",
                    border: `1px solid ${grey[800]}`,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: grey[800],
                    },
                    transition: "background 0.2s",
                    minWidth: 400,
                  }}
                  onClick={() => goToMove(index + 1)}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: grey[400], minWidth: 40 }}
                  >
                    {isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: grey[100],
                      minWidth: 100,
                      fontFamily: "monospace",
                    }}
                  >
                    {moves[index]}
                  </Typography>

                  <Box sx={{ flex: 1 }} />

                  <Tooltip title="Jump to this move">
                    <IconButton size="small" sx={{ color: grey[400] }}>
                      <PlayCircle size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              );
            })}
          </Box>
        </Paper>

        {moves.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: grey[500],
              fontStyle: "italic",
              mt: 1,
              letterSpacing: 0.2,
            }}
          >
            Load a game first to enable game review
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
          <Stack direction="row" alignItems="center" spacing={1}>
            <MessageCircle size={20} color="#4FC3F7" />
            <Typography variant="body2" sx={{ color: grey[300] }}>
              Click on any move to get Agine insights
            </Typography>
          </Stack>
      </Box>
      
      {getStatistics() && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <StatCard
            title="White"
            stats={getStatistics()!.whiteStats}
            side="white"
          />
          <StatCard
            title="Black"
            stats={getStatistics()!.blackStats}
            side="black"
          />
        </Stack>
      )}

      <Paper
        sx={{
          p: 2,
          maxHeight: 400,
          overflowY: "auto",
          bgcolor: grey[900],
          borderRadius: 2,
          border: `1px solid ${grey[800]}`,
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: grey[100] }}>
          Move Classifications        
        </Typography>
    
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {gameReview.map((review, index) => {
            const style = getMoveClassificationStyle(review.quality);
            const moveNumber = Math.floor(review.plyNumber / 2) + 1;
            const isWhiteMove = review.plyNumber % 2 === 0;
            const isCurrentMove = review.plyNumber === currentMoveIndex - 1;

            return (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: isCurrentMove ? grey[800] : "transparent",
                  border: isCurrentMove
                    ? `1px solid ${style.color}`
                    : `1px solid ${grey[800]}`,
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: grey[800],
                  },
                }}
                onClick={() => goToMove(review.plyNumber + 1)}
              >
                <Typography
                  variant="body2"
                  sx={{ color: grey[400], minWidth: 40 }}
                >
                  {isWhiteMove ? `${moveNumber}.` : `${moveNumber}...`}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: grey[100],
                    minWidth: 60,
                    fontFamily: "monospace",
                  }}
                >
                  {review.notation}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flex: 1,
                  }}
                >
                  <Box sx={{ color: style.color }}>{style.icon}</Box>
                  <Typography
                    variant="body2"
                    sx={{ color: style.color, fontWeight: "medium" }}
                  >
                    {review.notation}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  
                    {currentMoveIndex === review.plyNumber + 1 && (
                      <Tooltip title="Ask agine about this move">
                        <IconButton 
                          size="small" 
                          sx={{ 
                            color: "#4FC3F7",
                            "&:hover": { bgcolor: "#4FC3F720" }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveCoachClick(review);
                          }}
                          disabled={chatLoading}
                        >
                          {chatLoading ? (
                            <Badge badgeContent=" " color="primary" variant="dot">
                              <MessageCircle size={16} />
                            </Badge>
                          ) : (
                            <MessageCircle size={16} />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  
                  
                  <Tooltip title="Jump to this move">
                    <IconButton size="small" sx={{ color: grey[400] }}>
                      <PlayCircle size={16} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Stack>
  );
};

export default GameReviewTab;