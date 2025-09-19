import { BoardState } from "./state";

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
  const materialDiff = state.whitematerial.materialvalue - state.blackmaterial.materialvalue;
  
  sections.push('WHITE PIECES:');
  sections.push(`  Total Material Value: ${state.whitematerial.materialvalue} centipawns`);
  sections.push(`  Queens: ${state.whitematerial.piececount.queens} (${state.whitematerial.piececount.queens * 900} points)`);
  sections.push(`  Rooks: ${state.whitematerial.piececount.rooks} (${state.whitematerial.piececount.rooks * 500} points)`);
  sections.push(`  Bishops: ${state.whitematerial.piececount.bishops} (${state.whitematerial.piececount.bishops * 300} points)`);
  sections.push(`  Knights: ${state.whitematerial.piececount.knights} (${state.whitematerial.piececount.knights * 300} points)`);
  sections.push(`  Pawns: ${state.whitematerial.piececount.pawns} (${state.whitematerial.piececount.pawns * 100} points)`);
  sections.push(`  Bishop Pair Bonus: ${state.whitematerial.bishoppair ? 'YES (+50 points strategic value)' : 'NO'}`);
  
  sections.push('\nBLACK PIECES:');
  sections.push(`  Total Material Value: ${state.blackmaterial.materialvalue} centipawns`);
  sections.push(`  Queens: ${state.blackmaterial.piececount.queens} (${state.blackmaterial.piececount.queens * 900} points)`);
  sections.push(`  Rooks: ${state.blackmaterial.piececount.rooks} (${state.blackmaterial.piececount.rooks * 500} points)`);
  sections.push(`  Bishops: ${state.blackmaterial.piececount.bishops} (${state.blackmaterial.piececount.bishops * 300} points)`);
  sections.push(`  Knights: ${state.blackmaterial.piececount.knights} (${state.blackmaterial.piececount.knights * 300} points)`);
  sections.push(`  Pawns: ${state.blackmaterial.piececount.pawns} (${state.blackmaterial.piececount.pawns * 100} points)`);
  sections.push(`  Bishop Pair Bonus: ${state.blackmaterial.bishoppair ? 'YES (+50 points strategic value)' : 'NO'}`);
  
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
    sections.push(`  Material is EQUAL - both sides have ${state.whitematerial.materialvalue} centipawns`);
  }
  sections.push('</material_analysis>');

  // Detailed Piece Positions
  sections.push('\n<piece_positions>');
  sections.push('WHITE PIECE LOCATIONS:');
  sections.push(`  King: ${state.whitepieceplacement.kingplacement[0] || 'MISSING'}`);
  sections.push(`  Queens: ${state.whitepieceplacement.queenplacement.length > 0 ? state.whitepieceplacement.queenplacement.join(', ') : 'None'}`);
  sections.push(`  Rooks: ${state.whitepieceplacement.rookplacement.length > 0 ? state.whitepieceplacement.rookplacement.join(', ') : 'None'}`);
  sections.push(`  Bishops: ${state.whitepieceplacement.bishopplacement.length > 0 ? state.whitepieceplacement.bishopplacement.join(', ') : 'None'}`);
  sections.push(`  Knights: ${state.whitepieceplacement.knightplacement.length > 0 ? state.whitepieceplacement.knightplacement.join(', ') : 'None'}`);
  sections.push(`  Pawns: ${state.whitepieceplacement.pawnplacement.length > 0 ? state.whitepieceplacement.pawnplacement.join(', ') : 'None'}`);
  
  sections.push('\nBLACK PIECE LOCATIONS:');
  sections.push(`  King: ${state.blackpieceplacement.kingplacement[0] || 'MISSING'}`);
  sections.push(`  Queens: ${state.blackpieceplacement.queenplacement.length > 0 ? state.blackpieceplacement.queenplacement.join(', ') : 'None'}`);
  sections.push(`  Rooks: ${state.blackpieceplacement.rookplacement.length > 0 ? state.blackpieceplacement.rookplacement.join(', ') : 'None'}`);
  sections.push(`  Bishops: ${state.blackpieceplacement.bishopplacement.length > 0 ? state.blackpieceplacement.bishopplacement.join(', ') : 'None'}`);
  sections.push(`  Knights: ${state.blackpieceplacement.knightplacement.length > 0 ? state.blackpieceplacement.knightplacement.join(', ') : 'None'}`);
  sections.push(`  Pawns: ${state.blackpieceplacement.pawnplacement.length > 0 ? state.blackpieceplacement.pawnplacement.join(', ') : 'None'}`);
  sections.push('</piece_positions>');

  // King Safety Analysis
  sections.push('\n<king_safety_analysis>');
  sections.push('WHITE KING SAFETY:');
  sections.push(`  King Position: ${state.whitekingsafety.kingsquare}`);
  sections.push(`  Enemy Attackers on King: ${state.whitekingsafety.attackerscount} pieces attacking the king`);
  sections.push(`  Friendly Defenders of King: ${state.whitekingsafety.defenderscount} pieces defending the king`);
  sections.push(`  Pawn Shield Strength: ${state.whitekingsafety.pawnshield} (higher is better protection)`);
  sections.push(`  King Safety Score: ${state.whitekingsafety.kingsafetyscore} (lower is safer)`);
  sections.push(`  Castling Status: ${state.whitekingsafety.hascastled ? 'King HAS castled (safer)' : 'King has NOT castled'}`);
  sections.push(`  Castling Rights: ${state.whitekingsafety.cancastle ? 'Can still castle' : 'Cannot castle anymore'}`);
  
  const whiteSafetyLevel = state.whitekingsafety.kingsafetyscore <= 0 ? "VERY SAFE" : 
                          state.whitekingsafety.kingsafetyscore <= 5 ? "SAFE" :
                          state.whitekingsafety.kingsafetyscore <= 15 ? "SOMEWHAT UNSAFE" : "VERY DANGEROUS";
  sections.push(`  Overall King Safety: ${whiteSafetyLevel}`);
  
  sections.push('\nBLACK KING SAFETY:');
  sections.push(`  King Position: ${state.blackkingsafety.kingsquare}`);
  sections.push(`  Enemy Attackers on King: ${state.blackkingsafety.attackerscount} pieces attacking the king`);
  sections.push(`  Friendly Defenders of King: ${state.blackkingsafety.defenderscount} pieces defending the king`);
  sections.push(`  Pawn Shield Strength: ${state.blackkingsafety.pawnshield} (higher is better protection)`);
  sections.push(`  King Safety Score: ${state.blackkingsafety.kingsafetyscore} (lower is safer)`);
  sections.push(`  Castling Status: ${state.blackkingsafety.hascastled ? 'King HAS castled (safer)' : 'King has NOT castled'}`);
  sections.push(`  Castling Rights: ${state.blackkingsafety.cancastle ? 'Can still castle' : 'Cannot castle anymore'}`);
  
  const blackSafetyLevel = state.blackkingsafety.kingsafetyscore <= 0 ? "VERY SAFE" : 
                          state.blackkingsafety.kingsafetyscore <= 5 ? "SAFE" :
                          state.blackkingsafety.kingsafetyscore <= 15 ? "SOMEWHAT UNSAFE" : "VERY DANGEROUS";
  sections.push(`  Overall King Safety: ${blackSafetyLevel}`);
  sections.push('</king_safety_analysis>');

  // Castling Rights Detailed
  sections.push('\n<castling_rights>');
  sections.push('WHITE CASTLING:');
  sections.push(`  Kingside (O-O): ${state.whitecastlerights.kingside ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  sections.push(`  Queenside (O-O-O): ${state.whitecastlerights.queenside ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  
  sections.push('\nBLACK CASTLING:');
  sections.push(`  Kingside (O-O): ${state.blackcastlerights.kingside ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  sections.push(`  Queenside (O-O-O): ${state.blackcastlerights.queenside ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  sections.push('</castling_rights>');

  // Tactical Information
  sections.push('\n<tactical_information>');
  sections.push('WHITE TACTICAL STATUS:');
  sections.push(`  Pieces Under Attack: ${state.whitetactical.attackedpieces.length > 0 ? state.whitetactical.attackedpieces.join(', ') : 'None'}`);
  sections.push(`  Defended Pieces: ${state.whitetactical.defendedpieces.length > 0 ? state.whitetactical.defendedpieces.join(', ') : 'None'}`);
  sections.push(`  Hanging Pieces (undefended): ${state.whitetactical.hangingpieces.length > 0 ? state.whitetactical.hangingpieces.join(', ') : 'None'}`);
  sections.push(`  Currently in Check: ${state.whitetactical.checks.length > 0 ? 'YES - Checking pieces: ' + state.whitetactical.checks.join(', ') : 'NO'}`);
  sections.push(`  Double Check: ${state.whitetactical.doublechecks ? 'YES (very dangerous!)' : 'NO'}`);
  
  sections.push('\nBLACK TACTICAL STATUS:');
  sections.push(`  Pieces Under Attack: ${state.blacktactical.attackedpieces.length > 0 ? state.blacktactical.attackedpieces.join(', ') : 'None'}`);
  sections.push(`  Defended Pieces: ${state.blacktactical.defendedpieces.length > 0 ? state.blacktactical.defendedpieces.join(', ') : 'None'}`);
  sections.push(`  Hanging Pieces (undefended): ${state.blacktactical.hangingpieces.length > 0 ? state.blacktactical.hangingpieces.join(', ') : 'None'}`);
  sections.push(`  Currently in Check: ${state.blacktactical.checks.length > 0 ? 'YES - Checking pieces: ' + state.blacktactical.checks.join(', ') : 'NO'}`);
  sections.push(`  Double Check: ${state.blacktactical.doublechecks ? 'YES (very dangerous!)' : 'NO'}`);
  sections.push('</tactical_information>');

  // Piece Activity and Mobility
  sections.push('\n<piece_mobility>');
  sections.push('WHITE PIECE MOBILITY (number of squares each piece type can move to):');
  sections.push(`  Queen Mobility: ${state.whitemobility.queenmobility} squares`);
  sections.push(`  Rook Mobility: ${state.whitemobility.rookmobility} squares`);
  sections.push(`  Bishop Mobility: ${state.whitemobility.bishopmobility} squares`);
  sections.push(`  Knight Mobility: ${state.whitemobility.knightmobility} squares`);
  sections.push(`  Total Mobility Score: ${state.whitemobility.totalmobility} squares (higher = more active pieces)`);
  
  sections.push('\nBLACK PIECE MOBILITY (number of squares each piece type can move to):');
  sections.push(`  Queen Mobility: ${state.blackmobility.queenmobility} squares`);
  sections.push(`  Rook Mobility: ${state.blackmobility.rookmobility} squares`);
  sections.push(`  Bishop Mobility: ${state.blackmobility.bishopmobility} squares`);
  sections.push(`  Knight Mobility: ${state.blackmobility.knightmobility} squares`);
  sections.push(`  Total Mobility Score: ${state.blackmobility.totalmobility} squares (higher = more active pieces)`);
  
  const mobilityDiff = state.whitemobility.totalmobility - state.blackmobility.totalmobility;
  if (mobilityDiff > 0) {
    sections.push(`\nMOBILITY ADVANTAGE: White has ${mobilityDiff} more squares of mobility (more active pieces)`);
  } else if (mobilityDiff < 0) {
    sections.push(`\nMOBILITY ADVANTAGE: Black has ${Math.abs(mobilityDiff)} more squares of mobility (more active pieces)`);
  } else {
    sections.push(`\nMOBILITY: Both sides have equal piece mobility (${state.whitemobility.totalmobility} squares each)`);
  }
  sections.push('</piece_mobility>');

  // Space Control Analysis
  sections.push('\n<space_control>');
  sections.push('WHITE SPACE CONTROL:');
  sections.push(`  Center Control Score: ${state.whitespacescore.centerspacecontrolscore} (attacks on central squares d4,d5,e4,e5,c4,c5,f4,f5)`);
  sections.push(`  Flank Control Score: ${state.whitespacescore.flankspacecontrolscore} (attacks on flank squares a4,a5,b4,b5,g4,g5,h4,h5)`);
  sections.push(`  Total Space Control: ${state.whitespacescore.totalspacecontrolscore}`);
  
  sections.push('\nBLACK SPACE CONTROL:');
  sections.push(`  Center Control Score: ${state.blackspacescore.centerspacecontrolscore} (attacks on central squares d4,d5,e4,e5,c4,c5,f4,f5)`);
  sections.push(`  Flank Control Score: ${state.blackspacescore.flankspacecontrolscore} (attacks on flank squares a4,a5,b4,b5,g4,g5,h4,h5)`);
  sections.push(`  Total Space Control: ${state.blackspacescore.totalspacecontrolscore}`);
  
  const centerControlDiff = state.whitespacescore.centerspacecontrolscore - state.blackspacescore.centerspacecontrolscore;
  const totalSpaceDiff = state.whitespacescore.totalspacecontrolscore - state.blackspacescore.totalspacecontrolscore;
  
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
  sections.push(`  Light Squares Controlled: ${state.whitesquarecontrol.lightSquareControl} pieces on light squares`);
  sections.push(`  Dark Squares Controlled: ${state.whitesquarecontrol.darkSqaureControl} pieces on dark squares`);
  sections.push(`  Light Square Pieces: ${state.whitesquarecontrol.lightSquares.join(', ') || 'None'}`);
  sections.push(`  Dark Square Pieces: ${state.whitesquarecontrol.darkSquares.join(', ') || 'None'}`);
  
  sections.push('\nBLACK SQUARE COLOR INFLUENCE:');
  sections.push(`  Light Squares Controlled: ${state.blacksquarecontrol.lightSquareControl} pieces on light squares`);
  sections.push(`  Dark Squares Controlled: ${state.blacksquarecontrol.darkSqaureControl} pieces on dark squares`);
  sections.push(`  Light Square Pieces: ${state.blacksquarecontrol.lightSquares.join(', ') || 'None'}`);
  sections.push(`  Dark Square Pieces: ${state.blacksquarecontrol.darkSquares.join(', ') || 'None'}`);
  sections.push('</square_color_control>');

  // Pawn Structure Analysis (excluding passed pawns, pins, skewers)
  sections.push('\n<pawn_structure_analysis>');
  sections.push('WHITE PAWN STRUCTURE:');
  sections.push(`  Doubled Pawns: ${state.whitepositionalscore.doublepawncount} (weakness - pawns on same file)`);
  sections.push(`  Isolated Pawns: ${state.whitepositionalscore.isolatedpawncount} (weakness - no friendly pawns on adjacent files)`);
  sections.push(`  Backward Pawns: ${state.whitepositionalscore.backwardpawncount} (weakness - pawns that cannot advance safely)`);
  sections.push(`  Pawn Weakness Score: ${state.whitepositionalscore.weaknessscore}% (percentage of pawns with structural weaknesses)`);
  
  sections.push('\nBLACK PAWN STRUCTURE:');
  sections.push(`  Doubled Pawns: ${state.blackpositionalscore.doublepawncount} (weakness - pawns on same file)`);
  sections.push(`  Isolated Pawns: ${state.blackpositionalscore.isolatedpawncount} (weakness - no friendly pawns on adjacent files)`);
  sections.push(`  Backward Pawns: ${state.blackpositionalscore.backwardpawncount} (weakness - pawns that cannot advance safely)`);
  sections.push(`  Pawn Weakness Score: ${state.blackpositionalscore.weaknessscore}% (percentage of pawns with structural weaknesses)`);
  
  const whitePawnWeaknesses = state.whitepositionalscore.doublepawncount + state.whitepositionalscore.isolatedpawncount + state.whitepositionalscore.backwardpawncount;
  const blackPawnWeaknesses = state.blackpositionalscore.doublepawncount + state.blackpositionalscore.isolatedpawncount + state.blackpositionalscore.backwardpawncount;
  
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

