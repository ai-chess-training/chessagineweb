import { useState } from "react";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Alert,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { purpleTheme } from "@/theme/theme";
import { MoveAnalysis } from "@/hooks/useGameReview";
import { useLocalStorage } from "usehooks-ts";

export interface SavedGameReview {
  id: string;
  gameInfo: Record<string, string>;
  pgn: string;
  gameReview: MoveAnalysis[];
  moves: string[];
  savedAt: string;
  title?: string;
}

interface SaveGameReviewProp {
  loadFromHistory: (savedGame: SavedGameReview) => void;
  historyDialogOpen: boolean;
  setHistoryDialogOpen: (historysave: boolean) => void;
  saveDialogOpen: boolean;
  setSaveDialogOpen: (save: boolean) => void;
  gameInfo: Record<string, string>;
  pgnText: string;
  gameReview: MoveAnalysis[];
  moves: string[];
}

function SaveGameReviewDialog({
  loadFromHistory,
  saveDialogOpen,
  setSaveDialogOpen,
  historyDialogOpen,
  setHistoryDialogOpen,
  gameInfo,
  gameReview,
  moves,
  pgnText,
}: SaveGameReviewProp) {
  const [gameReviewHistory, setGameReviewHistory] = useLocalStorage<
    SavedGameReview[]
  >("chess-game-review-history", []);

const [saveTitle, setSaveTitle] = useState("");

  const generateGameTitle = () => {
    const white = gameInfo.White || "Unknown";
    const black = gameInfo.Black || "Unknown";
    const date = gameInfo.Date || new Date().toLocaleDateString();
    return `${white} vs ${black} - ${date}`;
  };

  const deleteFromHistory = (id: string) => {
    setGameReviewHistory((prev) => prev.filter((game) => game.id !== id));
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSaveConfirm = () => {
    const gameTitle = saveTitle.trim() || generateGameTitle();
    const savedGame: SavedGameReview = {
      id: Date.now().toString(),
      gameInfo,
      pgn: pgnText,
      gameReview,
      moves,
      savedAt: new Date().toISOString(),
      title: gameTitle,
    };

    setGameReviewHistory((prev) => [savedGame, ...prev]);
    setSaveDialogOpen(false);
    setSaveTitle("");
    alert("Game review saved successfully!");
  };

  return (
    <>
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: purpleTheme.background.paper,
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ color: purpleTheme.text.primary }}>
          Save Game Review
        </DialogTitle>
        <DialogContent>
          <div>
            <Typography
              variant="body2"
              component="div"
              sx={{ color: purpleTheme.text.secondary, mb: 2 }}
            >
              Give your game review a title for easy identification
            </Typography>
          </div>

          <TextField
            autoFocus
            fullWidth
            label="Game Title"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder={generateGameTitle()}
            sx={{
              mt: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: purpleTheme.secondary,
                },
                "&:hover fieldset": {
                  borderColor: purpleTheme.accent,
                },
                "&.Mui-focused fieldset": {
                  borderColor: purpleTheme.accent,
                },
              },
            }}
            slotProps={{
              inputLabel: { sx: { color: purpleTheme.text.secondary } },
              input: { sx: { color: purpleTheme.text.primary } },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setSaveDialogOpen(false)}
            sx={{ color: purpleTheme.text.secondary }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveConfirm}
            variant="contained"
            sx={{
              backgroundColor: purpleTheme.accent,
              "&:hover": { backgroundColor: `${purpleTheme.accent}dd` },
            }}
          >
            Save Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              backgroundColor: purpleTheme.background.paper,
              borderRadius: 3,
              maxHeight: "80vh",
            },
          },
        }}
      >
        <DialogTitle sx={{ color: purpleTheme.text.primary }}>
          Saved Game Reviews
        </DialogTitle>
        <DialogContent>
          {gameReviewHistory.length === 0 ? (
            <Alert
              severity="info"
              sx={{
                backgroundColor: `${purpleTheme.accent}20`,
                color: purpleTheme.text.primary,
                "& .MuiAlert-icon": {
                  color: purpleTheme.accent,
                },
              }}
            >
              No saved game reviews yet. Analyze a game and save the review to
              build your history!
            </Alert>
          ) : (
            <List sx={{ width: "100%" }}>
              {gameReviewHistory.map((savedGame) => (
                <ListItem
                  key={savedGame.id}
                  sx={{
                    backgroundColor: purpleTheme.background.card,
                    borderRadius: 2,
                    mb: 1,
                    "&:hover": {
                      backgroundColor: `${purpleTheme.secondary}20`,
                    },
                  }}
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        onClick={() => loadFromHistory(savedGame)}
                        sx={{
                          color: purpleTheme.accent,
                          "&:hover": {
                            backgroundColor: `${purpleTheme.accent}20`,
                          },
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => deleteFromHistory(savedGame.id)}
                        sx={{
                          color: "#f44336",
                          "&:hover": {
                            backgroundColor: "#f4433620",
                          },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <div>
                        <Typography
                          variant="h6"
                          component="div"
                          sx={{
                            color: purpleTheme.text.primary,
                            fontWeight: 600,
                          }}
                        >
                          {savedGame.title}
                        </Typography>
                      </div>
                    }
                    secondary={
                      <Box component="div">
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{
                            color: purpleTheme.text.secondary,
                            display: "block",
                          }}
                        >
                          Saved: {formatDate(savedGame.savedAt)}
                        </Typography>
                        <Box
                          sx={{
                            mt: 1,
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                         
                          <Chip
                            label={`${
                              savedGame.gameInfo.White || "unknown"
                            } vs ${savedGame.gameInfo.Black || "unknown"}`}
                            size="small"
                            sx={{
                              backgroundColor: `${purpleTheme.accent}30`,
                              color: purpleTheme.text.primary,
                              fontSize: "0.75rem",
                            }}
                          />
                          {savedGame.gameInfo.Result && (
                            <Chip
                              label={`Result: ${savedGame.gameInfo.Result}`}
                              size="small"
                              sx={{
                                backgroundColor: `${purpleTheme.secondary}30`,
                                color: purpleTheme.text.primary,
                                fontSize: "0.75rem",
                              }}
                            />
                          )}
                          <Chip
                            label={`${savedGame.moves.length} moves`}
                            size="small"
                            sx={{
                              backgroundColor: `${purpleTheme.primary}30`,
                              color: purpleTheme.text.primary,
                              fontSize: "0.75rem",
                            }}
                          />
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setHistoryDialogOpen(false)}
            sx={{ color: purpleTheme.text.secondary }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SaveGameReviewDialog;
