import React from 'react';
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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { grey } from '@mui/material/colors';
import {
  TrendingDown,
  Target,
  Star,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  PlayCircle,
} from 'lucide-react';

export interface GameReview {
  moveNumber: number;
  moveSan: string;
  moveClassification: MoveClassification;
  side: 'w' | 'b';
}

export type MoveClassification =
  | 'Best'
  | 'Excellent'
  | 'Good'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Blunder';

export interface MoveStats {
  Best: number;
  Excellent: number;
  Good: number;
  Inaccuracy: number;
  Mistake: number;
  Blunder: number;
}

interface GameReviewTabProps {
  gameReview: GameReview[] | null;
  generateGameReview: (moves: string[]) => Promise<void>;
  moves: string[];
  gameReviewLoading: boolean;
  goToMove: (index: number) => void;
  currentMoveIndex: number;
}

const getMoveClassificationStyle = (classification: MoveClassification) => {
  switch (classification) {
    case 'Best':
      return { color: '#4ade80', icon: <Target size={16} />, bgColor: '#16a34a20' };
    case 'Excellent':
      return { color: '#22d3ee', icon: <Star size={16} />, bgColor: '#0891b220' };
    case 'Good':
      return { color: '#84cc16', icon: <CheckCircle size={16} />, bgColor: '#65a30d20' };
    case 'Inaccuracy':
      return { color: '#fbbf24', icon: <TrendingDown size={16} />, bgColor: '#d9770620' };
    case 'Mistake':
      return { color: '#f97316', icon: <AlertTriangle size={16} />, bgColor: '#ea580c20' };
    case 'Blunder':
      return { color: '#ef4444', icon: <XCircle size={16} />, bgColor: '#dc262620' };
  }
};

