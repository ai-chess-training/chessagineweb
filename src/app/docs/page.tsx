"use client"
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Grid,
  Container,
  Tab,
  Tabs,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Key as KeyIcon,
  Launch as LaunchIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  AttachMoney as CostIcon,
  Psychology as IntelligenceIcon,
} from '@mui/icons-material';
import { deepPurple, purple, indigo } from '@mui/material/colors';

interface ProviderConfig {
  name: string;
  models: string[];
  keyPrefix: string;
  website: string;
  docsUrl: string;
}

interface ModelRecommendation {
  provider: string;
  model: string;
  useCase: string;
  cost: 'Low' | 'Medium' | 'High';
  performance: 'Good' | 'Better' | 'Best';
  reasoning: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const purpleTheme = {
  primary: deepPurple[500],
  primaryDark: deepPurple[700],
  secondary: purple[400],
  accent: indigo[300],
  background: {
    main: "#1a0d2e",
    paper: "#2d1b3d",
    card: "#3e2463",
    input: "#4a2c5a",
  },
  text: {
    primary: "#ffffff",
    secondary: "#e0e0e0",
    accent: "#f0f0f0",
  },
  success: "#4caf50",
};

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: purpleTheme.primary,
      dark: purpleTheme.primaryDark,
    },
    secondary: {
      main: purpleTheme.secondary,
    },
    background: {
      default: purpleTheme.background.main,
      paper: purpleTheme.background.paper,
    },
    text: {
      primary: purpleTheme.text.primary,
      secondary: purpleTheme.text.secondary,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: purpleTheme.background.card,
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: purpleTheme.background.paper,
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});

function CustomTabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    models: [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'o3',
      'o3-mini',
      'o1',
      'o1-mini',
      'o4-mini',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano'
    ],
    keyPrefix: 'sk-',
    website: 'https://platform.openai.com/api-keys',
    docsUrl: 'https://platform.openai.com/docs/quickstart',
  },
  anthropic: {
    name: 'Claude',
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-5-sonnet-latest',
      'claude-3-5-haiku-latest'
    ],
    keyPrefix: 'sk-ant-',
    website: 'https://console.anthropic.com/settings/keys',
    docsUrl: 'https://docs.anthropic.com/claude/docs/getting-started',
  },
  google: {
    name: 'Google Gemini',
    models: [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro'
    ],
    keyPrefix: 'AIza',
    website: 'https://aistudio.google.com/app/apikey',
    docsUrl: 'https://ai.google.dev/docs',
  },
};

const MODEL_RECOMMENDATIONS: ModelRecommendation[] = [
  {
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    useCase: 'Budget-friendly casual games',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Great balance of cost and chess understanding for beginners'
  },
  {
    provider: 'OpenAI',
    model: 'gpt-4o',
    useCase: 'Advanced chess analysis',
    cost: 'Medium',
    performance: 'Better',
    reasoning: 'Superior reasoning capabilities for complex positions'
  },
  {
    provider: 'OpenAI',
    model: 'o1',
    useCase: 'Deep chess training',
    cost: 'High',
    performance: 'Best',
    reasoning: 'Exceptional reasoning and strategic depth'
  },
  {
    provider: 'Claude',
    model: 'claude-3-5-haiku-latest',
    useCase: 'Quick analysis and hints',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Fast responses with solid chess knowledge'
  },
  {
    provider: 'Claude',
    model: 'claude-sonnet-4-20250514',
    useCase: 'Balanced performance',
    cost: 'Medium',
    performance: 'Better',
    reasoning: 'Excellent reasoning with good cost efficiency'
  },
  {
    provider: 'Gemini',
    model: 'gemini-2.0-flash-lite',
    useCase: 'Fast casual games',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Quick responses for rapid gameplay'
  },
  {
    provider: 'Gemini',
    model: 'gemini-2.5-pro',
    useCase: 'Deep position analysis',
    cost: 'High',
    performance: 'Best',
    reasoning: 'Advanced analysis, can take longer time to get responses'
  }
];

