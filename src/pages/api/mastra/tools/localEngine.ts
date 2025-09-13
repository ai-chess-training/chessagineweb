import { Chess} from "chess.js";
import { getBoardState } from "./state";

interface FastEngineResult {
  bestMove: string | null;
  evaluationCp: number; // Evaluation in centipawns
  uiEval: number; // Evaluation in 0.00 scale (centipawns / 100)
  depth: number;
  nodesSearched: number;
  timeMs: number;
  reasoning: string; // NEW: Detailed reasoning for the move
}

interface CachedEvaluation {
  score: number;
  depth: number;
}

interface MoveReasoning {
  primaryReasons: string[];
  tacticalFactors: string[];
  positionalFactors: string[];
  strategicGoals: string[];
  warnings: string[];
}

class FastChessEngine {
  private evalCache = new Map<string, CachedEvaluation>();
  private transpositionTable = new Map<string, { eval: number; depth: number; bestMove?: string }>();
  private nodesSearched = 0;
  private maxTimeMs = 10000; // Leave buffer for computation
  private startTime = 0;

  /**
   * Fast move finder with aggressive time limits
   */
  public findBestMoveFast(fen: string, maxDepth: number = 5): FastEngineResult {
    this.startTime = Date.now();
    this.nodesSearched = 0;
    this.evalCache.clear();
    this.transpositionTable.clear();

    const chess = new Chess(fen);
    const isWhite = chess.turn() === 'w';
    
    // Quick game state checks
    const moves = chess.moves();
    if (moves.length === 0) {
      return { 
        bestMove: null, 
        evaluationCp: 0, 
        uiEval: 0.00, 
        depth: 0, 
        nodesSearched: 0, 
        timeMs: 0,
        reasoning: chess.isCheckmate() ? "Game over - checkmate" : "Game over - stalemate"
      };
    }
    if (moves.length === 1) {
      const evalCp = Math.round(this.quickEval(fen));
      return { 
        bestMove: moves[0], 
        evaluationCp: evalCp, 
        uiEval: evalCp / 100,
        depth: 1, 
        nodesSearched: 1, 
        timeMs: Date.now() - this.startTime,
        reasoning: "Only legal move available"
      };
    }

    let bestMove = moves[0]; // Fallback
    let bestEval = isWhite ? -Infinity : Infinity;

    // Try iterative deepening but with strict time limits
    for (let depth = 1; depth <= maxDepth; depth++) {
      if (this.isTimeUp()) break;

      try {
        const result = this.fastMinimax(chess, depth, -50000, 50000, isWhite);
        if (result.bestMove) {
          bestMove = result.bestMove;
          bestEval = result.evaluation;
        }
        
        // If we found a winning move, stop searching
        if (Math.abs(bestEval) > 20000) break;
        
      } catch (e) {
        // Time cutoff - use current best
        break;
      }
    }

    // Generate reasoning for the best move
    const reasoning = this.generateMoveReasoning(fen, bestMove, bestEval);

    return {
      bestMove,
      evaluationCp: Math.round(bestEval), // Convert to centipawns (already in that scale)
      uiEval: Math.round(bestEval) / 100, // Convert to 0.00 scale
      depth: maxDepth,
      nodesSearched: this.nodesSearched,
      timeMs: Date.now() - this.startTime,
      reasoning
    };
  }

  /**
   * Generate detailed reasoning for why a move was selected
   */
  private generateMoveReasoning(fen: string, bestMove: string, evaluation: number): string {
    const chess = new Chess(fen);
    const isWhite = chess.turn() === 'w';
    const boardState = getBoardState(fen);
    
    if (!boardState || !bestMove) {
      return "Unable to analyze position";
    }

    const moveReasoning: MoveReasoning = {
      primaryReasons: [],
      tacticalFactors: [],
      positionalFactors: [],
      strategicGoals: [],
      warnings: []
    };

    // Analyze the move itself
    const moveDetails = chess.moves({ verbose: true }).find(m => m.san === bestMove);
    if (!moveDetails) {
      return "Move analysis unavailable";
    }

    // Get position before and after the move
    const beforeState = boardState;
    chess.move(bestMove);
    const afterState = getBoardState(chess.fen());
    chess.undo();

    if (!afterState) {
      return "Unable to analyze resulting position";
    }

    // === TACTICAL ANALYSIS ===
    this.analyzeTacticalFactors(moveDetails, beforeState, afterState, moveReasoning, isWhite);

    // === POSITIONAL ANALYSIS ===
    this.analyzePositionalFactors(beforeState, afterState, moveReasoning, isWhite);

    // === STRATEGIC ANALYSIS ===
    this.analyzeStrategicFactors(beforeState, afterState, moveReasoning, isWhite, evaluation);

    // === SAFETY ANALYSIS ===
    this.analyzeSafetyFactors(beforeState, afterState, moveReasoning, isWhite);

    // Format the reasoning into a readable explanation
    return this.formatReasoning(moveReasoning, bestMove, evaluation, isWhite);
  }

