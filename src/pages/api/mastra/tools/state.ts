"use server";
import { BISHOP, BLACK, Chess, Color, KING, KNIGHT, PAWN, Piece, PieceSymbol, QUEEN, ROOK, Square, validateFen, WHITE } from "chess.js";
import { z } from "zod";

interface CastleRights {
  queenside: boolean;
  kingside: boolean;
}


interface PositionalPawn {
  doublepawncount: number;
  isolatedpawncount: number;
  backwardpawncount: number;
  passedpawncount: number;
  weaknessscore: number;
}

interface SpaceControl {
  centerspacecontrolscore: number;
  flankspacecontrolscore: number;
  totalspacecontrolscore: number;
}

interface SidePiecePlacement {
  kingplacement: string[];
  queenplacement: string[];
  bishopplacement: string[];
  knightplacement: string[];
  rookplacement: string[];
  pawnplacement: string[];
}

interface TacticalInfo {
  attackedpieces: string[];
  defendedpieces: string[];
  hangingpieces: string[];
  pinned: string[];
  skewered: string[];
  checks: string[];
  doublechecks: boolean;
}

interface PieceAttackDefendInfo{
  attackerscount: number;
  defenderscount: number;
  attackers: string[];
  defenders: string[];
}

interface KingSafety {
  kingsquare: string;
  attackerscount: number;
  defenderscount: number;
  pawnshield: number;
  kingsafetyscore: number;
  cancastle: boolean;
  hascastled: boolean;
}

interface SideAttackerDefenders {
  pawnInfo: PieceAttackDefendInfo,
  knightInfo: PieceAttackDefendInfo,
  bishopInfo: PieceAttackDefendInfo,
  rookInfo: PieceAttackDefendInfo,
  queenInfo: PieceAttackDefendInfo,
  kingInfo: undefined
}

interface PieceMobility {
  queenmobility: number;
  rookmobility: number;
  bishopmobility: number;
  knightmobility: number;
  totalmobility: number;
}

interface SideSquareControl{
  lightSquares: string[],
  darkSquares: string[],
  lightSquareControl: number,
  darkSqaureControl: number
}

interface MaterialInfo {
  materialcount: number;
  materialvalue: number;
  piececount: {
    pawns: number;
    knights: number;
    bishops: number;
    rooks: number;
    queens: number;
  };
  bishoppair: boolean;
}

export interface BoardState {
  fen: string;
  validfen: boolean;
  whitecastlerights: CastleRights;
  blackcastlerights: CastleRights;
  legalMoves: string[];
  whitematerial: MaterialInfo;
  blackmaterial: MaterialInfo;
  whitespacescore: SpaceControl;
  blackspacescore: SpaceControl;
  whitepieceplacement: SidePiecePlacement;
  blackpieceplacement: SidePiecePlacement;
  whitepieceattackerdefenderinfo: SideAttackerDefenders;
  blackpieceattackerdefenderinfo: SideAttackerDefenders;
  whitepositionalscore: PositionalPawn;
  whitesquarecontrol: SideSquareControl,
  blacksquarecontrol: SideSquareControl,
  blackpositionalscore: PositionalPawn;
  whitetactical: TacticalInfo;
  blacktactical: TacticalInfo;
  whitekingsafety: KingSafety;
  blackkingsafety: KingSafety;
  whitemobility: PieceMobility;
  blackmobility: PieceMobility;
  isCheckmate: boolean;
  isStalemate: boolean;
  isGameOver: boolean;
  moveNumber: number;
  sidetomove: string;
  gamePhase: 'opening' | 'middlegame' | 'endgame';
}

const BOARD_CENTRE: Square[] = ["c4","c5","d4","d5","e4","e5","f4","f5"];
const BOARD_FLANK: Square[] = ["a4", "a5", "b4", "b5", "h4", "h5", "g4", "g5"];

const PIECE_VALUES = {
  [PAWN]: 100,
  [KNIGHT]: 300,
  [BISHOP]: 300,
  [ROOK]: 500,
  [QUEEN]: 900,
  [KING]: 0
};

