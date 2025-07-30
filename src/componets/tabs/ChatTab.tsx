import React, { useEffect, useRef, useState, useCallback } from "react";

import { Send, MenuBook, Close, ContentCopy, History, Stop, Settings as SettingsIcon } from "@mui/icons-material";
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
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
  playMode?: boolean;
  puzzleQuery?: string;
  setChatInput: (value: string) => void;
  handleChatKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  sendChatMessage: (
    gameInfo?: string,
    currentMove?: string,
    puzzleMode?: boolean,
    puzzleQuery?: string,
    playMode?: boolean
  ) => void;
  abortChatMessage?: () => void;
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const [copyMenuAnchor, setCopyMenuAnchor] = useState<null | HTMLElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [compactView, setCompactView] = useState(false);
  
  // Resize functionality
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimensionsRef = useRef({ width: 0, height: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Resize handler
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startDimensionsRef.current = { ...dimensions };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      
      // Set min and max limits
      const minWidth = 350;
      const maxWidth = 1200;
      const minHeight = 400;
      const maxHeight = 900;
      
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startDimensionsRef.current.width + deltaX));
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startDimensionsRef.current.height + deltaY));
      
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dimensions]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && autoScroll) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end"
      });
    }
  }, [chatMessages, chatLoading, autoScroll]);

  const handlePromptSelect = (prompt: string) => {
    setChatInput(prompt);
    setDrawerOpen(false);
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

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  // Determine which prompts to show based on mode
  let currentPrompts = sessionMode ? sessionPrompts : chatPrompts;
  let modeTitle = sessionMode ? "Position Analysis" : "Chess Discussion";
  let modeDescription = sessionMode
    ? "🔗 Session Mode: Agine will analyze your questions with current position, engine data, and opening theory"
    : "💬 Chat Mode: General conversation without position context";

  if (puzzleMode) {
    currentPrompts = puzzlePrompts;
    modeTitle = "Puzzle Assistant";
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
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
          backgroundColor: "#1a1a1a",
        }}
      >
        <Typography variant="subtitle1" sx={{ color: "white", fontWeight: 600 }}>
          {modeTitle}
        </Typography>
        <IconButton
          onClick={() => setDrawerOpen(false)}
          sx={{ color: "white" }}
          size="small"
        >
          <Close />
        </IconButton>
      </Box>
      
      <List sx={{ p: 0, backgroundColor: "#1a1a1a", height: "calc(100% - 80px)" }}>
        {currentPrompts.map((prompt, index) => (
          <ListItem key={index} disablePadding>
            <ListItemButton
              onClick={() => handlePromptSelect(prompt)}
              sx={{
                py: 1.5,
                px: 2,
                borderBottom: index < currentPrompts.length - 1 ? `1px solid rgba(255,255,255,0.1)` : "none",
                "&:hover": {
                  backgroundColor: "#2a2a2a",
                },
              }}
            >
              <ListItemText
                primary={prompt}
                sx={{
                  "& .MuiListItemText-primary": {
                    color: "white",
                    fontSize: "0.9rem",
                    lineHeight: 1.4,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ p: 2, borderTop: `1px solid rgba(255,255,255,0.1)`, backgroundColor: "#1a1a1a" }}>
        <Typography variant="caption" sx={{ color: "grey.400", fontStyle: "italic" }}>
          💡 Click any prompt to use it
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1a1a1a",
        overflow: "hidden",
        position: "relative",
        border: "1px solid #444",
        borderRadius: 1,
        userSelect: isResizing ? 'none' : 'auto',
      }}
    >
      {/* Header */}
      <Paper
        sx={{
          p: 1.5,
          backgroundColor: "#1a1a1a",
          borderRadius: 0,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Avatar
              src="/static/images/agineowl.png"
              sx={{
                width: 20,
                height: 20,
              }}
            />
            <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600 }}>
              AgineAI Chat
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Action Buttons */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Quick Prompts" arrow>
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{ color: "white", p: 0.5 }}
                size="small"
              >
                <MenuBook fontSize="small" />
              </IconButton>
            </Tooltip>

            {chatMessages.length > 0 && (
              <Tooltip title="Chat History" arrow>
                <IconButton
                  onClick={handleCopyMenuClick}
                  sx={{ color: "white", p: 0.5 }}
                  size="small"
                >
                  <History fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="Settings" arrow>
              <IconButton
                onClick={() => setSettingsOpen(true)}
                sx={{ color: "white", p: 0.5 }}
                size="small"
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Mode Controls */}
        {!puzzleMode && !playMode && (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="caption" sx={{ color: "white", fontWeight: 500 }}>
              Session Mode
            </Typography>
            <Switch
              checked={sessionMode}
              onChange={(e) => setSessionMode(e.target.checked)}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#9c27b0',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#9c27b0',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: "grey.400", fontSize: '11px' }}>
              {sessionMode ? "Position context enabled" : "General chat mode"}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            {chatMessages.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearChatHistory}
                sx={{ 
                  color: "white",
                  borderColor: "rgba(255,255,255,0.3)",
                  fontSize: '11px',
                  py: 0.5,
                  px: 1,
                  "&:hover": {
                    borderColor: "#9c27b0",
                    backgroundColor: "rgba(156, 39, 176, 0.1)",
                  }
                }}
              >
                Clear
              </Button>
            )}
          </Stack>
        )}

        {(puzzleMode || playMode) && (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Chip 
              label={modeTitle}
              size="small"
              sx={{ 
                backgroundColor: "#9c27b0", 
                color: "white",
                fontWeight: 500,
                fontSize: '11px'
              }} 
            />
            <Typography variant="caption" sx={{ color: "grey.400", fontSize: '10px' }}>
              {modeDescription}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            {chatMessages.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearChatHistory}
                sx={{ 
                  color: "white",
                  borderColor: "rgba(255,255,255,0.3)",
                  fontSize: '11px',
                  py: 0.5,
                  px: 1,
                  "&:hover": {
                    borderColor: "#9c27b0",
                    backgroundColor: "rgba(156, 39, 176, 0.1)",
                  }
                }}
              >
                Clear
              </Button>
            )}
          </Stack>
        )}
      </Paper>

      {/* Chat Messages */}
      <Box
        ref={chatContainerRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          backgroundColor: "#1a1a1a",
          position: "relative",
          px: 1.5,
          py: 1,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#2a2a2a',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#555',
            borderRadius: '3px',
            '&:hover': {
              background: '#666',
            },
          },
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
              color: "white",
              p: 2,
            }}
          >
            <Avatar
              src="/static/images/agineowl.png"
              sx={{
                width: 50,
                height: 50,
                mb: 2,
              }}
            />
            <Typography variant="subtitle1" sx={{ mb: 1, textAlign: "center", fontWeight: 500 }}>
              {playMode 
                ? "Ready to help you win!" 
                : puzzleMode 
                ? "Let's solve some puzzles!"
                : "Let's talk chess!"
              }
            </Typography>
            <Typography variant="caption" sx={{ mb: 3, textAlign: "center", color: "grey.300", maxWidth: 300 }}>
              {playMode 
                ? "Ask me about your moves, tactics, and strategy during your game."
                : puzzleMode 
                ? "Need a hint? Want to understand the solution? Just ask!"
                : sessionMode
                ? "I'll analyze the current position and provide detailed insights."
                : "Ask me anything about chess - from basics to advanced strategy."
              }
            </Typography>

            {/* Quick Start Prompts */}
            <Box sx={{ width: "100%" }}>
              <Typography
                variant="caption"
                sx={{ mb: 2, display: "block", opacity: 0.8, textAlign: "center", color: "grey.400" }}
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
                {currentPrompts.slice(0, 4).map((prompt, index) => (
                  <Chip
                    key={index}
                    label={prompt}
                    variant="outlined"
                    size="small"
                    onClick={() => handlePromptSelect(prompt)}
                    sx={{
                      color: "white",
                      borderColor: "rgba(156, 39, 176, 0.5)",
                      cursor: "pointer",
                      fontSize: '10px',
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "rgba(156, 39, 176, 0.2)",
                        borderColor: "#9c27b0",
                        transform: "translateY(-1px)",
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
                    color: "#9c27b0",
                    fontSize: '11px',
                    "&:hover": {
                      backgroundColor: "rgba(156, 39, 176, 0.1)",
                    },
                  }}
                >
                  View all prompts →
                </Button>
              </Box>
            </Box>
          </Box>
        ) : (
          <Stack spacing={compactView ? 0.5 : 1}>
            {chatMessages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: "flex",
                  justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar for assistant messages */}
                {message.role === "assistant" && (
                  <Avatar
                    src="/static/images/agineowl.png"
                    sx={{
                      width: compactView ? 24 : 28,
                      height: compactView ? 24 : 28,
                      mr: 1,
                      mt: 0.5,
                      flexShrink: 0,
                    }}
                  />
                )}

                <Paper
                  sx={{
                    p: compactView ? 1 : 1.5,
                    maxWidth: "85%",
                    backgroundColor: message.role === "user" ? "#1976d2" : "#7b1fa2",
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
                          top: 2,
                          right: 2,
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
                        <ContentCopy fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {message.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <Typography 
                            variant="body2" 
                            component="p" 
                            sx={{ 
                              mb: 0.5, 
                              "&:last-child": { mb: 0 },
                              fontSize: `${fontSize}px`,
                              lineHeight: compactView ? 1.2 : 1.4
                            }}
                          >
                            {children}
                          </Typography>
                        ),
                        ul: ({ children }) => (
                          <Box component="ul" sx={{ pl: 2, mb: 0.5 }}>
                            {children}
                          </Box>
                        ),
                        li: ({ children }) => (
                          <Typography 
                            component="li" 
                            variant="body2" 
                            sx={{ 
                              mb: 0.25,
                              fontSize: `${fontSize}px`,
                            }}
                          >
                            {children}
                          </Typography>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  ) : (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: `${fontSize}px`,
                        lineHeight: compactView ? 1.2 : 1.4
                      }}
                    >
                      {message.content}
                    </Typography>
                  )}
                  {showTimestamps && (
                    <Typography
                      variant="caption"
                      sx={{ 
                        opacity: 0.7, 
                        display: "block", 
                        mt: 0.5,
                        fontSize: `${fontSize - 2}px`
                      }}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </Typography>
                  )}
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
                    width: compactView ? 24 : 28,
                    height: compactView ? 24 : 28,
                    mr: 1,
                    mt: 0.5,
                    flexShrink: 0,
                  }}
                />
                <Paper
                  sx={{
                    p: compactView ? 1 : 1.5,
                    backgroundColor: "#7b1fa2",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderRadius: 2,
                  }}
                >
                  <CircularProgress size={14} sx={{ color: "white" }} />
                  <Typography variant="caption" sx={{ color: "white", fontSize: `${fontSize}px` }}>
                    Agine is thinking...
                  </Typography>
                  {abortChatMessage && (
                    <Tooltip title="Stop response" arrow>
                      <IconButton
                        onClick={handleAbortMessage}
                        size="small"
                        sx={{
                          color: "white",
                          ml: 0.5,
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
      <Paper
        sx={{
          p: 1.5,
          backgroundColor: "#1a1a1a",
          borderRadius: 0,
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
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
                    : "Chat with Agine..."
            }
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyPress}
            disabled={chatLoading}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "rgba(255,255,255,0.05)",
                "& fieldset": {
                  borderColor: "rgba(255,255,255,0.2)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255,255,255,0.3)",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#9c27b0",
                },
              },
            }}
            slotProps={{
              input: {
                sx: { 
                  color: "white",
                  fontSize: `${fontSize}px`
                },
              },
            }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={() => sendChatMessage(gameInfo, currentMove, puzzleMode, puzzleQuery, playMode)}
            disabled={chatLoading || !chatInput.trim()}
            sx={{
              minWidth: "auto",
              px: 1.5,
              backgroundColor: "#9c27b0",
              "&:hover": {
                backgroundColor: "#7b1fa2",
              },
              "&:disabled": {
                backgroundColor: "rgba(156, 39, 176, 0.3)",
              }
            }}
          >
            <Send fontSize="small" />
          </Button>
        </Stack>
      </Paper>

      {/* Resize Handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '16px',
          height: '16px',
          cursor: 'nw-resize',
          backgroundColor: '#555',
          borderTopRightRadius: '3px',
          opacity: 0.7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': {
            opacity: 1,
            backgroundColor: '#666',
          },
        }}
      >
        <OpenInFullIcon 
          sx={{ 
            fontSize: '10px', 
            color: '#ccc',
            transform: 'rotate(180deg)'
          }} 
        />
      </Box>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: {
            backgroundColor: "#1a1a1a",
            color: "white",
            minWidth: 400
          }
        }}
      >
        <DialogTitle>Chat Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Box>
              <Typography variant="body2" sx={{ color: "grey.300", mb: 2 }}>
                Display Options
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Auto-scroll to new messages
                  </Typography>
                  <Switch
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#9c27b0',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#9c27b0',
                      },
                    }}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Show timestamps
                  </Typography>
                  <Switch
                    checked={showTimestamps}
                    onChange={(e) => setShowTimestamps(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#9c27b0',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#9c27b0',
                      },
                    }}
                  />
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ color: "grey.300" }}>
                    Compact view
                  </Typography>
                  <Switch
                    checked={compactView}
                    onChange={(e) => setCompactView(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#9c27b0',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#9c27b0',
                      },
                    }}
                  />
                </Stack>
              </Stack>
            </Box>
            
            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
            
            <Box>
              <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                Font Size: {fontSize}px
              </Typography>
              <Typography variant="caption" sx={{ color: "grey.400", mb: 2, display: "block" }}>
                Adjust text size for better readability
              </Typography>
              <Box sx={{ px: 1 }}>
                <input
                  type="range"
                  min={12}
                  max={18}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#9c27b0'
                  }}
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSettingsClose} sx={{ color: "#9c27b0" }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Menu */}
      <Menu
        anchorEl={copyMenuAnchor}
        open={Boolean(copyMenuAnchor)}
        onClose={handleCopyMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: "#1a1a1a",
            color: "white",
            border: "1px solid rgba(255,255,255,0.1)",
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
            backgroundColor: "#9c27b0",
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
            backgroundColor: "#1a1a1a",
            color: "white",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default ChatTab;