"use server";
import { tavily } from '@tavily/core';

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function searchWebAnswer(searchQuery: string) {
    const res = await tvly.search(searchQuery, { searchDepth: 'basic', includeAnswer: true, includeImages: false });

    const resultsWithUrls = res.results
        .map((result: any, idx: number) => `${idx + 1}. ${result.title}\n${result.url}`)
        .join('\n\n');

    return `Answer: ${res.answer}\n\n${resultsWithUrls}`;
}
