import { Chess, Square } from 'chess.js';
import { boardStateToPrompt, getBoardState } from './state';

export interface StockfishResponse {
    success: boolean;
    evaluation: number | null;
    mate: string | null;
    bestmove: string;
    continuation: string;
}

export const getChessEvaluation = async (fen: string, depth: number) => {
    const stockfishUrl = `https://stockfish.online/api/s/v2.php?fen=${fen}&depth=${depth}`;
    const response = await fetch(stockfishUrl);
    const data = (await response.json()) as StockfishResponse;

    return data;
};


export const generateChessAnalysis = (data: StockfishResponse, fen: string) => {
    if (!data.bestmove) {
        return {
            bestMove: 'Unknown',
            reasoning: 'Insufficient data to determine best move.',
            topLine: 'unknown',
            numberEval: 0,
        };
    }
    const chess = new Chess(fen);
    const bestMove = data.bestmove.split(' ')[1];
    const variation = data.continuation;
    const evalNumber = data.evaluation != null ? data.evaluation : -100000;
    const moves = variation.split(' ');

    let sanBestMove = '';
    let sanVariation = '';

    chess.move(bestMove);

    const history = chess.history({ verbose: true });

    sanBestMove = history[0].san;

    chess.load(fen);

    for (let i = 0; i < moves.length; i++) {
        chess.move(moves[i]);
    }

    const varHistory = chess.history({ verbose: true });

    for (let i = 0; i < varHistory.length; i++) {
        sanVariation += `${varHistory[i].san} `;
    }

    return {
        bestMove: sanBestMove || 'Unknown',
        reasoning: boardStateToPrompt(getBoardState(fen)),
        topLine: sanVariation,
        numberEval: evalNumber,
    };
};

export interface HangingPieceAnalysis {
    hangingPieces: string[];
    unprotectedPieces: string[];
    semiProtectedPieces: string[];
}

export const getHangingPiecesAnalysis = async (
    fen: string,
): Promise<{
    hangingDetails: string[];
    unprotectedDetails: string[];
    semiProtectedDetails: string[];
}> => {
    const chess = new Chess(fen);

    const encodedFen = encodeURIComponent(fen);
    const url = `https://api.chessgubbins.com/positions/analyze?fen=${encodedFen}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch Gubbins analysis: ${response.statusText}`);
    }
    const data = (await response.json()) as HangingPieceAnalysis;

    // Helper to get piece name on a square
    const getPieceOnSquare = (square: string) => {
        const piece = chess.get(square as Square);
        if (!piece) return null;
        // Capitalize first letter and add color
        const color = piece.color === 'w' ? 'White' : 'Black';
        const pieceName =
            piece.type === 'p'
                ? 'pawn'
                : piece.type === 'n'
                ? 'knight'
                : piece.type === 'b'
                ? 'bishop'
                : piece.type === 'r'
                ? 'rook'
                : piece.type === 'q'
                ? 'queen'
                : piece.type === 'k'
                ? 'king'
                : 'piece';
        return `${color} ${pieceName} on ${square}`;
    };

    const hangingDetails = (data.hangingPieces || []).map((sq) => getPieceOnSquare(sq)).filter(Boolean) as string[];
    const unprotectedDetails = (data.unprotectedPieces || [])
        .map((sq) => getPieceOnSquare(sq))
        .filter(Boolean) as string[];
    const semiProtectedDetails = (data.semiProtectedPieces || [])
        .map((sq) => getPieceOnSquare(sq))
        .filter(Boolean) as string[];

    return {
        hangingDetails,
        unprotectedDetails,
        semiProtectedDetails,
    };
};
