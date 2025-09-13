
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { boardStateToPrompt, calculateDeep,  getBoardState } from "./state";
import { generateChessAnalysis, getChessEvaluation, getHangingPiecesAnalysis } from "./fish";
import { getTop3BestMoves } from "./chessdb";
import { getOpeningStatSpeech, getOpeningStats } from "./opening";
import { searchWebAnswer } from "./search";
import {  getMoveReasoningForFen, getTargetMoveReasoningForFen } from './localEngine'


// Schema for castling rights - tracks whether each side can castle in each direction
const CastleRightsSchema = z.object({
  queenside: z.boolean().describe("Whether queenside castling (long castle) is still legally possible"),
  kingside: z.boolean().describe("Whether kingside castling (short castle) is still legally possible")
});



// Schema for pawn structure evaluation - critical for positional assessment
const PositionalPawnSchema = z.object({
  doublepawncount: z.number().describe("Number of doubled pawns (pawns on the same file) - generally a weakness"),
  isolatedpawncount: z.number().describe("Number of isolated pawns (no friendly pawns on adjacent files) - typically weak"),
  backwardpawncount: z.number().describe("Number of backward pawns (can't advance safely due to enemy pawn control) - positional liability"),
  passedpawncount: z.number().describe("Number of passed pawns (no enemy pawns can stop their advance) - major endgame asset"),
  weaknessscore: z.number().describe("Overall pawn weakness score - higher values indicate more structural problems")
});

// Schema for space control evaluation - measures territorial dominance
const SpaceControlSchema = z.object({
  centerspacecontrolscore: z.number().describe("Control score for the central 4 squares (e4, e5, d4, d5) - crucial for piece coordination"),
  flankspacecontrolscore: z.number().describe("Control score for squares on the kingside and queenside flanks - important for attacks"),
  totalspacecontrolscore: z.number().describe("Combined space control score across the entire board - indicates territorial advantage")
});

// Schema for piece placement by type - useful for pattern recognition and evaluation
const SidePiecePlacementSchema = z.object({
  kingplacement: z.array(z.string()).describe("Current square location of the king (always single element array)"),
  queenplacement: z.array(z.string()).describe("Square locations of all queens on this side (usually 0-1 elements)"),
  bishopplacement: z.array(z.string()).describe("Square locations of all bishops on this side (0-2+ elements)"),
  knightplacement: z.array(z.string()).describe("Square locations of all knights on this side (0-2+ elements)"),
  rookplacement: z.array(z.string()).describe("Square locations of all rooks on this side (0-2+ elements)"),
  pawnplacement: z.array(z.string()).describe("Square locations of all pawns on this side (0-8 elements)")
});

// Schema for tactical situation awareness - immediate threats and opportunities
const TacticalInfoSchema = z.object({
  attackedpieces: z.array(z.string()).describe("Squares of friendly pieces currently under attack by enemy pieces"),
  defendedpieces: z.array(z.string()).describe("Squares of friendly pieces that are protected by other friendly pieces"),
  hangingpieces: z.array(z.string()).describe("Squares of friendly pieces that are attacked but not defended - immediate tactical targets"),
  pinned: z.array(z.string()).describe("Squares of friendly pieces that cannot move without exposing a more valuable piece behind them"),
  skewered: z.array(z.string()).describe("Squares of friendly pieces forced to move and expose a less valuable piece behind them"),
  checks: z.array(z.string()).describe("Squares from which the enemy king is currently being attacked (checked)"),
  doublechecks: z.boolean().describe("Whether the king is in double check (attacked by two pieces simultaneously) - must move king")
});