function getGamePhase(chess: Chess): 'opening' | 'middlegame' | 'endgame' {
  const fen = chess.fen();
  const moveNumber = parseInt(fen.split(' ')[5]) || 1; // Full move number
  const totalMaterial = getTotalMaterialValue(chess);
  
  // Count major pieces (queens and rooks) and minor pieces (bishops and knights)
  let queens = 0;
  let rooks = 0;
  let minorPieces = 0; // bishops + knights
  let totalPieces = 0;
  
  const board = chess.board();
  for (const row of board) {
    for (const square of row) {
      if (square) {
        switch (square.type) {
          case 'q': queens++; break;
          case 'r': rooks++; break;
          case 'b':
          case 'n': minorPieces++; break;
          case 'p':
          case 'k': break; // Count separately or not at all
        }
        if (square.type !== 'k') totalPieces++; // Don't count kings
      }
    }
  }
  
  // Check if pieces have been developed (not in starting positions)
  const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const isStartingPosition = chess.fen().split(' ')[0] === startingFen.split(' ')[0];
  
  // ENDGAME CRITERIA (most restrictive first)
  // Classic endgame: Very low material or specific piece combinations
  if (totalMaterial <= 10 || // Very few pieces left
      (queens === 0 && rooks <= 2 && minorPieces <= 2) || // No queens, minimal pieces
      (queens <= 1 && rooks === 0 && minorPieces <= 1) || // Queen vs minimal pieces
      (totalPieces <= 6)) { // Very few total pieces
    return 'endgame';
  }
  
  // OPENING CRITERIA
  // Early in the game with most pieces still on board
  if (moveNumber <= 12 || // Very early moves
      isStartingPosition ||
      (totalMaterial >= 30 && moveNumber <= 20) || // High material, early moves
      (queens === 2 && rooks === 4 && minorPieces >= 6)) { // Most pieces undeveloped
    return 'opening';
  }
  
  // ENDGAME CRITERIA (broader check after opening is ruled out)
  if (totalMaterial <= 20 || // Low material threshold
      queens === 0 || // No queens typically indicates endgame
      (queens === 1 && totalMaterial <= 25) || // Single queen with low material
      totalPieces <= 10) { // Limited pieces remaining
    return 'endgame';
  }
  
  // Everything else is middlegame
  return 'middlegame';
}

function getTotalMaterialValue(chess: Chess): number {
  let total = 0;
  const board = chess.board();
  
  for (const row of board) {
    for (const piece of row) {
      if (piece) {
        total += PIECE_VALUES[piece.type] || 0;
      }
    }
  }
  return total;
}

function getSpaceControl(chess: Chess, side: Color): number {
   let spaceMeasure = 0;
   for(const sq of BOARD_CENTRE){
     spaceMeasure += chess.attackers(sq, side).length;
   }
   return spaceMeasure;
}

function getFlankSpaceControl(chess: Chess, side: Color): number {
  let flankMeasure = 0;
  for(const sq of BOARD_FLANK){
    flankMeasure += chess.attackers(sq, side).length;
  }
  return flankMeasure;
}

function getPiecePlacement(chess: Chess, side: Color): SidePiecePlacement {
  return {
    kingplacement: chess.findPiece({type: KING, color: side}),
    queenplacement: chess.findPiece({type: QUEEN, color: side}),
    bishopplacement: chess.findPiece({type: BISHOP, color: side}),
    knightplacement: chess.findPiece({type: KNIGHT, color: side}),
    rookplacement: chess.findPiece({type: ROOK, color: side}),
    pawnplacement: chess.findPiece({type: PAWN, color: side}),
  }
}

function getSideSquareControl(chess: Chess, side: Color): SideSquareControl {
   const placement = getPiecePlacement(chess, side);
   const lightSquares: string[] = [];
   const darkSquares: string[] =  [];

   const allSquares = [...placement.knightplacement, ...placement.bishopplacement, ...placement.pawnplacement, ...placement.queenplacement, ...placement.rookplacement, ...placement.kingplacement];

   for(const square of allSquares){
     if(chess.squareColor(square as Square) === "light"){
       lightSquares.push(square);
     }else {
      darkSquares.push(square);
     }

   }

   return {
    lightSquareControl: lightSquares.length,
    darkSqaureControl: darkSquares.length,
    lightSquares: lightSquares,
    darkSquares: darkSquares
   }


 }

