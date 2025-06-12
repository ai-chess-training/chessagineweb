import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Divider,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  SmartToy,
  Person as PersonIcon,
  AutoAwesome as GenerateIcon,
} from '@mui/icons-material';
import { grey } from '@mui/material/colors';

interface ChessAnnotationProps {
  analyzePosition: (customQuery?: string) => Promise<string>;
  disabled?: boolean;
  pretext?: string;
}

const AnnotationTab: React.FC<ChessAnnotationProps> = ({
  analyzePosition,
  disabled = false,
  pretext,
}) => {
  const [userThoughts, setUserThoughts] = useState<string>('');
  const [aiAnnotation, setAiAnnotation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Set pretext when it becomes available
  useEffect(() => {
    if (pretext && !userThoughts) {
      setUserThoughts(pretext);
    }
  }, [pretext, userThoughts]);

  const handleGenerateAnnotation = async () => {
    try {
      setIsGenerating(true);
      setAiAnnotation(''); // Clear previous annotation
      
      // Build custom query with user thoughts if provided
      const customQuery = userThoughts.trim() 
       ? `Please consider the following user thoughts and questions: ${userThoughts.trim()}`
      : undefined;
      
      const result = await analyzePosition(customQuery);
      setAiAnnotation(result);
    } catch (error) {
      console.error('Error generating annotation:', error);
      setAiAnnotation('Error generating annotation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearThoughts = () => {
    setUserThoughts('');
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      p: 3,
      backgroundColor: 'transparent',
      overflow: 'hidden'
    }}>
      {/* Remove the outer Card wrapper to blend with tab background */}
      <Box sx={{ 
        width: '100%', 
        maxWidth: 1200, 
        mx: 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
    
        {/* AI Annotation Section */}
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 3, 
            mb: 3, 
            minHeight: 500,
            color: "wheat",
            backgroundColor: grey[900],
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SmartToy color="primary" />
            <Typography variant="subtitle1" fontWeight="medium">
              AgineAI Annotation
            </Typography>
          </Box>
          
          {isGenerating ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: 120,
              gap: 2
            }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Analyzing position...
              </Typography>
            </Box>
          ) : aiAnnotation ? (
            <Typography 
              variant="body1" 
              sx={{ 
                color: "wheat",
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                fontSize: '1.1rem',
                fontFamily: 'monospace'
              }}
            >
              {aiAnnotation}
            </Typography>
          ) : (
            <Typography 
              variant="body2" 
              color="wheat"
              sx={{ 
                fontStyle: 'italic',
                textAlign: 'center',
                py: 4,
                fontSize: '1rem'
              }}
            >
              Click Generate Annontation to get Agine thoughts about current positio
            </Typography>
          )}
        </Paper>

        <Divider sx={{ my: 3 }} />

        {/* User Thoughts Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonIcon color="secondary" />
            <Typography variant="subtitle1" fontWeight="medium">
              Your Thoughts
            </Typography>
          </Box>
          
          <TextField
            fullWidth
            multiline
            rows={6}
            variant="outlined"
            placeholder="Share your thoughts about the position, specific moves you're considering, or questions you'd like the AI to address..."
            value={userThoughts}
            onChange={(e) => setUserThoughts(e.target.value)}
            disabled={disabled || isGenerating}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: grey[900],
                borderRadius: 2,
                color: "wheat",
                fontSize: '1.1rem',
                '& input': {
                  fontSize: '1.1rem',
                },
                '& textarea': {
                  fontSize: '1.1rem',
                }
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'wheat',
                opacity: 0.7,
                fontSize: '1.1rem'
              }
            }}
          />
          
          {userThoughts && (
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
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
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
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
              textTransform: 'none',
              fontSize: '1rem'
            }}
          >
            {isGenerating 
              ? 'Generating...' 
              : userThoughts.trim() 
                ? 'Generate Annotation With Context'
                : 'Generate Annotation'
            }
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AnnotationTab;