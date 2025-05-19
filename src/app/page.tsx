'use client';

import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import { useUser } from '@clerk/nextjs';
import PositionPage from './position/page';

export default function HomePage() {
  const { isSignedIn, isLoaded } = useUser();
  

  if (isSignedIn && isLoaded) {
    return (
     <PositionPage/>
    )
  }

 
  return (
    <main>
      <Box bgcolor="black" color="white" py={12}>
        <Container maxWidth="md">
          <Stack spacing={4} alignItems="center" textAlign="center">
            <Typography variant="h2" fontWeight="bold">
              Welcome to Chessagine
            </Typography>
            <Typography variant="h6">
              Your AI-powered chess companion combining Stockfish precision with LLM intuition.
              Analyze your games, study openings, and get real-time feedback with access to real-world game data.
            </Typography>
            <Button variant="contained" color="primary" size="large">
              Launch the AI Board
            </Button>
          </Stack>
        </Container>
      </Box>

      <Box py={10}>
        <Container maxWidth="lg">
          <Stack spacing={6} alignItems="center">
            <Typography variant="h4" fontWeight="bold" textAlign="center">
              What Makes Chessagine Unique?
            </Typography>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={4}
              width="100%"
              justifyContent="center"
            >
              <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center' }}>
                <SmartToyIcon fontSize="large" color="primary" />
                <Typography variant="h6" mt={2} fontWeight="bold">
                  Hybrid AI Engine
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chessagine blends Stockfish's raw calculation with LLM explanations for human-friendly insights.
                </Typography>
              </Paper>

              <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center' }}>
                <TravelExploreIcon fontSize="large" color="primary" />
                <Typography variant="h6" mt={2} fontWeight="bold">
                  Opening Explorer
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse thousands of opening lines with win rates, popularity, and real game outcomes.
                </Typography>
              </Paper>

              <Paper elevation={3} sx={{ p: 4, flex: 1, textAlign: 'center' }}>
                <PsychologyAltIcon fontSize="large" color="primary" />
                <Typography variant="h6" mt={2} fontWeight="bold">
                  Understand Your Game
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Our Agent explains each move in plain language, so you don't have to figure out engine numbers.
                </Typography>
              </Paper>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </main>
  );
}
