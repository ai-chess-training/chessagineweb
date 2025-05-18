"use client";

import { AppBar, Button, Stack, Toolbar, Typography } from "@mui/material";
import { FaChessPawn } from "react-icons/fa6";
import { FaChessBoard } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { FaDiscord } from "react-icons/fa";

export default function NavBar() {
  const router = useRouter();

  return (
    <AppBar position="static" sx={{ backgroundColor: "#111", mb: 3 }}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        {/* Left: App Name */}
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", cursor: "pointer" }}
          onClick={() => router.push("/")}
        >
          ♟️ ChessAgine
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button color="inherit" startIcon={<FaChessPawn />} href="/game">
            Analyze Game
          </Button>
          <Button color="inherit" startIcon={<FaChessBoard />} href="/">
            Analyze Position
          </Button>
          <Button
            variant="text"
            color="inherit"
            startIcon={<FaDiscord />}
            href="https://discord.gg/3RpEnvmZwp"
            target="_blank"
            rel="noopener"
          >
            Discord
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
