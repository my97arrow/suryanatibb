const firebaseConfig = {
  apiKey: "AIzaSyCaYmaYYrK_hvUZWieQ5kw3gxP-Hc_6Tx8",
  authDomain: "suryanatibb.firebaseapp.com",
  projectId: "suryanatibb",
  storageBucket: "suryanatibb.firebasestorage.app",
  messagingSenderId: "851734498364",
  appId: "1:851734498364:web:d4b3eb60a12a1cce26c739",
  measurementId: "G-C17E1QK0LN"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

db.enablePersistence({ synchronizeTabs: true }).catch(() => {
  // Ignore if persistence cannot be enabled
});

window.db = db;
