import type { NextApiRequest, NextApiResponse } from 'next';

interface PuzzleData {
  lichessId: string;
  previousFEN: string;
  FEN: string;
  moves: string;
  preMove: string;
  rating: number;
  themes: string[];
  gameURL: string;
}

interface PuzzleResponse {
  success: boolean;
  data?: PuzzleData;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PuzzleResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { themes, ratingFrom, ratingTo } = req.query;
   
    // Build the external API URL
    let url = "https://api.chessgubbins.com/puzzles/random";
    const params = new URLSearchParams();
   
    // Add themes parameter if provided
    if (themes && typeof themes === 'string') {
      params.append("themes", themes);
    }
   
    // Add rating parameters if provided
    if (ratingFrom && ratingTo && 
        typeof ratingFrom === 'string' && 
        typeof ratingTo === 'string') {
      params.append("ratingFrom", ratingFrom);
      params.append("ratingTo", ratingTo);
    }
   
    // Append parameters to URL if any exist
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
   
    // Fetch from external API
    const response = await fetch(url);
   
    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`);
    }
   
    const data: PuzzleData = await response.json();
   
    // Return the puzzle data
    return res.status(200).json({
      success: true,
      data
    });
   
  } catch (error) {
    console.error("Error fetching puzzle:", error);
   
    return res.status(500).json({
      success: false,
      error: "Failed to load puzzle. Please try again."
    });
  }
}