
// import { Chess } from "chess.js";
// import { getBestMoveFast } from "./localEngine";

import { boardStateToPrompt, getBoardState } from "./state";

// interface GameResult {
//   pgn: string;
//   result: string;
//   totalMoves: number;
//   finalEval: number;
//   gameEndReason: string;
//   averageThinkTime: number;
//   totalThinkTime: number;
// }

// interface MoveInfo {
//   move: string;
//   eval: number;
//   thinkTime: number;
//   moveNumber: number;
//   side: 'white' | 'black';
// }

// export function simulateGame(
//   startingFen?: string,
//   maxMoves: number = 100,
//   logMoves: boolean = true
// ): GameResult {
//   const chess = new Chess(startingFen);
//   const moveHistory: MoveInfo[] = [];
//   let totalThinkTime = 0;
//   let moveCount = 0;

//   console.log("🎯 Starting chess game simulation...");
//   console.log(`📋 Starting position: ${chess.fen()}`);
//   console.log("=====================================");

//   while (!chess.isGameOver() && moveCount < maxMoves) {
//     const currentSide = chess.turn() === 'w' ? 'white' : 'black';
//     const moveNumber = Math.ceil((moveCount + 1) / 2);
    
//     if (logMoves) {
//       console.log(`\n${currentSide.toUpperCase()} to move (Move ${moveNumber})`);
//       console.log(`Position: ${chess.fen()}`);
//       console.log(chess.ascii());
//     }

//     // Get best move from engine
//     const startTime = Date.now();
//     const result = getBestMoveFast(chess.fen());
//     const thinkTime = Date.now() - startTime;
    
//     if (!result.bestMove) {
//       console.log("❌ No legal moves available");
//       break;
//     }

//     // Make the move
//     const moveObj = chess.move(result.bestMove);
//     if (!moveObj) {
//       console.log(`❌ Invalid move: ${result.bestMove}`);
//       break;
//     }

//     totalThinkTime += thinkTime;
//     moveCount++;

//     const moveInfo: MoveInfo = {
//       move: result.bestMove,
//       eval: result.uiEval,
//       thinkTime: result.timeMs,
//       moveNumber,
//       side: currentSide
//     };
    
//     moveHistory.push(moveInfo);

//     if (logMoves) {
//       const evalStr = result.uiEval > 0 ? `+${result.uiEval.toFixed(2)}` : result.uiEval.toFixed(2);
//       console.log(`🎲 Played: ${result.bestMove} Reason ${result.reasoning} (eval: ${evalStr}, time: ${result.timeMs}ms, nodes: ${result.nodesSearched})`);
//     }

//     // Show progress every 10 moves
//     if (moveCount % 10 === 0 && !logMoves) {
//       const evalStr = result.uiEval > 0 ? `+${result.uiEval.toFixed(2)}` : result.uiEval.toFixed(2);
//       console.log(`📊 Move ${moveCount}: ${result.bestMove} (${evalStr})`);
//     }
//   }

//   // Game ended - determine result
//   let gameResult = "*";
//   let gameEndReason = "Unknown";
  
//   if (chess.isCheckmate()) {
//     gameResult = chess.turn() === 'w' ? "0-1" : "1-0";
//     gameEndReason = "Checkmate";
//   } else if (chess.isStalemate()) {
//     gameResult = "1/2-1/2";
//     gameEndReason = "Stalemate";
//   } else if (chess.isDraw()) {
//     gameResult = "1/2-1/2";
//     if (chess.isInsufficientMaterial()) {
//       gameEndReason = "Insufficient material";
//     } else if (chess.isThreefoldRepetition()) {
//       gameEndReason = "Threefold repetition";
//     } else {
//       gameEndReason = "50-move rule";
//     }
//   } else if (moveCount >= maxMoves) {
//     gameResult = "1/2-1/2";
//     gameEndReason = `Move limit reached (${maxMoves})`;
//   }

//   // Get final evaluation
//   const finalResult = getBestMoveFast(chess.fen());
//   const finalEval = finalResult.uiEval || 0;

//   // Generate PGN
//   const pgn = chess.pgn();
//   const averageThinkTime = moveCount > 0 ? totalThinkTime / moveCount : 0;

//   console.log("\n=====================================");
//   console.log("🏁 GAME FINISHED!");
//   console.log(`📊 Result: ${gameResult}`);
//   console.log(`🎯 Reason: ${gameEndReason}`);
//   console.log(`📈 Final eval: ${finalEval > 0 ? '+' : ''}${finalEval.toFixed(2)}`);
//   console.log(`🎲 Total moves: ${moveCount}`);
//   console.log(`⏱️  Average think time: ${averageThinkTime.toFixed(0)}ms`);
//   console.log(`⏱️  Total think time: ${totalThinkTime}ms`);
//   console.log(`${pgn}`);
//   console.log("=====================================");

