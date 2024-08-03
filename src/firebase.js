// firebase credentials are :
// google acct: demoland.throwaway@gmail.com pw: demoland

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7cuvaKwEvwBA2mi2XeazvXWD8g0tPwxA",
  authDomain: "demoland-d0f7a.firebaseapp.com",
  projectId: "demoland-d0f7a",
  storageBucket: "demoland-d0f7a.appspot.com",
  messagingSenderId: "219823922050",
  appId: "1:219823922050:web:26fa1226eaa229fa464d9b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);