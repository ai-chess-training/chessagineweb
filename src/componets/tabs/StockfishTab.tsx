import React from "react";
import { Stack, Paper, Typography, Box, Slider, CircularProgress } from "@mui/material";
import { grey } from "@mui/material/colors";
import { LineEval, PositionEval,  } from "@/stockfish/engine/engine";
import { UciEngine } from "@/stockfish/engine/UciEngine";


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
    engine,
    analyzeWithStockfish,
    handleEngineLineClick,
    llmLoading,
    formatEvaluation,
    formatPrincipalVariation,
}) => {
    // Show loading animation when engine data isn't present
    if (!stockfishAnalysisResult) {
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
                                Depth: {engineDepth}
                            </Typography>
                            <Slider
                                value={engineDepth}
                                onChange={(_, value) => {
                                    setEngineDepth(value as number);
                                    if (engine) {
                                        analyzeWithStockfish();
                                    }
                                }}
                                min={10}
                                max={25}
                                step={1}
                                sx={{ color: "wheat" }}
                            />
                        </Box>

                        <Box>
                            <Typography variant="caption" sx={{ color: "wheat" }}>
                                Lines: {engineLines} (AI will analyze all {engineLines} line
                                {engineLines > 1 ? "s" : ""})
                            </Typography>
                            <Slider
                                value={engineLines}
                                onChange={(_, value) => {
                                    setEngineLines(value as number);
                                    if (engine) {
                                        analyzeWithStockfish();
                                    }
                                }}
                                min={1}
                                max={4}
                                step={1}
                                sx={{ color: "wheat" }}
                            />
                        </Box>
                    </Stack>
                </Paper>

                {/* Loading state when no engine data */}
                <Paper
                    sx={{
                        p: 4,
                        backgroundColor: grey[800],
                        textAlign: "center",
                        borderLeft: "3px solid #ffa726",
                    }}
                >
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <CircularProgress 
                            size={40} 
                            sx={{ 
                                color: "wheat",
                                animation: "pulse 2s infinite",
                                "@keyframes pulse": {
                                    "0%": { opacity: 0.6 },
                                    "50%": { opacity: 1 },
                                    "100%": { opacity: 0.6 },
                                },
                            }} 
                        />
                        <Typography variant="h6" sx={{ color: "wheat", fontWeight: "bold" }}>
                            Initializing Stockfish Engine
                        </Typography>
                        <Typography variant="body2" sx={{ color: "wheat", opacity: 0.8 }}>
                            Preparing chess analysis engine...
                        </Typography>
                        {!engine && (
                            <Typography variant="caption" sx={{ color: "#ffa726", fontStyle: "italic" }}>
                                Engine not ready. Please wait or try starting the analysis.
                            </Typography>
                        )}
                    </Box>
                </Paper>

                {/* Skeleton loading for analysis lines */}
                <Stack spacing={1}>
                    {Array.from({ length: engineLines }).map((_, index) => (
                        <Paper
                            key={`skeleton-${index}`}
                            sx={{
                                p: 2,
                                backgroundColor: grey[700],
                                borderLeft: `3px solid ${index === 0 ? "#4caf50" : "#2196f3"}`,
                                opacity: 0.3,
                                animation: "shimmer 1.5s infinite",
                                "@keyframes shimmer": {
                                    "0%": { opacity: 0.3 },
                                    "50%": { opacity: 0.5 },
                                    "100%": { opacity: 0.3 },
                                },
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                                <Box
                                    sx={{
                                        width: "60px",
                                        height: "16px",
                                        backgroundColor: grey[600],
                                        borderRadius: "4px",
                                    }}
                                />
                                <Box
                                    sx={{
                                        width: "80px",
                                        height: "12px",
                                        backgroundColor: grey[600],
                                        borderRadius: "4px",
                                    }}
                                />
                            </Stack>
                            <Box
                                sx={{
                                    width: "100%",
                                    height: "16px",
                                    backgroundColor: grey[600],
                                    borderRadius: "4px",
                                }}
                            />
                        </Paper>
                    ))}
                </Stack>
            </Stack>
        );
    }

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
                            Depth: {engineDepth}{" "}
                            {stockfishLoading && "(will update analysis)"}
                        </Typography>
                        <Slider
                            value={engineDepth}
                            onChange={(_, value) => {
                                setEngineDepth(value as number);
                                if (stockfishLoading && engine) {
                                    analyzeWithStockfish();
                                }
                            }}
                            min={10}
                            max={25}
                            step={1}
                            sx={{ color: "wheat" }}
                        />
                    </Box>

                    <Box>
                        <Typography variant="caption" sx={{ color: "wheat" }}>
                            Lines: {engineLines} (AI will analyze all {engineLines} line
                            {engineLines > 1 ? "s" : ""})
                        </Typography>
                        <Slider
                            value={engineLines}
                            onChange={(_, value) => {
                                setEngineLines(value as number);
                                if (stockfishLoading && engine) {
                                    analyzeWithStockfish();
                                }
                            }}
                            min={1}
                            max={4}
                            step={1}
                            sx={{ color: "wheat" }}
                        />
                    </Box>
                </Stack>
            </Paper>

            {stockfishLoading && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" sx={{ color: "wheat" }}>
                        Analyzing... (Depth: {engineDepth}, Lines: {engineLines}) - data
                        updates in real-time
                    </Typography>
                </Box>
            )}

            {stockfishAnalysisResult.bestMove && (
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
                            backgroundColor: grey[700],
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
                                backgroundColor: llmLoading ? grey[700] : grey[600],
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