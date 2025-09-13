import { validateFen } from "chess.js";

interface Opening {
    eco: string,
    name: string
}

interface Side {
    name: string,
    rating: number,
}

interface Game {
    uci: string,
    id: string,
    black: Side,
    white: Side,
    year: number,
    month: string,
}

interface Moves {
    uci: string,
    san: string,
    averageRating: number,
    white: number,
    draws: number,
    black: number,
    game: Game,
    opening: Opening
}

interface MasterGames {
    opening: Opening,
    white: number,
    draws: number,
    black: number, 
    moves: Moves[],
    topGames: Game[]
}

export const getOpeningStats = async (fen: string) => {

    if(!validateFen(fen)){
        throw new Error("Invalid FEN");
    }

    const masterEndpoint = `https://explorer.lichess.ovh/masters?fen=${fen}&moves=5&topGames=5`;
    const data = await fetch(masterEndpoint);
    const masterData = (await data.json()) as MasterGames;

    if(!masterData){
        throw new Error("Failed to fetch opening stats");
    }

    console.log(masterData);

    return masterData;
}

export const getOpeningStatSpeech = (masterData: MasterGames): string => {
    const { opening, white, draws, black, moves, topGames } = masterData;

    const totalGames = (white ?? 0) + (draws ?? 0) + (black ?? 0);
    if (totalGames === 0) {
        return "There is no game data available for this opening.";
    }

    const whiteWinRate = ((white / totalGames) * 100 || 0).toFixed(2);
    const drawRate = ((draws / totalGames) * 100 || 0).toFixed(2);
    const blackWinRate = ((black / totalGames) * 100 || 0).toFixed(2);

    let speech = `Opening: ${opening?.name ?? "Unknown"} (${opening?.eco ?? "N/A"}). `;
    speech += `Out of ${totalGames} master-level games, White wins ${whiteWinRate} percent, draws occur ${drawRate} percent, and Black wins ${blackWinRate} percent. `;

    if (moves?.length) {
        speech += "The most common next moves are: ";
        moves.slice(0, 3).forEach((move, index) => {
            const moveTotal = (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);
            const moveWhite = ((move.white / moveTotal) * 100 || 0).toFixed(2);
            const moveDraw = ((move.draws / moveTotal) * 100 || 0).toFixed(2);
            const moveBlack = ((move.black / moveTotal) * 100 || 0).toFixed(2);
            speech += `Move ${index + 1}: ${move.san ?? "Unknown"}, played in games with average rating ${move.averageRating ?? 0}. White wins ${moveWhite} percent, draws ${moveDraw} percent, Black wins ${moveBlack} percent. `;
        });
    }

    if (topGames?.length) {
        speech += "Some notable games include: ";
        topGames.slice(0, 3).forEach((game, index) => {
            speech += `Game ${index + 1}: Game URL: https://lichess.org/${game.id} ${game.white?.name ?? "Unknown"} (rating ${game.white?.rating ?? "N/A"}) versus ${game.black?.name ?? "Unknown"} (rating ${game.black?.rating ?? "N/A"}), played in ${game.month ?? "N/A"} ${game.year ?? "N/A"}. `;
        });
    }

    return speech.trim();
};
