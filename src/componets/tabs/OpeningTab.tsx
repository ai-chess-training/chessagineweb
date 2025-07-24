import React, { useState } from "react";
import {
  Box,
  CircularProgress,
  Typography,
  Stack,
  Paper,
  Chip,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { MasterGames, Moves } from "../opening/helper";

type ExplorerType = 'master' | 'lichess';

interface OpeningExplorerProps {
  openingLoading: boolean;
  lichessOpeningData?: MasterGames | null;
  lichessOpeningLoading?: boolean;
  openingData?: MasterGames | null;
  llmLoading: boolean;
  handleOpeningMoveClick: (move: Moves) => void;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  openingLoading,
  openingData,
  llmLoading,
  lichessOpeningData,
  lichessOpeningLoading,
  handleOpeningMoveClick,
}) => {
  const [explorerType, setExplorerType] = useState<ExplorerType>('master');

  const handleExplorerChange = (
    _event: React.MouseEvent<HTMLElement>,
    newExplorerType: ExplorerType,
  ) => {
    if (newExplorerType !== null) {
      setExplorerType(newExplorerType);
    }
  };

  // Determine which data to use based on explorer type
  const currentData = explorerType === 'master' ? openingData : lichessOpeningData;
  const isLoading = explorerType === 'master' ? openingLoading : lichessOpeningLoading;

  // Show loading state when opening is loading OR when no opening data is available
  if (isLoading || !currentData) {
    return (
      <Stack spacing={2}>
        {/* Explorer Type Selector */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={explorerType}
            exclusive
            onChange={handleExplorerChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: 'wheat',
                borderColor: '#444',
                '&.Mui-selected': {
                  backgroundColor: '#7dd3fc',
                  color: '#000',
                  '&:hover': {
                    backgroundColor: '#38bdf8',
                  }
                },
                '&:hover': {
                  backgroundColor: '#333',
                }
              }
            }}
          >
            <ToggleButton value="master">
              Master Games
            </ToggleButton>
            <ToggleButton value="lichess">
              Lichess Games
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={60} sx={{ color: "wheat" }} />
        </Box>
      </Stack>
    );
  }

  const totalGames =
    (currentData.white ?? 0) +
    (currentData.draws ?? 0) +
    (currentData.black ?? 0);

  if (totalGames === 0) {
    return (
      <Stack spacing={2}>
        {/* Explorer Type Selector */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={explorerType}
            exclusive
            onChange={handleExplorerChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: 'wheat',
                borderColor: '#444',
                '&.Mui-selected': {
                  backgroundColor: '#7dd3fc',
                  color: '#000',
                  '&:hover': {
                    backgroundColor: '#38bdf8',
                  }
                },
                '&:hover': {
                  backgroundColor: '#333',
                }
              }
            }}
          >
            <ToggleButton value="master">
              Master Games
            </ToggleButton>
            <ToggleButton value="lichess">
              Lichess Games
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 4,
          }}
        >
          <Typography sx={{ color: "wheat", textAlign: "center" }}>
            No {explorerType} games found for this position.
          </Typography>
        </Box>
      </Stack>
    );
  }

  const whiteWinRate = ((currentData.white / totalGames) * 100).toFixed(1);
  const drawRate = ((currentData.draws / totalGames) * 100).toFixed(1);
  const blackWinRate = ((currentData.black / totalGames) * 100).toFixed(1);

  // Helper function to render result bar
  const renderResultBar = (move: Moves, moveTotal: number) => {
    const whitePercent = (move.white / moveTotal) * 100;
    const drawPercent = (move.draws / moveTotal) * 100;
    const blackPercent = (move.black / moveTotal) * 100;

    return (
      <Box sx={{ display: 'flex', width: '100%', height: 24, borderRadius: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${whitePercent}%`,
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: whitePercent > 15 ? 'auto' : 0,
          }}
        >
          {whitePercent > 15 && (
            <Typography variant="caption" sx={{ color: '#333', fontWeight: 'bold' }}>
              {whitePercent.toFixed(0)}%
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: `${drawPercent}%`,
            backgroundColor: '#888',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: drawPercent > 15 ? 'auto' : 0,
          }}
        >
          {drawPercent > 15 && (
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
              {drawPercent.toFixed(0)}%
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: `${blackPercent}%`,
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: blackPercent > 15 ? 'auto' : 0,
          }}
        >
          {blackPercent > 15 && (
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
              {blackPercent.toFixed(0)}%
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Stack spacing={3}>
      {/* Explorer Type Selector */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={explorerType}
          exclusive
          onChange={handleExplorerChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'wheat',
              borderColor: '#444',
              '&.Mui-selected': {
                backgroundColor: '#7dd3fc',
                color: '#000',
                '&:hover': {
                  backgroundColor: '#38bdf8',
                }
              },
              '&:hover': {
                backgroundColor: '#333',
              }
            }
          }}
        >
          <ToggleButton value="master">
            Master Games
          </ToggleButton>
          <ToggleButton value="lichess">
            Lichess Games
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Opening Info */}
      {currentData.opening && (
        <Box>
          <Typography variant="h6" sx={{ color: "white", mb: 1 }}>
            {currentData.opening.name}
          </Typography>
          <Chip label={currentData.opening.eco} color="primary" size="small" />
        </Box>
      )}

      {/* Moves Table */}
      {currentData.moves && currentData.moves.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ color: "wheat", fontStyle: "italic", mb: 2, display: "block" }}>
            💡 Click on any move below to get AI analysis of that continuation
          </Typography>
          
          <TableContainer component={Paper} sx={{ backgroundColor: "#242121" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "white", fontWeight: "bold", borderBottom: "1px solid #444" }}>
                    Move
                  </TableCell>
                  <TableCell align="center" sx={{ color: "white", fontWeight: "bold", borderBottom: "1px solid #444" }}>
                    Games
                  </TableCell>
                  <TableCell align="center" sx={{ color: "white", fontWeight: "bold", borderBottom: "1px solid #444" }}>
                    %
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", borderBottom: "1px solid #444", minWidth: 200 }}>
                    White / Draw / Black
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentData.moves.slice(0, 10).map((move, index) => {
                  const moveTotal = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
                  const playedPercentage = ((moveTotal / totalGames) * 100).toFixed(1);

                  return (
                    <TableRow
                      key={`${move.uci}-${index}`}
                      onClick={() => handleOpeningMoveClick(move)}
                      sx={{
                        cursor: llmLoading ? "not-allowed" : "pointer",
                        "&:hover": {
                          backgroundColor: llmLoading ? "transparent" : "#333",
                        },
                        filter: llmLoading ? "grayscale(50%)" : "none",
                        borderBottom: "1px solid #444",
                      }}
                    >
                      <TableCell sx={{ color: "white", py: 1.5 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: "bold", color: "#7dd3fc" }}>
                            {move.san}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ color: "wheat", py: 1.5 }}>
                        {moveTotal.toLocaleString()}
                      </TableCell>
                      <TableCell align="center" sx={{ color: "wheat", py: 1.5 }}>
                        {playedPercentage}%
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {renderResultBar(move, moveTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Total row */}
                <TableRow sx={{ borderTop: "2px solid #666" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold", py: 1.5 }}>
                    All
                  </TableCell>
                  <TableCell align="center" sx={{ color: "white", fontWeight: "bold", py: 1.5 }}>
                    {totalGames.toLocaleString()}
                  </TableCell>
                  <TableCell align="center" sx={{ color: "white", fontWeight: "bold", py: 1.5 }}>
                    100.0%
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', width: '100%', height: 24, borderRadius: 1, overflow: 'hidden' }}>
                      <Box
                        sx={{
                          width: `${whiteWinRate}%`,
                          backgroundColor: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#333', fontWeight: 'bold' }}>
                          {whiteWinRate}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: `${drawRate}%`,
                          backgroundColor: '#888',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {drawRate}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: `${blackWinRate}%`,
                          backgroundColor: '#000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {blackWinRate}%
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Top Games */}
      {currentData.topGames && currentData.topGames.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: "white", mb: 2 }}>
            Notable Games
          </Typography>
          <Stack spacing={1}>
            {currentData.topGames.slice(0, 3).map((game, index) => (
              <Paper
                key={`${game.id}-${index}`}
                sx={{ p: 2, backgroundColor: "#242121" }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography variant="body2" sx={{ color: "white" }}>
                      {game.white?.name} ({game.white?.rating}) vs{" "}
                      {game.black?.name} ({game.black?.rating})
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

export default OpeningExplorer;