
# ChessAgine

<p align="center">
  <img src="/public/static/images/agineowl.png" alt="ChessAgine" width="200"/>
</p>

Convert OpenAI, Claude, Gemini, or Ollama models into chess-aware Chessbuddy and get personalized live chat training.  
ChessAgine integrates with Stockfish 17.1 engine and chess databases to better align with position context, making LLMs chess aware.

---

## Features

- **Multi-AI Support**: Compatible with OpenAI, Claude, Gemini, and Ollama models  
- **Chess-Aware AI**: Advanced position analysis and contextual understanding via implementation of **Chess Context Protocol (CCP)**  
- **Stockfish Integration**: Powered by Stockfish 17.1 engine for accurate evaluation  
- **Opening Explorer**: Comprehensive opening database integration  
- **Puzzle Training**: Interactive chess puzzles for skill improvement  
- **Game Review**: Generate game review and ask Agine for specific move analysis  
- **Ollama Integration**: Run LLMs locally or via cloud and connect to ChessAgine — free, open source, and no API key required  



## Providers

ChessAgine works with multiple AI providers:

| Provider   | API Key Required | Example Models                                   |
|------------|-----------------|-------------------------------------------------|
| OpenAI     | ✅ Yes          | gpt-4, gpt-4o, gpt-5, o1, o3                     |
| Anthropic  | ✅ Yes          | claude-sonnet-4, claude-3.5-haiku                |
| Google     | ✅ Yes          | gemini-1.5-pro, gemini-2.5-flash                 |
| Ollama     | ❌ No           | qwen3:8b, gpt-oss:120b, deepseek-v3.1:671b-cloud |

> ✅ Use Ollama for free, local, and open source AI integration without needing API keys.



## Using Ollama Locally (No API Key Required)

ChessAgine supports **Ollama** as a free, open-source option to run LLMs locally or via Ollama Cloud.  
Unlike other providers, **no API key is required**.

### Setup Steps

1. **Download Ollama**  
   👉 [https://ollama.com/](https://ollama.com/)

2. **Sign up to Ollama** (optional for cloud usage)

3. **Install models**  
   Run models locally or use the `-cloud` variants for Ollama Cloud.  
   Example:
   ```bash
   ollama run gpt-oss:20b


4. **Install ngrok**
   👉 [https://ngrok.com/download](https://ngrok.com/download)

5. **Authenticate ngrok**

   ```bash
   ngrok config add-authtoken <YOUR_TOKEN>
   ```

6. **Expose Ollama API on port 11434**

   ```bash
   ngrok http 11434
   ```

7. **Copy the ngrok forwarding URL** and paste it into ChessAgine **Settings**.

8. **Start using ChessAgine with Ollama models** 🎉

### Example Models Available

* `qwen3:8b`, `qwen3:4b`, `qwen3:30b`
* `gpt-oss:20b`, `gpt-oss:120b`
* Cloud versions: `deepseek-v3.1:671b-cloud`, `gpt-oss:20b-cloud`, `gpt-oss:120b-cloud`



## Chess Context Protocol (CCP)

ChessAgine is a **Chess Context Protocol Client (CCPC)** to the CCP.
To read more about the protocol, explore `/chessContextProtocol`.
This protocol allows Chess GUIs to integrate engines and LLMs seamlessly.



## Preview

<p align="center">
  <img src="/public/static/images/aginepreviewgh.png" alt="ChessAgine_Preview" >
</p>



## Open Source Software Credits

ChessAgine recognizes all the open source contributions made by various developers.
A huge thanks to everyone who helped make ChessAgine possible:

* **Stockfish developers** (see AUTHORS file). Stockfish [Computer software]. [https://github.com/official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish)
* **ChessDojo developers**, whose modified UiEngine model and Stockfish UI components were used. [https://github.com/jackstenglein/chess-dojo-scheduler](https://github.com/jackstenglein/chess-dojo-scheduler)
* **Stockfish.js developers** [https://github.com/nmrugg/stockfish.js/](https://github.com/nmrugg/stockfish.js/) for providing compiled Stockfish 17.1 wasm and NNUE files.
* **Lichess developers** whose API enabled opening explorer, puzzle databases, and game imports. [https://lichess.org/api](https://lichess.org/api)
* **ChessKit developers** [https://github.com/GuillaumeSD/Chesskit](https://github.com/GuillaumeSD/Chesskit) for UI and engine setup code, plus game review algorithms.
* **ChessDB developers** [https://github.com/noobpwnftw/chessdb](https://github.com/noobpwnftw/chessdb) for billions of engine-analyzed positions in the cloud.
* **Mastra devs** [https://mastra.ai/](https://mastra.ai/) for the Agent framework powering AI features.

---

## Author

ChessAgine by **@jalpp**


