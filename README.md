## ChessAgine

<p align="center">
  <img src="/public/static/images/agineowl.png" alt="ChessAgine" width="200"/>
</p>

Convert OpenAI, Claude, or Gemini model into chess-aware Chessbuddy and get personalized live chat training. ChessAgine integrates with Stockfish 17.1 engine and chess databases to better align with position context, making LLMs chess aware.

# Features

- Multi-AI Support: Compatible with OpenAI, Claude, and Gemini models
- Chess-Aware AI: Advanced position analysis and contextual understanding via implementation of Chess Context Protocol (CCP)
- Stockfish Integration: Powered by Stockfish 17.1 engine for accurate evaluation
- Opening Explorer: Comprehensive opening database integration
- Puzzle Training: Interactive chess puzzles for skill improvement
- Game Review: Generate game review and ask Agine for specific move analysis

# Chess Context Protocol (CCP)

ChessAgine is a **Chess Context Position Client (CCPC)** to the CCP, to read more about the protocol explore `/chessContextProtocol` This protocol allows Chess GUI to integrate engines and LLMs.

# Preview

<p align="center">
  <img src="/public/static/images/aginepreviewgh.png" alt="ChessAgine_Preview" width="500"/>
</p>


## Open Source Software Credits:

ChessAgine recognizes all the open source contributions made by various devs and I want to say thanks to everyone below who helped me get the ChessAgine to the current state, without this dev's work ChessAgine would be no where near to what have it acheived with LLMs.

- The Stockfish developers (see AUTHORS file). Stockfish [Computer software]. https://github.com/official-stockfish/Stockfish

- The ChessDojo developers, who's modified UiEngine model and Stockfish UI components where used in the project. https://github.com/jackstenglein/chess-dojo-scheduler

- The Stockfish.js developers https://github.com/nmrugg/stockfish.js/ for providing compiled stockfish 17.1 wasm and NNUE files that are being used in the project.

- The Lichess developers who great work with API helped me with opening explorer, puzzle databases and game imports API https://lichess.org/api

- The ChessKit developers https://github.com/GuillaumeSD/Chesskit for providing the UI and Stockfish engine setup code for stockfish 17.1. As well as the game review generation algo that was modified in this project.

- The ChessDB developers who give ChessAgine access to billions of engine analyed position on cloud and helped 
with game reviews also https://github.com/noobpwnftw/chessdb

- The Mastra devs who's Agent framework is being used to implement AI features https://mastra.ai/



