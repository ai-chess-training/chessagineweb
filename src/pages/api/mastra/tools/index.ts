
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { boardStateToPrompt, calculateDeep,  getBoardState } from "./state";
import { generateChessAnalysis, getChessEvaluation } from "./fish";
import { searchWebAnswer } from "./search";
import { getKnowledgeBase, knowledgebase } from "../agents/knowlegebase";




const fenSchema = z.string().regex(
  /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+ [bw] [KQkq-]+ [a-h][1-8]|[a-h][1-8]|[a-h][1-8]|[a-h][1-8]|- \d+ \d+$/,
  'Invalid FEN format'
);

// Schema for chess move (algebraic notation)
const moveSchema = z.string().min(2).max(7); // e.g., "e4", "Nf3", "O-O", "exd5", "Qh5+"


export const searchWeb = createTool({
  id: "search-web",
  description: "search the web for answer for given search query",
  inputSchema: z.object({
    searchQuery: z.string().describe("the query to search the web"),
  }),
  outputSchema: z.object({
    answer: z.string().optional().describe("the answer for the search query"),
  }),
  execute: async ({ context }) => {
    const answer = await searchWebAnswer(context.searchQuery);
    console.log(context.searchQuery);
    console.log(answer);
    return { answer: answer };
  },
});


export const getStockfishAnalysisTool = createTool({
  id: "get-stockfish-",
  description:
    "Analyze a given chess position using Stockfish and provide best move, reasoning, and varition, speech Eval and number Eval",
  inputSchema: z.object({
    fen: fenSchema.describe("FEN string representing the board position"),
    depth: z.number().min(12).max(15).describe("Search depth for Stockfish engine"),
  }),
  outputSchema: z.object({
    bestMove: z.string().describe("the best move for current side"),
    reasoning: z.string().describe("the board state information in text form, gives valuable reasoning"),
    numberEval: z.number().describe("the engine eval in number form"),
    topLine: z
      .string()
      .describe(
        "The top varation that would play out according to Stockfish in UCI format"
      ),
  }),
  execute: async ({ context }) => {
    const evaluation = await getChessEvaluation(context.fen, context.depth);
    return generateChessAnalysis(evaluation, context.fen);
  },
});

export const getStockfishMoveAnalysisTool = createTool({
  id: "get-stockfish-move-analysis",
  description:
    "Analyze a given chess position after a specific move using Stockfish and provide best move, reasoning, variation, speech eval, and number eval.",
  inputSchema: z.object({
    fen: fenSchema.describe("FEN string representing the current board position"),
    move: moveSchema.describe("The move to be played in UCI or SAN format"),
  }),
  outputSchema: z.object({
    bestMove: z.string().describe("The best move for the new position"),
    reasoning: z.string().describe("the board state information in text form, gives valuable reasoning"),
    numberEval: z.number().describe("The engine eval in number form"),
    topLine: z.string().describe("The top variation that would play out according to Stockfish in UCI format"),
  }),
  execute: async ({ context }) => {
    const { fen, move} = context;
    // calculateDeep returns the new FEN after the move
    const newFen = calculateDeep(fen, move)?.fen || fen;
    const evaluation = await getChessEvaluation(newFen, 15);
    return generateChessAnalysis(evaluation, newFen);
  },
});









export const isLegalMoveTool = createTool({
  id: "is-legal-move",
  description: "Check if a given move is legal for the provided FEN position.",
  inputSchema: z.object({
    fen: fenSchema.describe("FEN string representing the board position, the fen must be in full form containing which side to move"),
    move: z.string().describe("Move to check (in SAN or UCI format)"),
  }),
  outputSchema: z.object({
    isLegal: z.boolean().describe("Whether the move is legal in the given position"),
    message: z.string().optional().describe("Optional message about legality or errors"),
  }),
  execute: async ({ context }) => {
    try {
      const boardState = getBoardState(context.fen);
      if (!boardState) {
        return { isLegal: false, message: "Invalid FEN string" };
      }
      const legalMoves = boardState.legalMoves || [];
      const move = context.move.trim();
      const isLegal =
        legalMoves.includes(move) ||
        legalMoves.map(m => m.toLowerCase()).includes(move.toLowerCase());
      return {
        isLegal,
        message: isLegal ? "Move is legal." : "Move is not legal in this position.",
      };
    } catch (error) {
      return { isLegal: false, message: "Error checking move legality." };
    }
  },
});

export const boardStateToPromptTool = createTool({
  id: "boardstate-to-prompt",
  description:
    "Given a FEN and a move, returns a string describing the resulting board state after the move.",
  inputSchema: z.object({
    fen: fenSchema.describe("FEN string representing the current board position"),
    move: z.string().describe("The move to be played (in SAN or UCI format)"),
  }),
  outputSchema: z.object({
    prompt: z.string().describe("A prompt string describing the board state after the move"),
  }),
  execute: async ({ context }) => {
    const { fen, move } = context;
    const boardState = calculateDeep(fen, move);
    if (!boardState || !boardState.validfen) {
      return { prompt: "Invalid move or FEN. Cannot generate board state prompt." };
    }
    // Simple prompt string, you can customize this as needed
    const prompt = boardStateToPrompt(boardState);
    return { prompt };
  },
});


export const chessKnowledgeBaseTool = createTool({
  id: "get-chess-knowledgebase",
  description: "Returns a comprehensive chess knowledgebase including Silman Imbalances, Fine's 30 chess principles, endgame principles, and practical checklists.",
  inputSchema: z.object({}),
  outputSchema: z.object({
    knowledgebase: z.string().describe("Comprehensive chess knowledgebase as a formatted string"),
  }),
  execute: async () => {
    const knowledge = getKnowledgeBase();
    return { knowledgebase: knowledge};
  },
});