// Schema for king safety evaluation - critical for survival assessment
const KingSafetySchema = z.object({
  kingsquare: z.string().describe("Current square location of the king (e.g. 'e1', 'g8')"),
  attackerscount: z.number().describe("Number of enemy pieces that can attack squares around the king"),
  defenderscount: z.number().describe("Number of friendly pieces defending squares around the king"),
  pawnshield: z.number().describe("Quality score of pawn protection in front of the king - higher is safer"),
  kingsafetyscore: z.number().describe("Overall king safety evaluation - higher values indicate greater security"),
  cancastle: z.boolean().describe("Whether the king can still castle (either direction) in the current position"),
  hascastled: z.boolean().describe("Whether the king has already castled earlier in the game")
});

// Schema for piece mobility evaluation - measures piece activity and coordination
const PieceMobilitySchema = z.object({
  queenmobility: z.number().describe("Number of legal squares the queen can move to - measure of queen activity"),
  rookmobility: z.number().describe("Combined number of legal squares all rooks can move to"),
  bishopmobility: z.number().describe("Combined number of legal squares all bishops can move to"),
  knightmobility: z.number().describe("Combined number of legal squares all knights can move to"),
  totalmobility: z.number().describe("Sum of all piece mobility scores - overall measure of piece coordination and activity")
});

// Schema for material evaluation - piece count and value assessment
const MaterialInfoSchema = z.object({
  materialcount: z.number().describe("Total number of pieces remaining on the board for this side"),
  materialvalue: z.number().describe("Total point value of all pieces (pawns=1, knights/bishops=3, rooks=5, queen=9)"),
  piececount: z.object({
    pawns: z.number().describe("Number of pawns remaining (0-8)"),
    knights: z.number().describe("Number of knights remaining (0-2+)"),
    bishops: z.number().describe("Number of bishops remaining (0-2+)"),
    rooks: z.number().describe("Number of rooks remaining (0-2+)"),
    queens: z.number().describe("Number of queens remaining (0-1+)")
  }).describe("Detailed count of each piece type remaining on the board"),
  bishoppair: z.boolean().describe("Whether this side has both light and dark squared bishops - significant endgame advantage")
});

// Main board state schema - comprehensive chess position analysis
export const BoardStateSchema = z.object({
  fen: z.string().describe("Forsyth-Edwards Notation string representing the complete board position, castling rights, en passant, and move counters"),
  validfen: z.boolean().describe("Whether the FEN string represents a legally reachable chess position"),
  
  whitecastlerights: CastleRightsSchema.describe("White's remaining castling options (kingside and queenside)"),
  blackcastlerights: CastleRightsSchema.describe("Black's remaining castling options (kingside and queenside)"),
  
  legalMoves: z.array(z.string()).describe("Array of all legal moves available to the side to move, in algebraic notation (e.g. ['Nf3', 'e4', 'Bc4'])"),
  
  whitematerial: MaterialInfoSchema.describe("Complete material evaluation for White pieces including counts and values"),
  blackmaterial: MaterialInfoSchema.describe("Complete material evaluation for Black pieces including counts and values"),
  
  whitespacescore: SpaceControlSchema.describe("White's territorial control evaluation across center and flanks"),
  blackspacescore: SpaceControlSchema.describe("Black's territorial control evaluation across center and flanks"),
  
  
  
  whitepieceplacement: SidePiecePlacementSchema.describe("Current square locations of all White pieces organized by piece type"),
  blackpieceplacement: SidePiecePlacementSchema.describe("Current square locations of all Black pieces organized by piece type"),
  
  whitepositionalscore: PositionalPawnSchema.describe("White's pawn structure evaluation including weaknesses and strengths"),
  blackpositionalscore: PositionalPawnSchema.describe("Black's pawn structure evaluation including weaknesses and strengths"),
  
  whitetactical: TacticalInfoSchema.describe("White's immediate tactical situation including threats, pins, and hanging pieces"),
  blacktactical: TacticalInfoSchema.describe("Black's immediate tactical situation including threats, pins, and hanging pieces"),
  
  whitekingsafety: KingSafetySchema.describe("White king's safety evaluation including attackers, defenders, and castling status"),
  blackkingsafety: KingSafetySchema.describe("Black king's safety evaluation including attackers, defenders, and castling status"),
  
  whitemobility: PieceMobilitySchema.describe("White pieces' mobility and activity scores indicating coordination quality"),
  blackmobility: PieceMobilitySchema.describe("Black pieces' mobility and activity scores indicating coordination quality"),
  
  isCheckmate: z.boolean().describe("Whether the current position is checkmate (king in check with no legal moves)"),
  isStalemate: z.boolean().describe("Whether the current position is stalemate (no legal moves but king not in check)"),
  isGameOver: z.boolean().describe("Whether the game has ended due to checkmate, stalemate, or other terminal condition"),
  
  moveNumber: z.number().describe("Current full-move number in the game (increments after Black's move)"),
  sidetomove: z.string().describe("Which side has the next move ('white' or 'black')"),
  gamePhase: z.enum(['opening', 'middlegame', 'endgame']).describe("Current phase of the game based on material and piece development: opening (pieces developing), middlegame (most pieces active), endgame (few pieces remaining)")
});

