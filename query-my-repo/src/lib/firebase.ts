// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage"
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDac0pw92DURi4MQuSVb0ZPptnviILGDMw",
  authDomain: "query-my-repo.firebaseapp.com",
  projectId: "query-my-repo",
  storageBucket: "query-my-repo.firebasestorage.app",
  messagingSenderId: "188472839783",
  appId: "1:188472839783:web:f2f54d684ce7c6e06dcec2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app)


export async function uploadFile(
    file: File,
    setProgress?: (progress: number) => void,
): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const storageRef = ref(storage, file.name);
            const uploadTask = uploadBytesResumable(storageRef, file);
            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    // Observe state change events such as progress, pause, and resume
                    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                    const progress =
                        Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    if (setProgress) {
                        setProgress(progress);
                    }
                    switch (snapshot.state) {
                        case "paused":
                            console.log("Upload is paused");
                            break;
                        case "running":
                            console.log("Upload is running");
                            break;
                    }
                },
                (error) => {
                    // Handle unsuccessful uploads
                    reject(error);
                },
                () => {
                    // Handle successful uploads on complete
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        console.log("File available at", downloadURL);
                        resolve(downloadURL);
                    });
                },
            );
        } catch (error) {
            console.error(error);
        }
    });
}