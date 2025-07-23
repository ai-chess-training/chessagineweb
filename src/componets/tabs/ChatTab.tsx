import React, { useEffect, useRef, useState } from "react";

import { grey } from "@mui/material/colors";
import { Send, MenuBook, Close, ContentCopy, History, Stop } from "@mui/icons-material";
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
  Avatar,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Tooltip,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
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
  puzzleMode?: boolean;
  playMode?: boolean; // New prop for play mode
  puzzleQuery?: string;
  setChatInput: (value: string) => void;
  handleChatKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  sendChatMessage: (
    gameInfo?: string,
    currentMove?: string,
    puzzleMode?: boolean,
    puzzleQuery?: string,
    playMode?: boolean // Add playMode parameter
  ) => void;
  abortChatMessage?: () => void; // New prop for aborting requests
}

const sessionPrompts = [
  "What's the best move in this position?",
  "Analyze the current position for me",
  "What are the key weaknesses in this position?",
  "Suggest a strategic plan",
  "Is this position winning or losing?",
  "What opening is this?",
  "Show me tactical opportunities",
  "Evaluate the pawn structure",
  "What are the candidate moves here?",
  "Explain the imbalances in this position",
  "How should I continue from here?",
  "What's the evaluation of this position?",
];

const puzzlePrompts = [
  "Can you give me a hint",
  "How to solve this puzzle",
  "Analyze this position for me",
  "What's the theme of this puzzle?",
  "Show me the key move",
  "Explain the solution step by step",
];

const playPrompts = [
  "What's the best move here?",
  "Should I castle now?",
  "Is this a good time to attack?",
  "How should I defend this position?",
  "What's my opponent's threat?",
  "Should I trade pieces?",
  "Is this move safe?",
  "What's the key plan in this position?",
  "Should I advance my pawns?",
  "How do I improve my piece coordination?",
  "Is there a tactical shot available?",
  "What's the most important piece to develop?",
];

