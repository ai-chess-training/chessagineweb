import React, { useEffect, useRef, useState, useCallback } from "react";
import { Send, MenuBook, Close, ContentCopy, History, Stop, Settings as SettingsIcon, VolumeUp, VolumeOff, Visibility, DeleteOutline } from "@mui/icons-material";
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { BookmarkAdd } from "@mui/icons-material";
import { Bookmark } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import { Chessboard } from "react-chessboard";
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
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions
} from "@mui/material";
import ModelSetting from "./ModelSetting";
import { ChatMessage } from "../../hooks/useAgine";
import { calculateChatPrice } from "@/libs/docs/helper";
import { useLocalStorage } from "usehooks-ts";
import { DEFAULT_CHAT_AUTOSCROLL, DEFAULT_CHAT_COMPACT_VIEW, DEFAULT_CHAT_FONT_SIZE, DEFAULT_CHAT_DIMENSIONS, DEFAULT_CHAT_SHOW_TIMESTAMP, DEFAULT_CHAT_SPEECH_PITCH, DEFAULT_CHAT_SPEECH_RATE, DEFAULT_CHAT_SPEECH_VOICE, DEFAULT_CHAT_SPEECH_VOLUME, DEFAULT_CHAT_TECHNICAL_INFO } from "@/libs/setting/helper";

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
    playMode?: boolean,
  ) => void;
  abortChatMessage?: () => void;
}

interface SavedPosition {
  id: string;
  fen: string;
  analysis: string;
  timestamp: Date;
  title?: string;
}


const sessionPrompts = [
  "What do you think about this position?",
  "Any ideas for my next move?",
  "How would you play this?",
  "What catches your eye here?",
  "Is this looking good or bad?",
  "What's your gut feeling about this position?",
  "Any cool tactics you spot?",
  "How should I approach this?",
  "What would you do here?",
  "See anything interesting?",
  "Thoughts on the position?",
  "Which move feels right to you?",
  "What's your take on this setup?",
];

const puzzlePrompts = [
  "Any hints you can share?",
  "How would you approach this puzzle?",
  "What do you see here?",
  "Got any ideas?",
  "What's your first thought?",
  "Can you give me a nudge in the right direction?",
];

const playPrompts = [
  "What would you play here?",
  "Should I castle or wait?",
  "Time to attack or be patient?",
  "How do I handle this threat?",
  "What's my opponent up to?",
  "Good time to trade pieces?",
  "Is this move safe enough?",
  "What's the plan here?",
  "Push the pawns or hold back?",
  "How can I coordinate better?",
  "See any tactics brewing?",
  "What piece should I develop next?",
];

