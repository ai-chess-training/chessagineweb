import { Chess } from "chess.js";


type ChessApiResponse = {
    move: string;
    san: string;
    continuationArr: string[];
    eval: number;
    text: string;
    fen: string;
};


export async function getBestMoveInfo(fen: string, depth: number = 18) {
  const res = await fetch("https://chess-api.com/v1", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fen, depth }),
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }

  const data: ChessApiResponse = await res.json();

  const chess = new Chess(fen);

  // Convert best move (LAN format like "g8f6") to SAN
  
  const bestMoveSAN = data.san;

  // Convert continuationArr to SANs
  const continuationSAN: string[] = [];
  let tempChess = new Chess(data.fen); // Use the fen from response in case it was adjusted

  for (const lan of data.continuationArr) {
    tempChess.move(lan);
  }

  const varHistory = tempChess.history({verbose: true});

  for(let i = 0; i < varHistory.length; i++){
     continuationSAN.push(varHistory[i].san)
  }

  return {
    bestMoveSAN,
    continuationSAN,
    eval: data.eval,
    text: data.text,
  };
}
