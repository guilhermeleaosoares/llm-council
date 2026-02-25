# LLM Council

An elegant, highly-customizable Chat UI that lets you summon a Council of different AI models to debate, review, and synthesize the ultimate answer to your prompts.

Tired of copying and pasting between different AI platforms like OpenAI, Anthropic, or Google to get the best answer? LLM Council solves this by letting you ask them all at once. It automatically gathers their responses and elects a King model to review the council's thoughts and synthesize a perfect, unified answer.

It supports deep web search, a coding canvas, and autonomous image and video generation through tool calling.

---

## Features

- The Council Setup: Chat with up to 10 different AI models simultaneously. Incorporate industry-leading text models like Gemini 3, Claude 4.6, and GPT 5 to verify each other's work in real-time.
- The King Election System: Every model in your council generates a confidence percentage for its answer. The system automatically multiplies this confidence score by the model's assigned Tier (e.g., Tier 1 models carry more weight than Tier 3 models) and its custom Weight setting. The highest-scoring model is automatically elected as the King for that turn to lead the synthesis.
  - Manual King Override: If you want a specific model to always lead the conversation, you can explicitly select the King in the Chat UI dropdown.
- Synthesis Modes:
  - Select Best: The King LLM reviews all generated answers and outputs the single best one based on confidence scores.
  - Synthesize All: The King LLM reads every perspective and merges them into an ultimate, master response.
- Deep Think Levels:
  - Quick: Bypasses the council; sends the prompt to your cheapest/fastest model for instant answers.
  - Deep Think: The Council answers, and the King reviews.
  - Deeper Think: The Council answers, the models review each other, and the King synthesizes the feedback.
- Multimodal and Autonomous Media: 
  - Drag-and-drop PDFs, TXT, or visual Images into the context window.
  - The council can autonomously decide to use visual tools. Prominent supported image models include Seedance, Nano Banana, and Grok Imagine. For generative video, it natively supports cutting-edge models like Grok Imagine Video and Kling 2.6.
- Bring Your Own Keys: Supports OpenAI, Anthropic, Google Gemini, OpenRouter, fal.ai, Kie AI, and any OpenAI-compatible endpoint. All API keys and chat logs are stored safely on your local machine.

---

## How to Install and Run

You do not need to be a coder to run this. Follow these exact steps to get started:

### Prerequisites
1. Node.js: You need Node installed on your computer. Download and install it from nodejs.org.
2. Git: Download and install it from git-scm.com/downloads if you do not already have it.

### Step-by-step Setup

Open your terminal (Command Prompt on Windows, Terminal on Mac) and run these commands one by one.

1. Clone the repository to your computer:
```bash
git clone https://github.com/guilhermeleaosoares/llm-council.git
```

2. Go into the project folder:
```bash
cd llm-council
```

3. Install the required files for the Server and Frontend:
```bash
npm install
cd server
npm install
cd ..
```

4. Start the application:
```bash
npm run server
```

That is it. A browser window will automatically open to http://localhost:5173. 
(Note: Keep the terminal window open in the background while you are using the app. To stop it, go to the terminal and press Ctrl + C).

---

## Setting up your AI Models

When you first open the app, your council will be empty.
1. Click the Settings icon in the bottom-left corner.
2. Under "AI Models", click Add Model.
3. Give it a name (e.g., "Claude 4.6"), choose its type, assign its Tier, and paste in your API Key.
4. Set its custom Weight factor. High-tier models with high weights are most likely to be auto-elected as the King during council debates.

Tip: You do not need to pay for every individual API. You can use aggregators like OpenRouter or Kie AI to get access to dozens of state-of-the-art models using just one API key.

---

## Tech Stack

- Frontend: React (Vite), vanilla CSS Custom Properties
- Backend: Node.js, Express (for proxying API requests and avoiding CORS restrictions)
- Database/Auth: Firebase (Optional, for persistent cloud syncing of your local data)
