import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  message: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = req.headers.authorization || "";
  console.log('TOKEN', token);
  const pgn = req.body.pgn;
  console.log('PGN', pgn);

  try {
    const lambdaResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/Prod/pgn/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ pgn }),
      }
    );

    const responseText = await lambdaResponse.text(); 
    console.log("Lambda status:", lambdaResponse.status);
    console.log("Lambda raw response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log(e)
      data = { message: 'Non-JSON response from Lambda', raw: responseText };
    }

    res.status(lambdaResponse.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({
      message: "Internal proxy error",
    });
  }
}
