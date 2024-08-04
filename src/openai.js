import OpenAI from 'openai';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Function to handle speech-to-text
export const handleSTT = async (audioBlob) => {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');

    const response = await openai.audio.transcriptions.create({
      file: formData.get('file'),
      model: 'whisper-1',
    });

    return response.text;
  } catch (error) {
    console.error('Error in speech-to-text:', error);
    throw error;
  }
};

// Function to handle text-to-speech
export const handleTTS = async (text, scriptName) => {
  if (!text) {
    throw new Error("Text input is required for TTS.");
  }

  try {
    // Check if audio file already exists
    const storageRef = ref(storage, `audio/${scriptName}`);
    try {
      const url = await getDownloadURL(storageRef);
      return { downloadURL: url }; // Return existing URL if found
    } catch (error) {
      if (error.code !== 'storage/object-not-found') {
        throw error; // Handle other errors
      }
    }

    // If audio doesn't exist, generate new audio
    const response = await openai.audio.speech.create({
      model: "tts-1",
      input: text,
      voice: "onyx",
    });

    const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });

    // Upload the Blob to Firebase Storage with the structured filename
    await uploadBytes(storageRef, audioBlob);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    return { audioBlob, downloadURL };
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
};

// Function to analyze transcription and generate response
export const analyzeTranscription = (transcription) => {
  const keywords = {
    "Charging station": "Here's information about charging stations...",
    "Tracking Software": "Let me tell you about tracking software..."
  };

  for (const [keyword, script] of Object.entries(keywords)) {
    if (transcription.toLowerCase().includes(keyword.toLowerCase())) {
      // Create a structured filename based on the keyword
      const scriptName = `script-${keyword.toLowerCase().replace(/ /g, '-')}.mp3`;
      return { scriptName, script };
    }
  }

  return null;
};



//OLD CODE TO GET OPENAI WORKING BEFORE INTEGRATING FIREBASE
// export const handleTTS = async (text) => {
//   if (!text) {
//     throw new Error("Text input is required for TTS.");
//   }

//   try {
//     // Call the OpenAI TTS API
//     const response = await openai.audio.speech.create({
//       model: "tts-1", // Use the appropriate model
//       input: text,
//       voice: "onyx", // Choose a voice from the available options
//     });

//     // Assuming the response contains audio data
//     const audioBlob = await response.arrayBuffer();
//     const audioFile = new File([audioBlob], 'tts_audio.mp3', { type: 'audio/mpeg' });

//     // Create a URL for the audio file
//     const audioUrl = URL.createObjectURL(audioFile);
//     return audioUrl; // Return the audio URL
//   } catch (error) {
//     console.error('Error generating speech:', error);
//     throw error; // Rethrow the error for handling in the component
//   }
// };