  private analyzeTacticalFactors(
    moveDetails: any, 
    beforeState: any, 
    afterState: any, 
    reasoning: MoveReasoning, 
    isWhite: boolean
  ): void {
    // Captures
    if (moveDetails.captured) {
      const capturedValue = this.getPieceValue(moveDetails.captured);
      const attackerValue = this.getPieceValue(moveDetails.piece);
      
      if (capturedValue >= attackerValue) {
        reasoning.primaryReasons.push(`Captures ${moveDetails.captured} (${capturedValue} points) with ${moveDetails.piece} (${attackerValue} points)`);
      } else {
        reasoning.tacticalFactors.push(`Sacrifices ${moveDetails.piece} for ${moveDetails.captured} - likely for compensation`);
      }
    }

    // Checks
    if (moveDetails.san.includes('+')) {
      if (moveDetails.san.includes('#')) {
        reasoning.primaryReasons.push("Delivers checkmate!");
      } else {
        reasoning.tacticalFactors.push("Gives check, forcing opponent's response");
      }
    }

    // Promotions
    if (moveDetails.promotion) {
      reasoning.primaryReasons.push(`Promotes pawn to ${moveDetails.promotion}`);
    }

    // Castling
    if (moveDetails.flags.includes('k')) {
      reasoning.tacticalFactors.push("Castles kingside for king safety");
    } else if (moveDetails.flags.includes('q')) {
      reasoning.tacticalFactors.push("Castles queenside for king safety");
    }

    // Hanging pieces analysis
    const hangingBefore = isWhite ? beforeState.whitetactical.hangingpieces : beforeState.blacktactical.hangingpieces;
    const hangingAfter = isWhite ? afterState.whitetactical.hangingpieces : afterState.blacktactical.hangingpieces;
    
    if (hangingBefore.length > hangingAfter.length) {
      reasoning.tacticalFactors.push("Saves hanging piece(s)");
    }

    // Pins and skewers
    const pinnedBefore = isWhite ? beforeState.whitetactical.pinned : beforeState.blacktactical.pinned;
    const pinnedAfter = isWhite ? afterState.whitetactical.pinned : afterState.blacktactical.pinned;
    
    if (pinnedBefore.length > pinnedAfter.length) {
      reasoning.tacticalFactors.push("Breaks pin");
    }
  }

  private analyzePositionalFactors(
    beforeState: any, 
    afterState: any, 
    reasoning: MoveReasoning, 
    isWhite: boolean
  ): void {
    const beforeMobility = isWhite ? beforeState.whitemobility.totalmobility : beforeState.blackmobility.totalmobility;
    const afterMobility = isWhite ? afterState.whitemobility.totalmobility : afterState.blackmobility.totalmobility;
    
    if (afterMobility > beforeMobility + 5) {
      reasoning.positionalFactors.push("Significantly improves piece mobility");
    } else if (afterMobility > beforeMobility + 2) {
      reasoning.positionalFactors.push("Improves piece activity");
    }

    // Center control analysis
    const beforeCenter = isWhite ? beforeState.whitespacescore.centerspacecontrolscore : beforeState.blackspacescore.centerspacecontrolscore;
    const afterCenter = isWhite ? afterState.whitespacescore.centerspacecontrolscore : afterState.blackspacescore.centerspacecontrolscore;
    
    if (afterCenter > beforeCenter + 10) {
      reasoning.positionalFactors.push("Strengthens central control");
    }

    // Pawn structure improvements
    const beforePassed = isWhite ? beforeState.whitepositionalscore.passedpawncount : beforeState.blackpositionalscore.passedpawncount;
    const afterPassed = isWhite ? afterState.whitepositionalscore.passedpawncount : afterState.blackpositionalscore.passedpawncount;
    
    if (afterPassed > beforePassed) {
      reasoning.positionalFactors.push("Creates passed pawn");
    }

    // Doubled pawns
    const beforeDoubled = isWhite ? beforeState.whitepositionalscore.doublepawncount : beforeState.blackpositionalscore.doublepawncount;
    const afterDoubled = isWhite ? afterState.whitepositionalscore.doublepawncount : afterState.blackpositionalscore.doublepawncount;
    
    if (afterDoubled < beforeDoubled) {
      reasoning.positionalFactors.push("Improves pawn structure");
    }
  }

