import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { handleTTS } from './openai';

function App() {
  const [user] = useAuthState(auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [text, setText] = useState('');
  const [audioSrc, setAudioSrc] = useState('');
  const [loading, setLoading] = useState(false);

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

  const generateSpeech = async () => {
    if (!text) return;

    setLoading(true);
    try {
      const { audioBlob, downloadURL } = await handleTTS(text);

      // Check if audioBlob is valid before creating URL
      if (!(audioBlob instanceof Blob)) {
        throw new Error('Invalid audio data received');
      }

      // Create a URL for the Blob and set it as the audio source
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioSrc(audioUrl);

      // Log the Firebase Storage URL (optional)
      console.log('Firebase Storage URL:', downloadURL);
    } catch (error) {
      console.error('Error generating speech:', error);
      alert('Failed to generate speech. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='wrapper'>
      <h1>OpenAI TTS with Firebase</h1>
      {user ? (
        <>
          <div className="input-wrapper">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text for TTS"
              rows={5}
            />
          </div>
          <div className="btn-wrapper">
            <button onClick={generateSpeech} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Speech'}
            </button>
            {audioSrc && <audio src={audioSrc} controls />}
            <button className='link' onClick={handleSignOut}>Sign Out</button>
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