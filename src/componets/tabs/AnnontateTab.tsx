import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  SmartToy,
  Person as PersonIcon,
  AutoAwesome as GenerateIcon,
  ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { grey } from "@mui/material/colors";

interface ChessAnnotationProps {
  analyzePosition: (customQuery?: string) => Promise<string>;
  disabled?: boolean;
  pretext?: string;
  aiAnnotation: string | null;
  setAiAnnotation: (annon: string) => void;
  setIsGenerating: (gen: boolean) => void;
  isGenerating: boolean;
}

const AnnotationTab: React.FC<ChessAnnotationProps> = ({
  analyzePosition,
  disabled = false,
  pretext,
  aiAnnotation,
  setAiAnnotation,
  setIsGenerating,
  isGenerating,
}) => {
  const [userThoughts, setUserThoughts] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);

   useEffect(() => {
    setUserThoughts(pretext || "");
  }, [pretext]);

  
  const handleGenerateAnnotation = async () => {
    try {
      setIsGenerating(true);
      setAiAnnotation(""); // Clear previous annotation

      // Build custom query with user thoughts if provided
      const customQuery = userThoughts.trim()
        ? `Please consider the following user thoughts and questions: ${userThoughts.trim()}`
        : undefined;

      const result = await analyzePosition(customQuery);
      setAiAnnotation(result);
    } catch (error) {
      console.error("Error generating annotation:", error);
      setAiAnnotation("Error generating annotation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAnnotation = async () => {
    if (!aiAnnotation) return;
    
    try {
      await navigator.clipboard.writeText(aiAnnotation);
      setCopySuccess(true);
    } catch (error) {
      console.error("Failed to copy annotation:", error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = aiAnnotation;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleCloseCopySnackbar = () => {
    setCopySuccess(false);
  };

  const handleClearThoughts = () => {
    setUserThoughts("");
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        p: 3,
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1200,
          mx: "auto",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* AI Annotation Section - Now Scrollable */}
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: 3,
            flex: 1, // Take remaining space
            minHeight: 400,
            maxHeight: "60vh", // Limit height to make room for other sections
            color: "wheat",
            backgroundColor: grey[900],
            borderRadius: 2,
            boxShadow: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SmartToy color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                AgineAI Annotation
              </Typography>
            </Box>
            
            {aiAnnotation && !isGenerating && (
              <Tooltip title="Copy annotation">
                <IconButton
                  onClick={handleCopyAnnotation}
                  size="small"
                  sx={{
                    color: "wheat",
                    "&:hover": {
                      backgroundColor: grey[800],
                    },
                  }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Scrollable Content Area */}
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: grey[800],
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: grey[600],
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: grey[500],
                },
              },
            }}
          >
            {isGenerating ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 120,
                  gap: 2,
                }}
              >
                <CircularProgress size={40} />
                <Typography variant="body2" color="wheat" >
                  Generating...
                </Typography>
              </Box>
            ) : aiAnnotation ? (
              <ReactMarkdown>{aiAnnotation}</ReactMarkdown>
            ) : (
              <Typography
                variant="body2"
                color="wheat"
                sx={{
                  fontStyle: "italic",
                  textAlign: "center",
                  py: 4,
                  fontSize: "1rem",
                }}
              >
                Click Generate Annotation to get Agine thoughts about current
                position
              </Typography>
            )}
          </Box>
        </Paper>

        <Divider sx={{ my: 2 }} />

        {/* User Thoughts Section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <PersonIcon color="secondary" />
            <Typography variant="subtitle1" fontWeight="medium">
              Your Thoughts
            </Typography>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="Share your thoughts about the position, specific moves you're considering, or questions you'd like the AI to address..."
            value={userThoughts}
            onChange={(e) => setUserThoughts(e.target.value)}
            disabled={disabled || isGenerating}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: grey[900],
                borderRadius: 2,
                color: "wheat",
                fontSize: "1.1rem",
                "& input": {
                  fontSize: "1.1rem",
                },
                "& textarea": {
                  fontSize: "1.1rem",
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "wheat",
                opacity: 0.7,
                fontSize: "1.1rem",
              },
            }}
          />

          {userThoughts && (
            <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
              <Button
                size="small"
                onClick={handleClearThoughts}
                disabled={disabled || isGenerating}
              >
                Clear
              </Button>
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mb: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleGenerateAnnotation}
            disabled={disabled || isGenerating}
            startIcon={
              isGenerating ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <GenerateIcon />
              )
            }
            sx={{
              minWidth: 180,
              borderRadius: 2,
              textTransform: "none",
              fontSize: "1rem",
            }}
          >
            {isGenerating
              ? "Generating..."
              : userThoughts.trim()
              ? "Generate Annotation With Context"
              : "Generate Annotation"}
          </Button>
        </Box>
      </Box>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={handleCloseCopySnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseCopySnackbar} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          Annotation copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AnnotationTab;