import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Divider,
  Paper,
  Stack,
} from "@mui/material";
import { validateFen } from "chess.js";
import { grey } from "@mui/material/colors";

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

      if (moves.length === 0) {
        setData([]);
        return;
      }

      const processedMoves = moves.slice(0, 5).map((move: CandidateMove) => {
        const scoreNum = Number(move.score);
        const scoreStr = isNaN(scoreNum) ? "N/A" : String(scoreNum);
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
  title?: string;
  showTitle?: boolean;
  analyzeMove: (move: CandidateMove) => void;
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
  title = "ChessDB Analysis",
  showTitle = true,
  analyzeMove,
}: ChessDBDisplayProps) {
  const wheatDark = "#f2da2f";
  const wheatLight = "#FFF8E1";
  const textWheat = "#ecdf90";
  const borderGrey = "#BDBDBD";

  const getScoreColor = (score: string) => {
    if (score === "N/A") return "default";
    const numScore = parseFloat(score);
    if (numScore > 50) return "success";
    if (numScore < -50) return "error";
    return "warning";
  };

  const getWinrateColor = (winrate: string) => {
    if (winrate === "N/A") return "default";
    const rate = parseFloat(winrate);
    if (rate >= 60) return "success";
    if (rate <= 40) return "error";
    return "warning";
  };

  if (!data || data === null) {
    return (
      <Paper sx={{ backgroundColor: "#242121" }}>
        <Card elevation={0} sx={{ backgroundColor: "transparent" }}>
          <CardContent>
            <Typography variant="body2" sx={{ color: textWheat }}>
              No ChessDb data present for this position
            </Typography>
          </CardContent>
        </Card>
      </Paper>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ backgroundColor: "#242121" }}>
        <Card elevation={0} sx={{ backgroundColor: "transparent" }}>
          <CardContent>
            <Alert
              severity="info"
              sx={{
                border: `1px solid ${wheatDark}`,
                color: textWheat,
                backgroundColor: wheatLight,
              }}
            >
              No moves found for this position in ChessDB
            </Alert>
          </CardContent>
        </Card>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        backgroundColor: "#242121",
        p: 2,
        border: `1px solid ${wheatDark}`,
      }}
    >
      <Card elevation={0} sx={{ backgroundColor: "transparent" }}>
        <CardContent>
          <Stack spacing={2}>
            {showTitle && (
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ color: textWheat }}>
                  {title}
                </Typography>
                <Divider sx={{ borderColor: wheatDark }} />
              </Stack>
            )}

            <Typography variant="caption" sx={{ color: wheatDark }}>
              Tip: Click a move below to analyze it.
            </Typography>

            <Stack spacing={2}>
              {data.map((move, index) => (
                <Paper
                  key={`${move.uci}-${index}`}
                  elevation={2}
                  onClick={() => analyzeMove(move)}
                  sx={{
                    p: 2,
                    backgroundColor: "#242121",
                    border: "1px solid",
                    borderColor: index === 0 ? wheatDark : borderGrey,
                    cursor: "pointer",
                    transition: "background 0.2s",
                    "&:hover": {
                      backgroundColor: grey[700],
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography
                        variant="h6"
                        component="span"
                        sx={{ color: textWheat }}
                      >
                        {index + 1}. {move.san}
                      </Typography>
                      <Typography variant="body2" sx={{ color: wheatDark }}>
                        ({move.uci})
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={`Score: ${move.score}`}
                        color={getScoreColor(move.score)}
                        size="small"
                        variant="outlined"
                        sx={{ color: textWheat, borderColor: wheatDark }}
                      />
                      <Chip
                        label={`Win Rate: ${move.winrate}%`}
                        color={getWinrateColor(move.winrate)}
                        size="small"
                        variant="outlined"
                        sx={{ color: textWheat, borderColor: wheatDark }}
                      />
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Typography variant="caption" sx={{ color: textWheat }}>
              Data provided by ChessDB • Top {data.length} moves shown
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Paper>
  );
}