  private analyzeStrategicFactors(
    beforeState: any, 
    afterState: any, 
    reasoning: MoveReasoning, 
    isWhite: boolean,
    evaluation: number
  ): void {
    // Game phase considerations
    if (beforeState.gamePhase === 'opening') {
      reasoning.strategicGoals.push("Opening development");
    } else if (beforeState.gamePhase === 'endgame') {
      reasoning.strategicGoals.push("Endgame technique");
      
      // King activity in endgame
      const beforeKingPos = isWhite ? beforeState.whitepieceplacement.kingplacement[0] : beforeState.blackpieceplacement.kingplacement[0];
      const afterKingPos = isWhite ? afterState.whitepieceplacement.kingplacement[0] : afterState.blackpieceplacement.kingplacement[0];
      
      if (beforeKingPos && afterKingPos && this.isKingMoreActive(beforeKingPos, afterKingPos, isWhite)) {
        reasoning.strategicGoals.push("Activates king");
      }
    } else {
      reasoning.strategicGoals.push("Middlegame strategy");
    }

    // Evaluation-based insights
    if (Math.abs(evaluation) > 500) {
      if ((evaluation > 0 && isWhite) || (evaluation < 0 && !isWhite)) {
        reasoning.strategicGoals.push("Maintains winning advantage");
      } else {
        reasoning.strategicGoals.push("Attempts to complicate the position");
      }
    } else if (Math.abs(evaluation) < 50) {
      reasoning.strategicGoals.push("Seeks small positional advantage");
    }
  }

  private analyzeSafetyFactors(
    beforeState: any, 
    afterState: any, 
    reasoning: MoveReasoning, 
    isWhite: boolean
  ): void {
    // King safety analysis
    const beforeKingSafety = isWhite ? beforeState.whitekingsafety.kingsafetyscore : beforeState.blackkingsafety.kingsafetyscore;
    const afterKingSafety = isWhite ? afterState.whitekingsafety.kingsafetyscore : afterState.blackkingsafety.kingsafetyscore;
    
    if (afterKingSafety < beforeKingSafety - 20) {
      reasoning.warnings.push("Compromises king safety");
    } else if (beforeKingSafety > afterKingSafety + 20) {
      reasoning.tacticalFactors.push("Improves king safety");
    }

    // Check for new hanging pieces after the move
    const hangingAfter = isWhite ? afterState.whitetactical.hangingpieces : afterState.blacktactical.hangingpieces;
    if (hangingAfter.length > 0) {
      reasoning.warnings.push(`Leaves ${hangingAfter.length} piece(s) hanging`);
    }
  }

  private isKingMoreActive(beforePos: string, afterPos: string, isWhite: boolean): boolean {
    const beforeFile = beforePos.charCodeAt(0) - 'a'.charCodeAt(0);
    const beforeRank = parseInt(beforePos[1]) - 1;
    const afterFile = afterPos.charCodeAt(0) - 'a'.charCodeAt(0);
    const afterRank = parseInt(afterPos[1]) - 1;
    
    // Check centralization (closer to center is better)
    const beforeCenterDist = Math.abs(3.5 - beforeFile) + Math.abs(3.5 - beforeRank);
    const afterCenterDist = Math.abs(3.5 - afterFile) + Math.abs(3.5 - afterRank);
    
    // Check advancement
    const beforeAdvancement = isWhite ? beforeRank : (7 - beforeRank);
    const afterAdvancement = isWhite ? afterRank : (7 - afterRank);
    
    return afterCenterDist < beforeCenterDist || afterAdvancement > beforeAdvancement;
  }

