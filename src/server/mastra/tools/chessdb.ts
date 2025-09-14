// import { validateFen } from "chess.js";


// interface CandidateMove {
//   uci: string;
//   san: string;
//   score: string;
//   winrate: string;
// }

// export async function getTop3BestMoves(fen: string): Promise<CandidateMove[]> {
//   if (!validateFen(fen)) {
//     console.error("Invalid FEN provided:", fen);
//     return [];
//   }

//   const encodedFen = encodeURIComponent(fen);
//   const apiUrl = `https://www.chessdb.cn/cdb.php?action=queryall&board=${encodedFen}&json=1`;

//   try {
//     const response = await fetch(apiUrl);

//     if (!response.ok) {
//       console.error(`Failed to fetch data. HTTP status code: ${response.status}, URL: ${apiUrl}`);
//       return [];
//     }

//     const data = await response.json();

//     if (data.status !== "ok") {
//       console.error(`Position evaluation not available. Status: ${data.status}, Response: ${JSON.stringify(data)}`);
//       return [];
//     }

//     const moves = data.moves;
//     if (!Array.isArray(moves) || moves.length === 0) {
//       console.error("No moves found in the response. Response data:", JSON.stringify(data));
//       return [];
//     }

//     if(moves.length === 0){
//       console.log("Moves length is 0")
//       return [];
//     }

//     return moves.slice(0, 3).map((move: CandidateMove) => {
//       const scoreNum = Number(move.score);
//       const scoreStr = isNaN(scoreNum) ? "N/A" : String(scoreNum * 100);
//       return {
//       uci: move.uci || "N/A",
//       san: move.san || "N/A",
//       score: scoreStr,
//       winrate: move.winrate || "N/A",
//       };
//     });
//   } catch (error: any) {
//     console.error(`Error occurred while fetching or processing data: ${error.message}`);
//     return [];
//   }
// }


