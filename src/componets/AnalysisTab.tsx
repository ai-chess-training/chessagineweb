// components/AnalysisTabs.tsx
"use client";

import { Box, Tabs, Tab, Paper } from "@mui/material";
import { grey } from "@mui/material/colors";
import AiAnalysisTab from "./AiAnalysisTab";
import StockfishAnalysisTab from "./StockfishTab";
import OpeningExplorerTab from "./OpeningTab";
import { PositionEval } from "@/stockfish/engine/engine";

interface Opening {
  eco: string;
  name: string;
}

interface Side {
  name: string;
  rating: number;
}

interface Game {
  uci: string;
  id: string;
  black: Side;
  white: Side;
  year: number;
  month: string;
}

interface Moves {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
  game: Game;
  opening: Opening;
}

interface MasterGames {
  opening: Opening;
  white: number;
  draws: number;
  black: number;
  moves: Moves[];
  topGames: Game[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface AnalysisTabsProps {
  activeTab: number;
  onTabChange: (newTab: number) => void;
  
  // AI Analysis
  llmAnalysisResult: string | null;
  llmLoading: boolean;
  
  // Stockfish Analysis
  stockfishAnalysisResult: PositionEval | null;
  stockfishLoading: boolean;
  engineDepth: number;
  engineLines: number;
  onEngineDepthChange: (depth: number) => void;
  onEngineLinesChange: (lines: number) => void;
  onEngineLineClick: (line: any, lineIndex: number) => void;
  
  // Opening Explorer
  openingData: MasterGames | null;
  openingLoading: boolean;
  onOpeningMoveClick: (move: Moves) => void;
}

export default function AnalysisTabs({
  activeTab,
  onTabChange,
  llmAnalysisResult,
  llmLoading,
  stockfishAnalysisResult,
  stockfishLoading,
  engineDepth,
  engineLines,
  onEngineDepthChange,
  onEngineLinesChange,
  onEngineLineClick,
  openingData,
  openingLoading,
  onOpeningMoveClick,
}: AnalysisTabsProps) {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        flex: 1,
        minHeight: 300,
        color: "white",
        backgroundColor: grey[800],
        maxHeight: "80vh",
        overflow: "auto",
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => onTabChange(newValue)}
          sx={{
            '& .MuiTab-root': { color: 'wheat' },
            '& .Mui-selected': { color: 'white !important' },
          }}
        >
          <Tab label="AI Analysis" />
          <Tab label="Stockfish Analysis" />
          <Tab label="Opening Explorer" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <AiAnalysisTab
          result={llmAnalysisResult}
          loading={llmLoading}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <StockfishAnalysisTab
          result={stockfishAnalysisResult}
          loading={stockfishLoading}
          engineDepth={engineDepth}
          engineLines={engineLines}
          onEngineDepthChange={onEngineDepthChange}
          onEngineLinesChange={onEngineLinesChange}
          onEngineLineClick={onEngineLineClick}
          llmLoading={llmLoading}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <OpeningExplorerTab
          openingData={openingData}
          loading={openingLoading}
          onMoveClick={onOpeningMoveClick}
          llmLoading={llmLoading}
        />
      </TabPanel>
    </Paper>
  );
}

export type { MasterGames, Moves, Opening, Side, Game };