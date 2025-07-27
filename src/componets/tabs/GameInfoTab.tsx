"use client";

import { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { User, Clock, Calendar, Trophy, Navigation, SkipBack, ChevronLeft, ChevronRight, SkipForward, Info } from "lucide-react";
import GameReviewTab from "@/componets/tabs/GameReviewTab";
import { MoveAnalysis } from "@/componets/agine/useGameReview";

function GameInfoTab({
  moves,
  currentMoveIndex,
  goToMove,
  comment,
  gameInfo,
  generateGameReview,
  gameReviewLoading,
  gameReview,
  handleMoveCoachClick,
  handleMoveAnnontateClick,
  handleGameReviewClick,
  gameReviewProgress,
  chatLoading,
}: {
  moves: string[];
  currentMoveIndex: number;
  goToMove: (index: number) => void;
  comment: string;
  generateGameReview: (moves: string[]) => void;
  gameReviewLoading: boolean;
  gameReview: MoveAnalysis[];
  gameReviewProgress: number;
  gameInfo: Record<string, string>;
  chatLoading: boolean;
  handleMoveCoachClick: (gameReview: MoveAnalysis) => void;
  handleMoveAnnontateClick: (review: MoveAnalysis, customQuery?: string) => void;
  handleGameReviewClick: (gameReview: MoveAnalysis[], gameInfo: string) => void;
}) {
  const [gameInfoOpen, setGameInfoOpen] = useState(false);
  const [moveNavOpen, setMoveNavOpen] = useState(false);

  const formatTimeControl = (timeControl: string) => {
    const tc = timeControl.split("+");
    const time = tc[0];
    const inc = tc[1];
    const numberTime = parseInt(time);
    return `${Math.round(numberTime / 60)}+${inc}`;
  };

  const handlePreviousMove = () => {
    if (currentMoveIndex > 0) {
      goToMove(currentMoveIndex - 1);
    }
  };

  const handleNextMove = () => {
    if (currentMoveIndex < moves.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const handleFirstMove = () => {
    goToMove(0);
  };

  const handleLastMove = () => {
    goToMove(moves.length - 1);
  };

  function generateGameInfoPrompt(gameInfo: Record<string, string>): string {
    const lines: string[] = [];
    if (gameInfo.White || gameInfo.WhiteElo)
      lines.push(
        `White: ${gameInfo.White || "Unknown"}${gameInfo.WhiteElo ? ` (${gameInfo.WhiteElo})` : ""}`
      );
    if (gameInfo.Black || gameInfo.BlackElo)
      lines.push(
        `Black: ${gameInfo.Black || "Unknown"}${gameInfo.BlackElo ? ` (${gameInfo.BlackElo})` : ""}`
      );
    if (gameInfo.Date) lines.push(`Date: ${gameInfo.Date}`);
    if (gameInfo.Event) lines.push(`Event: ${gameInfo.Event}`);
    if (gameInfo.Site) lines.push(`Site: ${gameInfo.Site}`);
    if (gameInfo.Result) lines.push(`Result: ${gameInfo.Result}`);
    if (gameInfo.TimeControl) lines.push(`Time Control: ${formatTimeControl(gameInfo.TimeControl)}`);
    if (gameInfo.ECO) lines.push(`ECO: ${gameInfo.ECO}`);
    if (gameInfo.Opening) lines.push(`Opening: ${gameInfo.Opening}`);
    return lines.join("\n");
  }

  return (
    <Stack spacing={3}>
      {/* Icon Buttons for Popups */}
      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
        <IconButton
          onClick={() => setGameInfoOpen(true)}
          sx={{
            color: "wheat",
            bgcolor: grey[800],
            "&:hover": { bgcolor: grey[700] },
          }}
        >
          <Info size={20} />
        </IconButton>
        <IconButton
          onClick={() => setMoveNavOpen(true)}
          sx={{
            color: "wheat",
            bgcolor: grey[800],
            "&:hover": { bgcolor: grey[700] },
          }}
        >
          <Navigation size={20} />
        </IconButton>
      </Box>

      {/* Game Information Dialog */}
      <Dialog
        open={gameInfoOpen}
        onClose={() => setGameInfoOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: grey[900],
            color: "white",
          }
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Trophy size={20} />
          Game Information
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {/* Players */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
              <Stack spacing={0.5} flex={1}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <User size={16} />
                  <Typography variant="subtitle2" sx={{ color: "wheat" }}>
                    Players
                  </Typography>
                </Box>
                <Typography variant="body2">
                  <strong>White:</strong> {gameInfo.White || "Unknown"}
                  {gameInfo.WhiteElo && ` (${gameInfo.WhiteElo})`}
                </Typography>
                <Typography variant="body2">
                  <strong>Black:</strong> {gameInfo.Black || "Unknown"}
                  {gameInfo.BlackElo && ` (${gameInfo.BlackElo})`}
                </Typography>
              </Stack>
              <Stack spacing={0.5} flex={1}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Calendar size={16} />
                  <Typography variant="subtitle2" sx={{ color: "wheat" }}>
                    Game Details
                  </Typography>
                </Box>
                {gameInfo.Date && (
                  <Typography variant="body2">
                    <strong>Date:</strong> {gameInfo.Date}
                  </Typography>
                )}
                {gameInfo.Event && (
                  <Typography variant="body2">
                    <strong>Event:</strong> {gameInfo.Event}
                  </Typography>
                )}
                {gameInfo.Site && (
                  <Typography variant="body2">
                    <strong>Site:</strong> {gameInfo.Site}
                  </Typography>
                )}
                {gameInfo.Result && (
                  <Typography variant="body2">
                    <strong>Result:</strong> {gameInfo.Result}
                  </Typography>
                )}
              </Stack>
            </Stack>

            {/* Time Control */}
            {gameInfo.TimeControl && (
              <Stack spacing={0.5}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Clock size={16} />
                  <Typography variant="subtitle2" sx={{ color: "wheat" }}>
                    Time Control
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {formatTimeControl(gameInfo.TimeControl)}
                </Typography>
              </Stack>
            )}

            {/* Additional Info */}
            {(gameInfo.Opening || gameInfo.ECO) && (
              <Stack spacing={0.5}>
                <Typography variant="subtitle2" sx={{ color: "wheat" }}>
                  Opening
                </Typography>
                {gameInfo.ECO && (
                  <Typography variant="body2">
                    <strong>ECO:</strong> {gameInfo.ECO}
                  </Typography>
                )}
                {gameInfo.Opening && (
                  <Typography variant="body2">
                    <strong>Opening:</strong> {gameInfo.Opening}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGameInfoOpen(false)} sx={{ color: "wheat" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move Navigation Dialog */}
      <Dialog
        open={moveNavOpen}
        onClose={() => setMoveNavOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: grey[900],
            color: "white",
          }
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Navigation size={20} />
          Move Navigation
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {/* Navigation Controls */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
              <IconButton
                onClick={handleFirstMove}
                disabled={currentMoveIndex === 0}
                sx={{ 
                  color: "white",
                  "&:disabled": { color: grey[600] }
                }}
                size="small"
              >
                <SkipBack size={20} />
              </IconButton>
              <IconButton
                onClick={handlePreviousMove}
                disabled={currentMoveIndex === 0}
                sx={{ 
                  color: "white",
                  "&:disabled": { color: grey[600] }
                }}
                size="small"
              >
                <ChevronLeft size={20} />
              </IconButton>
              <Typography variant="body2" sx={{ mx: 2, minWidth: "120px", textAlign: "center" }}>
                Move {currentMoveIndex + 1} of {moves.length}
              </Typography>
              <IconButton
                onClick={handleNextMove}
                disabled={currentMoveIndex === moves.length - 1}
                sx={{ 
                  color: "white",
                  "&:disabled": { color: grey[600] }
                }}
                size="small"
              >
                <ChevronRight size={20} />
              </IconButton>
              <IconButton
                onClick={handleLastMove}
                disabled={currentMoveIndex === moves.length - 1}
                sx={{ 
                  color: "white",
                  "&:disabled": { color: grey[600] }
                }}
                size="small"
              >
                <SkipForward size={20} />
              </IconButton>
            </Box>

            {/* Current Move Display */}
            {moves[currentMoveIndex] && (
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="subtitle2" sx={{ color: "wheat", mb: 0.5 }}>
                  Current Move
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: "monospace" }}>
                  {moves[currentMoveIndex]}
                </Typography>
              </Box>
            )}

            {/* Move Progress Bar */}
            <Box sx={{ width: "100%", px: 1 }}>
              <LinearProgress
                variant="determinate"
                value={moves.length > 0 ? ((currentMoveIndex + 1) / moves.length) * 100 : 0}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: grey[700],
                  "& .MuiLinearProgress-bar": {
                    bgcolor: "wheat",
                    borderRadius: 3,
                  }
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveNavOpen(false)} sx={{ color: "wheat" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game Review Tab - Always Visible */}
      <GameReviewTab
        gameReview={gameReview}
        generateGameReview={async () => generateGameReview(moves)}
        moves={moves}
        handleMoveCoachClick={handleMoveCoachClick}
        chatLoading={chatLoading}
        gameReviewProgress={gameReviewProgress}
        comment={comment}
        whitePlayer={gameInfo.White || "Unknown"}
        blackPlayer={gameInfo.Black || "Unknown"}
        gameInfo={generateGameInfoPrompt(gameInfo)}
        handleMoveAnnontateClick={handleMoveAnnontateClick}
        handleGameReviewClick={handleGameReviewClick}
        gameReviewLoading={gameReviewLoading}
        goToMove={goToMove}
        currentMoveIndex={currentMoveIndex}
      />
    </Stack>
  );
}

export default GameInfoTab;