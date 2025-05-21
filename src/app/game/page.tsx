"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import ReactMarkdown from "react-markdown";
import {
  FaRegArrowAltCircleRight,
  FaRegArrowAltCircleLeft,
} from "react-icons/fa";
import { RiRobot2Line } from "react-icons/ri";
import { useSession } from "@clerk/nextjs";

function parsePgnChapters(pgnText: string) {
  const chapterBlocks = pgnText.split(/\n\n(?=\[Event)/);
  return chapterBlocks.map((block) => {
    const title = block.match(/\[ChapterName "(.*)"\]/)?.[1] || "Untitled";
    const url = block.match(/\[ChapterURL "(.*)"\]/)?.[1] || "";
    return { title, url, pgn: block.trim() };
  });
}

function extractMovesWithComments(pgn: string): { move: string; comment?: string }[] {
  const strippedHeaders = pgn.replace(/\[.*?\]\s*/g, ""); // remove PGN tags
  const tokenRegex = /(\{[^}]*\})|(;[^\n]*)|([^\s{};]+)/g;
  const tokens = [...strippedHeaders.matchAll(tokenRegex)];

  const result: { move: string; comment?: string }[] = [];
  let currentComment: string | undefined = undefined;

  for (const match of tokens) {
    const token = match[0];
    if (token.startsWith("{")) {
      currentComment = token.slice(1, -1).trim();
    } else if (token.startsWith(";")) {
      currentComment = token.slice(1).trim();
    } else if (/^[a-hRNBQKO0-9+#=x-]+$/.test(token)) {
      // token is a move (very rough pattern)
      result.push({ move: token, comment: currentComment });
      currentComment = undefined;
    }
  }

  return result;
}

export default function PGNUploaderPage() {
  const [pgnText, setPgnText] = useState("");
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [parsedMovesWithComments, setParsedMovesWithComments] = useState<
    { move: string; comment?: string }[]
  >([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [studyUrl, setStudyUrl] = useState("");
  const [inputsVisible, setInputsVisible] = useState(true);
  const [chapters, setChapters] = useState<
    { title: string; url: string; pgn: string }[]
  >([]);
  const [comment, setComment] = useState("");
  const [includeCommentsInAnalysis, setIncludeCommentsInAnalysis] = useState(true);

  const { session } = useSession();
 
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentMoveIndex > 0) {
        goToMove(currentMoveIndex - 1);
      }
      if (e.key === "ArrowRight" && currentMoveIndex < moves.length) {
        goToMove(currentMoveIndex + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMoveIndex, moves]);

  const loadPGN = () => {
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgnText);
      const moveList = tempGame.history();
      const parsed = extractMovesWithComments(pgnText);

      setMoves(moveList);
      setParsedMovesWithComments(parsed);
      setCurrentMoveIndex(0);

      const resetGame = new Chess();
      setGame(resetGame);
      setFen(resetGame.fen());
      setAnalysis(null);
      setComment("");
    } catch (err) {
      console.log(err);
      alert("Invalid PGN input");
    }
  };

  const goToMove = (index: number) => {
    const tempGame = new Chess();
    for (let i = 0; i < index; i++) {
      tempGame.move(moves[i]);
    }
    setGame(tempGame);
    setFen(tempGame.fen());
    setCurrentMoveIndex(index);
    setComment(parsedMovesWithComments[index - 1]?.comment || "");
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    const token = await session?.getToken();
    setLoading(true);
    setAnalysis(null);
    
    // Construct the query based on whether comments should be included
    let query = `Analyze this position: ${fen}`;
    if (includeCommentsInAnalysis && comment) {
      query += `\n\nExisting comment about this position: "${comment}"`;
    }
    
    try {
      const response = await fetch(`/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      setAnalysis(data.message);
    } catch (err) {
      console.log(err);
      setAnalysis("Error analyzing position.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {inputsVisible && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Analyze Your Chess Game with Agine
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "wheat", mb: 1 }}>
            Paste a Lichess Study URL or PGN to load your game and get instant move-by-move AI analysis and comments.
          </Typography>
        </Box>
      )}

      {inputsVisible && (
        <Stack spacing={2} sx={{ mb: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              fullWidth
              label="Paste Lichess Study URL"
              value={studyUrl}
              onChange={(e) => setStudyUrl(e.target.value)}
              placeholder="https://lichess.org/study/GuglnqGD"
              sx={{ backgroundColor: grey[900], borderRadius: 1 }}
              slotProps={{
                inputLabel: { sx: { color: "wheat" } },
                input: { sx: { color: "wheat" } }
              }}
            />
            <Button
              variant="contained"
              onClick={async () => {
                const idMatch = studyUrl.match(/study\/([a-zA-Z0-9]+)/);
                if (!idMatch) return alert("Invalid URL");

                const res = await fetch(
                  `https://lichess.org/api/study/${idMatch[1]}.pgn`
                );
                const text = await res.text();
                const parsed = parsePgnChapters(text);
                if (parsed.length === 0) return alert("No chapters found");

                setChapters(parsed);
                setPgnText(parsed[0].pgn); // Auto-load first chapter
                setTimeout(() => loadPGN(), 0);
                setInputsVisible(false);
              }}
            >
              Load Study
            </Button>
          </Stack>

          <TextField
            multiline
            minRows={4}
            label="Paste PGN Here"
            fullWidth
            value={pgnText}
            onChange={(e) => setPgnText(e.target.value)}
            sx={{
              backgroundColor: grey[900],
              borderRadius: 1,
            }}
            placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
            slotProps={{
              input: { sx: { color: "wheat" } },
              inputLabel: { sx: { color: "wheat" } },
            }}
          />
          <Button
            variant="contained"
            onClick={() => {
              loadPGN();
              setInputsVisible(false);
            }}
          >
            Load PGN
          </Button>
        </Stack>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={4}>
        {!inputsVisible && (
          <Stack spacing={2} alignItems="center">
            <Chessboard position={fen} boardWidth={500} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} width="100%">
              <Button
                variant="contained"
                onClick={handleAnalyze}
                disabled={loading}
                startIcon={<RiRobot2Line />}
                fullWidth
              >
                {loading ? "Analyzing..." : "Analyze"}
              </Button>

              <Button
                variant="outlined"
                onClick={() => {
                  setInputsVisible(true);
                  setMoves([]);
                  setPgnText("");
                  setStudyUrl("");
                  setAnalysis(null);
                  setComment("");
                  const reset = new Chess();
                  setGame(reset);
                  setFen(reset.fen());
                }}
                fullWidth
              >
                Load New Game
              </Button>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" width="100%">
              <Stack direction="row" spacing={2} flexGrow={1}>
                <Button
                  onClick={() => goToMove(currentMoveIndex - 1)}
                  disabled={currentMoveIndex === 0}
                  startIcon={<FaRegArrowAltCircleLeft />}
                >
                  Prev
                </Button>
                <Button
                  onClick={() => goToMove(currentMoveIndex + 1)}
                  disabled={currentMoveIndex >= moves.length}
                  endIcon={<FaRegArrowAltCircleRight />}
                >
                  Next
                </Button>
              </Stack>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={includeCommentsInAnalysis}
                    onChange={(e) => setIncludeCommentsInAnalysis(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: "wheat" }}>
                    Include comments in analysis
                  </Typography>
                }
                sx={{ 
                  color: "wheat",
                  mr: 0
                }}
              />
            </Stack>

            <Paper
              sx={{
                p: 1,
                backgroundColor: grey[800],
                color: "wheat",
                fontFamily: "monospace",
                width: "100%"
              }}
            >
              {fen}
            </Paper>
          </Stack>
        )}
        <Stack spacing={2} sx={{ flex: 1 }}>
          {!inputsVisible && chapters.length > 0 && (
            <Paper
              sx={{
                p: 2,
                backgroundColor: grey[900],
                borderRadius: 2,
                color: "white",
                maxHeight: 200,
                overflowY: "auto",
              }}
            >
              <Typography variant="h6" gutterBottom>
                Chapters
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {chapters.map((ch, index) => (
                  <Button
                    key={index}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setPgnText(ch.pgn);
                      setTimeout(() => loadPGN(), 0);
                    }}
                    sx={{
                      justifyContent: "start",
                      textTransform: "none",
                      color: "wheat",
                      borderColor: grey[700],
                      fontSize: "0.9rem",
                      px: 1.5,
                      py: 0.5,
                      minWidth: 80,
                    }}
                  >
                    {ch.title}
                  </Button>
                ))}
              </Stack>
            </Paper>
          )}

          {moves.length > 0 && (
            <>
              <Paper
                sx={{
                  p: 2,
                  maxHeight: 300,
                  overflowY: "auto",
                  borderRadius: 2,
                  backgroundColor: grey[900],
                  color: "white",
                }}
              >
                <Typography variant="h6">Moves</Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  {moves.map((move, i) => (
                    <Box key={i}>
                      <Button
                        size="small"
                        variant={
                          i === currentMoveIndex - 1 ? "contained" : "outlined"
                        }
                        onClick={() => goToMove(i + 1)}
                        sx={{
                          minWidth: 50,
                          maxWidth: 80,
                          whiteSpace: "nowrap",
                          px: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${move}` : move}
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Comments */}
              <Paper
                sx={{
                  p: 2,
                  bgcolor: grey[800],
                  color: "white",
                  borderRadius: 2,
                  minHeight: 80,
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Comments
                </Typography>
                <Typography>{comment || "Select a move to see comments."}</Typography>
              </Paper>

              <Paper
                sx={{
                  p: 2,
                  minHeight: 150,
                  borderRadius: 2,
                  backgroundColor: grey[800],
                  color: "wheat",
                }}
              >
                <Typography variant="h6">AI Analysis</Typography>
                {loading ? (
                  <CircularProgress sx={{ mt: 2 }} />
                ) : analysis ? (
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                ) : (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Click Analyze to get evaluation of this position. {includeCommentsInAnalysis && comment && "Comments will be included in the analysis."}
                  </Typography>
                )}
              </Paper>
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}