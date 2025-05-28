import React from "react";
import { Stack, Button } from "@mui/material";
import { UciEngine } from "@/stockfish/engine/UciEngine";
import { RiRobot2Line } from "react-icons/ri";
import { GiChessKing } from "react-icons/gi";
import { BiBookOpen } from "react-icons/bi";

interface AnalysisButtonProps {
    llmLoading: boolean;
    stockfishLoading: boolean;
    openingLoading: boolean;
    engine: UciEngine | undefined;
    analyzePosition: () => void;
    analyzeWithStockfish: () => void;
    fetchOpeningData: () => void;
}

export const AnalysisButtonGroup: React.FC<AnalysisButtonProps> = ({
    llmLoading,
    stockfishLoading,
    openingLoading,
    engine,
    analyzePosition,
    analyzeWithStockfish,
    fetchOpeningData,
}) => (
    <Stack direction="row" spacing={2} alignItems="center">
        <Button
            variant="contained"
            color="primary"
            onClick={analyzePosition}
            startIcon={<GiChessKing />}
            disabled={llmLoading}
        >
            {llmLoading ? "Analyzing..." : "LLM Analysis"}
        </Button>
        <Button
            variant="contained"
            color="secondary"
            onClick={analyzeWithStockfish}
            startIcon={<RiRobot2Line />}
            disabled={stockfishLoading || !engine}
        >
            {stockfishLoading ? "Stockfish..." : "Stockfish"}
        </Button>
        <Button
            variant="contained"
            color="success"
            onClick={fetchOpeningData}
            startIcon={<BiBookOpen />}
            disabled={openingLoading}
        >
            {openingLoading ? "Loading..." : "Opening"}
        </Button>
    </Stack>
);

export default AnalysisButtonGroup;