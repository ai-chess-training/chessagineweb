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
  BookA,
  Pen,
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

  // Reset loading states when chatLoading changes
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
    
    // Get stats
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
              Click on Generate Agine Review to get a detailed analysis of the
              game, for each move you can chat about position and make agine generate annotations.
            </Typography>
          )}
            {gameReviewLoading && (
            <Box sx={{ width: 550 }}>
              <LinearProgress
              variant="determinate"
              value={gameReviewProgress}
              sx={{
                height: 6,
                borderRadius: 5,
                bgcolor: grey[800],
                "& .MuiLinearProgress-bar": { bgcolor: "#2563eb" },
              }}
              />
              <Typography
              variant="caption"
              sx={{
                color: grey[400],
                mt: 0.5,
                display: "block",
                textAlign: "right",
                fontSize: 12,
                fontWeight: 500,
              }}
              >
              {`${Math.round(gameReviewProgress)}%`}
              </Typography>
            </Box>
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
                      sx={{
                        color: grey[400],
                        minWidth: 30,
                        textAlign: "right",
                      }}
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
                        borderRadius: 1,
                        bgcolor: isCurrentMove ? grey[800] : "transparent",
                        border: `1px solid ${grey[800]}`,
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: grey[800],
                        },
                        transition: "background 0.2s",
                        flex: 1,
                      }}
                      onClick={() => goToMove(index + 1)}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: grey[100],
                          fontFamily: "monospace",
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
                        borderRadius: 1,
                        bgcolor: isCurrentMove ? grey[800] : "transparent",
                        border: `1px solid ${grey[800]}`,
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: grey[800],
                        },
                        transition: "background 0.2s",
                        flex: 1,
                      }}
                      onClick={() => goToMove(index + 1)}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: grey[100],
                          fontFamily: "monospace",
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
          <Pen size={20} color="#4FC3F7"/>
          <Typography variant="body2" sx={{ color: grey[300] }}>
            Click on any move to get Agine annotations
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Person color="secondary" />
          <Typography variant="subtitle1" fontWeight="medium">
            Your Thoughts 
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          placeholder="Share your thoughts about the position, specific moves you're considering, Agine will consider them in her annotations"
          value={userThoughts}
          onChange={(e) => setUserThoughts(e.target.value)}
          disabled={chatLoading}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: grey[900],
              borderRadius: 2,
              color: "wheat",
              fontSize: "1.1rem",
              "& input": {
                fontSize: "1.1rem",
              },
              "& textarea": {
                fontSize: "1.1rem",
              },
            },
            "& .MuiInputBase-input::placeholder": {
              color: "wheat",
              opacity: 0.7,
              fontSize: "1.1rem",
            },
          }}
        />

        <Button
          variant="contained"
          color="primary"
          sx={{
            mt: 2,
            fontWeight: "bold",
            borderRadius: 2,
            bgcolor: "#2563eb",
            color: "white",
            "&:hover": {
              bgcolor: "#1741a6",
            },
            "&:disabled": {
              bgcolor: grey[700],
              color: grey[500],
            },
            minWidth: 200,
            position: "relative",
          }}
          onClick={handleGameReportClick}
          disabled={!gameReview || gameReview.length === 0 || chatLoading}
          startIcon={
            loadingStates.gameReport ? (
              <CircularProgress size={20} color="inherit" />
            ) : null
          }
        >
          {loadingStates.gameReport ? "Generating..." : "Generate Game Review Report"}
        </Button>
      </Box>

      {getStatistics() && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <StatCard
            title={whitePlayer}
            stats={getStatistics()!.whiteStats}
            side="white"
          />
          <StatCard
            title={blackPlayer}
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
                    sx={{ color: grey[400], minWidth: 40, textAlign: "right" }}
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
                      borderRadius: 1,
                      bgcolor: isCurrentMove ? grey[800] : "transparent",
                      border: isCurrentMove
                        ? `1px solid ${style.color}`
                        : `1px solid ${grey[800]}`,
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: grey[800],
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
                        {review.quality}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {currentMoveIndex === review.plyNumber + 1 && (
                        <Tooltip title="Ask agine about this move">
                          <IconButton
                            size="small"
                            sx={{
                              color: "#4FC3F7",
                              "&:hover": { bgcolor: "#4FC3F720" },
                              "&:disabled": {
                                color: grey[600],
                                bgcolor: "transparent",
                              },
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
                        <Tooltip title="Annotate this move with Agine">
                          <IconButton
                            size="small"
                            sx={{
                              color: "#4FC3F7",
                              "&:hover": { bgcolor: "#4FC3F720" },
                              "&:disabled": {
                                color: grey[600],
                                bgcolor: "transparent",
                              },
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
                      <Tooltip title="Jump to this move">
                        <IconButton size="small" sx={{ color: grey[400] }}>
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
                      borderRadius: 1,
                      bgcolor: isCurrentMove ? grey[800] : "transparent",
                      border: isCurrentMove
                        ? `1px solid ${style.color}`
                        : `1px solid ${grey[800]}`,
                      cursor: "pointer",
                      "&:hover": {
                        bgcolor: grey[800],
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
                        {review.quality}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {currentMoveIndex === review.plyNumber + 1 && (
                        <Tooltip title="Ask agine about this move">
                          <IconButton
                            size="small"
                            sx={{
                              color: "#4FC3F7",
                              "&:hover": { bgcolor: "#4FC3F720" },
                              "&:disabled": {
                                color: grey[600],
                                bgcolor: "transparent",
                              },
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
                        <Tooltip title="Annotate this move with Agine">
                          <IconButton
                            size="small"
                            sx={{
                              color: "#4FC3F7",
                              "&:hover": { bgcolor: "#4FC3F720" },
                              "&:disabled": {
                                color: grey[600],
                                bgcolor: "transparent",
                              },
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
                      <Tooltip title="Jump to this move">
                        <IconButton size="small" sx={{ color: grey[400] }}>
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
    </Stack>
  );
};

export default GameReviewTab;