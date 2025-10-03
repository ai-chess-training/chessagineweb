
export interface UserGame {
  id: string;
  speed: string;
  lastMoveAt: number;
  players: {
    white: GameUser;
    black: GameUser;
  };
  pgn: string;
}

export interface GameUser {
  user?: { id: string; name: string };
  rating?: number;
}

export const fetchUserRecentGames = async (
    username: string
): Promise<UserGame[]> => {
    try {
        const response = await fetch(
            `https://lichess.org/api/games/user/${username}?until=${Date.now()}&max=20&pgnInJson=true&sort=dateDesc`,
            { method: "GET", headers: { accept: "application/x-ndjson" } }
        );

        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`Failed to fetch games: ${response.statusText}`);
        }

        const rawData = await response.text();
        return rawData
            .split("\n")
            .filter(Boolean)
            .map((game) => JSON.parse(game)) as UserGame[];
    } catch (error) {
        console.error("Error fetching recent games:", error);
        return [];
    }
};