function getSidePieces(chess: Chess, side: Color): string[] {
  const pieces = getPiecePlacement(chess, side);

  return [
    ...pieces.kingplacement,
    ...pieces.queenplacement,
    ...pieces.bishopplacement,
    ...pieces.knightplacement,
    ...pieces.rookplacement,
    ...pieces.pawnplacement,
  ];
}


function getMaterialInfo(chess: Chess, side: Color): MaterialInfo {

  const pieces = getPiecePlacement(chess, side);
  
  const counts = {
    pawns: pieces.pawnplacement.length,
    knights: pieces.knightplacement.length,
    bishops: pieces.bishopplacement.length,
    rooks: pieces.rookplacement.length,
    queens: pieces.queenplacement.length,
  };

  const materialValue = 
    counts.pawns * PIECE_VALUES[PAWN] +
    counts.knights * PIECE_VALUES[KNIGHT] +
    counts.bishops * PIECE_VALUES[BISHOP] +
    counts.rooks * PIECE_VALUES[ROOK] +
    counts.queens * PIECE_VALUES[QUEEN];

  return {
    materialcount: counts.rooks + counts.bishops + counts.pawns + counts.knights,
    materialvalue: materialValue,
    piececount: counts,
    bishoppair: counts.bishops >= 2
  };
}

function getTacticalInfo(chess: Chess, side: Color): TacticalInfo {
  const enemySide = side === WHITE ? BLACK : WHITE;
  const myPieces = getSidePieces(chess, side);
  const enemyPieces = getSidePieces(chess, enemySide);
  
  const attacked: string[] = [];
  const defended: string[] = [];
  const hanging: string[] = [];
  const pinned: string[] = [];
  const skewered: string[] = [];
  const checks: string[] = [];
  
  // Find attacked and defended pieces
  for (const square of myPieces) {
    const attackers = chess.attackers(square as Square, enemySide);
    const defenders = chess.attackers(square as Square, side);
    
    if (attackers.length > 0) {
      attacked.push(square);
      if (defenders.length === 0) {
        hanging.push(square);
      }
    }
    
    if (defenders.length > 0) {
      defended.push(square);
    }
  }

  // Find pins and skewers for king, queen, rook, bishop, knight
  const pieceTypesToCheck: PieceSymbol[] = [KING, QUEEN, ROOK, BISHOP, KNIGHT];
  for (const pieceType of pieceTypesToCheck) {
    const pieceSquares = chess.findPiece({ type: pieceType, color: side });
    for (const pieceSquare of pieceSquares) {
      const pinsAndSkewers = findPinsAndSkewers(chess, pieceSquare as Square, side);
      pinned.push(...pinsAndSkewers.pins);
      skewered.push(...pinsAndSkewers.skewers);
    }
  }

  // Find checks
  if (chess.inCheck()) {
    const currentTurn = chess.turn();
    if ((currentTurn === 'w' && side === WHITE) || (currentTurn === 'b' && side === BLACK)) {
      const kingPos = chess.findPiece({type: KING, color: side})[0];
      if (kingPos) {
        const checkingPieces = chess.attackers(kingPos as Square, enemySide);
        checks.push(...checkingPieces);
      }
    }
  }

  return {
    attackedpieces: attacked,
    defendedpieces: defended,
    hangingpieces: hanging,
    pinned,
    skewered,
    checks,
    doublechecks: checks.length > 1
  };
}

