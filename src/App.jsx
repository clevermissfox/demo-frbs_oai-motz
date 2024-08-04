import React, { useState, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { handleSTT, handleTTS, analyzeTranscription } from './openai';

function App() {
  const [user] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [audioSrc, setAudioSrc] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null); // Add a ref for the audio element

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing up:', error);
    }
  };

  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error('Error signing out:', error);
    });
  };

  let audioContext;
  let analyser;
  let silenceTimer;
  const SILENCE_THRESHOLD = 0.01; // Adjust this value based on your needs
  const SILENCE_DURATION = 5000; // 3 seconds of silence
  
  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
  
        mediaRecorderRef.current.ondataavailable = event => {
          audioChunksRef.current.push(event.data);
        };
  
        mediaRecorderRef.current.start();
        setIsRecording(true);
  
        // Start checking for silence
        checkSilence();
      });
  };

  const checkSilence = () => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);
  
    let silenceDetected = true;
    for (let i = 0; i < bufferLength; i++) {
      if (Math.abs(dataArray[i] - 128) / 128 > SILENCE_THRESHOLD) {
        silenceDetected = false;
        break;
      }
    }
  
    if (silenceDetected) {
      if (!silenceTimer) {
        silenceTimer = setTimeout(() => {
          stopRecording();
        }, SILENCE_DURATION);
      }
    } else {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    }
  
    if (isRecording) {
      requestAnimationFrame(checkSilence);
    }
  };
  
  

  const stopRecording = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (audioContext) {
        await audioContext.close();
        audioContext = null;
        analyser = null;
      }
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        audioChunksRef.current = [];
        await processAudio(audioBlob);
      };
    }
  };
  

  const processAudio = async (audioBlob) => {
    setLoading(true);
    try {
      const transcription = await handleSTT(audioBlob);
      const analysis = analyzeTranscription(transcription);
      if (analysis) {
        const { audioBlob, downloadURL } = await handleTTS(analysis.script, analysis.scriptName);
        if (audioBlob) {
          const audioUrl = URL.createObjectURL(audioBlob);
          setAudioSrc(audioUrl);
        } else if (downloadURL) {
          setAudioSrc(downloadURL);
        }
        // Add this: Play the audio after setting the source
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.error("Error playing audio:", e));
        }
      } else {
        alert('No relevant information found for the given input.');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className='wrapper'>
      <h1>What would you like to know about?</h1>
      {user ? (
        <>
          <div className="btn-wrapper">
            <button onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            {loading && <p>Processing...</p>}
            {audioSrc && <audio ref={audioRef} src={audioSrc} controls autoPlay />}
            <button className='link abs' onClick={handleSignOut}>Sign out</button>
          </div>
        </>
      ) : (
        <>
          <p>Please sign in to use the app.</p>
          <div className="input-wrapper">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <div className="btn-wrapper">
              <button onClick={handleSignIn}>Sign In</button>
              <button className="link" onClick={handleSignUp}>Sign Up</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
