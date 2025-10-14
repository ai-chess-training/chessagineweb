
export const ANALYSIS_DELAY = 300;
export const DEFAULT_ENGINE_DEPTH = 15;
export const DEFAULT_ENGINE_LINES = 3;
export const MAX_PV_MOVES = 6;


export const DEFAULT_CHAT_DIMENSIONS = {
    width: 1200,
    height: 800
}
export const DEFAULT_CHAT_FONT_SIZE = 14;
export const DEFAULT_CHAT_SHOW_TIMESTAMP = true;
export const DEFAULT_CHAT_TECHNICAL_INFO = true;
export const DEFAULT_CHAT_COMPACT_VIEW = false;
export const DEFAULT_CHAT_SPEECH_RATE = 1;
export const DEFAULT_CHAT_SPEECH_PITCH = 1;
export const DEFAULT_CHAT_SPEECH_VOLUME = 0.8;
export const DEFAULT_CHAT_SPEECH_VOICE = '';
export const DEFAULT_CHAT_AUTOSCROLL = true;

export const DEFAULT_CHAPTER_DIMENIONS = {
    width: 900,
    height: 500
}

export const DEFAULT_BOARD_FLIPPED = false;
export const DEFAULT_BOARD_SIZE = 550;
export const DEFAULT_BOARD_SHOW_COORDINATE = true;
export const DEFAULT_BOARD_ANIMATION_DURATION = 300;
export const DEFAULT_BOARD_SHOW_FEN = false;
export const DEFAULT_BOARD_HANGING_PIECE = false;
export const DEFAULT_BOARD_SEMI_PROTECTED_PIECE = false;


export const DEFAULT_BOARD_PANEL_DIMENSIONS = {
    width: 600,
    height: 800
}

export const DEFAULT_PGN_PANEL_DIMENSIONS = {
    width: 550,
    height: 200
}

export const DEFAULT_BOARD_COLOR_SETTINGS = {
  lightSquareColor: "#f0d9b5",
  darkSquareColor: "#b58863",
}

export const BOARD_THEMES = {
  classic: {
    name: "Classic",
    lightSquareColor: "#f0d9b5",
    darkSquareColor: "#b58863",
    bestMoveArrowColor: "#2e7d32",
    squareClickLegalColor: "rgba(86, 65, 6, 0.5)",
    selectedSquareColor: "rgba(255, 215, 0, 0.6)", // golden highlight
  },
  green: {
    name: "Forest",
    lightSquareColor: "#bcbcafff",
    darkSquareColor: "#769656",
    bestMoveArrowColor: "#1b5e20",
    squareClickLegalColor: "rgba(27, 94, 32, 0.5)",
    selectedSquareColor: "rgba(255, 193, 7, 0.6)", // amber for contrast
  },
  blue: {
    name: "Ocean",
    lightSquareColor: "#bec0c2ff",
    darkSquareColor: "#8ca2ad",
    bestMoveArrowColor: "#2e7d32",
    squareClickLegalColor: "rgba(46, 125, 50, 0.5)",
    selectedSquareColor: "rgba(255, 235, 59, 0.6)", // bright yellow
  },
  gray: {
    name: "Modern",
    lightSquareColor: "#f5f5f5bc",
    darkSquareColor: "#504d4dff",
    bestMoveArrowColor: "#4caf50",
    squareClickLegalColor: "rgba(76, 175, 80, 0.5)",
    selectedSquareColor: "rgba(255, 193, 7, 0.6)", // amber pop
  },
  wood: {
    name: "Wooden",
    lightSquareColor: "#deb887",
    darkSquareColor: "#6d4d35ff",
    bestMoveArrowColor: "#2e7d32",
    squareClickLegalColor: "rgba(46, 125, 50, 0.5)",
    selectedSquareColor: "rgba(255, 235, 59, 0.6)", // warm yellow
  },
} as const;


export const PIECE_STYLE_TYPES = {
  cburnett: { name: "Cburnett" },
  Anime: { name: "Anime" },
  Apollo: { name: "Apollo" },
  Artemis: { name: "Artemis" },
  Attack: { name: "Attack" },
  Clash: { name: "Clash" },
  Hades: { name: "Hades" },
  Halloween: { name: "Halloween" },
  Hera: { name: "Hera" },
  Juno: { name: "Juno" },
  Junpiter: { name: "Junpiter" },
  Mars: { name: "Mars" },
  Minerva: { name: "Minerva" },
  Cyborg: {name: "Cyborg"}
};

export const getCurrentThemeColors = (themeName: string) => {
  return BOARD_THEMES[themeName as keyof typeof BOARD_THEMES] || BOARD_THEMES.classic;
};
