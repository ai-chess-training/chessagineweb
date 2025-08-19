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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Calculate as CalculateIcon,
  SportsEsports as GameIcon,
  Quiz as PuzzleIcon,
  Analytics as AnalysisIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpIcon,
  Search as SearchIcon,
  Storage as DatabaseIcon,
  Computer as EngineIcon,
  Groups as CommunityIcon,
  School as LearnIcon,
  SupportAgent as SupportIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { deepPurple, purple, indigo } from '@mui/material/colors';
import { FaGear } from 'react-icons/fa6';

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

interface ModelPricing {
  provider: string;
  model: string;
  inputPrice: number; // per 1M tokens
  outputPrice: number; // per 1M tokens
  costPer200Requests: number;
  tier: 'Budget' | 'Balanced' | 'Premium';
}

interface ChessScenario {
  name: string;
  description: string;
  icon: React.ReactNode;
  tokensPerRequest: { input: number; output: number };
  requestsPerSession: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'technical' | 'cost' | 'privacy';
}

interface IntegrationItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  status: 'Available' | 'Coming Soon' | 'Beta';
  link?: string;
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
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${purpleTheme.background.input}`,
          color: purpleTheme.text.primary,
        },
        head: {
          backgroundColor: purpleTheme.background.input,
          fontWeight: 600,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: purpleTheme.background.card,
          '&:before': {
            display: 'none',
          },
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
    model: 'gpt-5-nano',
    useCase: 'quick analysis and chat about a game',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Extremely affordable with solid chess understanding for beginners'
  },
  {
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    useCase: 'Budget-friendly analysis',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Great balance of cost and chess understanding'
  },
  {
    provider: 'OpenAI',
    model: 'gpt-5',
    useCase: 'Advanced chess analysis',
    cost: 'Medium',
    performance: 'Better',
    reasoning: 'Latest model with superior reasoning capabilities'
  },
  {
    provider: 'OpenAI',
    model: 'o1',
    useCase: 'Deep chess training',
    cost: 'High',
    performance: 'Best',
    reasoning: 'Exceptional reasoning and strategic depth for complex positions'
  },

  {
    provider: 'Claude',
    model: 'claude-3-5-haiku',
    useCase: 'Quick analysis and hints',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Fast responses with solid chess knowledge'
  },
  {
    provider: 'Claude',
    model: 'claude-sonnet-4',
    useCase: 'Balanced performance',
    cost: 'Medium',
    performance: 'Better',
    reasoning: 'Excellent reasoning with good cost efficiency'
  },
  {
    provider: 'Claude',
    model: 'claude-opus-4',
    useCase: 'Ultimate chess analysis',
    cost: 'High',
    performance: 'Best',
    reasoning: 'Latest and most capable Claude model for complex analysis'
  },
  {
    provider: 'Gemini',
    model: 'gemini-2.5-flash-lite',
    useCase: 'Ultra-fast casual games',
    cost: 'Low',
    performance: 'Good',
    reasoning: 'Quickest responses for rapid gameplay'
  },
  {
    provider: 'Gemini',
    model: 'gemini-2.5-pro',
    useCase: 'Deep position analysis',
    cost: 'Medium',
    performance: 'Best',
    reasoning: 'Advanced analysis with 1M token context window'
  }
];

// Pricing data (current as of August 2025, verified from official provider pricing pages)
const MODEL_PRICING: ModelPricing[] = [
  // OpenAI Models (Standard tier pricing)
  { provider: 'OpenAI', model: 'gpt-5-nano', inputPrice: 0.05, outputPrice: 0.40, costPer200Requests: 0.09, tier: 'Budget' },
  { provider: 'OpenAI', model: 'gpt-4o-mini', inputPrice: 0.15, outputPrice: 0.60, costPer200Requests: 0.18, tier: 'Budget' },
  { provider: 'OpenAI', model: 'gpt-5-mini', inputPrice: 0.25, outputPrice: 2.00, costPer200Requests: 0.45, tier: 'Budget' },
  { provider: 'OpenAI', model: 'gpt-4.1-nano', inputPrice: 0.10, outputPrice: 0.40, costPer200Requests: 0.12, tier: 'Budget' },
  { provider: 'OpenAI', model: 'gpt-4.1-mini', inputPrice: 0.40, outputPrice: 1.60, costPer200Requests: 0.48, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'o1-mini', inputPrice: 1.10, outputPrice: 4.40, costPer200Requests: 1.10, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'o3-mini', inputPrice: 1.10, outputPrice: 4.40, costPer200Requests: 1.10, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'o4-mini', inputPrice: 1.10, outputPrice: 4.40, costPer200Requests: 1.10, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'gpt-5', inputPrice: 1.25, outputPrice: 10.00, costPer200Requests: 2.25, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'gpt-4.1', inputPrice: 2.00, outputPrice: 8.00, costPer200Requests: 2.00, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'gpt-4o', inputPrice: 2.50, outputPrice: 10.00, costPer200Requests: 2.50, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'o3', inputPrice: 2.00, outputPrice: 8.00, costPer200Requests: 2.00, tier: 'Balanced' },
  { provider: 'OpenAI', model: 'o1', inputPrice: 15.00, outputPrice: 60.00, costPer200Requests: 15.00, tier: 'Premium' },
  
  // Claude Models (Standard API pricing)
  { provider: 'Claude', model: 'claude-3-haiku', inputPrice: 0.25, outputPrice: 1.25, costPer200Requests: 0.35, tier: 'Budget' },
  { provider: 'Claude', model: 'claude-3-5-haiku', inputPrice: 0.80, outputPrice: 4.00, costPer200Requests: 0.96, tier: 'Budget' },
  { provider: 'Claude', model: 'claude-sonnet-3.7', inputPrice: 3.00, outputPrice: 15.00, costPer200Requests: 3.60, tier: 'Balanced' },
  { provider: 'Claude', model: 'claude-sonnet-4', inputPrice: 3.00, outputPrice: 15.00, costPer200Requests: 3.60, tier: 'Balanced' },
  { provider: 'Claude', model: 'claude-opus-4', inputPrice: 15.00, outputPrice: 75.00, costPer200Requests: 18.00, tier: 'Premium' },
  
  // Google Gemini Models
  { provider: 'Gemini', model: 'gemini-2.5-flash-lite', inputPrice: 0.10, outputPrice: 0.40, costPer200Requests: 0.28, tier: 'Budget' },
  { provider: 'Gemini', model: 'gemini-2.0-flash', inputPrice: 0.10, outputPrice: 0.40, costPer200Requests: 0.28, tier: 'Budget' },
  { provider: 'Gemini', model: 'gemini-1.5-flash', inputPrice: 0.35, outputPrice: 1.05, costPer200Requests: 0.91, tier: 'Budget' },
  { provider: 'Gemini', model: 'gemini-2.5-flash', inputPrice: 0.30, outputPrice: 2.50, costPer200Requests: 0.56, tier: 'Budget' },
  { provider: 'Gemini', model: 'gemini-1.5-pro', inputPrice: 3.50, outputPrice: 10.50, costPer200Requests: 2.80, tier: 'Balanced' },
  { provider: 'Gemini', model: 'gemini-2.5-pro', inputPrice: 1.25, outputPrice: 10.00, costPer200Requests: 2.25, tier: 'Balanced' },
];

const CHESS_SCENARIOS: ChessScenario[] = [
  {
    name: 'Quick Move Analysis',
    description: 'Get hints or analyze a single position during live play',
    icon: <GameIcon />,
    tokensPerRequest: { input: 3000, output: 3000 },
    requestsPerSession: 15
  },
  {
    name: 'Full Game Review (40 moves)',
    description: 'Analyze every move of a typical game (~80 half-moves)',
    icon: <AnalysisIcon />,
    tokensPerRequest: { input: 3200, output: 3000 },
    requestsPerSession: 80
  },
  {
    name: 'Puzzle Training (20 puzzles)',
    description: 'Solve multiple tactical puzzles with detailed explanations',
    icon: <PuzzleIcon />,
    tokensPerRequest: { input: 3000, output: 1200 },
    requestsPerSession: 20
  },
  {
    name: 'Opening Study',
    description: 'Learn opening theory and key variations',
    icon: <InfoIcon />,
    tokensPerRequest: { input: 3000, output: 3000 },
    requestsPerSession: 12
  }
];
const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is ChessAgine and how is it different from a chess coach?",
    answer: "ChessAgine is your AI chess buddy, not a formal coach. Think of it as a knowledgeable friend who's always available to chat about chess, analyze positions, explain concepts, and help you explore the game. Unlike a structured coaching program, ChessAgine adapts to your curiosity and provides conversational, friendly guidance whenever you need it.",
    category: "general"
  },
  {
    question: "Is ChessAgine suitable for beginners?",
    answer: "Absolutely! ChessAgine is designed to be helpful for players of all levels. It can explain basic rules, teach fundamental concepts, suggest beginner-friendly openings, and provide encouragement. The AI adapts its explanations to your level and asks clarifying questions to better understand what you want to learn.",
    category: "general"
  },
  {
    question: "Can ChessAgine help improve my chess rating?",
    answer: "While ChessAgine isn't a replacement for structured training or human coaching, it can definitely support your improvement journey. It can help you understand your games, explain tactical patterns, suggest areas to focus on, and provide practice scenarios. Think of it as a study companion that's available 24/7.",
    category: "general"
  },
  {
    question: "Can ChessAgine make mistakes or give incorrect analysis?",
    answer: "Yes, like all AI models, ChessAgine can make mistakes or occasionally provide incorrect information - this is called 'hallucination'. It might miscalculate variations, give inaccurate historical facts, or misunderstand complex positions. Always use your own judgment and cross-reference important information. For critical analysis, consider using higher-tier models like o1.",
    category: "technical"
  },
  {
    question: "How can I get more accurate results from ChessAgine?",
    answer: "To improve accuracy: 1) Use higher-tier models (like GPT-5, Claude Opus-4, or o1) which generally provide better reasoning, 2) Be specific in your questions, 3) Ask follow-up questions if something seems unclear 4) Cross-reference important analysis with multiple sources. Remember, more powerful models cost more but typically give significantly better results.",
    category: "technical"
  },
  {
    question: "How accurate is ChessAgine's chess analysis?",
    answer: "ChessAgine provides good general chess understanding and can explain concepts well, but it's not a chess engine like Stockfish. For precise move evaluation, it integrates with Stockfish. For learning and understanding concepts, ChessAgine excels at providing clear, conversational explanations. However, like all AI, it can make errors, so use it as a learning tool rather than an absolute authority.",
    category: "technical"
  },
  {
    question: "Do different AI models give different quality results?",
    answer: "Absolutely! More advanced models (like o1, GPT-5, Claude Opus-4) generally provide more accurate analysis, better strategic understanding, and fewer mistakes compared to budget models. If you're serious about chess improvement or need reliable analysis, investing in a premium model can make a significant difference in the quality of explanations and accuracy of suggestions.",
    category: "technical"
  },
  {
    question: "Why do I need my own API key instead of a subscription?",
    answer: "Using your own API key gives you direct access to the latest AI models, complete cost control, and enhanced privacy. You only pay for what you use, can choose any supported model, and your conversations go directly to the AI provider without intermediaries.",
    category: "cost"
  },
  {
    question: "How much does it typically cost to use ChessAgine?",
    answer: "Costs vary by model and usage. For casual use (a few analyses per day), expect $0.50-$3 per month. Heavy users might spend $5-$15 monthly. The cost analysis tab shows detailed breakdowns for different usage patterns and models.",
    category: "cost"
  },
  {
    question: "Is my chess data and conversation history private?",
    answer: "Your privacy depends on the AI provider you choose. ChessAgine doesn't store your conversations - they go directly between your browser and the AI provider. Check each provider's privacy policy for details on data handling and retention.",
    category: "privacy"
  },
  {
    question: "Can I use multiple AI providers with ChessAgine?",
    answer: "Yes! You can set up API keys for multiple providers and switch between them. This lets you use different models for different purposes - perhaps a fast, cheap model for quick questions and a more powerful model for deep analysis.",
    category: "technical"
  },
  {
    question: "What happens if I run out of API credits?",
    answer: "If your API credits are exhausted, you'll need to add more funds to your provider account. ChessAgine will show you the error message from the provider, and you can add credits directly through their platform.",
    category: "cost"
  },
  {
    question: "Can ChessAgine analyze games from chess.com or Lichess?",
    answer: "Yes! You can paste PGN games from any platform, and ChessAgine can analyze them. With the Lichess integration, you can also explore opening databases and get additional context for your games.",
    category: "technical"
  }
];

const INTEGRATIONS: IntegrationItem[] = [
  {
    name: "Web Search",
    description: "Access real-time chess information, recent tournament results, and player statistics",
    icon: <SearchIcon />,
    features: [
      "Latest tournament results and standings",
      "Current player ratings and statistics", 
      "Recent chess news and developments",
      "Opening theory updates and trends"
    ],
    status: "Available"
  },
  {
    name: "Lichess Explorer",
    description: "Explore opening databases and master games directly within ChessAgine",
    icon: <DatabaseIcon />,
    features: [
      "Opening explorer with statistics",
      "Master game database access",
      "Position frequency analysis",
      "Variation popularity trends"
    ],
    status: "Available",
    link: "https://lichess.org/api"
  },
  {
    name: "Stockfish Engine",
    description: "Precise position evaluation and best move calculations",
    icon: <EngineIcon />,
    features: [
      "Accurate position evaluation",
      "Best move suggestions with depth",
      "Tactical mistake identification",
      "Engine line analysis"
    ],
    status: "Available"
  },
  {
    name: "ChessDB",
    description: "Access to comprehensive chess position databases",
    icon: <DatabaseIcon />,
    features: [
      "Position lookup in master games",
      "Historical game statistics",
      "Endgame tablebase access",
      "Position occurrence frequency"
    ],
    status: "Beta",
    link: "https://chessdb.cn/"
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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Budget': return 'success';
      case 'Balanced': return 'warning';
      case 'Premium': return 'error';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'success';
      case 'Beta': return 'warning';
      case 'Coming Soon': return 'info';
      default: return 'default';
    }
  };

  const calculateScenarioCost = (pricing: ModelPricing, scenario: ChessScenario) => {
    const inputCost = (scenario.tokensPerRequest.input * scenario.requestsPerSession * pricing.inputPrice) / 1000000;
    const outputCost = (scenario.tokensPerRequest.output * scenario.requestsPerSession * pricing.outputPrice) / 1000000;
    return inputCost + outputCost;
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

  const renderCostsAnalysis = () => (
    <Box>
      {/* Cost Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary.text" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalculateIcon />
            Cost Analysis Overview
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            All costs are calculated based on 200 API requests with approximately 3,000 input tokens and 3,000 output tokens per request.
            Chess scenarios below show approximately usage patterns, actual costs may very. Pricing updated August 2025 from official provider APIs.
          </Typography>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary.text">
            Model Pricing Comparison
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Provider</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell align="right">Input Price<br />(/1M tokens)</TableCell>
                  <TableCell align="right">Output Price<br />(/1M tokens)</TableCell>
                  <TableCell align="right">200 Requests<br />Cost</TableCell>
                  <TableCell align="center">Tier</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MODEL_PRICING.sort((a, b) => a.costPer200Requests - b.costPer200Requests).map((model, index) => (
                  <TableRow key={index}>
                    <TableCell>{model.provider}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {model.model}
                    </TableCell>
                    <TableCell align="right">${model.inputPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">${model.outputPrice.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ${model.costPer200Requests.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={model.tier} 
                        size="small" 
                        color={getTierColor(model.tier)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Chess Scenarios */}
      <Typography variant="h5" gutterBottom color="primary.text" sx={{ mb: 3 }}>
        Chess Session Cost Examples
      </Typography>
      
      {CHESS_SCENARIOS.map((scenario, scenarioIndex) => (
        <Card key={scenarioIndex} sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {scenario.icon}
              <Box>
                <Typography variant="h6" color="primary.text">
                  {scenario.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {scenario.description}
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Session: {scenario.requestsPerSession} requests × {scenario.tokensPerRequest.input} input + {scenario.tokensPerRequest.output} output tokens each
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Model</TableCell>
                    <TableCell align="right">Cost per Session</TableCell>
                    <TableCell align="right">Monthly Cost<br />(20 sessions)</TableCell>
                    <TableCell align="center">Value Rating</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MODEL_PRICING
                    .map(model => ({
                      ...model,
                      sessionCost: calculateScenarioCost(model, scenario)
                    }))
                    .sort((a, b) => a.sessionCost - b.sessionCost)
                    .map((model, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {model.provider}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                            {model.model}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ${model.sessionCost.toFixed(3)}
                      </TableCell>
                      <TableCell align="right">
                        ${(model.sessionCost * 20).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={model.tier} 
                          size="small" 
                          color={getTierColor(model.tier)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderFAQ = () => (
    <Box>
      <Typography variant="h4" gutterBottom color="primary.text" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HelpIcon />
        Frequently Asked Questions
      </Typography>
      
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary.text" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CommunityIcon />
            About ChessAgine
          </Typography>
          <Typography variant="body1" color="text.secondary" >
            ChessAgine is designed to be your friendly AI chess companion, think of it as a knowledgeable chess buddy 
            who is always available to chat, analyze positions, and help you explore the wonderful world of chess. 
            It is NOT a formal coach with structured lessons, but rather a conversational partner that adapts to your curiosity and learning style.
          </Typography>
        </CardContent>
      </Card>

      {['general', 'technical', 'cost', 'privacy'].map((category) => (
        <Box key={category} sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="primary.text" sx={{ textTransform: 'capitalize', mb: 2 }}>
            {category === 'general' && <LearnIcon sx={{ mr: 1, verticalAlign: 'middle' }} />}
            {category === 'technical' && <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />}
            {category === 'cost' && <CostIcon sx={{ mr: 1, verticalAlign: 'middle' }} />}
            {category === 'privacy' && <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />}
            {category} Questions
          </Typography>
          
          {FAQ_ITEMS.filter(item => item.category === category).map((faq, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body1" color="primary.text">
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ))}

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary.text" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SupportIcon />
            Still Have Questions?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Can not find what you are looking for? Join our community Discord where fellow chess enthusiasts 
            and ChessAgine users share tips, discuss strategies, and help each other out!
          </Typography>
          <Button
            variant="outlined"
            color="success"
            startIcon={<CommunityIcon />}
            href="https://discord.gg/3RpEnvmZwp"
            sx={{ mr: 2 }}
          >
            Join Discord Community
          </Button>
        </CardContent>
      </Card>
    </Box>
  );

  const renderIntegrations = () => (
    <Box>
      <Typography variant="h4" gutterBottom color="primary.text" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaGear/>
        ChessAgine Integrations
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        ChessAgine connects with powerful chess tools and databases to enhance your experience. ChessAgine convets a general purpose LLM into 
        a chess native helper buddy.
      </Typography>

      <Grid container spacing={3}>
        {INTEGRATIONS.map((integration, index) => (
          <Grid  key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {integration.icon}
                    <Typography variant="h6" color="primary.text">
                      {integration.name}
                    </Typography>
                  </Box>
                  <Chip 
                    label={integration.status} 
                    size="small" 
                    color={getStatusColor(integration.status)}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {integration.description}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom color="primary.text">
                  Features:
                </Typography>
                <List dense>
                  {integration.features.map((feature, featureIndex) => (
                    <ListItem key={featureIndex} sx={{ py: 0.5, pl: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <CheckCircleIcon sx={{ fontSize: 16, color: purpleTheme.success }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature} 
                        primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      />
                    </ListItem>
                  ))}
                </List>
                
                {integration.link && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      startIcon={<OpenIcon />}
                      href={integration.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Learn More
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary.text">
            How Integrations Work
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            ChessAgine seamlessly combines AI analysis with these powerful tools. When you ask about an opening, 
            it might consult the Lichess database for statistics. When you need precise evaluation, it can use 
            Stockfish. For recent tournament information, it searches the web. All of this happens automatically 
            based on your questions and needs.
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            <strong>Privacy Note:</strong> Integration data is processed in real-time and follows the same 
            privacy principles as your AI conversations - no permanent storage by ChessAgine.
          </Typography>
        </CardContent>
      </Card>
    </Box>
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
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Setup Guides" />
              <Tab label="Model Recommendations" />
              <Tab label="Costs Analysis" />
              <Tab label="Supported Providers" />
              <Tab label="Integrations" />
              <Tab label="FAQ" />
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
            {renderCostsAnalysis()}
          </CustomTabPanel>

          <CustomTabPanel value={selectedTab} index={3}>
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

          <CustomTabPanel value={selectedTab} index={4}>
            {renderIntegrations()}
          </CustomTabPanel>

          <CustomTabPanel value={selectedTab} index={5}>
            {renderFAQ()}
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