function findPinsAndSkewers(chess: Chess, kingSquare: Square, side: Color): {pins: string[], skewers: string[]} {
  const pins: string[] = [];
  const skewers: string[] = [];
  const enemySide = side === WHITE ? BLACK : WHITE;
  
  // Check all directions from king
  const directions = [
    [1, 0], [-1, 0], [0, 1], [0, -1],  // Rook directions
    [1, 1], [1, -1], [-1, 1], [-1, -1] // Bishop directions
  ];
  
  const kingFile = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
  const kingRank = parseInt(kingSquare[1]) - 1;
  
  for (const [df, dr] of directions) {
    const piecesInLine: {square: Square, piece: Piece, distance: number}[] = [];
    
    // Scan in this direction
    for (let i = 1; i < 8; i++) {
      const file = kingFile + df * i;
      const rank = kingRank + dr * i;
      
      if (file < 0 || file > 7 || rank < 0 || rank > 7) break;
      
      const square = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1) as Square;
      const piece = chess.get(square);
      
      if (piece) {
        piecesInLine.push({square, piece, distance: i});
      }
    }
    
    if (piecesInLine.length >= 2) {
      const firstPiece = piecesInLine[0];
      const secondPiece = piecesInLine[1];
      
      // Check for pins (first piece is ours, second is enemy attacking piece)
      if (firstPiece.piece.color === side && secondPiece.piece.color === enemySide) {
        const attackingPieceType = secondPiece.piece.type;
        const isValidAttacker = 
          (Math.abs(df) === Math.abs(dr) && (attackingPieceType === BISHOP || attackingPieceType === QUEEN)) ||
          (Math.abs(df) !== Math.abs(dr) && (attackingPieceType === ROOK || attackingPieceType === QUEEN));
        
        if (isValidAttacker) {
          pins.push(firstPiece.square);
        }
      }
      
      // Check for skewers (first piece valuable, second piece less valuable, both enemy or both ours)
      if (firstPiece.piece.color === secondPiece.piece.color && firstPiece.piece.color !== side) {
        
        const firstValue = PIECE_VALUES[firstPiece.piece.type] || 0;
        const secondValue = PIECE_VALUES[secondPiece.piece.type] || 0;
        
        if (firstValue > secondValue) {
          skewers.push(firstPiece.square);
        }
      }
    }
  }
  
  return {pins, skewers};
}

function getSideAttackerDefenderInfo(chess: Chess, side: Color): SideAttackerDefenders {
  const enemySide = side === WHITE ? BLACK : WHITE;
  return {
    pawnInfo: getPieceAttDefInfo(PAWN, chess, side, enemySide),
    knightInfo: getPieceAttDefInfo(KNIGHT, chess, side, enemySide),
    bishopInfo: getPieceAttDefInfo(BISHOP, chess, side, enemySide),
    rookInfo: getPieceAttDefInfo(ROOK, chess, side, enemySide),
    queenInfo: getPieceAttDefInfo(QUEEN, chess, side, enemySide),
    kingInfo: undefined
  };
  
}

function getPieceAttDefInfo(piece: PieceSymbol, chess: Chess, side: Color, enemySide: Color): PieceAttackDefendInfo {
  const pieceSquares = chess.findPiece({type: piece, color: side});

  const enemyAttackers: Square[] = [];
  const enemyDefenders: Square[] = [];

  for(let i = 0; i < pieceSquares.length; i++){
     const attackers = chess.attackers(pieceSquares[i], enemySide);
     const defenders = chess.attackers(pieceSquares[i], side);
    enemyAttackers.push(...attackers);
    enemyDefenders.push(...defenders);
  }

  return {
    attackers: enemyAttackers,
    defenders: enemyDefenders,
    attackerscount: enemyAttackers.length,
    defenderscount: enemyDefenders.length
  }


}

function getKingSafety(chess: Chess, side: Color): KingSafety {
  const enemySide = side === WHITE ? BLACK : WHITE;
  const kingSquare = chess.findPiece({type: KING, color: side})[0] as Square;
  
  if (!kingSquare) {
    return {
      kingsquare: '',
      attackerscount: 0,
      defenderscount: 0,
      pawnshield: 0,
      kingsafetyscore: 0,
      cancastle: false,
      hascastled: false
    };
  }
  
  const attackers = chess.attackers(kingSquare, enemySide);
  const defenders = chess.attackers(kingSquare, side);
  const pawnShield = calculatePawnShield(chess, kingSquare, side);
  const castlingRights = chess.getCastlingRights(side);
  const canCastle = castlingRights[KING] || castlingRights[QUEEN];
  const hascastled = hasKingCastled(chess, side);
  
  // Simple king safety score (lower is safer)
  const safetyscore = Math.max(0, attackers.length * 10 - defenders.length * 5 - pawnShield * 2);
  
  return {
    kingsquare: kingSquare,
    attackerscount: attackers.length,
    defenderscount: defenders.length,
    pawnshield: pawnShield,
    kingsafetyscore: safetyscore,
    cancastle: canCastle,
    hascastled: hascastled
  };
}

