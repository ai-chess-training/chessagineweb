import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from "@mui/material";
import UserLichessGames from "./UserLichessGames";

interface UserGameSelectProps {
  loadPGN: (pgn: string) => void;
}

const UserGameSelect: React.FC<UserGameSelectProps> = ({ loadPGN }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" onClick={handleOpen}>
          Select game
        </Button>
      </Stack>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "#2e2e2e", // grey background
              color: "#f5deb3", // wheat text
              padding: 2,
              borderRadius: 2,
            },
          },
        }}
      >
        <DialogTitle sx={{ color: "#f5deb3" }}>
          Select a recent Lichess game
        </DialogTitle>
        <DialogContent>
          <UserLichessGames loadPGN={loadPGN} setOpen={setOpen} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} sx={{ color: "#f5deb3" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserGameSelect;
