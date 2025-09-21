import type { NextApiRequest, NextApiResponse } from 'next';
import { chessAgine, chessAnnotationAgent, chessPuzzleAssistant } from '@/server/mastra/agents';
import { getBoardState } from '@/server/mastra/tools/protocol/state';
import { RuntimeContext } from '@mastra/core/di';
import { PositionPrompter } from '@/server/mastra/tools/protocol/positionPrompter';


interface ApiSettings {
    provider: 'openai' | 'anthropic' | 'google';
    model: string;
    apiKey: string;
    language: string;
}

interface ResponseData {
    message: string;
    maxTokens?: number;
    provider?: string;
    model?: string;
}

interface ErrorResponseData {
    message: string;
    maxTokens?: number;
    provider?: string;
    model?: string;
    stack?: string;
}

export default async function handler(
    req: NextApiRequest, 
    res: NextApiResponse<ResponseData | ErrorResponseData>
) {
    

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            message: 'Method not allowed' 
        });
    }


    try {
        const { query, fen, mode, apiSettings } = req.body;
       

        const rawApiSettings = apiSettings as ApiSettings;

        if (!rawApiSettings || !rawApiSettings.provider || !rawApiSettings.model || !rawApiSettings.apiKey) {
            return res.status(400).json({
                message: 'API settings are required (provider, model, apiKey)',
            });
        }

      
        if (!query || typeof query !== 'string') {
            return res.status(400).json({
                message: 'Missing or invalid "query" field in body (must be a non-empty string)',
            });
        }

        if (!fen || typeof fen !== 'string') {
            return res.status(400).json({
                message: 'Missing or invalid "fen" field in body (must be a non-empty string)',
            });
        }

        if (!mode || typeof mode !== 'string') {
            return res.status(400).json({
                message: 'Missing or invalid "mode" field in body (must be a non-empty string)',
            });
        }

        console.log('Processing FEN:', fen);

        let boardState;
        try {
            boardState = getBoardState(fen);
        } catch (boardStateError) {
            console.error('Error getting board state:', boardStateError);
            return res.status(400).json({
                message: 'Error processing FEN string',
            });
        }

        if (!boardState || !boardState.validfen) {
            console.log('Invalid FEN provided:', fen);
            return res.status(400).json({
                message: 'Invalid FEN string provided',
            });
        }

        

        let positionPrompt;
        try {
            const prompter = new PositionPrompter(boardState);
            positionPrompt = prompter.generatePrompt();
        } catch (promptError) {
            console.error('Error generating state prompt:', promptError);
            return res.status(500).json({
                message: 'Error processing board state',
            });
        }

        const aginePromptInject = `${query} \n ${positionPrompt}`;
        const runtimeContext = new RuntimeContext();
        runtimeContext.set('provider', apiSettings.provider);
        runtimeContext.set('model', apiSettings.model);
        runtimeContext.set('apiKey', apiSettings.apiKey);
        runtimeContext.set('lang', apiSettings.language);

        let response;
        let maxTokens;
      
        try {
            switch (mode) {
                case 'position':
                    response = await chessAgine.generate([{ role: 'user', content: aginePromptInject }], {
                        runtimeContext,
                    });
                    maxTokens = response.usage.totalTokens || 0;
                    break;
                case 'annotation':
                    response = await chessAnnotationAgent.generate([{ role: 'user', content: aginePromptInject }], {
                        runtimeContext
                    });
                    maxTokens = response.usage.totalTokens || 0;
                    break;
                case 'puzzle':
                    response = await chessPuzzleAssistant.generate([{ role: 'user', content: aginePromptInject }], {
                        runtimeContext,
                    });
                    maxTokens = response.usage.totalTokens || 0;
                    break;
                default:
                    return res.status(400).json({
                        message: 'Invalid mode specified',
                    });
            }
        } catch (agentError) {
            console.error('Error from chess agent:', agentError);
            return res.status(500).json({
                message: `An error occurred on the ${apiSettings.provider} API, check the credit balance or try with new API key, make sure your API key is correct`,
                maxTokens,
                provider: apiSettings.provider,
                model: apiSettings.model
            });
        }

        return res.status(200).json({
            message: response.text,
            maxTokens,
            provider: apiSettings.provider,
            model: apiSettings.model
        });

    } catch (error) {
        console.error('Unexpected error in API route:', error);

        return res.status(500).json({
            message: 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: error}),
        });
    }
}