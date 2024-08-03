import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { handleTTS } from './openai';

function App() {
  {/* Use Firebase authentication state */}
  const [user] = useAuthState(auth);
  
  {/* State for form inputs and UI control */}
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [text, setText] = useState('');
  const [audioSrc, setAudioSrc] = useState('');
  const [loading, setLoading] = useState(false);

  {/* Handle user sign in */}
  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  {/* Handle new user sign up */}
  const handleSignUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing up:', error);
    }
  };

  {/* Handle user sign out */}
  const handleSignOut = () => {
    signOut(auth).catch((error) => {
      console.error('Error signing out:', error);
    });
  };

  {/* Generate speech from text input */}
  const generateSpeech = async () => {
    if (!text) return; // Don't proceed if no text is entered

    setLoading(true);
    try {
      {/* Call OpenAI TTS API and upload to Firebase Storage */}
      const { audioBlob, downloadURL } = await handleTTS(text);

      {/* Validate the received audio data */}
      if (!(audioBlob instanceof Blob)) {
        throw new Error('Invalid audio data received');
      }

      {/* Create a local URL for the audio blob */}
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioSrc(audioUrl);

      {/* Log the Firebase Storage URL (useful for debugging) */}
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
      {/* Render TTS interface if user is logged in */}
      {/* OR Render login/signup form if user is not logged in */}
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