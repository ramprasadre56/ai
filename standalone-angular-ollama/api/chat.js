const { streamText } = require('ai');
const { createGateway } = require('@ai-sdk/gateway');

// Create gateway with the API key from environment
const gateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY || '',
});

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages } = req.body;

        // Convert frontend message format to AI SDK format
        const formattedMessages = (messages || []).map((msg) => ({
            role: msg.role,
            content: Array.isArray(msg.content)
                ? msg.content.map((c) => c.text).join(' ')
                : msg.content
        }));

        console.log('Received messages:', JSON.stringify(formattedMessages, null, 2));
        console.log('API Key present:', !!process.env.AI_GATEWAY_API_KEY);

        const result = streamText({
            model: gateway('openai/gpt-4o-mini'),
            messages: formattedMessages,
        });

        result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: String(error) });
    }
};
