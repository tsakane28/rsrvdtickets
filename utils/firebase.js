import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { EmailAuthProvider } from "firebase/auth";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
	apiKey: "AIzaSyARAkKkmqGsHS8JesYBFMFys9hz-qQrBYQ",
	authDomain: "rsrvd-be799.firebaseapp.com",
	databaseURL: "https://rsrvd-be799-default-rtdb.firebaseio.com",
	projectId: "rsrvd-be799",
	storageBucket: "rsrvd-be799.firebasestorage.app",
	messagingSenderId: "920784334197",
	appId: "1:920784334197:web:5a5a829458365f3536b73c",
	measurementId: "G-B84Y7H1CG0"
  };


// Initialize Firebase
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const provider = new EmailAuthProvider();
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { provider, auth, storage };
export default db;
