import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIza....",
  authDomain: "page-5b3da.firebaseapp.com",
  projectId: "page-5b3da",
  storageBucket: "page-5b3da.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