  private formatReasoning(reasoning: MoveReasoning, bestMove: string, evaluation: number, isWhite: boolean): string {
    let result = `**${bestMove}**`;
    
    // Add evaluation context
    const evalDesc = this.getEvaluationDescription(evaluation, isWhite);
    if (evalDesc) {
      result += ` (${evalDesc})`;
    }
    
    result += "\n\n";

    // Primary reasons first
    if (reasoning.primaryReasons.length > 0) {
      result += "**Key factors:** " + reasoning.primaryReasons.join(", ") + "\n\n";
    }

    // Tactical factors
    if (reasoning.tacticalFactors.length > 0) {
      result += "**Tactical:** " + reasoning.tacticalFactors.join(", ") + "\n\n";
    }

    // Positional factors
    if (reasoning.positionalFactors.length > 0) {
      result += "**Positional:** " + reasoning.positionalFactors.join(", ") + "\n\n";
    }

    // Strategic goals
    if (reasoning.strategicGoals.length > 0) {
      result += "**Strategic:** " + reasoning.strategicGoals.join(", ") + "\n\n";
    }

    // Warnings
    if (reasoning.warnings.length > 0) {
      result += "**⚠️ Caution:** " + reasoning.warnings.join(", ") + "\n\n";
    }

    return result.trim();
  }

  private getEvaluationDescription(evaluation: number, isWhite: boolean): string {
    const absEval = Math.abs(evaluation);
    const isWinning = (evaluation > 0 && isWhite) || (evaluation < 0 && !isWhite);
    
    if (absEval > 2000) {
      return isWinning ? "Winning" : "Losing";
    } else if (absEval > 500) {
      return isWinning ? "Much better" : "Much worse";
    } else if (absEval > 200) {
      return isWinning ? "Better" : "Worse";
    } else if (absEval > 50) {
      return isWinning ? "Slightly better" : "Slightly worse";
    } else {
      return "Equal";
    }
  }

  /**
   * Optimized minimax with aggressive pruning
   */
  private fastMinimax(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): { evaluation: number; bestMove?: string } {
    
    if (this.isTimeUp()) throw new Error("Time limit exceeded");
    
    this.nodesSearched++;
    
    // Quick transposition table lookup
    const posKey = this.getPositionKey(chess);
    const ttEntry = this.transpositionTable.get(posKey);
    if (ttEntry && ttEntry.depth >= depth) {
      return { evaluation: ttEntry.eval, bestMove: ttEntry.bestMove };
    }

    // Terminal conditions
    if (depth === 0 || chess.isGameOver()) {
      const eval1 = this.quickEval(chess.fen());
      return { evaluation: eval1 };
    }

    let bestMove: string | undefined;
    let bestValue = maximizingPlayer ? -50000 : 50000;

    // Get moves with simple ordering
    const moves = this.getQuickOrderedMoves(chess);
    
    // Limit move exploration in deep searches
    const moveLimit = depth > 3 ? Math.min(moves.length, 8) : moves.length;

    for (let i = 0; i < moveLimit; i++) {
      const move = moves[i];
      
      chess.move(move);
      
      let searchDepth = depth - 1;
      
      // Late move reduction - search later moves at reduced depth
      if (i > 3 && depth > 2 && !this.isTacticalMove(chess, move)) {
        searchDepth = Math.max(1, depth - 2);
      }
      
      const result = this.fastMinimax(chess, searchDepth, alpha, beta, !maximizingPlayer);
      chess.undo();

      if (maximizingPlayer) {
        if (result.evaluation > bestValue) {
          bestValue = result.evaluation;
          bestMove = move;
        }
        alpha = Math.max(alpha, bestValue);
      } else {
        if (result.evaluation < bestValue) {
          bestValue = result.evaluation;
          bestMove = move;
        }
        beta = Math.min(beta, bestValue);
      }

      // Alpha-beta cutoff
      if (beta <= alpha) break;
    }

    // Store in transposition table
    this.transpositionTable.set(posKey, {
      eval: bestValue,
      depth,
      bestMove
    });

    return { evaluation: bestValue, bestMove };
  }

