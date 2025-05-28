import express from 'express';
const router = express.Router();
import { OpenAI } from 'openai';

// Initialize OpenAI client with OpenRouter configuration
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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", // Store your API key in environment variables
});

// POST endpoint to generate narrative text from form data using AI
router.post('/generate-narrative', async (req, res) => {
  const formData = req.body; // Get form data from the request body

  // Construct a detailed prompt for the AI based on formData
  const prompt = `Generate a professional medical narrative based on the following patient visit data:
  
Patient Details:
- Chief Complaint: ${formData.chiefComplaint || 'Not specified'}
- History of Present Illness: ${formData.historyOfPresentIllness || 'Not documented'}
- Physical Examination Findings: ${formData.physicalExam || 'Not documented'}
- Assessment: ${formData.assessment || 'Not documented'}
- Plan: ${formData.plan || 'Not documented'}

Please generate a well-structured, professional medical note in paragraph format that incorporates all relevant information.`;

  try {
    // Call the DeepSeek AI model through OpenRouter
    const completion = await client.chat.completions.create({
      model: "deepseek/deepseek-r1:free",
      messages: [
        {
          "role": "system",
          "content": "You are a medical documentation assistant that helps create professional, accurate medical narratives based on provided clinical data."
        },
        {
          "role": "user",
          "content": prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more factual responses
      max_tokens: 1000
    });

    const generatedText = completion.choices[0]?.message?.content || "Unable to generate narrative at this time.";

    // Send the generated text back to the frontend
    res.json({ 
      success: true,
      narrative: generatedText 
    });

  } catch (error) {
    console.error('Error generating narrative:', error);
    
    // Handle specific error cases
    let errorMessage = 'Failed to generate narrative text';
    if (error.response) {
      switch (error.response.status) {
        case 400:
          errorMessage = 'Invalid request format';
          break;
        case 401:
          errorMessage = 'Invalid API key';
          break;
        case 402:
          errorMessage = 'Insufficient API credits';
          break;
        case 429:
          errorMessage = 'Too many requests - please try again later';
          break;
        case 500:
          errorMessage = 'AI service unavailable';
          break;
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: error.message 
    });
  }
});

export default router;