# LLM Council

An elegant, highly-customizable Chat UI that lets you summon a Council of different AI models to debate, review, and synthesize the ultimate answer to your prompts.

Tired of copying and pasting between different AI platforms like OpenAI, Anthropic, or Google to get the best answer? LLM Council solves this by letting you ask them all at once. It automatically gathers their responses and elects a King model to review the council's thoughts and synthesize a perfect, unified answer.

It supports deep web search, a coding canvas, and autonomous image and video generation through tool calling. Now also available as an **All Platform Desktop App**.

---

## Features

- The Council Setup: Chat with an unlimited number of different AI models simultaneously. Incorporate dozens of industry-leading text models like Gemini 3, Claude 4.6, and GPT 5 to verify each other's work in real-time.
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
- Desktop Native Experience: 
  - Fully packaged as an Electron application for macOS, Windows, and Linux.
  - Responsive, collapsible sidebar for maximum screen real estate.
  - Native window controls compatibility (macOS traffic lights).
- Bring Your Own Keys: Supports OpenAI, Anthropic, Google Gemini, OpenRouter, fal.ai, Kie AI, and any OpenAI-compatible endpoint. All API keys and chat logs are stored safely on your local machine.

## Study Mode
Transform your council interactions into actionable learning materials. Study Mode allows you to distill complex deliberations into structured study artifacts.
### Key Features
*   **Quiz Generation**: Instantly create multiple-choice or true/false assessments based on your current chat context or uploaded documents. Ideal for testing recall and understanding.
*   **Dynamic Mindmaps**: Visualize the relationships between complex concepts. Study Mode generates interactive mindmaps that help you grasp the "big picture" of any topic.
*   **Active Recall Flashcards**: Automatically generate flashcards for spaced repetition. Test yourself on key terms and concepts derived directly from your research.
*   **Multimodal Analysis**: Study Mode processes PDFs, high-resolution images, and even video content to extract core insights and learning objectives.
*   **Artifact Management**: All your quizzes, mindmaps, and flashcards are saved in your study history. Rename, organize, or delete artifacts to keep your workspace focused.
### How to Start a Study Session
1.  Select **Study** from the sidebar.
2.  Choose your source material: **upload new documents** or use **search the web**, and Council will automatically find the best sources for your studies.
3.  Select the artifact type you wish to generate (Quiz, Mindmap, or Flashcards).
4.  Interact with the results directly in the Study View.

## Automation Mode (Experimental)
Connect LLM Council to your existing n8n workflows. Automation Mode allows the council to interact with external tools and services via webhook integrations.
> [!WARNING]
> This feature is currently in **Beta** and is considered largely untested. Use with caution.
### Key Features
*   **Webhook Integration**: Connect the council to **n8n** via standard webhook URLs.
*   **Tool Execution**: Allow the council to trigger specific automation flows based on the conversation context.
*   **Contextual Payloads**: Send structured data from your research or deliberations directly to your automated pipelines. Create or improve workflows.
*   **Custom API Keys**: Securely manage your automation service keys within the application settings.
### How to Configure
1.  Navigate to **Automations** in the sidebar.
2.  Provide your **n8n Webhook URL** and **API Key** in the setup panel.
3.  In your chat, use the **Automate** toggle to allow the council to consider external tool execution.
4.  Monitor the automation logs to ensure payloads are being processed correctly.

---

## Recommended API Keys
To get the most out of LLM Council, we recommend starting with these providers. Most offer generous free tiers or high-value pay-as-you-go models.
### Free Tier Options
Access high-performance models at no cost, typically subject to daily or per-minute rate limits.
*   **Google AI Studio**: Access Gemini 3.1 Flash for free. This tier includes limited rate usage, and data submitted may be used to improve Google services.
*   **Groq Cloud**: Provides exceptionally fast inference for open-source models like Llama 3.1 and Mixtral. The free tier is available with specific daily and minute-based rate limits.
*   **OpenRouter (Free Models)**: Use the "Free" filter on OpenRouter to discover a rotating list of models from various providers that can be used at no cost.
### Value Aggregators
Recommended for access to premium models with competitive pricing and high reliability.
*   **Kie AI**: Offers an excellent balance of reliability and value for money. It is a preferred choice for users who want consistent performance at a lower price point. Access to top text, image and video models at 70% cheaper prices than competitors.
*   **OpenRouter** (Paid Tier): The most comprehensive aggregator, allowing you to use one API key for nearly every major model on the market (including Claude 4.6 Sonnet and GPT-5.2). This is ideal for council-style setups where multiple models are compared simultaneously.
*   **DeepSeek**: Provides high-performance reasoning and coding models at industry-leading low prices for pay-as-you-go usage.