//   return {
//     pgn,
//     result: gameResult,
//     totalMoves: moveCount,
//     finalEval,
//     gameEndReason,
//     averageThinkTime,
//     totalThinkTime
//   };
// }

// export function simulateQuickGame(startingFen?: string): void {
//   console.log("🚀 QUICK CHESS SIMULATION");
//   const result = simulateGame(startingFen, 80, false);
  
//   console.log("\n📜 COMPLETE PGN:");
//   console.log("=====================================");
//   console.log(result.pgn);
//   console.log("=====================================");
  
//   console.log(`\n📊 GAME SUMMARY:`);
//   console.log(`Result: ${result.result}`);
//   console.log(`End: ${result.gameEndReason}`);
//   console.log(`Moves: ${result.totalMoves}`);
//   console.log(`Final eval: ${result.finalEval > 0 ? '+' : ''}${result.finalEval.toFixed(2)}`);
// }

// export function simulateDetailedGame(startingFen?: string): void {
//   console.log("🔍 DETAILED CHESS SIMULATION");
//   const result = simulateGame(startingFen, 60, true);
  
//   console.log("\n📜 COMPLETE PGN:");
//   console.log("=====================================");
//   console.log(result.pgn);
//   console.log("=====================================");
// }

// export function simulateMultipleGames(
//   numberOfGames: number = 3,
//   startingFen?: string
// ): void {
//   console.log(`🎮 SIMULATING ${numberOfGames} GAMES`);
//   console.log("=====================================");
  
//   const results: GameResult[] = [];
//   let whiteWins = 0;
//   let blackWins = 0;
//   let draws = 0;
  
//   for (let i = 1; i <= numberOfGames; i++) {
//     console.log(`\n🎯 GAME ${i}/${numberOfGames}`);
//     console.log("-".repeat(20));
    
//     const result = simulateGame(startingFen, 80, false);
//     results.push(result);
    
//     if (result.result === "1-0") whiteWins++;
//     else if (result.result === "0-1") blackWins++;
//     else draws++;
    
//     console.log(`Game ${i} result: ${result.result} (${result.gameEndReason})`);
//   }
  
//   console.log("\n🏆 TOURNAMENT SUMMARY");
//   console.log("=====================================");
//   console.log(`White wins: ${whiteWins}`);
//   console.log(`Black wins: ${blackWins}`);
//   console.log(`Draws: ${draws}`);
//   console.log(`Average moves per game: ${Math.round(results.reduce((sum, r) => sum + r.totalMoves, 0) / numberOfGames)}`);
//   console.log(`Average think time: ${Math.round(results.reduce((sum, r) => sum + r.averageThinkTime, 0) / numberOfGames)}ms`);
  
//   console.log("\n📜 ALL GAME PGNS:");
//   console.log("=====================================");
//   results.forEach((result, index) => {
//     console.log(`\n--- GAME ${index + 1} (${result.result}) ---`);
//     console.log(result.pgn);
//   });
// }

// // Example usage functions:
// export function testEngine(): void {
//   console.log("🧪 TESTING ENGINE ON VARIOUS POSITIONS");
  
//   const testPositions = [
//     {
//       name: "Starting position",
//       fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
//     },
//     {
//       name: "French Defense",
//       fen: "rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3"
//     },
//     {
//       name: "Complex middlegame",
//       fen: "2kr4/pp2np2/4bp1r/2p1p2p/3pP2N/PPqP2P1/2P2PBP/R2Q1RK1 w - - 1 17"
//     },
//     {
//       name: "Rook endgame",
//       fen: "8/p3Rp2/2pk1P2/5R2/3p4/P2P1K2/2r3r1/8 w - - 2 35"
//     },
//     {
//         name: "from my game 1",
//         fen: "r1b2rk1/pp3pp1/2p1p2p/q2nP1B1/2B4P/2P5/PP2QPP1/R3K2R w KQ - 1 15"
//     }
//   ];
  
//   testPositions.forEach(pos => {
//     console.log(`\n🎯 Testing: ${pos.name}`);
//     console.log(`FEN: ${pos.fen}`);
    
//     const result = getBestMoveFast(pos.fen);
//     console.log(`Best move: ${result.bestMove} (${result.timeMs}ms)`);
//     console.log(`Reasoning: ${result.reasoning}`)
//     console.log(`Evaluation: ${result.uiEval > 0 ? '+' : ''}${result.uiEval.toFixed(2)}`);
//     console.log(`Nodes: ${result.nodesSearched}`);
//   });
// }

// testEngine()

console.log(boardStateToPrompt(getBoardState("r5k1/p1pq1rbp/1p2pppn/1b1pP3/3P1PP1/BPP2N1P/P2N1R2/2R1Q1K1 b - - 1 17")))