const ChessAgineDocumentation: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'Low': return 'success';
      case 'Medium': return 'warning';
      case 'High': return 'error';
      default: return 'default';
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'Good': return 'info';
      case 'Better': return 'warning';
      case 'Best': return 'success';
      default: return 'default';
    }
  };

  const renderProviderSetup = (provider: ProviderConfig) => (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ color: purpleTheme.text.primary }}>
          {provider.name} Setup Guide
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: purpleTheme.success }} />
            </ListItemIcon>
            <ListItemText primary="Visit the API keys page" />
          </ListItem>
          <ListItem sx={{ pl: 4 }}>
            <Button
              variant="outlined"
              size="small"
              color="success"
              startIcon={<LaunchIcon />}
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get API Key
            </Button>
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: purpleTheme.success }} />
            </ListItemIcon>
            <ListItemText primary="Create a new API key" />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: purpleTheme.success }} />
            </ListItemIcon>
            <ListItemText 
              primary="Copy your API key"
              secondary={`Should start with: ${provider.keyPrefix}...`}
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: purpleTheme.success }} />
            </ListItemIcon>
            <ListItemText primary="Enter the key in ChessAgine settings" />
          </ListItem>
        </List>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="secondary">
            Available Models:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {provider.models.map((model) => (
              <Chip 
                key={model} 
                label={model} 
                size="small" 
                variant="outlined"
                sx={{ color: purpleTheme.text.primary, borderColor: purpleTheme.text.secondary }}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="text"
            size="small"
            color="success"
            startIcon={<InfoIcon />}
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Documentation
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const renderModelRecommendations = () => (
    <Grid container spacing={3}>
      {MODEL_RECOMMENDATIONS.map((rec, index) => (
        <Grid  key={index}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" color="primary.text">
                  {rec.provider}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Chip 
                    label={rec.cost} 
                    size="small" 
                    color={getCostColor(rec.cost)}
                    icon={<CostIcon />}
                  />
                  <Chip 
                    label={rec.performance} 
                    size="small" 
                    color={getPerformanceColor(rec.performance)}
                    icon={<SpeedIcon />}
                  />
                </Box>
              </Box>
              
              <Typography variant="body2" sx={{ color: purpleTheme.text.primary, mb: 1, fontWeight: 500 }}>
                {rec.model}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                {rec.useCase}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                {rec.reasoning}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          {/* Header */}
          <Paper sx={{ 
            p: 4, 
            mb: 4, 
            background: `linear-gradient(135deg, ${purpleTheme.primary} 0%, ${purpleTheme.secondary} 100%)`,
            color: purpleTheme.text.primary
          }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Welcome to ChessAgine
            </Typography>
            <Typography variant="h6">
              Your AI-powered chess companion with plug-and-play provider integration
            </Typography>
          </Paper>

          {/* Security Alert */}
          <Alert severity="warning" sx={{ mb: 4 }}>
            <AlertTitle>Important Security Information</AlertTitle>
            <Typography variant="body2">
              <strong>ChessAgine DOES NOT store your API keys on our servers.</strong> Your keys are only stored in your browser local storage and encrypted during transmission.
            </Typography>
            <Typography variant="body2">
              <SecurityIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
              <strong>Never share your API keys with anyone and rotate them regularly.</strong> Your API keys are accessible only to you, not to developers or other users.
            </Typography>
          </Alert>

          {/* Why Use Your Own API Key */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom color="primary.text">
                Why Use Your Own API Key?
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CostIcon color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Cost Control" 
                    secondary="You pay only for what you use, directly to the provider"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <IntelligenceIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Model Choice" 
                    secondary="Select any supported model based on your budget and needs"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon sx={{ color: purpleTheme.text.accent }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Privacy & Security" 
                    secondary="Direct connection to providers without intermediary costs or risks"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={selectedTab} 
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Setup Guides" />
              <Tab label="Model Recommendations" />
              <Tab label="Supported Providers" />
            </Tabs>
          </Box>

          <CustomTabPanel value={selectedTab} index={0}>
            <Typography variant="h4" gutterBottom color="primary.text">
              API Setup Guides
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Follow these step-by-step guides to set up your API key with any supported provider.
            </Typography>
            
            {Object.values(PROVIDERS).map((provider) => (
              <Box key={provider.name}>
                {renderProviderSetup(provider)}
              </Box>
            ))}
          </CustomTabPanel>

          <CustomTabPanel value={selectedTab} index={1}>
            <Typography variant="h4" gutterBottom color="primary.text">
              Model Recommendations
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Choose the right model based on your use case, budget, and performance requirements.
            </Typography>
            
            {renderModelRecommendations()}
          </CustomTabPanel>

          <CustomTabPanel value={selectedTab} index={2}>
            <Typography variant="h4" gutterBottom color="primary.text">
              Supported Providers
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              ChessAgine supports the following AI providers. Click on any provider to learn more.
            </Typography>
            
            <Grid container spacing={3}>
              {Object.values(PROVIDERS).map((provider) => (
                <Grid  key={provider.name}>
                  <Card sx={{ 
                    height: '100%', 
                    cursor: 'pointer', 
                    '&:hover': { 
                      transform: 'translateY(-2px)',
                      transition: 'transform 0.2s ease-in-out'
                    } 
                  }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom color="primary.text">
                        {provider.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {provider.models.length} available models
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ color: purpleTheme.text.primary }}>
                        API Key Format: <code>{provider.keyPrefix}...</code>
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<KeyIcon />}
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Get API Key
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="success"
                          startIcon={<InfoIcon />}
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Docs
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CustomTabPanel>

          {/* Footer */}
          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom color="primary.text">
              Need Help?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you encounter any issues during setup, please join the community Discord for help!
            </Typography>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default ChessAgineDocumentation;