const CandidateMove = z.object({
  uci: z.string().describe("Move in UCI format"),
  san: z.string().describe("Move in SAN format"),
  score: z.string().describe("Score for the move in centipawns"),
  winrate: z.string().describe("Win rate for the move"),
}).describe("Candidate move information");


// export const chessBoardStateTool = createTool({
//   id: "get-chessboard-state",
//   description:
//     "Get the given fen's chess board state, like legal moves, chess board view, castling rights etc",
//   inputSchema: z.object({
//     fen: z.string().describe("FEN string representing the board position"),
//   }),
//   outputSchema: z.object({
//     boardstate: z.union([BoardStateSchema, InvalidBoardStateSchema]),
//   }),
//   execute: async ({ context }) => {
//     const boardState = getBoardState(context.fen);
//     return { boardstate: boardState };
//   },
// });

// export const chessBoardMoveCalculateTool = createTool({
//   id: "get-chessboard-state",
//   description:
//     "Get the future chess board state for given current fen, and future legal chess move",
//   inputSchema: z.object({
//     fen: z.string().describe("FEN string representing the current board position"),
//     move: z.string().describe("The future move")
//   }),
//   outputSchema: z.object({
//     boardstate: z.union([BoardStateSchema, InvalidBoardStateSchema]),
//   }),
//   execute: async ({ context }) => {
//     const boardState = calculateDeep(context.fen, context.move);
//     return { boardstate: boardState };
//   },
// });
// Schema for chess position (FEN string)
const fenSchema = z.string().regex(
  /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+ [bw] [KQkq-]+ [a-h][1-8]|[a-h][1-8]|[a-h][1-8]|[a-h][1-8]|- \d+ \d+$/,
  'Invalid FEN format'
);

// Schema for chess move (algebraic notation)
const moveSchema = z.string().min(2).max(7); // e.g., "e4", "Nf3", "O-O", "exd5", "Qh5+"

export const chessCandidateTool = createTool({
  id: "get-candidate-moves",
  description:
    "Get the candidate moves information for given chess fen and their win rates",
  inputSchema: z.object({
    fen: z.string().describe("FEN string representing the board position"),
  }),
  outputSchema: z.object({
    candidateMoves: z
      .array(CandidateMove)
      .describe(
        "candidate moves for this position in text form if present, contains win % and SAN/UCI moves"
      ),
  }),
  execute: async ({ context }) => {
    try {
      console.log("Executing chessCandidateTool with FEN:", context.fen);
      const candidateMoves = await getTop3BestMoves(context.fen);
      console.log("Successfully retrieved candidate moves:", candidateMoves);
      return { candidateMoves: candidateMoves };
    } catch (error) {
      console.error("Error in chessCandidateTool execution:", error);
      throw new Error(
        "Failed to retrieve candidate moves. Please check the FEN or the underlying implementation."
      );
    }
  },
});

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



// Response schema for move analysis
const moveAnalysisSchema = z.object({
  move: z.string().nullable(),
  eval: z.number(),
  reasoning: z.string()
});



export const analyzeFenTool = createTool({
  id: 'analyze-chess-position-with-agine',
  description: 'Analyze a chess position and get the best move with reasoning using Agine Engine',
  inputSchema: z.object({
    fen: fenSchema.describe('Chess position in FEN notation')
  }),
  outputSchema: moveAnalysisSchema,
  
  execute: async ({ context }) => {
    try {
      return getMoveReasoningForFen(context.fen);
    } catch (error) {
      throw new Error(`Failed to analyze position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});

export const analyzeTargetMoveTool = createTool({
  id: 'analyze-target-move',
  description: 'Analyze a specific move in a chess position and get evaluation with reasoning using Agine engine',
  inputSchema: z.object({
    fen: fenSchema.describe('Chess position in FEN notation'),
    move: moveSchema.describe('Target move to analyze in algebraic notation')
  }),
  outputSchema: moveAnalysisSchema,
  
  execute: async ({ context }) => {
    try {
      return getTargetMoveReasoningForFen(context.fen, context.move);
    } catch (error) {
      throw new Error(`Failed to analyze target move: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
});



export const hangingPiecesAnalysisTool = createTool({
  id: "get-hanging-pieces-analysis",
  description:
    "Analyze a chess position for hanging, unprotected, and semi-protected pieces for a given FEN.",
  inputSchema: z.object({
    fen: z.string().describe("FEN string representing the board position"),
  }),
  outputSchema: z.object({
    hangingDetails: z.array(z.string()).describe("List of hanging pieces with details"),
    unprotectedDetails: z.array(z.string()).describe("List of unprotected pieces with details"),
    semiProtectedDetails: z.array(z.string()).describe("List of semi-protected pieces with details"),
    error: z.string().optional().describe("Error message if analysis fails"),
  }),
  execute: async ({ context }) => {
    const { fen } = context;
    try {
      const result = await getHangingPiecesAnalysis(fen);
      return result;
    } catch (error) {
      return {
        hangingDetails: [],
        unprotectedDetails: [],
        semiProtectedDetails: [],
        error: "Failed to analyze hanging pieces: " + (error instanceof Error ? error.message : String(error)),
      };
    }
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
    const knowledgebase = `
    ### Silman Imbalances:
a. Superior minor piece - Knight vs bishop advantages in specific positions
b. Pawn structure - Doubled, isolated, backward, passed pawns and chains
c. Space - Territory control and piece mobility
d. Material - Piece count and exchange values
e. Control of a key file - Open files and heavy piece coordination
f. Control of a hole/weak square - Outposts and weak squares in opponent's camp
g. Lead in development - Piece activity and tempo advantage
h. Initiative (and Tempo) - Forcing moves and maintaining pressure
i. King safety - Castling, pawn shield, escape squares
j. Statics vs. Dynamics - Permanent vs temporary factors

### Fine's 30 Chess Principles

**The Opening:**
1. Open with a center pawn
2. Develop with threats
3. Develop knights before bishops
4. Don't move the same piece twice if you can help it
5. Make as few pawn moves as possible
6. Don't bring your queen out too early
7. Castle as soon as possible, preferably on the kingside
8. Play to get control of the center
9. Try to maintain at least one pawn in the center
10. Don't sacrifice without a clear and adequate reason

**The Middlegame:**
1. Have all your moves fit into a definite plan
2. When you are ahead in material, exchange as many pieces as possible, especially queens
3. Avoid doubled, isolated, or backward pawns
4. In cramped positions, free yourself by exchanging
5. Don't expose your king while the enemy queen is still on the board
6. All combinations are based on a double attack
7. When your opponent has one or more pieces exposed, look for a combination
8. To attack the enemy king, you must first open a file (or less often a diagonal) to gain access for your heavy pieces
9. Centralize the action of all your pieces
10. The best defense is a counterattack

**The Endgame:**
1. To win without pawns, you must be a rook or two minor pieces ahead
2. The king must be active in the ending
3. Passed pawns must be pushed
4. The easiest endings to win are pure pawn endings
5. If you are only one pawn ahead, trade pieces but not pawns
6. Don't place pawns on the same color squares as your bishop
7. A bishop is better than a knight in all but blocked pawn positions
8. It is worth a pawn to get a rook on the seventh rank
9. Rooks belong behind passed pawns
10. Blockade passed pawns with the king

### Additional Endgame Principles and Quotes
1. "Endings of one rook and pawns are about the most common sort of endings arising on the chess board. Yet, though they do occur so often, few have mastered them thoroughly. They are often of a very difficult nature, and sometimes while apparently very simple they are in reality extremely intricate." – Jose Capablanca
2. "It is a well-known phenomenon that the same amateur who can conduct the middle game quite creditably, is usually perfectly helpless in the end game. One of the principal requisites of good chess is the ability to treat both the middle and end game equally well." – Aaron Nimzowitsch
3. "The business of the endgame is maneuvering to control critical squares, advancing or blockading passed pawns, preparing a breakthrough by the king, or exploiting the subtle superiority of one piece over another." – Pal Benko
4. Capablanca's Principle of Two Weaknesses: Create multiple weaknesses to stretch the opponent's defense.
5. In the Chess Endgame, the king becomes a dominant force. Centralize your king for support and control.
6. "The great mobility of the King forms one of the chief characteristics of all endgame strategy. In the middle game the King is a mere 'super', in the endgame on the other hand – one of the 'principals'. We must therefore develop him; bring him nearer to the fighting line." – Aaron Nimzowitsch
7. "The king, which during the opening and middle game stage is often a burden because it has to be defended, becomes in the endgame a very important and aggressive piece, and the beginner should realize this, and utilize his king as much as possible." – Jose Capablanca
8. "In a rook and pawn ending, the rook must be used aggressively. It must either attack enemy pawns, or give active support to the advance of one of its own pawns to the queening square." – Siegbert Tarrasch
9. The opposition is key in king-and-pawn endgames. The player not to move often controls critical squares.
10. Passed pawns are the backbone of endgame strategy. Create and advance them.
11. The rule of the square: If the opposing king can enter the square drawn from the pawn to promotion, it can catch the pawn.
12. In rook endgames, rooks belong behind passed pawns.
13. Zugzwang: Forcing your opponent to move when any move worsens their position.
14. Simplify when ahead, but not too early; avoid giving counterplay.
15. Precise calculation is critical in endgames.
16. "A player can sometimes afford the luxury of an inaccurate move, or even a definite error, in the opening or middle game without necessarily obtaining a lost position. In the endgame … an error can be decisive, and we are rarely presented with a second chance." – Paul Keres
17. Patience and prophylactic thinking are vital in endgames.
18. "If you are weak in the endgame, you must spend more time analyzing studies. In your training games, you must aim at transposing to endgames which will help you to acquire the requisite experience." – Mikhail Botvinnik
19. "Do not hurry" in the endgame – Alexander Kotov
20. Rook vs Bishop: Defending side should put king in the opposite color corner to the bishop.
21. Rook vs Knight: Trap the knight at the edge (red/yellow zones); defend by keeping knight in the center (green zone).
22. Opposite color bishop endgames: Attacker should keep pawns on both sides; defender should restrict to one side.
23. Knight is often stronger than bishop in endgames with pawns on one side.

### Pawn Structures:
**Isolated Pawn:** Pawn with no friendly pawns on adjacent files
- Pros: Open files for pieces, central control
- Cons: Weakness, requires piece protection

**Doubled Pawns:** Two pawns on the same file
- Pros: May control key squares, semi-open file
- Cons: Static weakness, reduced mobility

**Backward Pawn:** Pawn that cannot advance safely
- Pros: Rare tactical opportunities
- Cons: Weak square in front, target for attack

**Passed Pawn:** Pawn with no enemy pawns blocking its path
- Pros: Promotes to queen, diverts enemy pieces
- Cons: May need protection, can be blockaded

**Pawn Chain:** Diagonal line of pawns supporting each other
- Pros: Strong structure, space control
- Cons: Base can be attacked, inflexible

### Major Tactical Motifs:
- **Pin:** Attacking a piece that cannot move without exposing a more valuable piece
- **Fork:** Single piece attacking two or more enemy pieces simultaneously
- **Skewer:** Forcing a valuable piece to move and capturing a less valuable piece behind it
- **Discovered Attack:** Moving one piece to reveal an attack from another piece
- **Double Attack:** Attacking two targets simultaneously
- **Deflection:** Forcing a piece away from an important duty
- **Decoy:** Luring a piece to a bad square
- **Clearance:** Moving a piece to clear a line for another piece
- **Interference:** Placing a piece between two enemy pieces to disrupt their coordination
- **X-ray:** Attack through another piece to a target behind it

### Saving Lost Positions
- Seek complications, avoid exchanges, target the king, sacrifice if needed, improve all pieces, play creatively, set traps, look for stalemates and swindles.

### Winning Won Positions
- Exchange pieces, maintain king safety, avoid greed, punish bluffs, prevent counterplay, keep pieces active.

### Endgame Roadmap
- Activate pieces and king, create weak opponent pawns/squares, win pawns, create and promote passed pawns, checkmate, stay alert for tactics, block or win passed pawns, exchange or sacrifice weak pawns, cover weak/entry squares.

### CLAMP Blundercheck Checklist
• C is for Checks: Does my move allow a devastating check for my opponent?
• L is for Loose Pieces and Squares: Am I leaving something unprotected?
• A is for Alignments: Am I creating a dangerous alignment (forks, pins, skewers, discovered attacks)?
• M is for Mobility Restrictions: Does my move restrict my pieces, making them trappable?
• P is for Passed Pawns: Does my move allow an unstoppable passed pawn for my opponent?

The CLAMP checklist can also be used in reverse to look for tactics.

### ChessMood 7Q
a. What problems does the opponent have?
b. What problems do I have?
c. Where am I strong?
d. Which of my pieces can be happier?
e. Which pieces do I want to trade?
f. What is the opponent's next move or plan?
g. How can I advance (if none of the other six questions have compelling answers)?

### Opening Principles:
- Control the center with pawns and pieces
- Develop knights before bishops
- Castle early for king safety
- Don't move the same piece twice without good reason
- Don't bring the queen out too early
- Connect your rooks
- Develop with purpose and threats

### Strategic Concepts:
**Common Weaknesses:** Weak squares, weak pawns, exposed king, uncoordinated pieces
**Sources of Strength:** Active pieces, better pawn structure, king safety, initiative
**Planning Guidelines:** Improve worst piece, create weaknesses, control key squares, advance passed pawns

### Self-Correction:
- Acknowledge errors naturally and thank the user if they point them out.
- Re-analyze with new input and keep the conversation collaborative.

### Handling Complexity:
- Admit when evaluation is difficult.
- Present multiple perspectives and discuss practical vs. theoretical considerations.
- For sharp tactics, start with obvious ideas, then dig deeper.

### Additional Chess Wisdom:
- "The pawns are the soul of chess" – Francois-Andre Danican Philidor
- "Every pawn is a potential queen" – James Mason
- "The threat is stronger than the execution" – Aaron Nimzowitsch
- "Capture towards the center" – General principle
- "When in doubt, improve your worst piece" – GM advice
- "Look for checks, captures, and threats" – Basic calculation order
    `.trim();
    return { knowledgebase };
  },
});

/**
 * # Playing Game Mode Framework:
When Play Mode: Active this means the user is playing against you
Always answer in first person, I think this is best move, I think you should play etc
1. Act as a supportive chess coach during live gameplay.
2. Provide real-time strategic advice and tactical guidance.
3. Help identify threats and opportunities in the current position.
4. Suggest candidate moves and explain their benefits.
5. Focus on practical, actionable advice for the current game situation.
6. Be encouraging and supportive while providing accurate analysis.
7. Provide quick explanations of notation or terminology if the user seems confused.
8. Share fun chess facts or anecdotes to keep the conversation engaging.
	 
# Game Analysis Framework:
	Context Understanding:
	- When provided with PGN data, recognize this is a game review scenario analyzing specific positions within completed games
	- Identify the current position within the game's narrative arc and consider practical context when relevant
	- Use the board state to better understand how would moves work, consider position analysis framework

	Move Comparison Analysis:
	- Primary Focus: Compare the move actually played in the game versus the engine's recommended best move
	- Assess whether the played move maintains, improves, or worsens the position
	- Brief evaluation of practical vs theoretical considerations

	Game Flow Integration:
	- Consider how previous moves led to this position when relevant to understanding the current choice
	- Note key turning points only when they directly impact the current analysis

	Error Classification (When Engine Analysis Available):
	- Blunder: Moves that significantly worsen the position (usually -1.5+ evaluation swing)
	- Mistake: Moves that clearly worsen the position (-0.7 to -1.4 evaluation swing) 
	- Dubious: Suboptimal moves that slightly worsen the position (-0.3 to -0.6 evaluation swing)

	Candidate Move Evaluation:
	- Identify 2-3 strongest alternatives to the played move
	- Brief comparison with engine recommendations

	Position Assessment Integration:
	- Apply core position analysis: key pieces, critical squares, immediate threats
	- Focus on factors most relevant to the move choice decision

	Default Response Structure:
	1. Position Summary: Current situation and whose move
	2. Move Analysis: Played move vs best move with evaluation impact
	3. Key Alternatives: 1-2 other strong options briefly mentioned
	4. Assessment: Whether the choice was reasonable given the position

	Detailed Analysis (On Request Only):
	- Full candidate move analysis with 4-5 options
	- Complete game flow and historical context
	- Detailed psychological and practical considerations
	- Educational perspective and pattern recognition
	- Extended continuation analysis
	- Comprehensive learning points and improvement suggestions

	Response Guidelines:
	- Keep default responses concise and focused
	- Provide core analysis without excessive detail unless requested
	- Balance criticism with practical understanding
	- Offer to provide deeper analysis if the user wants more detail
 */

export const chessOpeningStatTool = createTool({
  id: "get-opening-stats",
  description:
    "Get the Opening stat information from Lichess Opening Explorer, the opening names, games, moves etc for given fen",
  inputSchema: z.object({
    fen: z.string().describe("FEN string representing the board position"),
  }),
  outputSchema: z.object({
    openingSpeech: z
      .string()
      .describe(
        "opening stats in text form if present, contains opening name, moves, win %, master games information"
      ),
  }),
  execute: async ({ context }) => {
    const openingStats = await getOpeningStatSpeech(
      await getOpeningStats(context.fen)
    );
    return { openingSpeech: openingStats };
  },
});


// export const validateFENTool = createTool({
//     id: "validate-fen",
//     description: "Validate a FEN string to check if it represents a valid chess position",
//     inputSchema: z.object({
//         fen: z.string().describe("FEN string representing the board position"),
//     }),
//     outputSchema: z.object({
//         isValid: z.boolean().describe("Indicates if the FEN string is valid"),
//         message: z.string().optional().describe("Error message if the FEN is invalid"),
//     }),
//     execute: async ({ context }) => {
//         const { fen } = context;
//         try {
//             const boardState = getBoardState(fen);
//             return { isValid: boardState.validfen, message: boardState.validfen ? undefined : "Invalid FEN string" };
//         } catch (error) {
//             return { isValid: false, message: "An error occurred while validating the FEN" };
//         }
//     },
// });


