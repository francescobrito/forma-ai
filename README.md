# Forma — your AI workspace

A ChatGPT-style chat website with multiple API providers, model switching, streamed responses, conversation history and search, Markdown/code formatting, exports, custom instructions, response styles, and light/dark themes. Responsive layouts include a phone navigation drawer, full-screen settings, touch controls, and a keyboard-aware composer.

This version adds login-and-password accounts without an email requirement, password hashing, sign-in/sign-out, protected API endpoints, separate browser workspaces for each account, and Render deployment files. Logins accept 3–32 letters, numbers, dots, hyphens and underscores; they are case-insensitive. Passwords require 12–128 characters. See [DEPLOY.md](DEPLOY.md) for current hosting instructions, PostgreSQL requirements, and account limitations. Chats and files stay on each device; they do not sync across devices. Password recovery is not included yet.

## Run

Install Node.js 24 or newer, open this folder in a terminal, and run:

```sh
npm ci
npm start
```

Open **http://127.0.0.1:3003** and create an account. On Windows you can also double-click `Start Forma.cmd`. Keep the server running while you use the site. Use `PORT` to choose another port if 3003 is occupied. Browser data belongs to the address, port and account you use; the earlier versions retain their own settings and conversations.

## Connect your models

1. Go to **Settings → AI providers → Add provider**.
2. Choose a preset or enter a custom name, API base URL, and API format.
3. Enter your API key. Local providers such as Ollama can use an empty key.
4. Enter exact model IDs, one per line or separated by commas. **Fetch from provider** loads models if the API supports model discovery. Check that the selected model supports text chat; discovery can also return embedding or image models.
5. Save, close settings, and choose a model from the top-left model selector.

You can add any number of providers and switch between them, including within a conversation. Your existing conversation text is sent to the newly selected provider when you ask your next question or regenerate a reply.

| Provider | API base URL | API format |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | OpenAI-compatible |
| OpenAI Responses | `https://api.openai.com/v1` | OpenAI Responses |
| AgentRouter (GPT models) | `https://agentrouter.org/v1` | OpenAI Responses |
| Anthropic | `https://api.anthropic.com/v1` | Anthropic |
| OpenRouter | `https://openrouter.ai/api/v1` | OpenAI-compatible |
| Groq | `https://api.groq.com/openai/v1` | OpenAI-compatible |
| Ollama | `http://localhost:11434/v1` | OpenAI-compatible |

Other OpenAI-compatible services work with their documented base URLs. Full `/chat/completions`, `/responses`, or `/messages` URLs also work. For Ollama, start Ollama and pull a chat model first, then fetch its model list. Models, pricing, and API availability are controlled by each provider.

**Test connection** checks authentication and model discovery without generating a model response for ordinary providers. For AgentRouter it sends a short request to the first model in your list through Codex, using API credits, and verifies a real answer. If a selected model is absent from a returned list, verify its exact ID with the provider.

AgentRouter restricts generic API clients. Forma connects through the official **Codex CLI** with Responses. The npm dependencies include a pinned client for server deployment; Windows can use the installed desktop client. `FORMA_CODEX_PATH` can select an executable explicitly. Your API key is passed in a child-process environment variable, never on its command line. Codex uses an ephemeral session with shell, file tools, browser tools, plugins and hooks disabled, with a read-only sandbox. Its temporary environment does not use your normal Codex configuration or authentication files.

AgentRouter model IDs are entered manually. The model-list button is disabled for this transport; **Test connection** checks the first listed model with an actual reply. Native Codex returns completed answers to the site. Stopping generation cancels its process. Text, conversation context, effort, custom instructions, photos, PDF documents and text-file attachments are forwarded through Responses; the selected model must support the attached media.

