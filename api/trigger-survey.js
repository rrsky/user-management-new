const { google } = require('googleapis'); // Ensure googleapis is installed
const OpenAI = require('openai'); // Ensure openai library is installed

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send({ error: 'Method not allowed' });
    }

    try {
        const { userEmail } = req.body;

        // Step 1: Generate survey using OpenAI
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const surveyResponse = await openai.chat.completions.create({
            messages: [{ role: 'user', content: `Generate a survey for ${userEmail}` }],
            model: 'gpt-4',
        });

        const surveyContent = surveyResponse.choices[0].message.content;

        // Step 2: Create Google Form (use your logic)
        const forms = google.forms({
            version: 'v1',
            auth: process.env.GOOGLE_API_KEY, // Add to Vercel Environment Variables
        });

        const form = await forms.forms.create({
            requestBody: {
                info: {
                    title: `Survey for ${userEmail}`,
                },
                items: [
                    {
                        textItem: {
                            question: surveyContent,
                        },
                    },
                ],
            },
        });

        // Step 3: Send the form link back or store it
        const formLink = form.data.responderUri;

        res.status(200).send({ success: true, formLink });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Failed to trigger survey' });
    }
}