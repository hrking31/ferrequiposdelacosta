import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxFuwn9lwmYwkxsyD28XBnTu5EDRBIB2g",
  authDomain: "ferrequiposdelacosta-e2457.firebaseapp.com",
  projectId: "ferrequiposdelacosta-e2457",
  storageBucket: "ferrequiposdelacosta-e2457.appspot.com",
  messagingSenderId: "428909622394",
  appId: "1:428909622394:web:728f81395dab4fa39e37c3",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export default db;
