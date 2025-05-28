'use client';

import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Card,
  CardContent,
  Avatar,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SchoolIcon from '@mui/icons-material/School';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ViewBoardIcon from '@mui/icons-material/Bolt';
import { useClerk, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const clerk = useClerk();
  const router = useRouter();

  // Dashboard for logged-in users
  if (isSignedIn && isLoaded) {
    return (
      <main>
        <Box bgcolor="#7c3aed" color="white" py={8}>
          <Container maxWidth="md">
            <Stack spacing={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#f5deb3', color: '#7c3aed' }}>
                  <SmartToyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    Welcome back, {user?.firstName || 'Chess Player'}!
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Ready to train with Agine today?
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Container>
        </Box>

        <Box py={8} bgcolor="#f5deb3">
          <Container maxWidth="md">
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={4}
              alignItems="stretch"
            >
              <Card 
                elevation={6} 
                sx={{ 
                  flex: 1,
                  height: 320,
                  background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  borderRadius: 3,
                  '&:hover': { 
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: '0 20px 40px rgba(124, 58, 237, 0.3)'
                  }
                }}
                onClick={() => router.push('/position')}
              >
                <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <ViewBoardIcon sx={{ fontSize: 48 }} />
                    <Typography variant="h4" fontWeight="bold">
                      Position Board
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Set up any position and analyze it with Agine. Perfect for studying specific scenarios or exploring tactical ideas.
                  </Typography>
                </CardContent>
              </Card>

              <Card 
                elevation={6} 
                sx={{ 
                  flex: 1,
                  height: 320,
                  background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  borderRadius: 3,
                  '&:hover': { 
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: '0 20px 40px rgba(91, 33, 182, 0.3)'
                  }
                }}
                onClick={() => router.push('/game')}
              >
                <CardContent sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <AnalyticsIcon sx={{ fontSize: 48 }} />
                    <Typography variant="h4" fontWeight="bold">
                      Game Analysis
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Upload your games or paste PGN to get detailed analysis and insights from Agine about your play.
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Container>
        </Box>
      </main>
    );
  }

  // Landing page for non-logged-in users
  return (
    <main>
      {/* Hero Section */}
      <Box 
        sx={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
          color: 'white',
          py: 16,
          position: 'relative'
        }}
      >
        <Container maxWidth="lg">
          <Stack spacing={8} alignItems="center" textAlign="center">
            {/* Agine Avatar */}
            <Box sx={{ position: 'relative' }}>
              <Avatar 
                sx={{ 
                  width: 140, 
                  height: 140, 
                  bgcolor: '#f5deb3',
                  color: '#7c3aed',
                  fontSize: '4rem',
                  boxShadow: '0 10px 30px rgba(245, 222, 179, 0.3)'
                }}
              >
                <SmartToyIcon fontSize="inherit" />
              </Avatar>
              <Box 
                sx={{
                  position: 'absolute',
                  top: -10,
                  right: -10,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  bgcolor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'white' }} />
              </Box>
            </Box>
            
            {/* Main Heading */}
            <Stack spacing={4}>
              <Box>
                <Typography variant="h1" fontWeight="bold" sx={{ fontSize: { xs: '3rem', md: '4rem' } }}>
                  Meet Agine
                </Typography>
                <Typography 
                  variant="h3" 
                  sx={{ 
                    color: '#f5deb3', 
                    fontWeight: 400,
                    fontSize: { xs: '1.8rem', md: '2.5rem' },
                    mt: 2
                  }}
                >
                  Your Virtual Chess Buddy
                </Typography>
              </Box>
              
              <Typography 
                variant="h5" 
                sx={{ 
                  opacity: 0.9, 
                  maxWidth: '800px',
                  lineHeight: 1.6,
                  fontSize: { xs: '1.2rem', md: '1.5rem' }
                }}
              >
                More than just an engine – Agine is your conversational training partner who helps you understand your thought process and explains chess in plain language.
              </Typography>
            </Stack>

            {/* CTA Buttons */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} mt={6}>
              <Button 
                variant="contained" 
                size="large" 
                sx={{ 
                  bgcolor: '#f5deb3', 
                  color: '#7c3aed',
                  '&:hover': { 
                    bgcolor: '#f0d798',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(245, 222, 179, 0.4)'
                  },
                  px: 6,
                  py: 2,
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  borderRadius: 2,
                  transition: 'all 0.3s ease'
                }}
                onClick={() => clerk.openSignUp()}
              >
                Start Training with Agine
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                sx={{ 
                  borderColor: '#f5deb3', 
                  color: '#f5deb3',
                  '&:hover': { 
                    borderColor: '#f0d798', 
                    bgcolor: 'rgba(245, 222, 179, 0.1)',
                    transform: 'translateY(-2px)'
                  },
                  px: 6,
                  py: 2,
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  borderRadius: 2,
                  borderWidth: 2,
                  transition: 'all 0.3s ease'
                }}
                onClick={() => clerk.openSignIn()}
              >
                Sign In
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box py={16} bgcolor="#f5deb3">
        <Container maxWidth="lg">
          <Stack spacing={12}>
            <Box textAlign="center">
              <Typography 
                variant="h2" 
                fontWeight="bold" 
                color="#7c3aed"
                sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' } }}
                gutterBottom
              >
                Why Choose Agine?
              </Typography>
              <Typography 
                variant="h5" 
                color="#5b21b6" 
                sx={{ opacity: 0.8, fontSize: { xs: '1.2rem', md: '1.5rem' } }}
              >
                Experience chess training that feels natural and intuitive
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={6}
              alignItems="stretch"
              justifyContent="center"
            >
              {[ // Use an array to DRY up the cards
                {
                  icon: <ChatIcon sx={{ fontSize: 64, color: '#7c3aed', mb: 3 }} />,
                  title: 'Chat Naturally',
                  description:
                    'Ask "Why is this move good?" or "What should I think here?" and get clear, helpful answers in plain language.',
                },
                {
                  icon: <SportsEsportsIcon sx={{ fontSize: 64, color: '#7c3aed', mb: 3 }} />,
                  title: 'Training Partner',
                  description:
                    'Practice scenarios, work through puzzles, and get personalized feedback based on your playing style.',
                },
                {
                  icon: <SchoolIcon sx={{ fontSize: 64, color: '#7c3aed', mb: 3 }} />,
                  title: 'Learn to Think',
                  description:
                    'Develop better decision-making patterns and strategic understanding with guided analysis.',
                },
              ].map((card) => (
                <Paper
                  key={card.title}
                  elevation={8}
                  sx={{
                    p: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    bgcolor: 'white',
                    borderRadius: 4,
                    flex: 1,
                    minWidth: 0,
                    minHeight: 370,
                    height: { xs: 'auto', md: 370 },
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(124, 58, 237, 0.15)',
                    },
                  }}
                >
                  {card.icon}
                  <Typography variant="h4" fontWeight="bold" gutterBottom color="#7c3aed">
                    {card.title}
                  </Typography>
                  <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6, flexGrow: 1 }}
                  >
                    {card.description}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Final CTA Section */}
      <Box py={16} bgcolor="#7c3aed" color="white">
        <Container maxWidth="md">
          <Stack spacing={6} alignItems="center" textAlign="center">
            <Box>
              <Typography 
                variant="h2" 
                fontWeight="bold"
                sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' } }}
                gutterBottom
              >
                Ready to Improve?
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  opacity: 0.9,
                  fontSize: { xs: '1.3rem', md: '1.5rem' }
                }}
              >
                Join players who are training smarter with Agine
              </Typography>
            </Box>
            
            <Button 
              variant="contained" 
              size="large" 
              sx={{ 
                bgcolor: '#f5deb3', 
                color: '#7c3aed',
                '&:hover': { 
                  bgcolor: '#f0d798',
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 30px rgba(245, 222, 179, 0.4)'
                },
                px: 8,
                py: 3,
                fontSize: '1.4rem',
                fontWeight: 'bold',
                borderRadius: 3,
                transition: 'all 0.3s ease'
              }}
              onClick={() => clerk.openSignUp()}
            >
              Get Started Free
            </Button>
          </Stack>
        </Container>
      </Box>
    </main>
  );
}