  /**
   * Comprehensive evaluation using detailed BoardState features
   */
  private quickEval(fen: string): number {
    // Check cache first
    const cached = this.evalCache.get(fen);
    if (cached) return cached.score;

    const boardState = getBoardState(fen);
    if (!boardState) return 0;

    let score = 0;

    // Terminal position checks
    if (boardState.isCheckmate) {
      score = boardState.sidetomove === 'white' ? -30000 : 30000;
      this.evalCache.set(fen, { score, depth: 0 });
      return score;
    }
    if (boardState.isStalemate) return 0;

    // === MATERIAL EVALUATION ===
    const materialDiff = boardState.whitematerial.materialvalue - boardState.blackmaterial.materialvalue;
    score += materialDiff;

    // Bishop pair bonus
    if (boardState.whitematerial.bishoppair) score += 50;
    if (boardState.blackmaterial.bishoppair) score -= 50;

    // === PIECE ACTIVITY & MOBILITY ===
    const mobilityDiff = boardState.whitemobility.totalmobility - boardState.blackmobility.totalmobility;
    score += mobilityDiff * 4;

    // Piece-specific mobility bonuses
    score += (boardState.whitemobility.queenmobility - boardState.blackmobility.queenmobility) * 2;
    score += (boardState.whitemobility.rookmobility - boardState.blackmobility.rookmobility) * 3;
    score += (boardState.whitemobility.bishopmobility - boardState.blackmobility.bishopmobility) * 3;
    score += (boardState.whitemobility.knightmobility - boardState.blackmobility.knightmobility) * 4;

    // === SPACE CONTROL ===
    const centerControlDiff = boardState.whitespacescore.centerspacecontrolscore - boardState.blackspacescore.centerspacecontrolscore;
    score += centerControlDiff * 10; // Center control is crucial

    const totalSpaceDiff = boardState.whitespacescore.totalspacecontrolscore - boardState.blackspacescore.totalspacecontrolscore;
    score += totalSpaceDiff * 5;

    // === KING SAFETY ===
    // Penalize unsafe kings more in middlegame
    const isEndgame = boardState.gamePhase === 'endgame';
    const kingSafetyWeight = isEndgame ? 0.3 : 1.0; // Reduce king safety importance in endgame
    
    score -= boardState.whitekingsafety.kingsafetyscore * kingSafetyWeight;
    score += boardState.blackkingsafety.kingsafetyscore * kingSafetyWeight;

    // Bonus for castling rights
    if (boardState.whitecastlerights.kingside || boardState.whitecastlerights.queenside) score += 20;
    if (boardState.blackcastlerights.kingside || boardState.blackcastlerights.queenside) score -= 20;

    // Bonus for having castled
    if (boardState.whitekingsafety.hascastled) score += 30;
    if (boardState.blackkingsafety.hascastled) score -= 30;

    // === TACTICAL FACTORS ===
    // Hanging pieces (critical) - increased penalty
    score -= boardState.whitetactical.hangingpieces.length * 200; // Increased from 120
    score += boardState.blacktactical.hangingpieces.length * 200;

    // Attacked pieces (pressure) - differentiate by piece value
    const whiteAttackedValue = this.calculateAttackedPiecesValue(boardState.whitetactical.attackedpieces, boardState.whitepieceplacement);
    const blackAttackedValue = this.calculateAttackedPiecesValue(boardState.blacktactical.attackedpieces, boardState.blackpieceplacement);
    score -= whiteAttackedValue * 0.3; // 30% penalty for being under attack
    score += blackAttackedValue * 0.3;

    // Defended pieces (coordination)
    score += boardState.whitetactical.defendedpieces.length * 8;
    score -= boardState.blacktactical.defendedpieces.length * 8;

    // Pins and skewers
    score -= boardState.whitetactical.pinned.length * 25;
    score += boardState.blacktactical.pinned.length * 25;
    score -= boardState.whitetactical.skewered.length * 40;
    score += boardState.blacktactical.skewered.length * 40;

    // === PAWN STRUCTURE ===
    // Passed pawns (very important)
    const whitePassedBonus = boardState.whitepositionalscore.passedpawncount * (isEndgame ? 40 : 25);
    const blackPassedBonus = boardState.blackpositionalscore.passedpawncount * (isEndgame ? 40 : 25);
    score += whitePassedBonus - blackPassedBonus;

    // Pawn weaknesses
    score -= boardState.whitepositionalscore.doublepawncount * 15;
    score += boardState.blackpositionalscore.doublepawncount * 15;
    score -= boardState.whitepositionalscore.isolatedpawncount * 20;
    score += boardState.blackpositionalscore.isolatedpawncount * 20;
    score -= boardState.whitepositionalscore.backwardpawncount * 12;
    score += boardState.blackpositionalscore.backwardpawncount * 12;

    // === SQUARE CONTROL ===
    const whiteSquareControl = boardState.whitesquarecontrol.lightSquareControl + boardState.whitesquarecontrol.darkSqaureControl;
    const blackSquareControl = boardState.blacksquarecontrol.lightSquareControl + boardState.blacksquarecontrol.darkSqaureControl;
    score += (whiteSquareControl - blackSquareControl) * 2;

    // Light vs dark square control balance
    const whiteLightDarkBalance = Math.abs(boardState.whitesquarecontrol.lightSquareControl - boardState.whitesquarecontrol.darkSqaureControl);
    const blackLightDarkBalance = Math.abs(boardState.blacksquarecontrol.lightSquareControl - boardState.blacksquarecontrol.darkSqaureControl);
    score -= whiteLightDarkBalance * 3; // Penalty for imbalanced square control
    score += blackLightDarkBalance * 3;

    // === GAME PHASE ADJUSTMENTS ===
    if (isEndgame) {
      // King activity in endgame
      const whiteKingPos = boardState.whitepieceplacement.kingplacement[0];
      const blackKingPos = boardState.blackpieceplacement.kingplacement[0];
      
      if (whiteKingPos) {
        score += this.getKingActivityScore(whiteKingPos, true);
      }
      if (blackKingPos) {
        score -= this.getKingActivityScore(blackKingPos, false);
      }

      // Rook activity in endgame
      const whiteRookMobility = boardState.whitemobility.rookmobility;
      const blackRookMobility = boardState.blackmobility.rookmobility;
      score += (whiteRookMobility - blackRookMobility) * 3;

    } else {
      // Development bonus in opening/middlegame
      if (boardState.gamePhase === 'opening') {
        // Penalty for king in center
        const whiteKingPos = boardState.whitepieceplacement.kingplacement[0];
        const blackKingPos = boardState.blackpieceplacement.kingplacement[0];
        
        if (whiteKingPos === 'e1') score -= 10; // King still on starting square
        if (blackKingPos === 'e8') score += 10;
      }
    }

    // === PIECE COORDINATION ===
    // Count pieces attacking/defending same squares (simplified coordination)
    const whiteAttackerInfo = boardState.whitepieceattackerdefenderinfo;
    const blackAttackerInfo = boardState.blackpieceattackerdefenderinfo;
    
    const whiteCoordination = whiteAttackerInfo.queenInfo.defenderscount + 
                             whiteAttackerInfo.rookInfo.defenderscount + 
                             whiteAttackerInfo.bishopInfo.defenderscount + 
                             whiteAttackerInfo.knightInfo.defenderscount;
    
    const blackCoordination = blackAttackerInfo.queenInfo.defenderscount + 
                             blackAttackerInfo.rookInfo.defenderscount + 
                             blackAttackerInfo.bishopInfo.defenderscount + 
                             blackAttackerInfo.knightInfo.defenderscount;
    
    score += (whiteCoordination - blackCoordination) * 3;

    // Cache the evaluation
    this.evalCache.set(fen, { score, depth: 0 });
    return score;
  }

