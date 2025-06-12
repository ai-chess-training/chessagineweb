import React from "react";
import { Stack, Paper, Typography, Box, CircularProgress } from "@mui/material";
import { grey } from "@mui/material/colors";
import { LineEval, PositionEval,  } from "@/stockfish/engine/engine";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import Slider from "../stockfish/Slider";


interface StockfishAnalysisProps {
    stockfishAnalysisResult: PositionEval | null;
    stockfishLoading: boolean;
    engineDepth: number;
    setEngineDepth: (depth: number) => void;
    engineLines: number;
    setEngineLines: (lines: number) => void;
    engine: UciEngine | undefined;
    analyzeWithStockfish: () => void;
    handleEngineLineClick: (line: LineEval, index: number) => void;
    llmLoading: boolean;
    formatEvaluation: (line: LineEval) => string;
    formatPrincipalVariation: (pv: string[], fen: string) => string;
}

export const StockfishAnalysisTab: React.FC<StockfishAnalysisProps> = ({
    stockfishAnalysisResult,
    stockfishLoading,
    engineDepth,
    setEngineDepth,
    engineLines,
    setEngineLines,
    handleEngineLineClick,
    llmLoading,
    formatEvaluation,
    formatPrincipalVariation,
}) => {
  
    // Enhanced condition to check for valid analysis result with lines
    if (!stockfishAnalysisResult || stockfishLoading || !stockfishAnalysisResult.lines || stockfishAnalysisResult.lines.length === 0) {
        return (
            <Stack spacing={2}>
                <Paper
                    sx={{
                        p: 2,
                        width: "100%",
                        backgroundColor: "#242121",
                    }}
                >
                    <Typography variant="subtitle2" sx={{ color: "wheat", mb: 2 }}>
                        Stockfish Settings (Used by AI Analysis)
                    </Typography>

                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="caption" sx={{ color: "wheat" }}>
                                Depth: {engineDepth}
                            </Typography>
                            <Slider
                                value={engineDepth}
                                setValue={setEngineDepth}
                                min={10}
                                max={25}
                                disable={stockfishLoading}
                                
                            />
                        </Box>

                        <Box>
                            <Typography variant="caption" sx={{ color: "wheat" }}>
                                Lines: {engineLines} (AI will analyze all {engineLines} line
                                {engineLines > 1 ? "s" : ""})
                            </Typography>
                            <Slider
                                value={engineLines}
                                setValue={setEngineLines}
                                min={1}
                                max={4}
                                disable={stockfishLoading}
                            />
                        </Box>
                    </Stack>
                </Paper>

                {/* Simple loading state */}
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress 
                        size={40} 
                        sx={{ color: "wheat" }} 
                    />
                </Box>
            </Stack>
        );
    }

    return (
        <Stack spacing={2}>
            <Paper
                    sx={{
                        p: 2,
                        width: "100%",
                        backgroundColor: "#242121",
                    }}
                >
                    <Typography variant="subtitle2" sx={{ color: "wheat", mb: 2 }}>
                        Stockfish Settings (Used by AI Analysis)
                    </Typography>

                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="caption" sx={{ color: "wheat" }}>
                                Depth: {engineDepth}
                            </Typography>
                            <Slider
                                value={engineDepth}
                                setValue={setEngineDepth}
                                min={10}
                                max={25}
                                disable={stockfishLoading}
                                
                            />
                        </Box>

                        <Box>
                            <Typography variant="caption" sx={{ color: "wheat" }}>
                                Lines: {engineLines} (AI will analyze all {engineLines} line
                                {engineLines > 1 ? "s" : ""})
                            </Typography>
                            <Slider
                                value={engineLines}
                                setValue={setEngineLines}
                                min={1}
                                max={4}
                                disable={stockfishLoading}
                            />
                        </Box>
                    </Stack>
                </Paper>

            {stockfishLoading && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: "wheat" }} />
                    <Typography variant="caption" sx={{ color: "wheat" }}>
                        Analyzing... (Depth: {engineDepth}, Lines: {engineLines}) - data
                        updates in real-time
                    </Typography>
                </Box>
            )}

            {/* Enhanced safety check for bestMove display */}
            {stockfishAnalysisResult.bestMove && 
             stockfishAnalysisResult.lines && 
             stockfishAnalysisResult.lines.length > 0 && 
             stockfishAnalysisResult.lines[0].pv && 
             stockfishAnalysisResult.lines[0].pv.length > 0 && (
                <Box>
                    <Typography
                        variant="subtitle2"
                        sx={{ color: "wheat", fontWeight: "bold" }}
                    >
                        Best Move: {formatPrincipalVariation(stockfishAnalysisResult.lines[0].pv, stockfishAnalysisResult.lines[0].fen).split(' ')[0]}
                    </Typography>
                </Box>
            )}

            <Typography
                variant="caption"
                sx={{ color: "wheat", fontStyle: "italic" }}
            >
                💡 Click on any line below to get AI analysis of that specific
                variation
            </Typography>

            <Stack spacing={1}>
                {stockfishAnalysisResult.lines.map((line, index) => (
                    <Paper
                        key={`line-${index}-${line.depth}-${line.cp || line.mate}`}
                        onClick={() => handleEngineLineClick(line, index)}
                        sx={{
                            p: 2,
                            backgroundColor: "#242121", // Changed from grey[700] to grey[800] for a darker initial state
                            borderLeft: `3px solid ${index === 0 ? "#4caf50" : "#2196f3"}`,
                            opacity: stockfishLoading && line.depth < engineDepth ? 0.8 : 1,
                            transition: "opacity 0.3s ease, transform 0.2s ease",
                            animation: stockfishLoading ? "pulse 2s infinite" : "none",
                            "@keyframes pulse": {
                                "0%": { opacity: 0.8 },
                                "50%": { opacity: 1 },
                                "100%": { opacity: 0.8 },
                            },
                            cursor: llmLoading ? "not-allowed" : "pointer",
                            "&:hover": {
                                backgroundColor: llmLoading ? grey[800] : grey[600],
                                transform: llmLoading ? "none" : "translateY(-2px)",
                                boxShadow: llmLoading ? "none" : "0 4px 8px rgba(0,0,0,0.3)",
                            },
                            filter: llmLoading ? "grayscale(50%)" : "none",
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{ mb: 1 }}
                        >
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
                                {stockfishLoading &&
                                    line.depth < engineDepth &&
                                    " (updating...)"}
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

                {stockfishLoading &&
                    stockfishAnalysisResult.lines.length < engineLines &&
                    Array.from({
                        length: engineLines - stockfishAnalysisResult.lines.length,
                    }).map((_, index) => (
                        <Paper
                            key={`placeholder-${index}`}
                            sx={{
                                p: 2,
                                backgroundColor: grey[800],
                                borderLeft: "3px solid #666",
                                opacity: 0.5,
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={2}
                                alignItems="center"
                                sx={{ mb: 1 }}
                            >
                                <Typography
                                    variant="body2"
                                    sx={{ color: "grey", fontFamily: "monospace" }}
                                >
                                    Calculating line{" "}
                                    {stockfishAnalysisResult.lines.length + index + 1}...
                                </Typography>
                            </Stack>
                        </Paper>
                    ))}
            </Stack>
        </Stack>
    );
};

export default StockfishAnalysisTab;