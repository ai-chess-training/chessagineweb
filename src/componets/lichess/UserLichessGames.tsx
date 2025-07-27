import React, { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { UserGame, fetchUserRecentGames } from "./LichessTypes";
import {
  Box,
  CircularProgress,
  FormControl,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import TimerIcon from "@mui/icons-material/Timer";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import HistoryIcon from "@mui/icons-material/History";
import CasinoIcon from "@mui/icons-material/Casino";
import { purpleTheme } from "./UserGameSelect";

interface UserGameProp {
  loadPGN: (pgn: string) => void;
  setOpen: (handle: boolean) => void;
}

export default function UserLichessGames({ loadPGN, setOpen }: UserGameProp) {
  const [requestCount, setRequestCount] = useState(0);
  const [lichessUsername, setLichessUsername] = useLocalStorage(
    "lichess-username",
    ""
  );
  const [games, setGames] = useState<UserGame[]>([]);

  useEffect(() => {
    if (!lichessUsername) {
      setGames([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const games = await fetchUserRecentGames(lichessUsername);
      setGames(games);
    }, requestCount === 0 ? 0 : 500);

    setRequestCount((prev) => prev + 1);
    return () => clearTimeout(timeout);
  }, [lichessUsername]);

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case "bullet":
        return <FlashOnIcon fontSize="small" sx={{ mr: 1, color: purpleTheme.primary }} />;
      case "blitz":
        return <TimerIcon fontSize="small" sx={{ mr: 1, color: purpleTheme.primary }} />;
      case "rapid":
        return <RocketLaunchIcon fontSize="small" sx={{ mr: 1, color: purpleTheme.primary }} />;
      case "classical":
        return <HistoryIcon fontSize="small" sx={{ mr: 1, color: purpleTheme.primary }} />;
      default:
        return <CasinoIcon fontSize="small" sx={{ mr: 1, color: purpleTheme.primary }} />;
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        backgroundColor: purpleTheme.background.paper,
        color: purpleTheme.text.primary,
      }}
    >
      <Box display="flex" justifyContent="center" mb={2}>
        <FormControl>
          <TextField
            label="Lichess Username"
            variant="outlined"
            value={lichessUsername}
            onChange={(e) => setLichessUsername(e.target.value)}
            InputLabelProps={{ 
              style: { color: purpleTheme.text.secondary } 
            }}
            InputProps={{
              style: {
                color: purpleTheme.text.primary,
                backgroundColor: purpleTheme.background.input,
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: purpleTheme.secondary,
                },
                '&:hover fieldset': {
                  borderColor: purpleTheme.primary,
                },
                '&.Mui-focused fieldset': {
                  borderColor: purpleTheme.primary,
                },
              },
            }}
          />
        </FormControl>
      </Box>

      {!lichessUsername ? (
        <Typography textAlign="center" color={purpleTheme.text.secondary}>
          Enter a username to load recent games
        </Typography>
      ) : games.length === 0 ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress sx={{ color: purpleTheme.primary }} />
        </Box>
      ) : (
        <List sx={{ maxHeight: 400, overflowY: "auto" }}>
          {games.map((game) => (
            <ListItemButton
              key={game.id}
              onClick={() => {
                loadPGN(game.pgn);
                setOpen(false);
              }}
              sx={{
                mb: 1,
                backgroundColor: purpleTheme.background.card,
                color: purpleTheme.text.primary,
                borderRadius: "8px",
                "&:hover": {
                  backgroundColor: purpleTheme.primaryDark,
                },
              }}
            >
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center">
                    {getSpeedIcon(game.speed)}
                    {`${game.players.white.user?.name || "white"} (${
                      game.players.white.rating || "?"
                    }) vs ${game.players.black.user?.name || "black"} (${
                      game.players.black.rating || "?"
                    })`}
                  </Box>
                }
                secondary={`Played on ${new Date(game.lastMoveAt)
                  .toLocaleString()
                  .slice(0, -3)}`}
                primaryTypographyProps={{
                  fontWeight: "bold",
                  noWrap: true,
                  color: purpleTheme.text.primary,
                }}
                secondaryTypographyProps={{
                  noWrap: true,
                  color: purpleTheme.text.secondary,
                }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  );
}