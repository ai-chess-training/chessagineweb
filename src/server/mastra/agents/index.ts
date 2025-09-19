"use server";
import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI} from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { RuntimeContext } from "@mastra/core/di";
import { agineSystemPrompt } from './prompt';
import {
    AgineTools,
} from '../tools';

// Type definitions for supported models
type OpenAIModel = 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' | 'gpt-4o' | 'gpt-4o-mini' | "o3" | "o3-mini" | "o1" | "o1-mini" | "o4-mini" | "gpt-5" | "gpt-5-mini" | "gpt-5-nano" | "gpt-4.1" | "gpt-4.1-mini" | "gpt-4.1-nano";

// Updated Claude models - latest available as of August 2025
type AnthropicModel =
    | 'claude-sonnet-4-20250514'  
    | 'claude-opus-4-20250514'            
    | 'claude-3-5-sonnet-latest'  
    | 'claude-3-5-haiku-latest';  

// Updated Gemini models - latest available
type GoogleModel = 
    | 'gemini-1.5-pro' 
    | 'gemini-1.5-flash'
    | 'gemini-2.0-flash'        
    | 'gemini-2.0-flash-lite'     
    | 'gemini-2.5-flash'     
    | 'gemini-2.5-pro'                         

type LanguageModel = OpenAIModel | AnthropicModel | GoogleModel;
type Provider = "openai" | "anthropic" | "google";

export type ApiSetting = {
	provider: Provider,
	model: LanguageModel,
	apiKey: string,
    language: string
}

// Helper function to create the model with proper typing
function createModelFromContext(runtimeContext: RuntimeContext) {
    const provider = runtimeContext.get('provider') as string;
    const modelName = runtimeContext.get('model') as string;
    const apiKey = runtimeContext.get('apiKey') as string;

    switch (provider) {
        case 'openai':
            const openAi = createOpenAI({
                apiKey: apiKey,
            });
            return openAi(modelName as OpenAIModel);
        case 'anthropic':
            const claude = createAnthropic({
                apiKey: apiKey,
            });
            return claude(modelName as AnthropicModel);
        case 'google':
            const gemini = createGoogleGenerativeAI({
                apiKey: apiKey,
            });
            return gemini(modelName as GoogleModel);
        default:
            return openai("gpt-4o-mini");
    }
}

// Provider-specific system prompt formatters
function formatSystemPrompt(provider: Provider, basePrompt: string): string {
    switch (provider) {
        case 'anthropic':
            return basePrompt;
            
        case 'google':
            // Gemini works well with structured prompts but prefers concise instructions
            // Break down complex instructions into clear, actionable sections
            return basePrompt.replace(/###/g, '##'); // Reduce heading levels for Gemini
            
        case 'openai':
            // OpenAI models work well with the current format
            return basePrompt;
            
        default:
            return basePrompt;
    }
}


export const chessAgine = new Agent({
    name: 'ChessAgine',
    instructions: ({ runtimeContext }) => {
        const provider = runtimeContext.get('provider') as Provider || 'openai';
        const lang = runtimeContext.get('lang') as string || 'English'
        return formatSystemPrompt(provider, agineSystemPrompt).replace('ENGLISH', lang);
    },
    model: ({ runtimeContext }) => createModelFromContext(runtimeContext),
    tools: AgineTools
});

export const chessAnnotationAgent = new Agent({
    name: 'ChessAnnotationAgent',
    instructions: ({ runtimeContext }) => {
        const provider = runtimeContext.get('provider') as Provider || 'openai';
        const lang = runtimeContext.get('lang') as string || 'English'
        return formatSystemPrompt(provider, agineSystemPrompt).replace('ENGLISH', lang);
    },
    model: ({ runtimeContext }) => createModelFromContext(runtimeContext),
    tools: AgineTools
});


export const chessPuzzleAssistant = new Agent({
    name: 'ChessPuzzleAssistant',
    instructions: ({ runtimeContext }) => {
        const provider = runtimeContext.get('provider') as Provider || 'openai';
        const lang = runtimeContext.get('lang') as string || 'English'
        return formatSystemPrompt(provider, agineSystemPrompt).replace('ENGLISH', lang);
    },
     model: ({ runtimeContext }) => createModelFromContext(runtimeContext),
    tools: AgineTools
});
