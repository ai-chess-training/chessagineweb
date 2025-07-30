import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { 
  Target, 
  ThumbsUp, 
  CheckCircle, 
  TrendingDown, 
  AlertTriangle, 
  XCircle, 
  BookA 
} from 'lucide-react';

export type MoveQuality =
  | "Best"
  | "Very Good"
  | "Good"
  | "Dubious"
  | "Mistake"
  | "Blunder"
  | "Book";

export interface Move {
  from: string;
  to: string;
  piece?: string;
  captured?: string;
  promotion?: string;
}

export interface MoveAnalysis {
  plyNumber: number;
  notation: string;
  sanNotation: string | undefined;
  quality: MoveQuality;
  arrowMove: Move;
  fen: string;
  currenFen: string;
  player: "w" | "b";
}

interface PGNViewProps {
  moves: string[];
  moveAnalysis: MoveAnalysis[] | null;
  goToMove: (index: number) => void;
  currentMoveIndex: number;
}

const getMoveClassificationStyle = (classification: MoveQuality) => {
  switch (classification) {
    case "Best":
      return {
        color: "#81C784",
        icon: <Target size={12} />,
        bgColor: "#81C78420",
      };
    case "Very Good":
      return {
        color: "#4FC3F7",
        icon: <ThumbsUp size={12} />,
        bgColor: "#4FC3F720",
      };
    case "Good":
      return {
        color: "#AED581",
        icon: <CheckCircle size={12} />,
        bgColor: "#AED58120",
      };
    case "Dubious":
      return {
        color: "#FFB74D",
        icon: <TrendingDown size={12} />,
        bgColor: "#FFB74D20",
      };
    case "Mistake":
      return {
        color: "#FF8A65",
        icon: <AlertTriangle size={12} />,
        bgColor: "#FF8A6520",
      };
    case "Blunder":
      return {
        color: "#E57373",
        icon: <XCircle size={12} />,
        bgColor: "#E5737320",
      };
    case "Book":
      return {
        color: "#FFD54F",
        icon: <BookA size={12} />,
        bgColor: "#FFD54F20",
      };
  }
};

const PGNView: React.FC<PGNViewProps> = ({
  moves,
  moveAnalysis,
  goToMove,
  currentMoveIndex,
}) => {
  const getMoveAnalysis = (moveIndex: number): MoveAnalysis | undefined => {
    if (!moveAnalysis) return undefined;
    // plyNumber is 1-indexed, moveIndex is 0-indexed
    return moveAnalysis.find(analysis => analysis.plyNumber === moveIndex + 1);
  };

  const renderPGNText = () => {
    const elements = [];
    
    for (let i = 0; i < moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      // Move number
      elements.push(
        <Typography
          key={`num-${moveNumber}`}
          component="span"
          sx={{ 
            color: '#888',
            mr: 0.3,
            fontFamily: 'monospace',
            fontSize: '12px',
            flexShrink: 0
          }}
        >
          {moveNumber}.
        </Typography>
      );
      
      // White move
      const whiteIndex = i;
      const whiteAnalysis = getMoveAnalysis(whiteIndex);
      const whiteStyle = whiteAnalysis ? getMoveClassificationStyle(whiteAnalysis.quality) : null;
      // Compare with currentMoveIndex - 1 since your goToMove uses 1-based indexing
      const isWhiteSelected = whiteIndex === currentMoveIndex - 1;
      
      elements.push(
        <Button
          key={`white-${whiteIndex}`}
          onClick={() => goToMove(whiteIndex + 1)} // Pass 1-based index to match your goToMove function
          variant="text"
          size="small"
          startIcon={whiteStyle?.icon}
          sx={{
            minWidth: 'auto',
            padding: '1px 3px',
            margin: '0 1px',
            textTransform: 'none',
            fontFamily: 'monospace',
            fontSize: '12px',
            height: '20px',
            backgroundColor: isWhiteSelected 
              ? '#555' 
              : whiteStyle?.bgColor || 'transparent',
            color: isWhiteSelected 
              ? '#fff' 
              : whiteStyle?.color || '#ccc',
            border: whiteStyle?.color 
              ? `1px solid ${whiteStyle.color}40` 
              : 'none',
            '&:hover': {
              backgroundColor: isWhiteSelected 
                ? '#666' 
                : whiteStyle?.bgColor 
                  ? `${whiteStyle.color}30` 
                  : '#333',
            },
            '& .MuiButton-startIcon': {
              marginRight: '2px',
              marginLeft: 0,
            },
          }}
        >
          {whiteMove}
        </Button>
      );
      
      // Black move (if exists)
      if (blackMove) {
        const blackIndex = i + 1;
        const blackAnalysis = getMoveAnalysis(blackIndex);
        const blackStyle = blackAnalysis ? getMoveClassificationStyle(blackAnalysis.quality) : null;
        // Compare with currentMoveIndex - 1 since your goToMove uses 1-based indexing
        const isBlackSelected = blackIndex === currentMoveIndex - 1;
        
        elements.push(
          <Button
            key={`black-${blackIndex}`}
            onClick={() => goToMove(blackIndex + 1)} // Pass 1-based index to match your goToMove function
            variant="text"
            size="small"
            startIcon={blackStyle?.icon}
            sx={{
              minWidth: 'auto',
              padding: '1px 3px',
              margin: '0 1px',
              textTransform: 'none',
              fontFamily: 'monospace',
              fontSize: '12px',
              height: '20px',
              backgroundColor: isBlackSelected 
                ? '#555' 
                : blackStyle?.bgColor || 'transparent',
              color: isBlackSelected 
                ? '#fff' 
                : blackStyle?.color || '#ccc',
              border: blackStyle?.color 
                ? `1px solid ${blackStyle.color}40` 
                : 'none',
              '&:hover': {
                backgroundColor: isBlackSelected 
                  ? '#666' 
                  : blackStyle?.bgColor 
                    ? `${blackStyle.color}30` 
                    : '#333',
              },
              '& .MuiButton-startIcon': {
                marginRight: '2px',
                marginLeft: 0,
              },
            }}
          >
            {blackMove}
          </Button>
        );
      }
      
      // Add minimal space after each move pair
      elements.push(
        <Box key={`space-${moveNumber}`} component="span" sx={{ width: '4px', flexShrink: 0 }} />
      );
    }
    
    return elements;
  };

  return (
    <Box 
      sx={{ 
        width: '100%',
        maxWidth: '550px',
        height: '100px',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#2a2a2a',
        borderRadius: 1,
        border: '1px solid #444',
        px: 1,
        py: 0.5,
        mt: 1,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#1a1a1a',
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
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.2,
          lineHeight: 1.2
        }}
      >
        {moves.length > 0 ? renderPGNText() : (
          <Typography variant="body2" sx={{ color: '#888', fontSize: '12px' }}>
            No moves to display
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PGNView;