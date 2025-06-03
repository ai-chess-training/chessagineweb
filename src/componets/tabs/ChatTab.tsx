import React from "react";

import { grey } from "@mui/material/colors";
import { Message, Send } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import {
  Stack,
  Box,
  Typography,
  Switch,
  Button,
  Paper,
  TextField,
  CircularProgress,
  Chip,
} from "@mui/material";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatTabProps {
  sessionMode: boolean;
  setSessionMode: (checked: boolean) => void;
  clearChatHistory: () => void;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  gameInfo?: string;
  currentMove?: string;
  chatInput: string;
  setChatInput: (value: string) => void;
  handleChatKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  sendChatMessage: (gameInfo?: string, currentMove?: string) => void;
}

const sessionPrompts = [
  "What's the best move in this position?",
  "Analyze the current position for me",
  "What are the key weaknesses in this position?",
  "Suggest a strategic plan",
  "Is this position winning or losing?",
  "What opening is this?",
  "Show me tactical opportunities",
  "Evaluate the pawn structure"
];

const chatPrompts = [
  "Explain chess fundamentals",
  "How do I improve my chess rating?",
  "What are common chess tactics?",
  "Tell me about famous chess games",
  "How do I study chess openings?",
  "What's the importance of endgames?",
  "Explain chess strategy vs tactics",
  "How do grandmasters think?"
];

export const ChatTab: React.FC<ChatTabProps> = ({
  sessionMode,
  setSessionMode,
  clearChatHistory,
  chatMessages,
  chatLoading,
  chatInput,
  setChatInput,
  handleChatKeyPress,
  sendChatMessage,
  gameInfo,
  currentMove
}) => {
  const handlePromptClick = (prompt: string) => {
    setChatInput(prompt);
  };

  const currentPrompts = sessionMode ? sessionPrompts : chatPrompts;

  return (
    <Stack
      spacing={2}
      sx={{
        height: "60vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6">AI Chat</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" sx={{ color: "wheat" }}>
            Session Mode
          </Typography>
          <Switch
            checked={sessionMode}
            onChange={(e) => setSessionMode(e.target.checked)}
            size="small"
          />
          <Button
            variant="outlined"
            size="small"
            onClick={clearChatHistory}
            disabled={chatMessages.length === 0}
          >
            Clear
          </Button>
        </Stack>
      </Box>

      {/* Mode Description */}
      <Paper sx={{ p: 2, backgroundColor: grey[700] }}>
        <Typography variant="caption" sx={{ color: "wheat" }}>
          {sessionMode
            ? "🔗 Session Mode: AI will analyze your questions with current position, engine data, and opening theory"
            : "💬 Chat Mode: General conversation without position context"}
        </Typography>
      </Paper>

      {/* Chat Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          border: `1px solid ${grey[600]}`,
          borderRadius: 1,
          p: 1,
          backgroundColor: grey[900],
        }}
      >
        {chatMessages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "wheat",
              p: 2,
            }}
          >
            <Message sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            <Typography variant="body1" sx={{ mb: 2, textAlign: "center" }}>
              Start a conversation with the AI
              {sessionMode && (
                <>
                  <br />
                  <Typography variant="caption" sx={{ fontStyle: "italic" }}>
                    Your messages will include current position analysis
                  </Typography>
                </>
              )}
            </Typography>
            
            {/* Pre-defined Prompts */}
            <Box sx={{ width: "100%", maxWidth: 500 }}>
              <Typography variant="caption" sx={{ mb: 1, display: "block", opacity: 0.8 }}>
                {sessionMode ? "Try asking about the position:" : "Popular topics:"}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  justifyContent: "center",
                }}
              >
                {currentPrompts.map((prompt, index) => (
                  <Chip
                    key={index}
                    label={prompt}
                    variant="outlined"
                    size="small"
                    onClick={() => handlePromptClick(prompt)}
                    sx={{
                      color: "wheat",
                      borderColor: grey[600],
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: grey[700],
                        borderColor: "wheat",
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        ) : (
          <Stack spacing={2}>
            {chatMessages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: "flex",
                  justifyContent:
                    message.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: "80%",
                    backgroundColor:
                      message.role === "user" ? "#1976d2" : grey[700],
                    color: "white",
                  }}
                >
                  {message.role === "assistant" ? (
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <Typography variant="body2">
                      {message.content}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.7, display: "block", mt: 1 }}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            ))}
            {chatLoading && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: grey[700],
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CircularProgress size={16} />
                  <Typography variant="body2" sx={{ color: "wheat" }}>
                    AI is thinking...
                  </Typography>
                </Paper>
              </Box>
            )}
          </Stack>
        )}
      </Box>

      {/* Chat Input */}
      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          placeholder={
            sessionMode ? "Ask about this position..." : "Chat with AI..."
          }
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleChatKeyPress}
          disabled={chatLoading}
          sx={{
            backgroundColor: grey[900],
            borderRadius: 1,
          }}
          slotProps={{
            input: {
              sx: { color: "wheat" },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={() => sendChatMessage(gameInfo, currentMove)}
          disabled={chatLoading || !chatInput.trim()}
        >
          <Send />
        </Button>
      </Stack>
    </Stack>
  );
};

export default ChatTab;