const chatPrompts = [
  "Explain chess fundamentals",
  "How do I improve my chess rating?",
  "What are common chess tactics?",
  "Tell me about famous chess games",
  "How do I study chess openings?",
  "What's the importance of endgames?",
  "Explain chess strategy vs tactics",
  "How do grandmasters think?",
  "What are the basic chess principles?",
  "How to calculate variations?",
  "Explain pawn structures",
  "What's the difference between positional and tactical play?",
  "How to manage time in chess games?",
  "What are common opening mistakes?",
  "Explain king safety concepts",
  "How to improve pattern recognition?",
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
  abortChatMessage,
  gameInfo,
  currentMove,
  puzzleMode = false,
  playMode = false,
  puzzleQuery,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const [copyMenuAnchor, setCopyMenuAnchor] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  }, [chatMessages, chatLoading]);

  const  handlePromptSelect = (prompt: string) => {
    setChatInput(prompt);
    setDrawerOpen(false);
    // Auto-send the message
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySnackbar(true);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const copyMessage = (content: string) => {
    copyToClipboard(content);
  };

  const copyEntireChat = () => {
    const chatHistory = chatMessages
      .map((msg) => `**${msg.role === 'user' ? 'You' : 'Agine'}** (${msg.timestamp.toLocaleString()}):\n${msg.content}`)
      .join('\n\n---\n\n');
    
    copyToClipboard(chatHistory);
    setCopyMenuAnchor(null);
  };

  const handleCopyMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setCopyMenuAnchor(event.currentTarget);
  };

  const handleCopyMenuClose = () => {
    setCopyMenuAnchor(null);
  };

  const handleAbortMessage = () => {
    if (abortChatMessage) {
      abortChatMessage();
    }
  };

  // Determine which prompts to show based on mode
  let currentPrompts = sessionMode ? sessionPrompts : chatPrompts;
  let modeTitle = sessionMode ? "Position Analysis" : "Chess Discussion";
  let modeDescription = sessionMode
    ? "🔗 Session Mode: Agine will analyze your questions with current position, engine data, and opening theory"
    : "💬 Chat Mode: General conversation without position context";

  if (puzzleMode) {
    currentPrompts = puzzlePrompts;
    modeTitle = "Puzzle Prompts";
    modeDescription = "🧩 Puzzle Mode: Get hints and solutions for chess puzzles";
  } else if (playMode) {
    currentPrompts = playPrompts;
    modeTitle = "Game Assistant";
    modeDescription = "🎮 Play Mode: Get real-time assistance during your game";
  }

  const drawerContent = (
    <Box sx={{ width: 350, height: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: `1px solid ${grey[600]}`,
        }}
      >
        <Typography variant="h6" sx={{ color: "wheat", fontWeight: "bold" }}>
          {modeTitle}
        </Typography>
        <IconButton
          onClick={() => setDrawerOpen(false)}
          sx={{ color: "wheat" }}
        >
          <Close />
        </IconButton>
      </Box>
      
      <List sx={{ p: 0 }}>
        {currentPrompts.map((prompt, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton
              onClick={() => handlePromptSelect(prompt)}
              sx={{
                py: 1.5,
                px: 2,
                borderBottom: index < currentPrompts.length - 1 ? `1px solid ${grey[700]}` : "none",
                "&:hover": {
                  backgroundColor: grey[700],
                },
              }}
            >
              <ListItemText
                primary={prompt}
                sx={{
                  "& .MuiListItemText-primary": {
                    color: "wheat",
                    fontSize: "0.9rem",
                    lineHeight: 1.4,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ p: 2, mt: "auto", borderTop: `1px solid ${grey[600]}` }}>
        <Typography variant="caption" sx={{ color: grey[400], fontStyle: "italic" }}>
          💡 Click any prompt to send it instantly
        </Typography>
      </Box>
    </Box>
  );

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
        <Typography variant="h6">AgineAI Chat</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title="Prompt Drawer" arrow>
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{ 
                color: "wheat",
                backgroundColor: grey[700],
                "&:hover": {
                  backgroundColor: grey[600],
                },
              }}
              size="small"
            >
              <MenuBook />
            </IconButton>
          </Tooltip>

          {chatMessages.length > 0 && (
            <Tooltip title="Copy Chat History" arrow>
              <IconButton
                onClick={handleCopyMenuClick}
                sx={{ 
                  color: "wheat",
                  backgroundColor: grey[700],
                  "&:hover": {
                    backgroundColor: grey[600],
                  },
                }}
                size="small"
              >
                <History />
              </IconButton>
            </Tooltip>
          )}
          
          {!puzzleMode && !playMode ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" sx={{ color: "wheat" }}>
                Session Mode
              </Typography>
              <Switch
                checked={sessionMode}
                onChange={(e) => setSessionMode(e.target.checked)}
                size="small"
              />
            </Stack>
          ) : (
            <Button
              variant="outlined"
              size="small"
              sx={{ color: "wheat" }}
              onClick={clearChatHistory}
              disabled={chatMessages.length === 0}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {/* Mode Description */}
      <Paper sx={{ p: 2, backgroundColor: grey[700] }}>
        <Typography variant="caption" sx={{ color: "wheat" }}>
          {modeDescription}
        </Typography>
      </Paper>

      {/* Chat Messages */}
      <Box
        ref={chatContainerRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          border: `1px solid ${grey[600]}`,
          borderRadius: 1,
          p: 1,
          backgroundColor: grey[900],
          position: "relative",
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
            <Avatar
              src="/static/images/agineowl.png"
              sx={{
                width: 55,
                height: 55,
                mr: 1,
                mt: 0.5,
                mb: 2,
              }}
            />
            <Typography variant="body1" sx={{ mb: 3, textAlign: "center" }}>
              {playMode 
                ? "Ready to help you during your game!" 
                : puzzleMode 
                ? "Let's solve some chess puzzles together!"
                : "Hey friend, lets talk about chess positions!"
              }
            </Typography>

            {/* Quick Start Prompts */}
            <Box sx={{ width: "100%", maxWidth: 500 }}>
              <Typography
                variant="caption"
                sx={{ mb: 2, display: "block", opacity: 0.8, textAlign: "center" }}
              >
                Quick start - click any topic:
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  justifyContent: "center",
                }}
              >
                {currentPrompts.slice(0, 6).map((prompt, index) => (
                  <Chip
                    key={index}
                    label={prompt}
                    variant="outlined"
                    size="small"
                    onClick={() => handlePromptSelect(prompt)}
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
              <Box sx={{ textAlign: "center", mt: 2 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setDrawerOpen(true)}
                  sx={{ 
                    color: grey[400],
                    textDecoration: "underline",
                    "&:hover": {
                      color: "wheat",
                    },
                  }}
                >
                  View all prompts →
                </Button>
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
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar for assistant messages */}
                {message.role === "assistant" && (
                  <Avatar
                    src="/static/images/agineowl.png"
                    sx={{
                      width: 32,
                      height: 32,
                      mr: 1,
                      mt: 0.5,
                      flexShrink: 0,
                    }}
                  />
                )}

                <Paper
                  sx={{
                    p: 2,
                    maxWidth: "80%",
                    backgroundColor:
                      message.role === "user" ? "#1976d2" : "#5a2d80",
                    color: "white",
                    borderRadius: 2,
                    position: "relative",
                    "&:hover .copy-button": {
                      opacity: 1,
                    },
                  }}
                >
                  {message.role === "assistant" && (
                    <Tooltip title="Copy message" arrow>
                      <IconButton
                        className="copy-button"
                        onClick={() => copyMessage(message.content)}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          opacity: 0,
                          transition: "opacity 0.2s",
                          color: "rgba(255, 255, 255, 0.7)",
                          backgroundColor: "rgba(0, 0, 0, 0.2)",
                          "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            color: "white",
                          },
                        }}
                        size="small"
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <Typography variant="body2" component="p" sx={{ mb: 1, "&:last-child": { mb: 0 } }}>
                            {children}
                          </Typography>
                        ),
                        ul: ({ children }) => (
                          <Box component="ul" sx={{ pl: 2, mb: 1 }}>
                            {children}
                          </Box>
                        ),
                        li: ({ children }) => (
                          <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                            {children}
                          </Typography>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <Typography variant="body2">{message.content}</Typography>
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
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "flex-start",
                }}
              >
                <Avatar
                  src="/static/images/agineowl.png"
                  sx={{
                    width: 32,
                    height: 32,
                    mr: 1,
                    mt: 0.5,
                    flexShrink: 0,
                  }}
                />
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: "#5a2d80",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderRadius: 2,
                  }}
                >
                  <CircularProgress size={16} sx={{ color: "wheat" }} />
                  <Typography variant="body2" sx={{ color: "wheat" }}>
                    Agine is thinking...
                  </Typography>
                  {abortChatMessage && (
                    <Tooltip title="Stop response" arrow>
                      <IconButton
                        onClick={handleAbortMessage}
                        size="small"
                        sx={{
                          color: "wheat",
                          ml: 1,
                          "&:hover": {
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                          },
                        }}
                      >
                        <Stop fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Paper>
              </Box>
            )}
            {/* Invisible div for auto-scroll */}
            <div ref={messagesEndRef} />
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
            playMode 
              ? "Ask for game advice..." 
              : puzzleMode 
                ? "Ask about this puzzle..." 
                : sessionMode 
                  ? "Ask about this position..." 
                  : "Chat with AI..."
          }
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleChatKeyPress}
          disabled={chatLoading}
          sx={{
            backgroundColor: grey[900],
            borderRadius: 1,
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: grey[600],
              },
              "&:hover fieldset": {
                borderColor: grey[500],
              },
              "&.Mui-focused fieldset": {
                borderColor: "wheat",
              },
            },
          }}
          slotProps={{
            input: {
              sx: { color: "wheat" },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={() =>
            sendChatMessage(gameInfo, currentMove, puzzleMode, puzzleQuery, playMode)
          }
          disabled={chatLoading || !chatInput.trim()}
          sx={{
            minWidth: "auto",
            px: 2,
          }}
        >
          <Send />
        </Button>
      </Stack>

      {/* Copy Menu */}
      <Menu
        anchorEl={copyMenuAnchor}
        open={Boolean(copyMenuAnchor)}
        onClose={handleCopyMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: grey[800],
            color: "wheat",
          },
        }}
      >
        <MenuItem onClick={copyEntireChat}>
          <ContentCopy sx={{ mr: 1 }} fontSize="small" />
          Copy Entire Chat History
        </MenuItem>
      </Menu>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={() => setCopySnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          onClose={() => setCopySnackbar(false)} 
          severity="success" 
          variant="filled"
          sx={{ 
            backgroundColor: "#4caf50",
            color: "white"
          }}
        >
          Copied to clipboard!
        </Alert>
      </Snackbar>

      {/* Prompts Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: grey[800],
            color: "wheat",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Stack>
  );
};

export default ChatTab;