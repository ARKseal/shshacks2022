// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyArtbyyjIX-MaO0x-zyeabQdHS3aN8Rsek",
  authDomain: "choice-2022.firebaseapp.com",
  databaseURL: "https://choice-2022-default-rtdb.firebaseio.com",
  projectId: "choice-2022",
  storageBucket: "choice-2022.appspot.com",
  messagingSenderId: "53489200258",
  appId: "1:53489200258:web:1276b8c6170a456bab989b",
  measurementId: "G-XJJ5DL9YTL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

firebase.initializeApp(firebaseConfig); //initialize firebase app 
module.exports = { firebase, app, analytics, auth }; //export the app