function calculatePawnShield(chess: Chess, kingSquare: Square, side: Color): number {
  const kingFile = kingSquare.charCodeAt(0) - 'a'.charCodeAt(0);
  const kingRank = parseInt(kingSquare[1]) - 1;
  const direction = side === WHITE ? 1 : -1;
  
  let pawnShield = 0;
  
  // Check squares in front of king
  for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
    const file = kingFile + fileOffset;
    if (file < 0 || file > 7) continue;
    
    for (let rankOffset = 1; rankOffset <= 2; rankOffset++) {
      const rank = kingRank + direction * rankOffset;
      if (rank < 0 || rank > 7) continue;
      
      const square = String.fromCharCode('a'.charCodeAt(0) + file) + (rank + 1) as Square;
      const piece = chess.get(square);
      
      if (piece && piece.type === PAWN && piece.color === side) {
        pawnShield += rankOffset === 1 ? 2 : 1; // Closer pawns worth more
      }
    }
  }
  
  return pawnShield;
}

function hasKingCastled(chess: Chess, side: Color): boolean {
  const kingSquare = chess.findPiece({type: KING, color: side})[0];
  if (!kingSquare) return false;
  
  const expectedSquare = side === WHITE ? 'e1' : 'e8';
  return kingSquare !== expectedSquare;
}

function getPieceMobility(fen: string, side: Color): PieceMobility {
  const chess = new Chess(fen);
  const originalTurn = chess.turn();

  // If the turn is not the side we're analyzing, temporarily set it
  if (originalTurn !== side) {
    const fenParts = fen.split(' ');
    fenParts[1] = side; // set turn to the desired side
    chess.load(fenParts.join(' '));
  }

  const pieces = getSidePieces(chess, side);
  let queenMobility = 0, rookMobility = 0, bishopMobility = 0, knightMobility = 0;

  for (const square of pieces) {
    const piece = chess.get(square as Square);
    if (!piece) continue;

    const moves = chess.moves({square: square as Square, verbose: true});
    const mobility = moves.length;

    switch (piece.type) {
      case QUEEN: queenMobility += mobility; break;
      case ROOK: rookMobility += mobility; break;
      case BISHOP: bishopMobility += mobility; break;
      case KNIGHT: knightMobility += mobility; break;
    }
  }

  return {
    queenmobility: queenMobility,
    rookmobility: rookMobility,
    bishopmobility: bishopMobility,
    knightmobility: knightMobility,
    totalmobility: queenMobility + rookMobility + bishopMobility + knightMobility
  };
}

function getSidePositionalCount(chess: Chess, side: Color): PositionalPawn {
  const pawnSquares = chess.findPiece({type: PAWN, color: side});
  const doublePawns = getDoublePawnCount(pawnSquares);
  const isolatedPawnCount = getSideIsolatedPawnCount(pawnSquares);
  const backwardpawncount = getSideBackwardPawnCount(pawnSquares);
  const passedpawncount = getPassedPawnCount(chess, side);
  const totalPawns = pawnSquares.length;
  const weaknessscore = totalPawns > 0 
    ? Math.round(((doublePawns + isolatedPawnCount + backwardpawncount) / totalPawns) * 100) 
    : 0;

  return {
    doublepawncount: doublePawns,
    isolatedpawncount: isolatedPawnCount,
    backwardpawncount: backwardpawncount,
    passedpawncount: passedpawncount,
    weaknessscore: weaknessscore,
  };
}

function getPassedPawnCount(chess: Chess, side: Color): number {
  const enemySide = side === WHITE ? BLACK : WHITE;
  const myPawns = chess.findPiece({type: PAWN, color: side});
  const enemyPawns = chess.findPiece({type: PAWN, color: enemySide});
  
  let passedCount = 0;
  
  for (const pawnSquare of myPawns) {
    const file = pawnSquare[0];
    const rank = parseInt(pawnSquare[1]);
    const direction = side === WHITE ? 1 : -1;
    
    let isBlocked = false;
    
    // Check if any enemy pawns block this pawn's path
    for (const enemyPawn of enemyPawns) {
      const enemyFile = enemyPawn[0];
      const enemyRank = parseInt(enemyPawn[1]);
      
      // Check same file and adjacent files
      if (Math.abs(enemyFile.charCodeAt(0) - file.charCodeAt(0)) <= 1) {
        if (side === WHITE && enemyRank > rank) {
          isBlocked = true;
          break;
        } else if (side === BLACK && enemyRank < rank) {
          isBlocked = true;
          break;
        }
      }
    }
    
    if (!isBlocked) {
      passedCount++;
    }
  }
  
  return passedCount;
}

