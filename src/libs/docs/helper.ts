

export interface ProviderConfig {
  name: string;
  models: string[];
  keyPrefix: string;
  website: string;
  docsUrl: string;
}

export interface ModelRecommendation {
  provider: string;
  model: string;
  useCase: string;
  cost: 'Low' | 'Medium' | 'High';
  performance: 'Good' | 'Better' | 'Best';
  reasoning: string;
}

export interface ModelPricing {
  provider: string;
  model: string;
  inputPrice: number; // per 1M tokens
  outputPrice: number; // per 1M tokens
  costPer200Requests: number;
  tier: 'Budget' | 'Balanced' | 'Premium';
}

export interface ChessScenario {
  name: string;
  description: string;
  icon: React.ReactNode;
  tokensPerRequest: { input: number; output: number };
  requestsPerSession: number;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'technical' | 'cost' | 'privacy';
}

export interface IntegrationItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  status: 'Available' | 'Coming Soon' | 'Beta';
  link?: string;
}


export const PROVIDERS: Record<string, ProviderConfig> = {
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

export const MODEL_RECOMMENDATIONS: ModelRecommendation[] = [
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
export const MODEL_PRICING: ModelPricing[] = [
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


export const FAQ_ITEMS: FAQItem[] = [
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

