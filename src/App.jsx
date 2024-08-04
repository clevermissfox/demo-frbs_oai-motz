import React, { useState, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { handleSTT, handleTTS, analyzeTranscription } from './openai';

function App() {
  // State variables to manage user authentication and application state
  const [user] = useAuthState(auth); // Get the current user state from Firebase
  const [email, setEmail] = useState(''); // State for email input
  const [password, setPassword] = useState(''); // State for password input
  const [audioSrc, setAudioSrc] = useState(''); // State for the audio source URL
  const [loading, setLoading] = useState(false); // State to indicate loading status
  const [isRecording, setIsRecording] = useState(false); // State to track if recording is in progress
  const mediaRecorderRef = useRef(null); // Ref to hold the MediaRecorder instance
  const audioChunksRef = useRef([]); // Ref to store audio data chunks
  const audioRef = useRef(null); // Ref for the audio element

  // Function to handle user sign in
  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password); // Sign in using Firebase auth
    } catch (error) {
      console.error('Error signing in:', error); // Log any errors
    }
  };

  // Function to handle user sign up
  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password); // Create a new user
    } catch (error) {
      console.error('Error signing up:', error); // Log any errors
    }
  };

  // Function to handle user sign out
  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error('Error signing out:', error); // Log any errors
    });
  };

  // Audio processing variables
  let audioContext; // Audio context for processing audio
  let analyser; // Analyser node for analyzing audio data
  let silenceTimer; // Timer to detect silence
  const SILENCE_THRESHOLD = 0.01; // Threshold to detect silence
  const SILENCE_DURATION = 5000; // Duration to wait before stopping recording after silence

  // Function to start recording audio
  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }) // Request access to the microphone
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream); // Create a MediaRecorder instance
        audioContext = new (window.AudioContext || window.webkitAudioContext)(); // Create an audio context
        analyser = audioContext.createAnalyser(); // Create an analyser node
        const source = audioContext.createMediaStreamSource(stream); // Create a source from the media stream
        source.connect(analyser); // Connect the source to the analyser

        mediaRecorderRef.current.ondataavailable = event => {
          audioChunksRef.current.push(event.data); // Store audio data chunks
        };

        mediaRecorderRef.current.start(); // Start recording
        setIsRecording(true); // Update recording state

        // Start checking for silence
        checkSilence();
      });
  };

  // Function to check for silence in the audio input
  const checkSilence = () => {
    const bufferLength = analyser.frequencyBinCount; // Get the number of frequency bins
    const dataArray = new Uint8Array(bufferLength); // Create an array to hold audio data
    analyser.getByteTimeDomainData(dataArray); // Get the audio data from the analyser

    let silenceDetected = true; // Assume silence is detected
    for (let i = 0; i < bufferLength; i++) {
      // Check if the audio data indicates sound above the silence threshold
      if (Math.abs(dataArray[i] - 128) / 128 > SILENCE_THRESHOLD) {
        silenceDetected = false; // Sound detected, not silent
        break;
      }
    }

    // If silence is detected, start a timer to stop recording
    if (silenceDetected) {
      if (!silenceTimer) {
        silenceTimer = setTimeout(() => {
          stopRecording(); // Stop recording after the specified silence duration
        }, SILENCE_DURATION);
      }
    } else {
      // If sound is detected, clear the silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    }

    // Continue checking for silence if still recording
    if (isRecording) {
      requestAnimationFrame(checkSilence);
    }
  };

  // Function to stop recording audio
  const stopRecording = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop(); // Stop the MediaRecorder
      setIsRecording(false); // Update recording state
      if (audioContext) {
        await audioContext.close(); // Close the audio context
        audioContext = null; // Reset audio context
        analyser = null; // Reset analyser
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer); // Clear the silence timer
        silenceTimer = null;
      }
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // Create a Blob from audio chunks
        audioChunksRef.current = []; // Reset audio chunks
        await processAudio(audioBlob); // Process the recorded audio
      };
    }
  };

  // Function to process the recorded audio
  const processAudio = async (audioBlob) => {
    setLoading(true); // Set loading state
    try {
      const transcription = await handleSTT(audioBlob); // Convert audio to text using STT
      const analysis = analyzeTranscription(transcription); // Analyze the transcription
      if (analysis) {
        const { audioBlob, downloadURL } = await handleTTS(analysis.script, analysis.scriptName); // Generate audio from the analysis
        if (audioBlob) {
          const audioUrl = URL.createObjectURL(audioBlob); // Create a URL for the audio Blob
          setAudioSrc(audioUrl); // Set the audio source
        } else if (downloadURL) {
          setAudioSrc(downloadURL); // Set the audio source from the download URL
        }
        // Play the audio after setting the source
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.error("Error playing audio:", e)); // Play the audio
        }
      } else {
        alert('No relevant information found for the given input.'); // Alert if no analysis is found
      }
    } catch (error) {
      console.error('Error processing audio:', error); // Log any errors
      alert('Failed to process audio. Please try again.'); // Alert on failure
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Render the UI
  return (
    <div className='wrapper'>
      <h1>What would you like to know about?</h1>
      {user ? ( // If the user is signed in
        <>
          <div className="btn-wrapper">
            <button onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {loading && <p>Processing...</p>} // Show loading message
            {audioSrc && <audio ref={audioRef} src={audioSrc} controls autoPlay />} // Audio player
            <button className='link abs' onClick={handleSignOut}>Sign out</button> // Sign out button
          </div>
        </>
      ) : ( // If the user is not signed in
        <>
          <p>Please sign in to use the app.</p>
          <div className="input-wrapper">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Update email state
              placeholder="Email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Update password state
              placeholder="Password"
            />
            <div className="btn-wrapper">
              <button onClick={handleSignIn}>Sign In</button> // Sign in button
              <button className="link" onClick={handleSignUp}>Sign Up</button> // Sign up button
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App; // Export the App component