---

## Installation

### Option 1: Desktop App (Recommended)

Simply download the installer for your operating system from the **[Releases](https://github.com/guilhermeleaosoares/llm-council/releases)** page:

- **macOS**: Download the `.dmg` file. Open it and drag LLM Council to your Applications folder.
- **Windows**: Download the `.exe` or `.msi` setup file and run it.
- **Linux**: Download the `.AppImage` or `.deb` file.

> [!NOTE]
> During MacOS installations, the OS might block the app from running, saying it is unable to verify it´s safety. In this case, clear the notification, go to Settings -> Privacy & Security -> Allow anyways

### Option 2: Command Line (Web / Local Setup)

If you prefer to run LLM Council in your browser or want to setup a local development environment, follow these steps:

**Prerequisites:**
1. [Node.js](https://nodejs.org/) installed.
2. [Git](https://git-scm.com/) installed.

**Setup Instructions:**

1. Clone the repository:
```bash
git clone https://github.com/guilhermeleaosoares/llm-council.git
cd llm-council
```

2. Install dependencies for both the App and Server:
```bash
npm install
cd server && npm install && cd ..
```

3. Start the application:
```bash
npm run server
```

The app will automatically open in your browser at `http://localhost:5173`.

**Stopping the App:**
To stop the application at any time, go to your terminal and press `Ctrl + C`.

**Running again after setup:**
Whenever you want to use the application again, simply open your terminal and run:
```bash
cd llm-council
npm run server
```

**Updating to the latest version:**
To get the latest bug fixes and features:
```bash
cd llm-council
git pull origin main
npm install
cd server && npm install && cd ..
npm run server
```

---

## Setting up your AI Models

When you first open the app, your council will be empty.
1. Click the Settings icon in the bottom-left corner.
2. Under "AI Models", click Add Model.
3. Give it a name (e.g., "Claude 4.6"), choose its type, assign its Tier, and paste in your API Key.
4. Set its custom Weight factor. High-tier models with high weights are most likely to be auto-elected as the King during council debates.

Tip: You do not need to pay for every individual API. You can use aggregators like OpenRouter or Kie AI to get access to dozens of state-of-the-art models using just one API key.

---

## Automation Integration (n8n)

> ⚠️ **Note:** The n8n automation integration is currently **untested** and in an experimental phase. Use with caution.

LLM Council features a deep integration with **n8n**, a powerful workflow automation tool. You can embed your n8n builder directly into the application and use the Council Sidebar to generate, tune, and modify your automation graphs using natural language.

### Setting up n8n

1. Click the Settings icon in the bottom-left corner.
2. Navigate to the **"Tool APIs"** tab.
3. Under the n8n Integration section, enter your **n8n Instance URL** (e.g., `https://your-n8n-instance.com`).
4. Enter your **n8n API Key**, which you can generate from your n8n instance settings.
5. Click **Save**.

Once configured, the Automation tab will transform from an empty state into a fully interactive embedded n8n builder. You can use the Import/Export buttons to pass workflow JSONs directly to the AI Council for analysis and automatic modification!

---

## Development & Packaging

If you wish to contribute or generate your own installers:

1. Follow the **Command Line** setup above.
2. Run `npm run electron:dev` to launch the Desktop version in development mode.
3. Run `npm run electron:build` to package the app and generate the `.dmg`, `.exe`, or Linux installers in the `release/` folder.

## Tech Stack

- Frontend: React (Vite), vanilla CSS Custom Properties
- Backend: Node.js, Express (for proxying API requests and avoiding CORS restrictions)
- Database/Auth: Firebase (Optional, for persistent cloud syncing of your local data)