function getSideIsolatedPawnCount(pawnSquares: string[]): number {
  const pawnFiles = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const filesWithPawns = new Set(pawnSquares.map(sq => sq[0]));
  let isolatedCount = 0;
  
  for (const file of filesWithPawns) {
    const fileIndex = pawnFiles.indexOf(file);
    const hasLeftNeighbor = fileIndex > 0 && filesWithPawns.has(pawnFiles[fileIndex - 1]);
    const hasRightNeighbor = fileIndex < 7 && filesWithPawns.has(pawnFiles[fileIndex + 1]);
    
    if (!hasLeftNeighbor && !hasRightNeighbor) {
      // Count how many pawns are on this isolated file
      isolatedCount += pawnSquares.filter(sq => sq[0] === file).length;
    }
  }
  
  return isolatedCount;
}

function getSideBackwardPawnCount(pawnSquares: string[]): number {
  const pawnMap = new Map<string, number[]>();

  for (const square of pawnSquares) {
    const file = square[0];
    const rank = parseInt(square[1], 10);
    if (!pawnMap.has(file)) pawnMap.set(file, []);
    pawnMap.get(file)?.push(rank);
  }

  let backwardCount = 0;

  for (const [file, ranks] of pawnMap.entries()) {
    ranks.sort((a, b) => b - a);
    const fileIndex = "abcdefgh".indexOf(file);
    const leftRanks = fileIndex > 0 ? pawnMap.get("abcdefgh"[fileIndex - 1]) || [] : [];
    const rightRanks = fileIndex < 7 ? pawnMap.get("abcdefgh"[fileIndex + 1]) || [] : [];
    const highestLeft = Math.max(...leftRanks, 0);
    const highestRight = Math.max(...rightRanks, 0);

    for (const rank of ranks) {
      if (rank < highestLeft && rank < highestRight) {
        backwardCount++;
      }
    }
  }

  return backwardCount;
}

function getDoublePawnCount(pawnSquares: string[]): number {
  const fileCounts = new Map<string, number>();
  
  for (const square of pawnSquares) {
    const file = square[0];
    fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
  }
  
  let doublePawns = 0;
  for (const count of fileCounts.values()) {
    if (count > 1) {
      doublePawns += count - 1; // Each extra pawn beyond the first is a doubled pawn
    }
  }
  
  return doublePawns;
}




// Define valid chess squares
export const SquareEnum = z.enum([
  "a8", "b8", "c8", "d8", "e8", "f8", "g8", "h8",
  "a7", "b7", "c7", "d7", "e7", "f7", "g7", "h7",
  "a6", "b6", "c6", "d6", "e6", "f6", "g6", "h6",
  "a5", "b5", "c5", "d5", "e5", "f5", "g5", "h5",
  "a4", "b4", "c4", "d4", "e4", "f4", "g4", "h4",
  "a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3",
  "a2", "b2", "c2", "d2", "e2", "f2", "g2", "h2",
  "a1", "b1", "c1", "d1", "e1", "f1", "g1", "h1",
]);

export const PieceSymbolEnum = z.enum(["p", "n", "b", "r", "q", "k"]);

export const MoveSchema = z.object({
  color: z.enum(["w", "b"]),
  from: SquareEnum,
  to: SquareEnum,
  san: z.string(),
  flags: z.string(),
  piece: PieceSymbolEnum,
  lan: z.string(),
  captured: PieceSymbolEnum.optional(),
  promotion: PieceSymbolEnum.optional(),
  before: z.string(),
  after: z.string(),
});

export function calculateDeep(fen: string, move: string): BoardState | undefined{
    const chess = new Chess(fen);
    chess.move(move);
    return getBoardState(chess.fen());
}

