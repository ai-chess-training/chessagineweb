"use client";

import {
    Box,
    TextField,
    Typography,
    CircularProgress,
    IconButton,
    InputAdornment,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { useSession } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import ChatBubble from "@/componets/chat/ChatBubble";

interface ChatMessage {
    text: string;
    isUser: boolean;
}

interface AgineResponse {
    message: string;
}

export default function PgnReviewPage() {
    const [input, setInput] = useState("");
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const {session, isLoaded, isSignedIn} = useSession();
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textFieldRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat, loading]);


    // Show a spinner while session is loading
      if (!isLoaded) {
        return (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        );
      }
    
      // If user is not signed in, redirect them to sign-in page
      if (!isSignedIn) {
        return (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <Typography variant="h6" color="wheat">
              Please sign in to view this page.
            </Typography>
          </Box>
        );
      }

    
    
    const handleSubmit = async () => {
        if (!input.trim() || loading) return;

        const userMessage = { text: input, isUser: true };
        setChat((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const token = await session?.getToken();
            const res = await fetch("/api/pgn", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ pgn: input }),
            });

            const data: AgineResponse = await res.json();
            setChat((prev) => [
                ...prev,
                { text: data.message || "Something went wrong!", isUser: false },
            ]);
        } catch (err) {
            setChat((prev) => [
                ...prev,
                { text: "Error: " + err, isUser: false },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <Box
            sx={{
                height: "100vh",
                width: "100vw",
                bgcolor: "#181818",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 1,
                    borderBottom: "1px solid #333",
                    bgcolor: "#1a1a1a",
                    flexShrink: 0,
                }}
            >
                <Typography
                    variant="h5"
                    fontWeight={600}
                    color="wheat"
                    sx={{ 
                        textAlign: "center",
                        textShadow: "0 2px 8px rgba(0,0,0,0.3)" 
                    }}
                >
                    AgineAnnotator
                </Typography>
            </Box>

            {/* Chat Area */}
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {/* Messages Container */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: "auto",
                        px: 2,
                        py: 2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        "&::-webkit-scrollbar": {
                            width: "6px",
                        },
                        "&::-webkit-scrollbar-track": {
                            background: "#2a2a2a",
                            borderRadius: "3px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: "#555",
                            borderRadius: "3px",
                            "&:hover": {
                                background: "#666",
                            },
                        },
                    }}
                >
                    {chat.length === 0 && (
                        <Box
                            sx={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                alignItems: "center",
                                textAlign: "center",
                                px: 4,
                            }}
                        >
                            <Typography
                                variant="h6"
                                color="wheat"
                                sx={{ mb: 2, opacity: 0.8 }}
                            >
                                Welcome to AgineAnnotator
                            </Typography>
                            <Typography
                                variant="body1"
                                color="wheat"
                                sx={{ opacity: 0.6, maxWidth: 500 }}
                            >
                                Paste your PGN notation below and I'll provide detailed analysis and annotations for your chess game.
                            </Typography>
                        </Box>
                    )}

                    {chat.map((msg, i) => (
                        <ChatBubble key={i} message={msg.text} isUser={msg.isUser} />
                    ))}

                    {loading && (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                            <CircularProgress size={24} sx={{ color: "wheat" }} />
                        </Box>
                    )}
                    
                    <div ref={chatEndRef} />
                </Box>

                {/* Input Area */}
                <Box
                    sx={{
                        p: 3,
                        borderTop: "1px solid #333",
                        bgcolor: "#1a1a1a",
                        flexShrink: 0,
                    }}
                >
                    <Box sx={{ maxWidth: "800px", mx: "auto" }}>
                        <TextField
                            ref={textFieldRef}
                            placeholder="Paste your PGN here... (e.g., [Event 'Example'] 1. e4 e5 2. Nf3 Nc6)"
                            multiline
                            minRows={2}
                            maxRows={8}
                            fullWidth
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    bgcolor: "#2a2a2a",
                                    borderRadius: "12px",
                                    fontFamily: "monospace",
                                    fontSize: "14px",
                                    color: "wheat",
                                    "& fieldset": {
                                        borderColor: "#444",
                                        borderWidth: "1px",
                                    },
                                    "&:hover fieldset": {
                                        borderColor: "#666",
                                    },
                                    "&.Mui-focused fieldset": {
                                        borderColor: "wheat",
                                        borderWidth: "2px",
                                    },
                                    "& textarea": {
                                        "&::placeholder": {
                                            color: "#888",
                                            opacity: 1,
                                        },
                                    },
                                },
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={handleSubmit}
                                            disabled={!input.trim() || loading}
                                            sx={{
                                                color: input.trim() && !loading ? "wheat" : "#666",
                                                "&:hover": {
                                                    bgcolor: "rgba(245, 222, 179, 0.1)",
                                                },
                                            }}
                                        >
                                            <SendIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                color: "#888",
                                display: "block",
                                mt: 1,
                                textAlign: "center",
                            }}
                        >
                            Press Enter to send • Shift + Enter for new line
                        </Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}