  /**
   * Calculate king activity bonus for endgames
   */
     private getKingActivityScore(kingSquare: string, isWhite: boolean): number {
    const file = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(kingSquare[1]) - 1;
    
    // Centralization bonus (distance from center)
    const centerDistance = Math.abs(3.5 - file) + Math.abs(3.5 - rank);
    const centralizationBonus = Math.max(0, 7 - centerDistance) * 6;
    
    // Advancement bonus (moving up the board)
    const advancementBonus = isWhite ? rank * 4 : (7 - rank) * 4;
    
    return centralizationBonus + advancementBonus;
  }

  /**
   * Calculate the total value of attacked pieces to heavily penalize hanging valuable pieces
   */
  private calculateAttackedPiecesValue(attackedSquares: string[], piecePlacement: any): number {
    let totalValue = 0;
    
    // Map squares to piece types and calculate total value under attack
    for (const square of attackedSquares) {
      // Check each piece type placement to find what piece is on this square
      if (piecePlacement.queenplacement.includes(square)) {
        totalValue += 900;
      } else if (piecePlacement.rookplacement.includes(square)) {
        totalValue += 500;
      } else if (piecePlacement.bishopplacement.includes(square)) {
        totalValue += 300;
      } else if (piecePlacement.knightplacement.includes(square)) {
        totalValue += 300;
      } else if (piecePlacement.pawnplacement.includes(square)) {
        totalValue += 100;
      }
      // King attacks are handled separately in king safety
    }
    
    return totalValue;
  }

