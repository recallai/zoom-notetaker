# Zoom Notetaker

If you don't want to build a bot yourself, check out [Recall.ai](https://recall.ai)

This is an AI-powered meeting transcription and note-taking application that automatically joins Zoom meetings, transcribes conversations, and generates intelligent summaries using Recall.ai and OpenAI.

## Prerequisites

- Node.js 18+
- Ngrok
- Recall.ai API Key
- OpenAI API Key

## Installation

### Clone the Repository

```bash
git clone https://github.com/recallai/zoom-notetaker
cd zoom_notetaker
```

### Install Dependencies

```bash
npm install
```

## Configuration

### Environment Variables

Copy the `.env.example` file and rename it to `.env`. Then, add your API keys:

```bash
RECALL_API_KEY=your_recall_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Quickstart

1. **Start the development server:**

   ```bash
   npm run dev
   ```

2. **In a separate terminal, expose your local server using ngrok:**

   ```bash
   ngrok http 3000
   ```

   Note: See the [ngrok setup guide](https://docs.recall.ai/docs/local-webhook-development#ngrok-setup) for detailed instructions on setting up a static domain.

3. **Configure webhook in [Recall.ai Dashboard](https://us-west-2.recall.ai/dashboard/webhooks):**

   - Add endpoint: `https://your-ngrok-url.ngrok-free.app/api/webhook`
   - Subscribe to event: `bot.done`

4. **Open your browser** to [http://localhost:3000](http://localhost:3000)

5. **Enter a Zoom meeting URL** and click "Send Bot to Meeting"

The bot will join your meeting and automatically:

- Transcribe the conversation in real-time
- Identify speakers
- Generate an AI summary when the meeting ends
- Provide access to meeting recordings

## Development

The app requires webhooks to generate summaries. See the [ngrok setup guide](https://docs.recall.ai/docs/local-webhook-development#ngrok-setup) for detailed instructions.
