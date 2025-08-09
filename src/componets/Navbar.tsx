"use client";

import {
  AppBar,
  Button,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { FaChessPawn, FaChessBoard, FaDiscord, FaPuzzlePiece, FaRobot } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";


export default function NavBar() {
  const router = useRouter();

  return (
    <AppBar position="static" sx={{ backgroundColor: "#111", mb: 3 }}>
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: "bold", cursor: "pointer" }}
          onClick={() => router.push("/")}
        >
          ♟️ ChessAgine
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <SignedIn>
            
            <Button color="inherit" startIcon={<FaChessBoard />} href="/position">
              Analyze Position
            </Button>

            <Button color="inherit" startIcon={<FaChessPawn />} href="/game">
              Analyze Game
            </Button>

            <Button color="inherit" startIcon={<FaPuzzlePiece/>} href="/puzzle">
              Puzzles
            </Button>


            <Button
              variant="text"
              color="inherit"
              startIcon={<FaDiscord />}
              href="https://discord.gg/3RpEnvmZwp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </Button>
            <UserButton />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal" />
            <SignUpButton mode="modal" />
          </SignedOut>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