  /**
   * Quick move ordering with minimal computation
   */
  private getQuickOrderedMoves(chess: Chess): string[] {
    const moves = chess.moves({ verbose: true });
    
    return moves
      .map(move => ({
        move: move.san,
        score: this.getQuickMoveScore(move)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.move);
  }

  /**
   * Enhanced move scoring for better tactical awareness
   */
  private getQuickMoveScore(move: any): number {
    let score = 0;

    // Captures (MVV-LVA simplified)
    if (move.captured) {
      const victimValue = this.getPieceValue(move.captured);
      const attackerValue = this.getPieceValue(move.piece);
      score += 1000 + victimValue - attackerValue;
    }

    // Promotions
    if (move.promotion) {
      score += 900;
    }

    // Checks - but be careful about hanging pieces
    if (move.san.includes('+')) {
      // Reduce check bonus if the checking piece can be captured
      let checkBonus = 500;
      
      // Heavily penalize queen checks that hang the queen
      if (move.piece === 'q') {
        checkBonus = 100; // Much lower bonus for queen checks
      }
      // Moderate penalty for rook checks
      else if (move.piece === 'r') {
        checkBonus = 200;
      }
      // Knights and bishops get normal check bonus
      else if (move.piece === 'n' || move.piece === 'b') {
        checkBonus = 300;
      }
      // Pawn checks are usually safe
      else if (move.piece === 'p') {
        checkBonus = 400;
      }
      
      score += checkBonus;
    }

    // Castling
    if (move.flags.includes('k') || move.flags.includes('q')) {
      score += 200;
    }

    // Center moves in opening
    if (move.to === 'e4' || move.to === 'd4' || move.to === 'e5' || move.to === 'd5') {
      score += 100;
    }

    return score;
  }

  /**
   * Check if move is tactical (should not be reduced) - enhanced to detect unsafe checks
   */
  private isTacticalMove(chess: Chess, move: string): boolean {
    const moveObj = chess.moves({ verbose: true }).find(m => m.san === move);
    if (!moveObj) return false;
    
    // Always consider captures and promotions tactical
    if (moveObj.captured || moveObj.promotion) return true;
    
    // For checks, be more selective - don't reduce search for checks but evaluate them carefully
    if (moveObj.san.includes('+')) {
      // Consider all checks tactical, but the evaluation will penalize bad ones
      return true;
    }
    
    return false;
  }

  /**
   * Simple piece values
   */
  private getPieceValue(piece: string): number {
    const values: { [key: string]: number } = {
      'p': 100, 'n': 300, 'b': 300, 'r': 500, 'q': 900
    };
    return values[piece.toLowerCase()] || 0;
  }

  /**
   * Fast position key generation
   */
  private getPositionKey(chess: Chess): string {
    return chess.fen().split(' ')[0]; // Just the board position
  }

  /**
   * Time management
   */
  private isTimeUp(): boolean {
    return Date.now() - this.startTime > this.maxTimeMs;
  }
}

// Simplified API for fast results with reasoning
export function getBestMoveFast(fen: string): FastEngineResult {
  const engine = new FastChessEngine();
  return engine.findBestMoveFast(fen, 4); // Shallow search for speed
}

// Example with different time/depth tradeoffs
export function getBestMoveUltraFast(fen: string): FastEngineResult {
  const engine = new FastChessEngine();
  engine['maxTimeMs'] = 300; // Even faster
  return engine.findBestMoveFast(fen, 3);
}

// Simple API that returns just move, eval, and reasoning
export function getMoveReasoningForFen(fen: string): { move: string | null; eval: number; reasoning: string } {
  const result = getBestMoveFast(fen);
  return {
    move: result.bestMove,
    eval: result.uiEval,
    reasoning: result.reasoning
  };
}

export function getTargetMoveReasoningForFen(fen: string, move: string): { move: string | null; eval: number; reasoning: string } {
    const chess = new Chess(fen);
    chess.move(move);
    return getMoveReasoningForFen(chess.fen());
}

// Ultra-simple API for just the best move (no reasoning)
export function getBestMove(fen: string): string | null {
  const result = getBestMoveFast(fen);
  return result.bestMove;
}

// Enhanced API for detailed analysis
export function getDetailedAnalysis(fen: string): FastEngineResult {
  const engine = new FastChessEngine();
  return engine.findBestMoveFast(fen, 5); // Deeper search for better reasoning
}


