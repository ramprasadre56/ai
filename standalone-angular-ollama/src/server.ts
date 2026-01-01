import { createGateway, streamText } from 'ai';
import 'dotenv/config';
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

// Use Vercel AI Gateway
const gateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
});

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
            model: gateway('openai/gpt-4o-mini'),
            messages: formattedMessages,
        });

        result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: String(error) });
    }
});

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
