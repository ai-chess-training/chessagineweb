// components/tabs/OpeningExplorerTab.tsx
"use client";

import { 
  Box, 
  CircularProgress, 
  Typography, 
  Paper, 
  Stack, 
  Chip,
  Link
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { MasterGames, Moves } from "./AnalysisTab";

interface OpeningExplorerTabProps {
  openingData: MasterGames | null;
  loading: boolean;
  onMoveClick: (move: Moves) => void;
  llmLoading: boolean;
}

export default function OpeningExplorerTab({
  openingData,
  loading,
  onMoveClick,
  llmLoading,
}: OpeningExplorerTabProps) {

 const renderOpeningExplorer = () => {

    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
          <CircularProgress size={20} />
          <Typography sx={{ ml: 2, color: "wheat" }}>Loading opening data...</Typography>
        </Box>
      );
    }

    if (!openingData) {
      return (
        <Typography sx={{ color: "wheat", py: 2 }}>
          Click Opening Explorer to load master game statistics for this position.
        </Typography>
      );
    }

    const totalGames = (openingData.white ?? 0) + (openingData.draws ?? 0) + (openingData.black ?? 0);

    if (totalGames === 0) {
      return (
        <Typography sx={{ color: "wheat", py: 2 }}>
          No master games found for this position.
        </Typography>
      );
    }

    const whiteWinRate = ((openingData.white / totalGames) * 100).toFixed(1);
    const drawRate = ((openingData.draws / totalGames) * 100).toFixed(1);
    const blackWinRate = ((openingData.black / totalGames) * 100).toFixed(1);

    return (
      <Stack spacing={3}>
        {/* Opening Info */}
        {openingData.opening && (
          <Box>
            <Typography variant="h6" sx={{ color: "white", mb: 1 }}>
              {openingData.opening.name}
            </Typography>
            <Chip label={openingData.opening.eco} color="primary" size="small" />
          </Box>
        )}

        {/* Overall Statistics */}
        <Paper sx={{ p: 2, backgroundColor: grey[700] }}>
          <Typography variant="subtitle2" sx={{ color: "white", mb: 2 }}>
            Master Games: {totalGames.toLocaleString()}
          </Typography>
            <Stack direction="row" spacing={2} justifyContent="space-between">
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography variant="h6" sx={{ color: "#4caf50" }}>
              {whiteWinRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: "wheat" }}>
              White wins
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography variant="h6" sx={{ color: "#ff9800" }}>
              {drawRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: "wheat" }}>
              Draws
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center", flex: 1 }}>
              <Typography variant="h6" sx={{ color: "#f44336" }}>
              {blackWinRate}%
              </Typography>
              <Typography variant="caption" sx={{ color: "wheat" }}>
              Black wins
              </Typography>
            </Box>
            </Stack>
        </Paper>

        {/* Popular Moves */}
        {openingData.moves && openingData.moves.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "white", mb: 2 }}>
              Popular Moves
            </Typography>
            <Typography variant="caption" sx={{ color: "wheat", fontStyle: "italic", mb: 2, display: "block" }}>
              💡 Click on any move below to get AI analysis of that continuation
            </Typography>
            <Stack spacing={1}>
              {openingData.moves.slice(0, 5).map((move, index) => {
                const moveTotal = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
                const moveWhite = ((move.white / moveTotal) * 100).toFixed(1);
                const moveDraw = ((move.draws / moveTotal) * 100).toFixed(1);
                const moveBlack = ((move.black / moveTotal) * 100).toFixed(1);
                const playedPercentage = ((moveTotal / totalGames) * 100).toFixed(1);

                return (
                  <Paper
                    key={`${move.uci}-${index}`}
                    onClick={() => onMoveClick(move)}
                    sx={{
                      p: 2,
                      backgroundColor: grey[600],
                      cursor: llmLoading ? "not-allowed" : "pointer",
                      "&:hover": {
                        backgroundColor: llmLoading ? grey[600] : grey[500],
                        transform: llmLoading ? "none" : "translateY(-1px)",
                      },
                      filter: llmLoading ? "grayscale(50%)" : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body1" sx={{ color: "white", fontWeight: "bold" }}>
                          {move.san}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "wheat" }}>
                          {moveTotal.toLocaleString()} games ({playedPercentage}%) • Avg rating: {move.averageRating}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Chip label={`W: ${moveWhite}%`} size="small" sx={{ backgroundColor: "#4caf50", color: "white" }} />
                        <Chip label={`D: ${moveDraw}%`} size="small" sx={{ backgroundColor: "#ff9800", color: "white" }} />
                        <Chip label={`B: ${moveBlack}%`} size="small" sx={{ backgroundColor: "#f44336", color: "white" }} />
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Top Games */}
        {openingData.topGames && openingData.topGames.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "white", mb: 2 }}>
              Notable Games
            </Typography>
            <Stack spacing={1}>
              {openingData.topGames.slice(0, 3).map((game, index) => (
                <Paper key={`${game.id}-${index}`} sx={{ p: 2, backgroundColor: grey[700] }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" sx={{ color: "white" }}>
                        {game.white?.name} ({game.white?.rating}) vs {game.black?.name} ({game.black?.rating})
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

  return (
    renderOpeningExplorer()
  )

}