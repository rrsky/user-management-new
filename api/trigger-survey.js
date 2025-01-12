export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { user } = req.body;
  
    if (!user || !user.name) {
      return res.status(400).json({ error: 'User data is missing or incomplete' });
    }
  
    try {
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-davinci-003',
          prompt: `Create a survey for the user ${user.name}. Include details about their preferences and goals.`,
          max_tokens: 200,
        }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        res.status(200).json({ success: true, survey: data });
      } else {
        res.status(500).json({ error: 'Error generating survey', details: data });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }