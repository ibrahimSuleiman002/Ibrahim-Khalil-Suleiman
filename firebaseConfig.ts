// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBJ-suENNTLOvF7Hmy7Qu3itjfHIRcHfVk",
    authDomain: "project-kano.firebaseapp.com",
    projectId: "project-kano",
    storageBucket: "project-kano.firebasestorage.app",
    messagingSenderId: "691276197217",
    appId: "1:691276197217:web:3821e12a7ad752e6f2e920",
    measurementId: "G-XBGMK3N0GW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);