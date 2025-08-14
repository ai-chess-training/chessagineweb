import type { NextApiRequest, NextApiResponse } from 'next';
import { encrypt } from '@/utils/crypto';

interface ApiSettings {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
}

export type ResponseData = {
  message: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
 
  const token = req.headers.authorization || "";
  const { query, fen, mode, apiSettings } = req.body;
  const apiSettings1: ApiSettings = apiSettings;
  
  // Validate API settings
  if (!apiSettings1 || !apiSettings1.provider || !apiSettings1.model || !apiSettings1.apiKey) {
    return res.status(400).json({
      message: "API settings are required. Please configure your provider settings."
    });
  }
 
  try {
    // Encrypt the API key before sending to Lambda
    const encryptedApiSettings = {
      ...apiSettings1,
      apiKey: encrypt(apiSettings1.apiKey)
    };


    const lambdaResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/agent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
          // Optional: Add a header to indicate encryption is used
        },
        body: JSON.stringify({
          query,
          fen,
          mode,
          // Pass encrypted API settings to Lambda
          apiSettings1: encryptedApiSettings
        }),
      }
    );
   
    const responseText = await lambdaResponse.text();
   
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log(e);
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