export function getBoardState(fen: string): BoardState | undefined {
  const chess = new Chess(fen);
  const validfen = validateFen(fen).ok;

  if (!validfen) {
    return undefined;
  }

  const whitecastlerights = {
    queenside: chess.getCastlingRights(WHITE)[QUEEN],
    kingside: chess.getCastlingRights(WHITE)[KING],
  };
  
  const blackcastlerights = {
    queenside: chess.getCastlingRights(BLACK)[QUEEN],
    kingside: chess.getCastlingRights(BLACK)[KING],
  };

  const legalMoves = chess.moves();
  const isCheckmate = chess.isCheckmate();
  const isStalemate = chess.isStalemate();
  const isGameOver = chess.isGameOver();
  const moveNumber = chess.moveNumber();
  const sidetomove = chess.turn() === "w" ? "white" : "black";
  const gamePhase = getGamePhase(chess);

  // Space control
  const whitecenterspacecontrol = getSpaceControl(chess, WHITE);
  const blackcenterspacecontrol = getSpaceControl(chess, BLACK);
  const whiteflankspacecontrol = getFlankSpaceControl(chess, WHITE);
  const blackflankspacecontrol = getFlankSpaceControl(chess, BLACK);

  const whitespacescore: SpaceControl = {
    centerspacecontrolscore: whitecenterspacecontrol,
    flankspacecontrolscore: whiteflankspacecontrol,
    totalspacecontrolscore: whitecenterspacecontrol + whiteflankspacecontrol,
  };

  const blackspacescore: SpaceControl = {
    centerspacecontrolscore: blackcenterspacecontrol,
    flankspacecontrolscore: blackflankspacecontrol,
    totalspacecontrolscore: blackcenterspacecontrol + blackflankspacecontrol,
  };

  return {
    fen,
    validfen,
    whitecastlerights,
    blackcastlerights,
    legalMoves,
    whitematerial: getMaterialInfo(chess, WHITE),
    blackmaterial: getMaterialInfo(chess, BLACK),
    whitespacescore,
    blackspacescore,
    whitepositionalscore: getSidePositionalCount(chess, WHITE),
    blackpositionalscore: getSidePositionalCount(chess, BLACK),
    whitepieceplacement: getPiecePlacement(chess, WHITE),
    blackpieceplacement: getPiecePlacement(chess, BLACK),
    whitetactical: getTacticalInfo(chess, WHITE),
    whitesquarecontrol: getSideSquareControl(chess, WHITE),
    blacksquarecontrol: getSideSquareControl(chess, BLACK),
    whitepieceattackerdefenderinfo: getSideAttackerDefenderInfo(chess, WHITE),
    blackpieceattackerdefenderinfo: getSideAttackerDefenderInfo(chess, BLACK),
    blacktactical: getTacticalInfo(chess, BLACK),
    whitekingsafety: getKingSafety(chess, WHITE),
    blackkingsafety: getKingSafety(chess, BLACK),
    whitemobility: getPieceMobility(fen, WHITE),
    blackmobility: getPieceMobility(fen, BLACK),
    isCheckmate,
    isStalemate,
    isGameOver,
    moveNumber,
    sidetomove,
    gamePhase,
  };
}

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

// // Helper function to format piece lists more concisely
// function formatPieceList(pieceSymbol: string, squares: string[]): string {
//   if (squares.length === 0) return '';
//   return `${pieceSymbol}:${squares.join(',')}`;
// }

// // Helper function to get attacked pieces summary
// function getAttackedPiecesSummary(state: BoardState, color: 'white' | 'black'): string {
//   const attackedPieces: string[] = [];
//   const pieceInfo = color === 'white' ? state.whitepieceattackerdefenderinfo : state.blackpieceattackerdefenderinfo;
  
//   if (pieceInfo.queenInfo.attackerscount > 0) attackedPieces.push(`Q(${pieceInfo.queenInfo.attackerscount})`);
//   if (pieceInfo.rookInfo.attackerscount > 0) attackedPieces.push(`R(${pieceInfo.rookInfo.attackerscount})`);
//   if (pieceInfo.bishopInfo.attackerscount > 0) attackedPieces.push(`B(${pieceInfo.bishopInfo.attackerscount})`);
//   if (pieceInfo.knightInfo.attackerscount > 0) attackedPieces.push(`N(${pieceInfo.knightInfo.attackerscount})`);
//   if (pieceInfo.pawnInfo.attackerscount > 0) attackedPieces.push(`P(${pieceInfo.pawnInfo.attackerscount})`);
  