A temporary localhost adapter forwards the official client's generated headers and metadata while replacing its default coding context with the website conversation. It removes tool definitions and sets tool choice to none, reducing token usage and keeping chat requests free of coding instructions. The child environment excludes the parent task's tool bridge, client overrides and unrelated API keys. Attachments remain in memory during forwarding. The adapter permits one authenticated request, closes after completion or cancellation, and the CLI's temporary working folder is removed. The transport uses the actual official client and does not forge a client identity. HTTP error details are preserved and API keys are redacted from errors. Provider limits and available credit can still temporarily prevent answers.

## Language and attachments

Choose **Settings → Preferences → Language** to switch between English and Russian. The selection is remembered on this browser.

The **+** beside the message field offers **Attach files**, **Paste photo**, and **Take a photo**. Copy an image or screenshot and press **Ctrl+V** (or **⌘+V**) in the message field; on phones, touch and hold the field and choose **Paste** when the browser provides image clipboard data. Ordinary text paste still works. **Paste photo** reads image data directly in browsers that support the Clipboard API; it may ask for clipboard access. Copy the image itself, rather than its link. If your phone browser only shares text, use **Attach files** or **Take a photo**.

Previews appear before sending and can be removed individually. Attach up to five JPEG, PNG, WebP, GIF, PDF or text/code files per message, up to 5 MB per file and 8 MB total; text files are limited to 500 KB. Photos are resized to at most 1600 pixels and converted to JPEG (GIFs remain GIFs). Use a model that accepts images or PDF blocks; provider support varies.

Attachments are saved in IndexedDB on this browser and included with conversation context in subsequent requests. JSON and Markdown exports contain attachment metadata or names, not the file contents, and cannot restore the files on another device.

## Response mode and reasoning effort

The controls below the message field offer exactly two response modes: **Concise** and **Detailed**. The choice adds an instruction to each request and works alongside your custom instructions.

Choose **Low**, **Medium**, or **High** reasoning effort separately. Supported OpenAI-compatible models receive `reasoning_effort`; OpenRouter receives `reasoning.effort`; supported Anthropic models receive thinking budgets or adaptive thinking settings. Unknown models keep their normal request format, and the interface explains that the saved effort is not applied. GPT-5 Pro automatically uses its supported High level while keeping your preferred level for other models. These settings are saved in this browser and can also be changed under **Settings → Preferences**.

## Phone use

The website adapts to small screens. Open conversations with the top-left drawer button. On touch devices, Return adds a new line; tap the send arrow to submit. Desktop supports Enter to send, Shift+Enter for a new line, Ctrl/⌘+K for a new chat, and Ctrl/⌘+/ for search.

Local mode binds to localhost. For use on a separate phone, deploy the frontend and backend together on Render using [DEPLOY.md](DEPLOY.md). Hosted mode uses authentication, a configured HTTPS origin, request limits and outbound URL restrictions. It requires persistent PostgreSQL storage for accounts. Local-network AI servers are available in local mode only.

## Data and credentials

Conversations, provider metadata, and preferences live in browser local storage for each account. API keys default to session storage and are cleared on logout. **Remember API key on this device** saves the key in browser local storage without encryption. Use it only on a trusted device. Keys are sent to the Forma server for forwarding to the chosen API, are not written to server files or logs, and are excluded from conversation exports. The server rejects cross-origin API requests and does not follow provider redirects.

Your selected provider receives your messages, conversation context, and custom instructions. Its own data policy applies. Accounts are stored on the server; chats and keys do not sync across devices. There is no analytics or external asset dependency. Settings → Your data lets you export chats, clear chat history, or forget saved keys.

Supports text chat with OpenAI-compatible Chat Completions, OpenAI Responses, and Anthropic Messages APIs. Responses includes streaming and JSON replies, images, PDFs, conversation history and reasoning effort. Image generation and web browsing tools are outside this build.

## Check

```sh
npm test
```

Tests use a local mock API, with no real credentials or paid calls. They cover endpoint normalization, protocol and attachment translation, streaming boundaries and UTF-8, model discovery, API errors, and local-origin enforcement.
