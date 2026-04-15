const API_KEY = 'AIzaSyCDJvrZGqCwGJE38unuSAa7uaN3gmJp4TY'; // Replace with your new key

// gemini-2.0-flash-lite: highest free-tier quota (30 RPM, 1,500 RPD), supports vision/images
const MODEL = 'gemini-2.0-flash-lite';

export const askGemini = async (prompt, systemContext = "", imagesArray = []) => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    // Build the parts payload
    const parts = [{ text: systemContext ? `Context: ${systemContext}\n\nUser: ${prompt}` : prompt }];
    
    // Support either a single string (for backwards compatibility) or an array
    const imagesToProcess = Array.isArray(imagesArray) ? imagesArray : (imagesArray ? [imagesArray] : []);

    for (const imageBase64 of imagesToProcess) {
      if (!imageBase64) continue;
      // Remove data URL prefix if present e.g. "data:image/jpeg;base64,"
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const mimeType = imageBase64.includes(';') ? imageBase64.split(';')[0].split(':')[1] : 'image/jpeg';
      
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] })
    });

    const data = await response.json();

    if (!response.ok) {
      // Provide a human-readable error based on common API error codes
      if (response.status === 429) {
        throw new Error('API_QUOTA_EXCEEDED');
      }
      if (response.status === 400) {
        throw new Error(`Bad request: ${data.error?.message || 'Unknown error'}`);
      }
      throw new Error(data.error?.message || 'Gemini API call failed.');
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned.';
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (error.message === 'API_QUOTA_EXCEEDED') {
      throw error; // Re-throw so caller can show specific message
    }
    throw new Error(error.message || 'Network or API error.');
  }
};
