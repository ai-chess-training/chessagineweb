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
  chatInput: string;
  setChatInput: (value: string) => void;
  handleChatKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  sendChatMessage: () => void;
}

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
}) => (
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
          }}
        >
          <Message sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
       
            Start a conversation with the AI
            {sessionMode && (
              <>
                <br />
                <Typography variant="caption" sx={{ fontStyle: "italic" }}>
                  Your messages will include current position analysis
                </Typography>
              </>
            )}
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
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <span {...props} />,
                    }}
                  >
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
        onClick={sendChatMessage}
        disabled={chatLoading || !chatInput.trim()}
      >
        <Send />
      </Button>
    </Stack>
  </Stack>
);

export default ChatTab;
