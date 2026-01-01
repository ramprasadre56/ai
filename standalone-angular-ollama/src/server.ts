import { ollama } from 'ai-sdk-ollama';
import { streamText } from 'ai';
import 'dotenv/config';
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

// Use Ollama with Gemma model (local)
const model = ollama('gemma3:1b');

app.post('/api/chat', async (req: Request, res: Response) => {
    try {
        const { messages } = req.body;

        // Convert frontend message format to AI SDK format
        const formattedMessages = messages?.map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: Array.isArray(msg.content)
                ? msg.content.map((c: any) => c.text).join(' ')
                : msg.content
        })) || [];

        console.log('Received messages:', JSON.stringify(formattedMessages, null, 2));

        const result = streamText({
            model,
            messages: formattedMessages,
        });

        result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: String(error) });
    }
});

app.listen(3000, () => {
    console.log('Server listening on port 3000 (Ollama + Gemma)');
});