//   const kingAttackers = color === 'white' ? state.whitetactical.attackedpieces.length : state.blacktactical.attackedpieces.length;
//   if (kingAttackers > 0) attackedPieces.push(`K(${kingAttackers})`);
  
//   return attackedPieces.join(' ');
// }

// // Helper function to get defended pieces summary
// function getDefendedPiecesSummary(state: BoardState, color: 'white' | 'black'): string {
//   const defendedPieces: string[] = [];
//   const pieceInfo = color === 'white' ? state.whitepieceattackerdefenderinfo : state.blackpieceattackerdefenderinfo;
  
//   if (pieceInfo.queenInfo.defenderscount > 0) defendedPieces.push(`Q(${pieceInfo.queenInfo.defenderscount})`);
//   if (pieceInfo.rookInfo.defenderscount > 0) defendedPieces.push(`R(${pieceInfo.rookInfo.defenderscount})`);
//   if (pieceInfo.bishopInfo.defenderscount > 0) defendedPieces.push(`B(${pieceInfo.bishopInfo.defenderscount})`);
//   if (pieceInfo.knightInfo.defenderscount > 0) defendedPieces.push(`N(${pieceInfo.knightInfo.defenderscount})`);
//   if (pieceInfo.pawnInfo.defenderscount > 0) defendedPieces.push(`P(${pieceInfo.pawnInfo.defenderscount})`);
  
//   const kingDefenders = color === 'white' ? state.whitetactical.defendedpieces.length : state.blacktactical.defendedpieces.length;
//   if (kingDefenders > 0) defendedPieces.push(`K(${kingDefenders})`);
  
//   return defendedPieces.join(' ');
// }

// // Helper functions for cleaner descriptions
// function formatPieces(pieces: MaterialInfo): string {
//   const parts: string[] = [];
//   if (pieces.piececount.queens > 0) parts.push(`${pieces.piececount.queens}Q`);
//   if (pieces.piececount.rooks > 0) parts.push(`${pieces.piececount.rooks}R`);
//   if (pieces.piececount.bishops > 0) parts.push(`${pieces.piececount.bishops}B`);
//   if (pieces.piececount.knights > 0) parts.push(`${pieces.piececount.knights}N`);
//   if (pieces.piececount.pawns > 0) parts.push(`${pieces.piececount.pawns}P`);
//   return parts.join(', ') || 'King only';
// }



// function getKingSafetyDescription(safety: KingSafety): string {
//   const parts: string[] = [];
  
//   if (safety.hascastled) {
//     parts.push("castled");
//   } else if (safety.cancastle) {
//     parts.push("can castle");
//   } else {
//     parts.push("cannot castle");
//   }
  
//   if (safety.attackerscount > 0) {
//     parts.push(`${safety.attackerscount} attackers`);
//   }
  
//   if (safety.pawnshield) {
//     parts.push("has pawn shield");
//   }
  
//   const safetyLevel = safety.kingsafetyscore <= 0 ? "safe" : 
//                     safety.kingsafetyscore > 10 ? "very unsafe" : "somewhat unsafe";
//   parts.push(safetyLevel);
  
//   return parts.join(', ');
// }

// function getCastlingDescription(rights: any): string {
//   const parts: string[] = [];
//   if (rights.kingside) parts.push("kingside");
//   if (rights.queenside) parts.push("queenside");
//   return parts.length > 0 ? `Can castle ${parts.join(' and ')}` : '';
// }


// function getPawnStructureIssues(positional: any, color: string): string {
//   const issues: string[] = [];
  
//   if (positional.doublepawncount > 0) {
//     issues.push(`${positional.doublepawncount} doubled pawns`);
//   }
  
//   if (positional.isolatedpawncount > 0) {
//     issues.push(`${positional.isolatedpawncount} isolated pawns`);
//   }
  
//   if (positional.backwardpawncount > 0) {
//     issues.push(`${positional.backwardpawncount} backward pawns`);
//   }
  
//   if (positional.passedpawncount > 0) {
//     issues.push(`${positional.passedpawncount} passed pawns`);
//   }
  
//   return issues.length > 0 ? `${color}: ${issues.join(', ')}` : '';
// }