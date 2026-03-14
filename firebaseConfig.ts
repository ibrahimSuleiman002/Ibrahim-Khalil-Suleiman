
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// Replace these placeholders with your actual Firebase project config
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
export const auth = getAuth(app);