const chatPrompts = [
  "Tell me about chess basics",
  "How do I get better at chess?",
  "What are your favorite tactics?",
  "Know any cool chess stories?",
  "How should I study openings?",
  "Why are endgames important?",
  "What's the difference between strategy and tactics?",
  "How do strong players think?",
  "What are the key chess principles?",
  "How do you calculate moves?",
  "Tell me about pawn structures",
  "Positional vs tactical play - what's the deal?",
  "Any time management tips?",
  "What opening mistakes should I avoid?",
  "How do I keep my king safe?",
  "How can I recognize patterns better?",
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
  const [chessboardModalOpen, setChessboardModalOpen] = useState(false);
  const [selectedFen, setSelectedFen] = useState<string>("");
  
  const [savedPositions, setSavedPositions] = useLocalStorage<SavedPosition[]>(
    "agine_position_library",
    []
  );
 
  const [libraryOpen, setLibraryOpen] = useState(false);

  const [autoScroll, setAutoScroll] = useLocalStorage<boolean>(
    "chat_ui_autoscroll",
    DEFAULT_CHAT_AUTOSCROLL
  )
  const [fontSize, setFontSize] = useLocalStorage<number>(
    "chat_ui_font_size",
    DEFAULT_CHAT_FONT_SIZE
  )
  const [showTimestamps, setShowTimestamps] = useLocalStorage<boolean>(
    "chat_ui_timestamp",
    DEFAULT_CHAT_SHOW_TIMESTAMP
  )
  const [showTechnicalInfo, setTechnicalInfo] = useLocalStorage<boolean>(
    "chat_ui_technical_info",
    DEFAULT_CHAT_TECHNICAL_INFO
  )
  const [compactView, setCompactView] = useLocalStorage<boolean>(
    "chat_ui_compact_view",
    DEFAULT_CHAT_COMPACT_VIEW
  )
  
  // Text-to-Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useLocalStorage<number>(
    "chat_ui_speech_rate",
    DEFAULT_CHAT_SPEECH_RATE
  )
  const [speechPitch, setSpeechPitch] = useLocalStorage<number>(
    "chat_ui_speech_pitch",
    DEFAULT_CHAT_SPEECH_PITCH
  )
  const [speechVolume, setSpeechVolume] = useLocalStorage<number>(
    "chat_ui_speech_volume",
    DEFAULT_CHAT_SPEECH_VOLUME
  )
  const [selectedVoice, setSelectedVoice] = useLocalStorage<string>(
    "chat_ui_speech_voice",
    DEFAULT_CHAT_SPEECH_VOICE
  )
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  
  // Resize functionality
  const [dimensions, setDimensions] = useLocalStorage<{width: number, height: number}>(
    "chat_ui_chat_dimensions",
    DEFAULT_CHAT_DIMENSIONS
  )
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimensionsRef = useRef({ width: 0, height: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Try to find a good default voice
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
        const preferredVoice = englishVoices.find(voice => voice.name.includes('Female')) || 
                              englishVoices.find(voice => voice.name.includes('Natural')) ||
                              englishVoices[0];
        
        if (preferredVoice && !selectedVoice) {
          setSelectedVoice(preferredVoice.name);
        }
      };

      // Load voices immediately if available
      loadVoices();
      
      // Also listen for the voiceschanged event (needed for some browsers)
      speechSynthesis.addEventListener('voiceschanged', loadVoices);
      
      return () => {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    } else {
      setSpeechEnabled(false);
    }
  }, [selectedVoice]);

  // Clean up speech when component unmounts
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Position Library functions
  const savePositionToLibrary = (message: ChatMessage) => {
    if (!message.fen || message.role !== 'assistant') return;
    
    const newPosition: SavedPosition = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fen: message.fen,
      analysis: message.content,
      timestamp: message.timestamp,
      title: `Analysis from ${message.timestamp.toLocaleDateString()}`
    };
    
    setSavedPositions(prev => [newPosition, ...prev]);
  };

  const deletePositionFromLibrary = (positionId: string) => {
    setSavedPositions(prev => prev.filter(pos => pos.id !== positionId));
  };

  const viewPositionFromLibrary = (position: SavedPosition) => {
    setSelectedFen(position.fen);
    setChessboardModalOpen(true);
    setLibraryOpen(false);
  };

  const isPositionSaved = (fen: string) => {
    return savedPositions.some(pos => pos.fen === fen);
  };

  // Text-to-Speech functions
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/[*_`~]/g, '') // Remove markdown formatting
      .replace(/#+\s/g, '') // Remove headers
      .replace(/>\s/g, '') // Remove blockquotes
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();
  };

  const speakMessage = (messageId: string, content: string) => {
    if (!speechEnabled || !('speechSynthesis' in window)) return;

    // Stop any current speech
    speechSynthesis.cancel();
    
    if (currentSpeakingId === messageId && isSpeaking) {
      // If clicking the same message that's playing, stop it
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      return;
    }

    const cleanText = stripMarkdown(content);
    
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Find the selected voice
    const voice = availableVoices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentSpeakingId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    };

    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    }
  };

  // Chessboard modal functions
  const openChessboardModal = (fen: string) => {
    setSelectedFen(fen);
    setChessboardModalOpen(true);
  };

  const openLibraryModal = () => {
    setLibraryOpen(true);
  }

  const closeLibraryModal = () => {
    setLibraryOpen(false);
  }

  const closeChessboardModal = () => {
    setChessboardModalOpen(false);
    setSelectedFen("");
  };

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
  let modeTitle = sessionMode ? "Chess Buddy Analysis" : "Chess Chat";
  let modeDescription = sessionMode
    ? "🤔 Let's look at this position together (I might miss things too!)"
    : "♟️ Just chatting about chess - no pressure, no perfect answers";

  if (puzzleMode) {
    currentPrompts = puzzlePrompts;
    modeTitle = "Puzzle Solving";
    modeDescription = "🧩 Let's figure this puzzle out together!";
  } else if (playMode) {
    currentPrompts = playPrompts;
    modeTitle = "Game Buddy";
    modeDescription = "🎮 I'm here to brainstorm moves with you";
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
          💡 Click any prompt to get started
        </Typography>
      </Box>
    </Box>
  );

  const libraryContent = (
    <Box sx={{ width: 400, height: "100%" }}>
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
          Position Library ({savedPositions.length})
        </Typography>
      </Box>
      
      <Box sx={{ 
        height: "calc(100% - 80px)", 
        overflowY: "auto",
        backgroundColor: "#1a1a1a",
        p: 1,
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
      }}>
        {savedPositions.length === 0 ? (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "100%",
            p: 2
          }}>
            <Bookmark sx={{ fontSize: 48, color: "grey.600", mb: 2 }} />
            <Typography variant="body2" sx={{ color: "grey.400", textAlign: "center" }}>
              No saved positions yet
            </Typography>
            <Typography variant="caption" sx={{ color: "grey.500", textAlign: "center", mt: 1 }}>
              Save assistant messages with positions to build your analysis library
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {savedPositions.map((position) => (
              <Card 
                key={position.id}
                sx={{ 
                  backgroundColor: "#2a2a2a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "#333",
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                  }
                }}
              >
                <CardContent sx={{ p: 1.5, pb: 1 }}>
                  <Typography variant="body2" sx={{ color: "white", mb: 1, fontWeight: 500 }}>
                    {position.title}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: "grey.400",
                      display: "block",
                      mb: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      lineHeight: 1.3
                    }}
                  >
                    {position.analysis}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "grey.500" }}>
                    {new Date(position.timestamp).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions sx={{ p: 1, pt: 0, justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="View position on board" arrow>
                          <IconButton
                            onClick={() => openChessboardModal(position.fen)}
                            sx={{
                              color: "rgba(255, 255, 255, 0.7)",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.4)",
                                color: "white",
                              },
                            }}
                            size="small"
                          >
                            <Visibility fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                    <Tooltip title="Copy analysis" arrow>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          copyMessage(position.analysis);
                        }}
                        size="small"
                        sx={{ 
                          color: "rgba(255, 255, 255, 0.7)",
                          "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            color: "white",
                          }
                        }}
                      >
                        <ContentCopy fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                     <Tooltip title="Delete from history" arrow>
                      <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePositionFromLibrary(position.id);
                    }}
                    size="small"
                    sx={{ 
                      color: "rgba(255, 255, 255, 0.5)",
                      "&:hover": {
                        color: "#ff6b6b",
                        backgroundColor: "rgba(255, 107, 107, 0.1)"
                      }
                    }}
                  >
                    <DeleteOutline />
                  </IconButton>
                    </Tooltip>
                  </Box>
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
      
      <Box sx={{ p: 2, borderTop: `1px solid rgba(255,255,255,0.1)`, backgroundColor: "#1a1a1a" }}>
        <Typography variant="caption" sx={{ color: "grey.400", fontStyle: "italic" }}>
         Your local saved position analyses
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
              Agine - Your Chess Buddy
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Action Buttons */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Conversation starters" arrow>
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{ color: "white", p: 0.5 }}
                size="small"
              >
                <MenuBook fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Position Library" arrow>
              <IconButton
                onClick={openLibraryModal}
                sx={{ 
                  color: savedPositions.length > 0 ? "#9c27b0" : "white", 
                  p: 0.5,
                  position: "relative"
                }}
                size="small"
              >
                <Bookmark fontSize="small" />
                {savedPositions.length > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 12,
                      height: 12,
                      backgroundColor: "#9c27b0",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "8px",
                      fontWeight: "bold",
                      color: "white"
                    }}
                  >
                    {savedPositions.length > 9 ? "9+" : savedPositions.length}
                  </Box>
                )}
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

            {speechEnabled && isSpeaking && (
              <Tooltip title="Stop speaking" arrow>
                <IconButton
                  onClick={stopSpeaking}
                  sx={{ color: "#ff6b6b", p: 0.5 }}
                  size="small"
                >
                  <VolumeOff fontSize="small" />
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
              Position Context
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
              {sessionMode ? "Looking at the board together" : "General chess chat"}
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
                ? "Hey! Let's figure out some good moves together" 
                : puzzleMode 
                ? "Ready to tackle this puzzle with you!"
                : "Hey there, chess friend!"
              }
            </Typography>
            <Typography variant="caption" sx={{ mb: 2, textAlign: "center", color: "grey.300", maxWidth: 320 }}>
              {playMode 
                ? "I'll share my thoughts on moves and positions."
                : puzzleMode 
                ? "Let's work on this puzzle together! I might not get it right the first time, but that's part of the fun."
                : sessionMode
                ? "I'll take a look at your position and share what I'm thinking."
                : "Let's chat about chess! I'm just a fellow chess enthusiast."
              }
            </Typography>
            
            {/* Disclaimer */}
            <Paper
              sx={{
                p: 1.5,
                mb: 3,
                backgroundColor: "rgba(156, 39, 176, 0.1)",
                border: "1px solid rgba(156, 39, 176, 0.3)",
                borderRadius: 2,
                maxWidth: 350,
              }}
            >
              <Typography variant="caption" sx={{ color: "grey.300", textAlign: "center", display: "block", lineHeight: 1.4 }}>
                ⚠️ <strong>Friendly reminder:</strong> I can make mistakes and miss things just like a human! 
                Always double-check important moves, especially in real games. 
                I am here to help you think through positions, not replace your own judgment.
              </Typography>
            </Paper>

            {/* Quick Start Prompts */}
            <Box sx={{ width: "100%" }}>
              <Typography
                variant="caption"
                sx={{ mb: 2, display: "block", opacity: 0.8, textAlign: "center", color: "grey.400" }}
              >
                Quick start - try one of these:
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
                  More conversation starters →
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
                    "&:hover .message-actions": {
                      opacity: 1,
                    },
                  }}
                >
                  {/* Message Actions */}
                  {message.role === "assistant" && (
                    <Box
                      className="message-actions"
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        opacity: 0,
                        transition: "opacity 0.2s",
                        display: "flex",
                        gap: 0.5,
                      }}
                    >
                       {/* Save to Library icon - only show for assistant messages with FEN */}
                      {message.fen && (
                        <Tooltip title={isPositionSaved(message.fen) ? "Position already saved" : "Save to position library"} arrow>
                          <IconButton
                            onClick={() => savePositionToLibrary(message)}
                            disabled={isPositionSaved(message.fen)}
                            sx={{
                              color: isPositionSaved(message.fen) ? "rgba(156, 39, 176, 0.5)" : "rgba(255, 255, 255, 0.7)",
                              backgroundColor: "rgba(0, 0, 0, 0.2)",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.4)",
                                color: isPositionSaved(message.fen) ? "rgba(156, 39, 176, 0.7)" : "#9c27b0",
                              },
                              "&:disabled": {
                                color: "rgba(156, 39, 176, 0.5)",
                              }
                            }}
                            size="small"
                          >
                            <BookmarkAdd fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {/* Eye icon for viewing chessboard - only show if FEN exists */}
                      {message.fen && (
                        <Tooltip title="View position on board" arrow>
                          <IconButton
                            onClick={() => openChessboardModal(message.fen)}
                            sx={{
                              color: "rgba(255, 255, 255, 0.7)",
                              backgroundColor: "rgba(0, 0, 0, 0.2)",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.4)",
                                color: "white",
                              },
                            }}
                            size="small"
                          >
                            <Visibility fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      {speechEnabled && (
                        <Tooltip title={currentSpeakingId === message.id && isSpeaking ? "Stop speaking" : "Listen to message"} arrow>
                          <IconButton
                            onClick={() => speakMessage(message.id, message.content)}
                            sx={{
                              color: currentSpeakingId === message.id && isSpeaking ? "#ff6b6b" : "rgba(255, 255, 255, 0.7)",
                              backgroundColor: "rgba(0, 0, 0, 0.2)",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.4)",
                                color: "white",
                              },
                            }}
                            size="small"
                          >
                            {currentSpeakingId === message.id && isSpeaking ? (
                              <VolumeOff fontSize="inherit" />
                            ) : (
                              <VolumeUp fontSize="inherit" />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Copy message" arrow>
                        <IconButton
                          onClick={() => copyMessage(message.content)}
                          sx={{
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
                    </Box>
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
                  {showTechnicalInfo && message.maxTokens && message.model && message.provider && (
                    <Typography
                      variant="caption"
                      sx={{ 
                        opacity: 0.7, 
                        display: "block", 
                        mt: 0.5,
                        fontSize: `${fontSize - 2}px`
                      }}
                    >
                      Tokens: {message.maxTokens} Cost: ${calculateChatPrice(message.maxTokens, message.model)}, {message.provider}: {message.model}
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
                ? "What are you thinking?" 
                : puzzleMode 
                  ? "Want to brainstorm this puzzle?" 
                  : sessionMode 
                    ? "What's on your mind about this position?" 
                    : "Let's talk chess..."
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

      {/* Library Modal */}
      <Dialog
        open={libraryOpen}
        onClose={closeLibraryModal}
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: "#1a1a1a",
            color: "white",
            minWidth: 450,
            maxHeight: "80vh"
          }
        }}
      >
        <DialogTitle sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          pb: 1
        }}>
         Agine Position Library
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {libraryContent}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLibraryModal} sx={{ color: "#9c27b0" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Chessboard Modal */}
      <Dialog
        open={chessboardModalOpen}
        onClose={closeChessboardModal}
        maxWidth="md"
       PaperProps={{
          sx: {
            backgroundColor: "#1a1a1a",
            color: "white",
            minWidth: 450,
            maxHeight: "80vh"
          }
        }}
      >
        <DialogTitle sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          pb: 1
        }}>
          <Typography variant="h6" sx={{ color: "white" }}>
            Position View
          </Typography>
          <IconButton onClick={closeChessboardModal} sx={{ color: "white" }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ 
            display: "flex", 
            justifyContent: "center",
            maxWidth: 400,
            mx: "auto"
          }}>
            {selectedFen && (
              <Chessboard 
                position={selectedFen}
                arePiecesDraggable={false}
                boardWidth={350}
                customBoardStyle={{
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                }}
              />
            )}
          </Box>
          <Typography 
            variant="caption" 
            sx={{ 
              color: "grey.400", 
              display: "block", 
              textAlign: "center", 
              mt: 2,
              fontFamily: "monospace"
            }}
          >
            FEN: {selectedFen}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => copyToClipboard(selectedFen)} 
            sx={{ color: "#9c27b0" }}
          >
            Copy FEN
          </Button>
          <Button onClick={closeChessboardModal} sx={{ color: "#9c27b0" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: {
            backgroundColor: "#1a1a1a",
            color: "white",
            minWidth: 450,
            maxHeight: "80vh"
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
                    Show tokens, model info
                  </Typography>
                  <Switch
                    checked={showTechnicalInfo}
                    onChange={(e) => setTechnicalInfo(e.target.checked)}
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

            {/* Text-to-Speech Settings */}
            {speechEnabled && (
              <>
                <Box>
                  <Typography variant="body2" sx={{ color: "grey.300", mb: 2 }}>
                    Text-to-Speech Settings
                  </Typography>
                  <Stack spacing={2}>
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ color: "grey.300" }}>Voice</InputLabel>
                      <Select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        label="Voice"
                        sx={{
                          color: "white",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(255,255,255,0.2)",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "rgba(255,255,255,0.3)",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#9c27b0",
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              backgroundColor: "#2a2a2a",
                              color: "white",
                            },
                          },
                        }}
                      >
                        {availableVoices.map((voice) => (
                          <MenuItem key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Box>
                      <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                        Speech Rate: {speechRate.toFixed(1)}x
                      </Typography>
                      <Box sx={{ px: 1 }}>
                        <input
                          type="range"
                          min={0.5}
                          max={2}
                          step={0.1}
                          value={speechRate}
                          onChange={(e) => setSpeechRate(Number(e.target.value))}
                          style={{
                            width: '100%',
                            accentColor: '#9c27b0'
                          }}
                        />
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                        Pitch: {speechPitch.toFixed(1)}
                      </Typography>
                      <Box sx={{ px: 1 }}>
                        <input
                          type="range"
                          min={0.5}
                          max={2}
                          step={0.1}
                          value={speechPitch}
                          onChange={(e) => setSpeechPitch(Number(e.target.value))}
                          style={{
                            width: '100%',
                            accentColor: '#9c27b0'
                          }}
                        />
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="body2" sx={{ color: "grey.300", mb: 1 }}>
                        Volume: {Math.round(speechVolume * 100)}%
                      </Typography>
                      <Box sx={{ px: 1 }}>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={speechVolume}
                          onChange={(e) => setSpeechVolume(Number(e.target.value))}
                          style={{
                            width: '100%',
                            accentColor: '#9c27b0'
                          }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                </Box>
                <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
              </>
            )}

            <ModelSetting/>
            
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