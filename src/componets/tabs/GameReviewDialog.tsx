import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Tab,
  Tabs,
  Stack,
  Alert,
  Button,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import {
  Close as CloseIcon,
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Warning,
  Flag,
  Analytics,
} from "@mui/icons-material";
import { BarChart, LineChart } from "@mui/x-charts";

interface ThemeScore {
  material: number;
  mobility: number;
  space: number;
  positional: number;
  kingSafety: number;
}

interface ThemeChange {
  theme: string;
  initialScore: number;
  finalScore: number;
  change: number;
  percentChange: number;
}

interface VariationAnalysis {
  themeChanges: ThemeChange[];
  overallChange: number;
  strongestImprovement: ThemeChange | null;
  biggestDecline: ThemeChange | null;
  moveByMoveScores: ThemeScore[];
}

export interface GameReviewTheme {
  gameInfo: {
    white: string;
    black: string;
    result: string;
  };
  whiteAnalysis: {
    overallThemes: VariationAnalysis;
    criticalMoments: Array<{ moveIndex: number; move: string; themeChanges: ThemeChange[] }>;
    averageThemeScores: ThemeScore;
  };
  blackAnalysis: {
    overallThemes: VariationAnalysis;
    criticalMoments: Array<{ moveIndex: number; move: string; themeChanges: ThemeChange[] }>;
    averageThemeScores: ThemeScore;
  };
  insights: {
    whiteBestTheme: string;
    whiteWorstTheme: string;
    blackBestTheme: string;
    blackWorstTheme: string;
    turningPoints: Array<{
      moveNumber: number;
      player: string;
      move: string;
      impact: string;
    }>;
  };
}

interface GameReviewDialogProps {
  gameReview: GameReviewTheme | null;
}

const darkGreyTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#121212",
      paper: "#1E1E1E",
    },
    text: {
      primary: "#E0E0E0",
      secondary: "#B0B0B0",
    },
    primary: { main: "#bb86fc" },
    success: { main: "#81c784" },
    error: { main: "#e57373" },
    divider: "#333",
  },
  components: {
    MuiCard: { styleOverrides: { root: { backgroundColor: "#1E1E1E" } } },
    MuiDialog: { styleOverrides: { paper: { backgroundColor: "#1E1E1E" } } },
  },
});

export const GameReviewDialog: React.FC<GameReviewDialogProps> = ({ gameReview }) => {
  const [open, setOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  if (!gameReview) return null;

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => setTabValue(newValue);

  const formatThemeName = (theme: string) =>
    theme
      .split(/(?=[A-Z])/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const getThemeColor = (value: number) =>
    value > 0 ? "success" : value < 0 ? "error" : "default";

  const renderBarChart = (scores: ThemeScore) => {
    const data = Object.entries(scores).map(([theme, score]) => ({
      theme: formatThemeName(theme),
      score,
    }));

    return (
      <BarChart
        xAxis={[{ dataKey: "theme", scaleType: "band", label: "Theme" }]}
        series={[{ dataKey: "score", label: "Score", color: "#bb86fc" }]}
        dataset={data}
        height={300}
        margin={{ left: 60, right: 20, bottom: 50 }}
        grid={{ horizontal: true }}
      />
    );
  };

  const renderMoveByMoveChart = (scores: ThemeScore[]) => {
    const moveNumbers = scores.map((_, i) => i + 1);
    const themes = Object.keys(scores[0]);

    return (
      <LineChart
        xAxis={[{ data: moveNumbers, label: "Move Number" }]}
        series={themes.map((t) => ({
          data: scores.map((s) => s[t as keyof ThemeScore]),
          label: formatThemeName(t),
        }))}
        height={300}
        margin={{ left: 60, right: 20, bottom: 50 }}
        grid={{ horizontal: true }}
      />
    );
  };

  const renderPlayerAnalysis = (
    analysis: GameReviewTheme["whiteAnalysis"] | GameReviewTheme["blackAnalysis"],
    bestTheme: string,
    worstTheme: string
  ) => (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip icon={<EmojiEvents />} label={`Best: ${formatThemeName(bestTheme)}`} color="success" />
        <Chip icon={<Warning />} label={`Worst: ${formatThemeName(worstTheme)}`} color="error" />
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Average Theme Scores
          </Typography>
          {renderBarChart(analysis.averageThemeScores)}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Move-by-Move Theme Trends
          </Typography>
          {renderMoveByMoveChart(analysis.overallThemes.moveByMoveScores)}
        </CardContent>
      </Card>

      
        <Grid >
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Theme Changes
              </Typography>
              {analysis.overallThemes.themeChanges.map((change, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2">{formatThemeName(change.theme)}</Typography>
                  <Chip
                    size="small"
                    icon={change.change > 0 ? <TrendingUp /> : <TrendingDown />}
                    label={`${change.change > 0 ? "+" : ""}${change.change.toFixed(2)} (${change.percentChange.toFixed(1)}%)`}
                    color={getThemeColor(change.change)}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      
    </Box>
  );

  return (
    <ThemeProvider theme={darkGreyTheme}>
      <Button variant="contained" startIcon={<Analytics />} onClick={handleOpen}>
        Game Theme Analysis
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Typography variant="h5">Game Theme Analysis</Typography>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>{gameReview.gameInfo.white}</strong> vs{" "}
              <strong>{gameReview.gameInfo.black}</strong> • Result:{" "}
              <strong>{gameReview.gameInfo.result}</strong>
            </Typography>
          </Alert>

          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab label="White Analysis" />
            <Tab label="Black Analysis" />
            <Tab label="Game Insights" />
          </Tabs>

          {tabValue === 0 &&
            renderPlayerAnalysis(
              gameReview.whiteAnalysis,
              gameReview.insights.whiteBestTheme,
              gameReview.insights.whiteWorstTheme
            )}

          {tabValue === 1 &&
            renderPlayerAnalysis(
              gameReview.blackAnalysis,
              gameReview.insights.blackBestTheme,
              gameReview.insights.blackWorstTheme
            )}

          {tabValue === 2 && (
            <Box>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Flag /> Turning Points
                  </Typography>
                  {gameReview.insights.turningPoints.map((tp, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        mb: 1.5,
                        p: 2,
                        borderRadius: 1,
                        backgroundColor: "#2A2A2A",
                        borderLeft: 4,
                        borderColor: tp.player === "White" ? "primary.main" : "secondary.main",
                      }}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        Move {tp.moveNumber} • {tp.player}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>{tp.move}</strong>
                      </Typography>
                      <Chip
                        size="small"
                        label={tp.impact}
                        sx={{ mt: 1 }}
                        color={tp.impact.includes("+") ? "success" : "error"}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
};