const GameReviewTab: React.FC<GameReviewTabProps> = ({
  gameReview,
  generateGameReview,
  moves,
  gameReviewLoading,
  goToMove,
  currentMoveIndex,
}) => {
  const getStatistics = () => {
    if (!gameReview) return null;

    const whiteStats: MoveStats = {
      Best: 0,
      Excellent: 0,
      Good: 0,
      Inaccuracy: 0,
      Mistake: 0,
      Blunder: 0,
    };
    const blackStats: MoveStats = { ...whiteStats };

    gameReview.forEach((review) => {
      const stats = review.side === 'w' ? whiteStats : blackStats;
      stats[review.moveClassification]++;
    });

    return { whiteStats, blackStats };
  };

  const calculateAccuracy = (stats: MoveStats) => {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const goodMoves = stats.Best + stats.Excellent + stats.Good;
    return Math.round((goodMoves / total) * 100);
  };

  const StatCard = ({
    title,
    stats,
  }: {
    title: string;
    stats: MoveStats;
    side: 'white' | 'black';
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
                  accuracy >= 90 ? '#16a34a' : accuracy >= 80 ? '#d97706' : '#dc2626',
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          </Box>

          <Grid container spacing={1}>
            {Object.entries(stats).map(([classification, count]) => {
              const style = getMoveClassificationStyle(
                classification as MoveClassification
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
                    <Typography variant="body2" sx={{ color: grey[200], flex: 1 }}>
                      {classification}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: style.color, fontWeight: 'bold' }}
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
      <Paper
        sx={{
          width: '100%',
          maxWidth: 'none',
          maxHeight: 320,
          overflowY: 'auto',
          bgcolor: grey[900],
          borderRadius: 2,
          border: `1px solid ${grey[800]}`,
          boxShadow: 0,
          p: 2,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {moves.map((_move, index) => {
            const moveNumber = Math.floor(index / 2) + 1;
            const isWhiteMove = index % 2 === 0;
            const isCurrentMove = index === currentMoveIndex - 1;

            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: isCurrentMove ? grey[800] : 'transparent',
                  border: `1px solid ${grey[800]}`,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: grey[800],
                  },
                  transition: 'background 0.2s',
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
                    fontFamily: 'monospace',
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

      <Button
        variant="outlined"
        size="medium"
        onClick={() => generateGameReview(moves)}
        disabled={gameReviewLoading || moves.length === 0}
        startIcon={!gameReviewLoading && <PlayCircle size={18} />}
        color='success'
        sx={{
          px: 2,
          py: 0.8,
          bgcolor: '#2563eb10',
          fontWeight: 500,
          fontSize: 14,
          borderRadius: 2,
          minWidth: 120,
          boxShadow: 0,
          '&:hover': { bgcolor: '#2563eb20', borderColor: '#1d4ed8', color: '#1d4ed8' },
          '&:disabled': { bgcolor: grey[800], color: grey[500], borderColor: grey[800] },
        }}
      >
        {gameReviewLoading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <LinearProgress
              sx={{
                width: 50,
                height: 6,
                borderRadius: 5,
                bgcolor: grey[800],
                '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' },
              }}
            />
            <Typography variant="body2" sx={{ color: grey[200], fontSize: 12 }}>
              Analyzing...
            </Typography>
          </Stack>
        ) : (
          'Generate Review'
        )}
      </Button>

      {moves.length === 0 && (
        <Typography
          variant="body2"
          sx={{
            color: grey[500],
            fontStyle: 'italic',
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
      </Box>
      <Button
        variant="outlined"
        size="small"
        onClick={() => generateGameReview(moves)}
        disabled={gameReviewLoading || moves.length === 0}
        startIcon={<BarChart3 size={16} />}
        sx={{
          px: 2,
          py: 0.7,
          bgcolor: '#2563eb10',
          fontWeight: 500,
          fontSize: 13,
          borderRadius: 2,
          minWidth: 160,
          boxShadow: 0,
          mb: 1,
          alignSelf: 'flex-end',
          color: 'wheat',
          borderColor: 'wheat',
          
          '&:disabled': { bgcolor: grey[800], color: grey[500], borderColor: grey[800] },
        }}
      >
        {gameReviewLoading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
        <LinearProgress
          sx={{
            width: 40,
            height: 6,
            borderRadius: 5,
            bgcolor: grey[800],
            '& .MuiLinearProgress-bar': { bgcolor: '#2563eb' },
          }}
        />
        <Typography variant="body2" sx={{ color: grey[200], fontSize: 12 }}>
          Recalculating...
        </Typography>
          </Stack>
        ) : (
          'Recalculate with Current Engine Depth'
        )}
      </Button>
      {getStatistics() && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <StatCard title="White" stats={getStatistics()!.whiteStats} side="white" />
          <StatCard title="Black" stats={getStatistics()!.blackStats} side="black" />
        </Stack>
      )}

      <Paper
        sx={{
          p: 2,
          maxHeight: 400,
          overflowY: 'auto',
          bgcolor: grey[900],
          borderRadius: 2,
          border: `1px solid ${grey[800]}`,
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: grey[100] }}>
          Move Classifications
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {gameReview.map((review, index) => {
            const style = getMoveClassificationStyle(review.moveClassification);
            const moveNumber = Math.floor(review.moveNumber / 2) + 1;
            const isWhiteMove = review.moveNumber % 2 === 0;
            const isCurrentMove = review.moveNumber === currentMoveIndex - 1;

            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: isCurrentMove ? grey[800] : 'transparent',
                  border: isCurrentMove
                    ? `1px solid ${style.color}`
                    : `1px solid ${grey[800]}`,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: grey[800],
                  },
                }}
                onClick={() => goToMove(review.moveNumber + 1)}
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
                    fontFamily: 'monospace',
                  }}
                >
                  {review.moveSan}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                  <Box sx={{ color: style.color }}>{style.icon}</Box>
                  <Typography
                    variant="body2"
                    sx={{ color: style.color, fontWeight: 'medium' }}
                  >
                    {review.moveClassification}
                  </Typography>
                </Box>

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
    </Stack>
  );
};

export default GameReviewTab;
