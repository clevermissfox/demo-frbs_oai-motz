import OpenAI from 'openai';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY, // Correct way to access in Vite
  dangerouslyAllowBrowser: true
});

// Fixed filename for the audio file
const FIXED_FILENAME = 'latest_tts_audio.mp3';

export const handleTTS = async (text) => {
  if (!text) {
    throw new Error("Text input is required for TTS.");
  }

  try {
    // Call the OpenAI TTS API
    const response = await openai.audio.speech.create({
      model: "tts-1",
      input: text,
      voice: "onyx",
    });

    // Convert the response to a Blob
    const audioBlob = new Blob([await response.arrayBuffer()], { type: 'audio/mpeg' });

    // Create a reference to the fixed location in Firebase Storage
    const storageRef = ref(storage, `audio/${FIXED_FILENAME}`);

    // Upload the Blob to Firebase Storage, overwriting any existing file
    await uploadBytes(storageRef, audioBlob);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Return both the Blob and the download URL
    return { audioBlob, downloadURL };
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
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
