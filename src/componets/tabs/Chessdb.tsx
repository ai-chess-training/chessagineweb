import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from "@mui/material";
import { Settings as SettingsIcon, Storage } from "@mui/icons-material";
import { Chess, validateFen } from "chess.js";

export interface CandidateMove {
  uci: string;
  san: string;
  score: string;
  winrate: string;
}

// Custom hook for fetching ChessDB data
export function useChessDB(fen: string) {
  const [data, setData] = useState<CandidateMove[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChessDBData = useCallback(async (fenString: string) => {
    if (!fenString.trim()) {
      setData([]);
      setError(null);
      return;
    }

    if (!validateFen(fenString)) {
      setError("Invalid FEN provided");
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const encodedFen = encodeURIComponent(fenString);
      const apiUrl = `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodedFen}&json=1`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch data`);
      }

      const responseData = await response.json();

      if (responseData.status !== "ok") {
        throw new Error(
          `Position evaluation not available: ${responseData.status}`
        );
      }

      const moves = responseData.moves;
      if (!Array.isArray(moves)) {
        throw new Error("Invalid response format: moves not found");
      }

      const maxMoveSize = new Chess(fenString).moves().length;

      if (moves.length === 0) {
        setData([]);
        return;
      }

      const processedMoves = moves.slice(0, maxMoveSize).map((move: CandidateMove) => {
        const scoreNum = Number(move.score);
        // Convert centipawns to pawns and format to 2 decimal places
        const scoreStr = isNaN(scoreNum) ? "N/A" : (scoreNum / 100).toFixed(2);
        return {
          uci: move.uci || "N/A",
          san: move.san || "N/A",
          score: scoreStr,
          winrate: move.winrate || "N/A",
        };
      });

      setData(processedMoves);
    } catch (err) {
      console.log('error!', err)
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChessDBData(fen);
  }, [fen, fetchChessDBData]);

  const refetch = useCallback(() => {
    fetchChessDBData(fen);
  }, [fen, fetchChessDBData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}

// Component props interface
interface ChessDBDisplayProps {
  data: CandidateMove[] | null;
  loading?: boolean;
  fen?: string; // Add FEN to calculate max legal moves
  title?: string;
  showTitle?: boolean;
  analyzeMove: (move: CandidateMove) => void;
  llmLoading?: boolean;
}

export function getChessDBSpeech(data: CandidateMove[]): string {
   let query = 'Candidate Moves \n\n'

   for(let i = 0; i < data.length; i++){
     query += `Move: ${data[i].san} Score ${data[i].score} WinRate ${data[i].winrate}\n`;
   }

   return query;
}

// Component for displaying ChessDB information
export function ChessDBDisplay({
  data,
  loading = false,
  fen = "",
  analyzeMove,
  llmLoading = false,
}: ChessDBDisplayProps) {
  const [chessDBEnabled, setChessDBEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [maxMoves, setMaxMoves] = useState(5);
  const [showScores, setShowScores] = useState(true);
  const [showWinrates, setShowWinrates] = useState(true);

  // Calculate maximum possible moves from current position
  const getMaxLegalMoves = () => {
    if (!fen || !validateFen(fen)) return 20; // Fallback
    try {
      const chess = new Chess(fen);
      return chess.moves().length;
    } catch {
      return 20; // Fallback
    }
  };

  const maxLegalMoves = getMaxLegalMoves();
  const availableMoves = data ? data.length : 0;
  const actualMaxMoves = Math.min(maxLegalMoves, availableMoves);

  const handleChessDBToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChessDBEnabled(event.target.checked);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  const getScoreColor = (score: string) => {
    if (score === "N/A") return "grey.400";
    const numScore = parseFloat(score) / 100; // Convert centipawns to pawns
    if (numScore > 0.5) return "#4caf50";   // Green for advantage > 0.5 pawns
    if (numScore < -0.5) return "#f44336";  // Red for disadvantage > 0.5 pawns
    return "#ff9800";                       // Orange for roughly equal
  };

  const getWinrateColor = (winrate: string) => {
    if (winrate === "N/A") return "grey.400";
    const rate = parseFloat(winrate);
    if (rate >= 60) return "#4caf50";
    if (rate <= 40) return "#f44336";
    return "#ff9800";
  };

  // Show disabled state
  if (!chessDBEnabled) {
    return (
      <Paper
        sx={{
          p: 2,
          backgroundColor: "#1a1a1a",
          borderRadius: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "grey.600",
              }}
            />
            <Typography variant="subtitle2" sx={{ color: "grey.400", fontWeight: 600 }}>
              ChessDB Off
            </Typography>
          </Box>
          <Switch
            checked={chessDBEnabled}
            onChange={handleChessDBToggle}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#9c27b0',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#9c27b0',
              },
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <IconButton
            onClick={() => setSettingsOpen(true)}
            sx={{ color: "grey.400", p: 0.5 }}
            size="small"
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Stack>

        {/* Settings Dialog */}
        <Dialog
          open={settingsOpen}
          onClose={handleSettingsClose}
          PaperProps={{
            sx: {
              backgroundColor: "#1a1a1a",
              color: "white",
              minWidth: 400
            }
          }}
        >
          <DialogTitle>ChessDB Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Max Moves to Display: {maxMoves}
                </Typography>
                <Typography variant="caption" sx={{ color: "grey.400", mb: 1, display: "block" }}>
                  Available moves in this position: {actualMaxMoves}
                </Typography>
                <Typography variant="caption" sx={{ color: "grey.400", mb: 2, display: "block" }}>
                  Set how many candidate moves to show
                </Typography>
                <Box sx={{ px: 1 }}>
                  <input
                    type="range"
                    min={1}
                    max={Math.max(actualMaxMoves, 1)}
                    value={Math.min(maxMoves, actualMaxMoves)}
                    onChange={(e) => setMaxMoves(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#9c27b0'
                    }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Show Scores
                </Typography>
                <Switch
                  checked={showScores}
                  onChange={(e) => setShowScores(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9c27b0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9c27b0',
                    },
                  }}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Show Win Rates
                </Typography>
                <Switch
                  checked={showWinrates}
                  onChange={(e) => setShowWinrates(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9c27b0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9c27b0',
                    },
                  }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSettingsClose} sx={{ color: "#9c27b0" }}>
              Done
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  }

  // Show loading state
  if (loading || (!data && chessDBEnabled)) {
    return (
      <Box>
        {/* Header */}
        <Paper
          sx={{
            p: 2,
            backgroundColor: "#1a1a1a",
            borderRadius: 2,
            mb: 2
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#9c27b0",
                }}
              />
              <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600 }}>
                ChessDB On
              </Typography>
            </Box>
            <Switch
              checked={chessDBEnabled}
              onChange={handleChessDBToggle}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#9c27b0',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#9c27b0',
                },
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
        </Paper>

        {/* Loading State */}
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress 
              size={40} 
              sx={{ color: "#9c27b0" }} 
            />
            <Typography variant="body2" sx={{ color: "grey.400" }}>
              Querying ChessDB...
            </Typography>
          </Stack>
        </Box>

        {/* Settings Dialog */}
        <Dialog
          open={settingsOpen}
          onClose={handleSettingsClose}
          PaperProps={{
            sx: {
              backgroundColor: "#1a1a1a",
              color: "white",
              minWidth: 400
            }
          }}
        >
          <DialogTitle>ChessDB Settings</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Max Moves to Display: {maxMoves}
                </Typography>
                <Typography variant="caption" sx={{ color: "grey.400", mb: 1, display: "block" }}>
                  Available moves in this position: {actualMaxMoves}
                </Typography>
                <Typography variant="caption" sx={{ color: "grey.400", mb: 2, display: "block" }}>
                  Set how many candidate moves to show
                </Typography>
                <Box sx={{ px: 1 }}>
                  <input
                    type="range"
                    min={1}
                    max={Math.max(actualMaxMoves, 1)}
                    value={Math.min(maxMoves, actualMaxMoves)}
                    onChange={(e) => setMaxMoves(Number(e.target.value))}
                    style={{
                      width: '100%',
                      accentColor: '#9c27b0'
                    }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Show Scores
                </Typography>
                <Switch
                  checked={showScores}
                  onChange={(e) => setShowScores(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9c27b0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9c27b0',
                    },
                  }}
                />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                  Show Win Rates
                </Typography>
                <Switch
                  checked={showWinrates}
                  onChange={(e) => setShowWinrates(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#9c27b0',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#9c27b0',
                    },
                  }}
                />
              </Box>
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

  // Show no data state
  if (!data || data.length === 0) {
    return (
      <Box>
        {/* Header */}
        <Paper
          sx={{
            p: 2,
            backgroundColor: "#1a1a1a",
            borderRadius: 2,
            mb: 2
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#9c27b0",
                }}
              />
              <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600 }}>
                ChessDB On
              </Typography>
            </Box>
            <Switch
              checked={chessDBEnabled}
              onChange={handleChessDBToggle}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#9c27b0',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#9c27b0',
                },
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
        </Paper>

        {/* No Data State */}
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Typography variant="body2" sx={{ color: "grey.400", textAlign: "center" }}>
            No ChessDB data found for this position.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper
        sx={{
          p: 2,
          backgroundColor: "#1a1a1a",
          borderRadius: 2,
          mb: 2
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#9c27b0",
              }}
            />
            <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600 }}>
              ChessDB On
            </Typography>
          </Box>
          <Switch
            checked={chessDBEnabled}
            onChange={handleChessDBToggle}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#9c27b0',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#9c27b0',
              },
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

        {/* Database Info */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ color: "white", fontWeight: 500 }}>
            ChessDB Database
          </Typography>
          <Chip 
            label={`${data.length}`} 
            size="small" 
            sx={{ 
              backgroundColor: "rgba(156, 39, 176, 0.2)", 
              color: "#9c27b0",
              fontSize: "0.7rem",
              fontWeight: 600
            }} 
          />
          <Typography variant="caption" sx={{ color: "grey.400" }}>
            of {maxLegalMoves} legal moves
          </Typography>
        </Stack>

        {/* Column Headers */}
        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: "grey.400", minWidth: "80px" }}>
            Move
          </Typography>
          {showScores && (
            <Typography variant="caption" sx={{ color: "grey.400", minWidth: "60px" }}>
              Score
            </Typography>
          )}
          {showWinrates && (
            <Typography variant="caption" sx={{ color: "grey.400", minWidth: "60px" }}>
              Win %
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: "grey.400", flex: 1 }}>
            UCI
          </Typography>
        </Stack>
      </Paper>

      {/* Moves List */}
      <Stack spacing={0}>
        {data.slice(0, maxMoves).map((move, index) => (
          <Paper
            key={`${move.uci}-${index}`}
            onClick={() => analyzeMove(move)}
            sx={{
              p: 2,
              backgroundColor: "#1a1a1a",
              borderRadius: 0,
              borderBottom: index < data.slice(0, maxMoves).length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
              borderLeft: index === 0 ? "3px solid #9c27b0" : "3px solid transparent",
              cursor: llmLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              "&:hover": {
                backgroundColor: llmLoading ? "#1a1a1a" : "rgba(156, 39, 176, 0.1)",
              },
              filter: llmLoading ? "grayscale(50%)" : "none",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              {/* Move */}
              <Typography
                variant="body2"
                sx={{
                  color: "#9c27b0",
                  fontWeight: "bold",
                  minWidth: "80px",
                  fontFamily: "monospace",
                  fontSize: "0.9rem"
                }}
              >
                {index + 1}. {move.san}
              </Typography>

              {/* Score */}
              {showScores && (
                <Typography
                  variant="body2"
                  sx={{
                    color: getScoreColor(move.score),
                    minWidth: "60px",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    fontWeight: 500
                  }}
                >
                  {move.score === "N/A" ? "—" : `${parseFloat(move.score) >= 0 ? '+' : ''}${move.score}`}
                </Typography>
              )}

              {/* Win Rate */}
              {showWinrates && (
                <Typography
                  variant="body2"
                  sx={{
                    color: getWinrateColor(move.winrate),
                    minWidth: "60px",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    fontWeight: 500
                  }}
                >
                  {move.winrate === "N/A" ? "—" : `${move.winrate}%`}
                </Typography>
              )}

              {/* UCI */}
              <Typography
                variant="body2"
                sx={{
                  color: "grey.400",
                  fontFamily: "monospace",
                  fontSize: "0.8rem",
                  flex: 1
                }}
              >
                {move.uci}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* Footer Info */}
      <Paper
        sx={{
          p: 1.5,
          backgroundColor: "#1a1a1a",
          borderRadius: 0,
          mt: 0
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={1}>
            <Storage fontSize="small" sx={{ color: "#9c27b0" }} />
            <Typography variant="caption" sx={{ color: "grey.400" }}>
              Data from ChessDB
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: "grey.400" }}>
            Showing {Math.min(maxMoves, data.length)} of {data.length} moves
          </Typography>
        </Stack>
      </Paper>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: {
            backgroundColor: "#1a1a1a",
            color: "white",
            minWidth: 400
          }
        }}
      >
        <DialogTitle>ChessDB Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                Max Moves to Display: {Math.min(maxMoves, actualMaxMoves)}
              </Typography>
              <Typography variant="caption" sx={{ color: "grey.400", mb: 1, display: "block" }}>
                Available moves in this position: {actualMaxMoves}
              </Typography>
              <Typography variant="caption" sx={{ color: "grey.400", mb: 2, display: "block" }}>
                Set how many candidate moves to show
              </Typography>
              <Box sx={{ px: 1 }}>
                <input
                  type="range"
                  min={1}
                  max={Math.max(actualMaxMoves, 1)}
                  value={Math.min(maxMoves, actualMaxMoves)}
                  onChange={(e) => setMaxMoves(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#9c27b0'
                  }}
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                Display Options
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Show Scores
                  </Typography>
                  <Switch
                    checked={showScores}
                    onChange={(e) => setShowScores(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#9c27b0',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#9c27b0',
                      },
                    }}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Show Win Rates
                  </Typography>
                  <Switch
                    checked={showWinrates}
                    onChange={(e) => setShowWinrates(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#9c27b0',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#9c27b0',
                      },
                    }}
                  />
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose} sx={{ color: "#9c27b0" }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hint */}
      <Box sx={{ mt: 2 }}>
        <Typography
          variant="caption"
          sx={{ color: "grey.500", fontStyle: "italic" }}
        >
          💡 Click on any move above to get AI analysis of that candidate
        </Typography>
      </Box>
    </Box>
  );
}

export default ChessDBDisplay;