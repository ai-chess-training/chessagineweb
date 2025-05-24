// components/tabs/StockfishAnalysisTab.tsx
"use client";

import { 
  Box, 
  CircularProgress, 
  Typography, 
  Paper, 
  Stack, 
  Slider 
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import { PositionEval, LineEval } from "@/stockfish/engine/engine";

interface StockfishAnalysisTabProps {
  result: PositionEval | null;
  loading: boolean;
  engineDepth: number;
  engineLines: number;
  onEngineDepthChange: (depth: number) => void;
  onEngineLinesChange: (lines: number) => void;
  onEngineLineClick: (line: LineEval, lineIndex: number) => void;
  llmLoading: boolean;
}

export default function StockfishAnalysisTab({
  result,
  loading,
  engineDepth,
  engineLines,
  onEngineDepthChange,
  onEngineLinesChange,
  onEngineLineClick,
  llmLoading,
}: StockfishAnalysisTabProps) {
  
  const formatEvaluation = (line: LineEval) => {
    if (line.mate !== undefined) {
      return `M${line.mate}`;
    }
    if (line.cp !== undefined) {
      const eval1 = line.cp / 100;
      return eval1 > 0 ? `+${eval1.toFixed(2)}` : eval1.toFixed(2);
    }
    return "0.00";
  };

  const formatPrincipalVariation = (pv: string[], startFen: string) => {
    const tempGame = new Chess(startFen);
    const moves: string[] = [];
    
    for (const uciMove of pv.slice(0, 6)) { // Show first 6 moves
      try {
        const move = tempGame.move({
          from: uciMove.slice(0, 2),
          to: uciMove.slice(2, 4),
          promotion: uciMove.length > 4 ? uciMove[4] as string : undefined,
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
  };

  const renderStockfishAnalysis = () => {
    if (!result) return null;

    return (
      <Stack spacing={2}>
        <Paper
          sx={{
            p: 2,
            width: "100%",
            backgroundColor: grey[800],
          }}
        >
          <Typography variant="subtitle2" sx={{ color: "wheat", mb: 2 }}>
            Stockfish Settings (Used by AI Analysis)
          </Typography>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" sx={{ color: "wheat" }}>
                Depth: {engineDepth} {loading && "(will update analysis)"}
              </Typography>
              <Slider
                value={engineDepth}
                onChange={(_, value) => onEngineDepthChange(value as number)}
                min={10}
                max={25}
                step={1}
                sx={{ color: "wheat" }}
              />
            </Box>
            
            <Box>
              <Typography variant="caption" sx={{ color: "wheat" }}>
                Lines: {engineLines} (AI will analyze all {engineLines} line{engineLines > 1 ? 's' : ''})
              </Typography>
              <Slider
                value={engineLines}
                onChange={(_, value) => onEngineLinesChange(value as number)}
                min={1}
                max={4}
                step={1}
                sx={{ color: "wheat" }}
              />
            </Box>
          </Stack>
        </Paper>

        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ color: "wheat" }}>
              Analyzing... (Depth: {engineDepth}, Lines: {engineLines}) - data updates in real-time
            </Typography>
          </Box>
        )}

        {result.bestMove && (
          <Box>
            <Typography variant="subtitle2" sx={{ color: "wheat", fontWeight: "bold" }}>
              Best Move: {result.bestMove}
            </Typography>
          </Box>
        )}

        <Typography variant="caption" sx={{ color: "wheat", fontStyle: "italic" }}>
          💡 Click on any line below to get AI analysis of that specific variation
        </Typography>

        <Stack spacing={1}>
          {result.lines.map((line, index) => (
            <Paper
              key={`line-${index}-${line.depth}-${line.cp || line.mate}`}
              onClick={() => onEngineLineClick(line, index)}
              sx={{
                p: 2,
                backgroundColor: grey[700],
                borderLeft: `3px solid ${index === 0 ? "#4caf50" : "#2196f3"}`,
                opacity: loading && line.depth < engineDepth ? 0.8 : 1,
                transition: "opacity 0.3s ease, transform 0.2s ease",
                animation: loading ? "pulse 2s infinite" : "none",
                "@keyframes pulse": {
                  "0%": { opacity: 0.8 },
                  "50%": { opacity: 1 },
                  "100%": { opacity: 0.8 },
                },
                cursor: llmLoading ? "not-allowed" : "pointer",
                "&:hover": {
                  backgroundColor: llmLoading ? grey[700] : grey[600],
                  transform: llmLoading ? "none" : "translateY(-2px)",
                  boxShadow: llmLoading ? "none" : "0 4px 8px rgba(0,0,0,0.3)",
                },
                filter: llmLoading ? "grayscale(50%)" : "none",
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                    minWidth: "60px",
                    fontFamily: "monospace",
                  }}
                >
                  {formatEvaluation(line)}
                </Typography>
                <Typography variant="caption" sx={{ color: "wheat" }}>
                  Depth {line.depth}/{engineDepth}
                  {loading && line.depth < engineDepth && " (updating...)"}
                </Typography>
                {line.nps && (
                  <Typography variant="caption" sx={{ color: "wheat" }}>
                    {Math.round(line.nps / 1000)}k nps
                  </Typography>
                )}
              </Stack>
              
              <Typography
                variant="body2"
                sx={{ color: "wheat", fontFamily: "monospace", mb: 1 }}
              >
                {formatPrincipalVariation(line.pv, line.fen)}
              </Typography>
            </Paper>
          ))}
          
          {/* Show placeholder lines if we're expecting more lines */}
          {loading && result.lines.length < engineLines && (
            Array.from({ length: engineLines - result.lines.length }).map((_, index) => (
              <Paper
                key={`placeholder-${index}`}
                sx={{
                  p: 2,
                  backgroundColor: grey[800],
                  borderLeft: "3px solid #666",
                  opacity: 0.5,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ color: "grey", fontFamily: "monospace" }}>
                    Calculating line {result.lines.length + index + 1}...
                  </Typography>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Stack>
    );
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Stockfish Analysis
      </Typography>

      {!loading && !result ? (
        <Typography sx={{ color: "wheat" }}>
          Make some moves or paste a FEN and click Stockfish to see engine evaluation with real-time updates.
        </Typography>
      ) : (
        renderStockfishAnalysis()
      )}
    </>
  );
}