import { BoardState } from "./types";

export function boardStateToPrompt(state: BoardState | undefined): string {
  if (!state) return '<board_state>Invalid FEN provided</board_state>';

  const sections: string[] = [];

  // Wrap everything in structured tags
  sections.push('<detailed_board_analysis>');

    // Basic Game Information
  sections.push('<game_status>');
  sections.push(`FEN: ${state.fen}`);
  sections.push(`Move Number: ${state.moveNumber}`);
  sections.push(`Active Player: ${state.sidetomove === 'white' ? 'White to move' : 'Black to move'}`);
  sections.push(`Game Phase: ${state.gamePhase.toUpperCase()}`);
  
  if (state.isCheckmate) {
    sections.push('Game Status: CHECKMATE - Game is over');
  } else if (state.isStalemate) {
    sections.push('Game Status: STALEMATE - Game is drawn');
  } else if (state.isGameOver) {
    sections.push('Game Status: GAME OVER - No legal moves available');
  } else {
    sections.push('Game Status: ACTIVE GAME - Normal play continues');
  }
  
  sections.push(`Total Legal Moves Available: ${state.legalMoves.length}`);
  if (state.legalMoves.length > 0 && state.legalMoves.length <= 15) {
    sections.push(`All Legal Moves: ${state.legalMoves.join(', ')}`);
  } else if (state.legalMoves.length > 15) {
    sections.push(`Sample Legal Moves: ${state.legalMoves.slice(0, 15).join(', ')}... (${state.legalMoves.length - 15} more)`);
  }
  sections.push('</game_status>');

  // Material Analysis - Very Detailed
  sections.push('\n<material_analysis>');
  const materialDiff = state.white.materialScore.materialvalue - state.black.materialScore.materialvalue;
  
  sections.push('WHITE PIECES:');
  sections.push(`  Total Material Value: ${state.white.materialScore.materialvalue} centipawns`);
  sections.push(`  Queens: ${state.white.materialScore.piececount.queens} (${state.white.materialScore.piececount.queens * 900} points)`);
  sections.push(`  Rooks: ${state.white.materialScore.piececount.rooks} (${state.white.materialScore.piececount.rooks * 500} points)`);
  sections.push(`  Bishops: ${state.white.materialScore.piececount.bishops} (${state.white.materialScore.piececount.bishops * 300} points)`);
  sections.push(`  Knights: ${state.white.materialScore.piececount.knights} (${state.white.materialScore.piececount.knights * 300} points)`);
  sections.push(`  Pawns: ${state.white.materialScore.piececount.pawns} (${state.white.materialScore.piececount.pawns * 100} points)`);
  sections.push(`  Bishop Pair Bonus: ${state.white.materialScore.bishoppair ? 'YES (+50 points strategic value)' : 'NO'}`);
  
  sections.push('\nBLACK PIECES:');
  sections.push(`  Total Material Value: ${state.black.materialScore.materialvalue} centipawns`);
  sections.push(`  Queens: ${state.black.materialScore.piececount.queens} (${state.black.materialScore.piececount.queens * 900} points)`);
  sections.push(`  Rooks: ${state.black.materialScore.piececount.rooks} (${state.black.materialScore.piececount.rooks * 500} points)`);
  sections.push(`  Bishops: ${state.black.materialScore.piececount.bishops} (${state.black.materialScore.piececount.bishops * 300} points)`);
  sections.push(`  Knights: ${state.black.materialScore.piececount.knights} (${state.black.materialScore.piececount.knights * 300} points)`);
  sections.push(`  Pawns: ${state.black.materialScore.piececount.pawns} (${state.black.materialScore.piececount.pawns * 100} points)`);
  sections.push(`  Bishop Pair Bonus: ${state.black.materialScore.bishoppair ? 'YES (+50 points strategic value)' : 'NO'}`);
  
  sections.push('\nMATERIAL BALANCE:');
  if (materialDiff > 0) {
    sections.push(`  White has a material advantage of +${materialDiff} centipawns`);
    if (materialDiff >= 900) sections.push(`  This is equivalent to approximately a QUEEN advantage`);
    else if (materialDiff >= 500) sections.push(`  This is equivalent to approximately a ROOK advantage`);
    else if (materialDiff >= 300) sections.push(`  This is equivalent to approximately a MINOR PIECE advantage`);
    else if (materialDiff >= 100) sections.push(`  This is equivalent to approximately a PAWN advantage`);
  } else if (materialDiff < 0) {
    const absMatDiff = Math.abs(materialDiff);
    sections.push(`  Black has a material advantage of +${absMatDiff} centipawns`);
    if (absMatDiff >= 900) sections.push(`  This is equivalent to approximately a QUEEN advantage`);
    else if (absMatDiff >= 500) sections.push(`  This is equivalent to approximately a ROOK advantage`);
    else if (absMatDiff >= 300) sections.push(`  This is equivalent to approximately a MINOR PIECE advantage`);
    else if (absMatDiff >= 100) sections.push(`  This is equivalent to approximately a PAWN advantage`);
  } else {
    sections.push(`  Material is EQUAL - both sides have ${state.white.materialScore.materialvalue} centipawns`);
  }
  sections.push('</material_analysis>');

  // Detailed Piece Positions
  sections.push('\n<piece_positions>');
  sections.push('WHITE PIECE LOCATIONS:');
  sections.push(`  King: ${state.white.pieceplacementScore.kingplacement[0] || 'MISSING'}`);
  sections.push(`  Queens: ${state.white.pieceplacementScore.queenplacement.length > 0 ? state.white.pieceplacementScore.queenplacement.join(', ') : 'None'}`);
  sections.push(`  Rooks: ${state.white.pieceplacementScore.rookplacement.length > 0 ? state.white.pieceplacementScore.rookplacement.join(', ') : 'None'}`);
  sections.push(`  Bishops: ${state.white.pieceplacementScore.bishopplacement.length > 0 ? state.white.pieceplacementScore.bishopplacement.join(', ') : 'None'}`);
  sections.push(`  Knights: ${state.white.pieceplacementScore.knightplacement.length > 0 ? state.white.pieceplacementScore.knightplacement.join(', ') : 'None'}`);
  sections.push(`  Pawns: ${state.white.pieceplacementScore.pawnplacement.length > 0 ? state.white.pieceplacementScore.pawnplacement.join(', ') : 'None'}`);
  
  sections.push('\nBLACK PIECE LOCATIONS:');
  sections.push(`  King: ${state.black.pieceplacementScore.kingplacement[0] || 'MISSING'}`);
  sections.push(`  Queens: ${state.black.pieceplacementScore.queenplacement.length > 0 ? state.black.pieceplacementScore.queenplacement.join(', ') : 'None'}`);
  sections.push(`  Rooks: ${state.black.pieceplacementScore.rookplacement.length > 0 ? state.black.pieceplacementScore.rookplacement.join(', ') : 'None'}`);
  sections.push(`  Bishops: ${state.black.pieceplacementScore.bishopplacement.length > 0 ? state.black.pieceplacementScore.bishopplacement.join(', ') : 'None'}`);
  sections.push(`  Knights: ${state.black.pieceplacementScore.knightplacement.length > 0 ? state.black.pieceplacementScore.knightplacement.join(', ') : 'None'}`);
  sections.push(`  Pawns: ${state.black.pieceplacementScore.pawnplacement.length > 0 ? state.black.pieceplacementScore.pawnplacement.join(', ') : 'None'}`);
  sections.push('</piece_positions>');

  // King Safety Analysis
  sections.push('\n<king_safety_analysis>');
  sections.push('WHITE KING SAFETY:');
  sections.push(`  King Position: ${state.white.kingSafetyScore.kingsquare}`);
  sections.push(`  Enemy Attackers on King: ${state.white.kingSafetyScore.attackerscount} pieces attacking the king`);
  sections.push(`  Friendly Defenders of King: ${state.white.kingSafetyScore.defenderscount} pieces defending the king`);
  sections.push(`  Pawn Shield Strength: ${state.white.kingSafetyScore.pawnshield} (higher is better protection)`);
  sections.push(`  King Safety Score: ${state.white.kingSafetyScore.kingsafetyscore} (lower is safer)`);
  sections.push(`  Castling Status: ${state.white.kingSafetyScore.hascastled ? 'King HAS castled (safer)' : 'King has NOT castled'}`);
  sections.push(`  Castling Rights: ${state.white.kingSafetyScore.cancastle ? 'Can still castle' : 'Cannot castle anymore'}`);
  
  const whiteSafetyLevel = state.white.kingSafetyScore.kingsafetyscore <= 0 ? "VERY SAFE" : 
                          state.white.kingSafetyScore.kingsafetyscore <= 5 ? "SAFE" :
                          state.white.kingSafetyScore.kingsafetyscore <= 15 ? "SOMEWHAT UNSAFE" : "VERY DANGEROUS";
  sections.push(`  Overall King Safety: ${whiteSafetyLevel}`);
  
  sections.push('\nBLACK KING SAFETY:');
  sections.push(`  King Position: ${state.black.kingSafetyScore.kingsquare}`);
  sections.push(`  Enemy Attackers on King: ${state.black.kingSafetyScore.attackerscount} pieces attacking the king`);
  sections.push(`  Friendly Defenders of King: ${state.black.kingSafetyScore.defenderscount} pieces defending the king`);
  sections.push(`  Pawn Shield Strength: ${state.black.kingSafetyScore.pawnshield} (higher is better protection)`);
  sections.push(`  King Safety Score: ${state.black.kingSafetyScore.kingsafetyscore} (lower is safer)`);
  sections.push(`  Castling Status: ${state.black.kingSafetyScore.hascastled ? 'King HAS castled (safer)' : 'King has NOT castled'}`);
  sections.push(`  Castling Rights: ${state.black.kingSafetyScore.cancastle ? 'Can still castle' : 'Cannot castle anymore'}`);
  
  const blackSafetyLevel = state.black.kingSafetyScore.kingsafetyscore <= 0 ? "VERY SAFE" : 
                          state.black.kingSafetyScore.kingsafetyscore <= 5 ? "SAFE" :
                          state.black.kingSafetyScore.kingsafetyscore <= 15 ? "SOMEWHAT UNSAFE" : "VERY DANGEROUS";
  sections.push(`  Overall King Safety: ${blackSafetyLevel}`);
  sections.push('</king_safety_analysis>');

  // Castling Rights Detailed
  sections.push('\n<castling_rights>');
  sections.push('WHITE CASTLING:');
  sections.push(`  Kingside (O-O): ${state.white.castlingScore.kingside ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  sections.push(`  Queenside (O-O-O): ${state.white.castlingScore.queenside ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  
  sections.push('\nBLACK CASTLING:');
  sections.push(`  Kingside (O-O): ${state.black.castlingScore.kingside ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  sections.push(`  Queenside (O-O-O): ${state.black.castlingScore.queenside ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  sections.push('</castling_rights>');
 
  // Piece Activity and Mobility
  sections.push('\n<piece_mobility>');
  sections.push('WHITE PIECE MOBILITY (number of squares each piece type can move to):');
  sections.push(`  Queen Mobility: ${state.white.pieceMobilityScore.queenmobility} squares`);
  sections.push(`  Rook Mobility: ${state.white.pieceMobilityScore.rookmobility} squares`);
  sections.push(`  Bishop Mobility: ${state.white.pieceMobilityScore.bishopmobility} squares`);
  sections.push(`  Knight Mobility: ${state.white.pieceMobilityScore.knightmobility} squares`);
  sections.push(`  Total Mobility Score: ${state.white.pieceMobilityScore.totalmobility} squares (higher = more active pieces)`);
  
  sections.push('\nBLACK PIECE MOBILITY (number of squares each piece type can move to):');
  sections.push(`  Queen Mobility: ${state.black.pieceMobilityScore.queenmobility} squares`);
  sections.push(`  Rook Mobility: ${state.black.pieceMobilityScore.rookmobility} squares`);
  sections.push(`  Bishop Mobility: ${state.black.pieceMobilityScore.bishopmobility} squares`);
  sections.push(`  Knight Mobility: ${state.black.pieceMobilityScore.knightmobility} squares`);
  sections.push(`  Total Mobility Score: ${state.black.pieceMobilityScore.totalmobility} squares (higher = more active pieces)`);
  
  const mobilityDiff = state.white.pieceMobilityScore.totalmobility - state.black.pieceMobilityScore.totalmobility;
  if (mobilityDiff > 0) {
    sections.push(`\nMOBILITY ADVANTAGE: White has ${mobilityDiff} more squares of mobility (more active pieces)`);
  } else if (mobilityDiff < 0) {
    sections.push(`\nMOBILITY ADVANTAGE: Black has ${Math.abs(mobilityDiff)} more squares of mobility (more active pieces)`);
  } else {
    sections.push(`\nMOBILITY: Both sides have equal piece mobility (${state.white.pieceMobilityScore.totalmobility} squares each)`);
  }
  sections.push('</piece_mobility>');

  // Space Control Analysis
  sections.push('\n<space_control>');
  sections.push('WHITE SPACE CONTROL:');
  sections.push(`  Center Control Score: ${state.white.spaceScore.centerspacecontrolscore} (attacks on central squares d4,d5,e4,e5,c4,c5,f4,f5)`);
  sections.push(`  Flank Control Score: ${state.white.spaceScore.flankspacecontrolscore} (attacks on flank squares a4,a5,b4,b5,g4,g5,h4,h5)`);
  sections.push(`  Total Space Control: ${state.white.spaceScore.totalspacecontrolscore}`);
  
  sections.push('\nBLACK SPACE CONTROL:');
  sections.push(`  Center Control Score: ${state.black.spaceScore.centerspacecontrolscore} (attacks on central squares d4,d5,e4,e5,c4,c5,f4,f5)`);
  sections.push(`  Flank Control Score: ${state.black.spaceScore.flankspacecontrolscore} (attacks on flank squares a4,a5,b4,b5,g4,g5,h4,h5)`);
  sections.push(`  Total Space Control: ${state.black.spaceScore.totalspacecontrolscore}`);
  
  const centerControlDiff = state.white.spaceScore.centerspacecontrolscore - state.black.spaceScore.centerspacecontrolscore;
  const totalSpaceDiff = state.white.spaceScore.totalspacecontrolscore - state.black.spaceScore.totalspacecontrolscore;
  
  if (centerControlDiff > 0) {
    sections.push(`\nCENTER CONTROL: White controls the center better (+${centerControlDiff} advantage)`);
  } else if (centerControlDiff < 0) {
    sections.push(`\nCENTER CONTROL: Black controls the center better (+${Math.abs(centerControlDiff)} advantage)`);
  } else {
    sections.push(`\nCENTER CONTROL: Both sides have equal center control`);
  }
  
  if (totalSpaceDiff > 0) {
    sections.push(`OVERALL SPACE: White has more space (+${totalSpaceDiff} total advantage)`);
  } else if (totalSpaceDiff < 0) {
    sections.push(`OVERALL SPACE: Black has more space (+${Math.abs(totalSpaceDiff)} total advantage)`);
  } else {
    sections.push(`OVERALL SPACE: Both sides control equal space`);
  }
  sections.push('</space_control>');

  // Square Color Control
  sections.push('\n<square_color_control>');
  sections.push('WHITE SQUARE COLOR INFLUENCE:');
  sections.push(`  Light Squares Controlled: ${state.white.squareControlScore.lightSquareControl} pieces on light squares`);
  sections.push(`  Dark Squares Controlled: ${state.white.squareControlScore.darkSqaureControl} pieces on dark squares`);
  sections.push(`  Light Square Pieces: ${state.white.squareControlScore.lightSquares.join(', ') || 'None'}`);
  sections.push(`  Dark Square Pieces: ${state.white.squareControlScore.darkSquares.join(', ') || 'None'}`);
  
  sections.push('\nBLACK SQUARE COLOR INFLUENCE:');
  sections.push(`  Light Squares Controlled: ${state.black.squareControlScore.lightSquareControl} pieces on light squares`);
  sections.push(`  Dark Squares Controlled: ${state.black.squareControlScore.darkSqaureControl} pieces on dark squares`);
  sections.push(`  Light Square Pieces: ${state.black.squareControlScore.lightSquares.join(', ') || 'None'}`);
  sections.push(`  Dark Square Pieces: ${state.black.squareControlScore.darkSquares.join(', ') || 'None'}`);
  sections.push('</square_color_control>');

  // Pawn Structure Analysis
  sections.push('\n<pawn_structure_analysis>');
  sections.push('WHITE PAWN STRUCTURE:');
  sections.push(`  Doubled Pawns: ${state.white.positionalScore.doublepawncount} (weakness - pawns on same file)`);
  sections.push(`  Isolated Pawns: ${state.white.positionalScore.isolatedpawncount} (weakness - no friendly pawns on adjacent files)`);
  sections.push(`  Backward Pawns: ${state.white.positionalScore.backwardpawncount} (weakness - pawns that cannot advance safely)`);
  sections.push(`  Pawn Weakness Score: ${state.white.positionalScore.weaknessscore}% (percentage of pawns with structural weaknesses)`);
  
  sections.push('\nBLACK PAWN STRUCTURE:');
  sections.push(`  Doubled Pawns: ${state.black.positionalScore.doublepawncount} (weakness - pawns on same file)`);
  sections.push(`  Isolated Pawns: ${state.black.positionalScore.isolatedpawncount} (weakness - no friendly pawns on adjacent files)`);
  sections.push(`  Backward Pawns: ${state.black.positionalScore.backwardpawncount} (weakness - pawns that cannot advance safely)`);
  sections.push(`  Pawn Weakness Score: ${state.black.positionalScore.weaknessscore}% (percentage of pawns with structural weaknesses)`);
  
  const whitePawnWeaknesses = state.white.positionalScore.doublepawncount + state.white.positionalScore.isolatedpawncount + state.white.positionalScore.backwardpawncount;
  const blackPawnWeaknesses = state.black.positionalScore.doublepawncount + state.black.positionalScore.isolatedpawncount + state.black.positionalScore.backwardpawncount;
  
  if (whitePawnWeaknesses > blackPawnWeaknesses) {
    sections.push(`\nPAWN STRUCTURE EVALUATION: Black has better pawn structure (White has ${whitePawnWeaknesses - blackPawnWeaknesses} more pawn weaknesses)`);
  } else if (blackPawnWeaknesses > whitePawnWeaknesses) {
    sections.push(`\nPAWN STRUCTURE EVALUATION: White has better pawn structure (Black has ${blackPawnWeaknesses - whitePawnWeaknesses} more pawn weaknesses)`);
  } else {
    sections.push(`\nPAWN STRUCTURE EVALUATION: Both sides have similar pawn structure quality`);
  }
  sections.push('</pawn_structure_analysis>');

  // Attack/Defense Information
  sections.push('\n<attack_defense_details>');
  sections.push('WHITE PIECE ATTACK/DEFENSE STATUS:');
  sections.push(`  Pawns: ${state.whitepieceattackerdefenderinfo.pawnInfo.attackerscount} attackers, ${state.whitepieceattackerdefenderinfo.pawnInfo.defenderscount} defenders`);
  sections.push(`  Knights: ${state.whitepieceattackerdefenderinfo.knightInfo.attackerscount} attackers, ${state.whitepieceattackerdefenderinfo.knightInfo.defenderscount} defenders`);
  sections.push(`  Bishops: ${state.whitepieceattackerdefenderinfo.bishopInfo.attackerscount} attackers, ${state.whitepieceattackerdefenderinfo.bishopInfo.defenderscount} defenders`);
  sections.push(`  Rooks: ${state.whitepieceattackerdefenderinfo.rookInfo.attackerscount} attackers, ${state.whitepieceattackerdefenderinfo.rookInfo.defenderscount} defenders`);
  sections.push(`  Queens: ${state.whitepieceattackerdefenderinfo.queenInfo.attackerscount} attackers, ${state.whitepieceattackerdefenderinfo.queenInfo.defenderscount} defenders`);
  
  sections.push('\nBLACK PIECE ATTACK/DEFENSE STATUS:');
  sections.push(`  Pawns: ${state.blackpieceattackerdefenderinfo.pawnInfo.attackerscount} attackers, ${state.blackpieceattackerdefenderinfo.pawnInfo.defenderscount} defenders`);
  sections.push(`  Knights: ${state.blackpieceattackerdefenderinfo.knightInfo.attackerscount} attackers, ${state.blackpieceattackerdefenderinfo.knightInfo.defenderscount} defenders`);
  sections.push(`  Bishops: ${state.blackpieceattackerdefenderinfo.bishopInfo.attackerscount} attackers, ${state.blackpieceattackerdefenderinfo.bishopInfo.defenderscount} defenders`);
  sections.push(`  Rooks: ${state.blackpieceattackerdefenderinfo.rookInfo.attackerscount} attackers, ${state.blackpieceattackerdefenderinfo.rookInfo.defenderscount} defenders`);
  sections.push(`  Queens: ${state.blackpieceattackerdefenderinfo.queenInfo.attackerscount} attackers, ${state.blackpieceattackerdefenderinfo.queenInfo.defenderscount} defenders`);
  sections.push('</attack_defense_details>');

  sections.push('</detailed_board_analysis>');

  return sections.join('\n');
}

