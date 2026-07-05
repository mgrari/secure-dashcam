"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from 'next/navigation'; // Use this for navigation in App Router
import axios from 'axios';
import { handleProfile, handleProfileTrusted } from '@/crypto/handlers';
import { logout } from '@/actions/auth';
import { exit } from "process";
import {encryptDatachunk,generateMAC, generateSymmetricKey, generateHMACKey, encryptData, verifyMAC, decryptData, importKey, encryptAndSignKey, importHmacKey} from '@/crypto/symKeyUtils';
import {base64ToArrayBuffer, arrayBufferToBase64, decryptWithPrivateKey, verifySignatureWithPublicKey, importPrivateKey, importPublicKey} from '@/crypto/rsaUtils';

export default function Dashcam() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true); 
  const [name, setName] = useState('');
  const [showProjects, setShowProjects] = useState(false);
  const [fadeClass, setFadeClass] = useState("opacity-0");
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // Reference for MediaRecorder
  const userStreamRef = useRef<MediaStream | null>(null); // Reference for the user media stream
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoId] = useState(`${Date.now()}`); // Video ID
  const [clientId] = useState("unique-client-id"); // TODO: add real client ID


  useEffect(() => {
    const token = localStorage.getItem('token');
    (async () => {
      try {
        if (!token) {
          setIsCheckingAuth(false); // Fin de la vérification
          return router.push('/');
        }
        

        const response = await axios.get('https://localhost:8080/api/user/current', {
          headers: { Authorization: `Bearer ${token}` },
          
        });

        if (response.status == 200) {
          setIsAuthenticated(true);
          setIsCheckingAuth(false); // Fin de la vérification
          let decrypted_profile;
          if (response.data.isTrustedUser) {
            decrypted_profile = await handleProfileTrusted(response.data);
            setName(decrypted_profile.fullname);
          }
          else{
            decrypted_profile = await handleProfile(response.data);
            setName(decrypted_profile.email);
          }
          const timer = setTimeout(() => {
            setShowProjects(true);
            setFadeClass("opacity-100 transition-opacity duration-1000");
          }, 1500);
      
          return () => clearTimeout(timer);      
        } else {
          setIsCheckingAuth(false); // Fin de la vérification
          router.push('/');
        }
      } catch (error) {
        console.error('Error verifying authentication:', error);
        await handleLogout();
        setIsCheckingAuth(false); // Fin de la vérification
      }
    })();
  }, []);

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      cleanupResources(); // Stop recording and release resources
      router.push('/'); // Redirect to the login page
    }
}, [isAuthenticated, isCheckingAuth]);

 
  useEffect(() => {
    if (isAuthenticated && !isCheckingAuth) {
      initializeMedia();
      return () => {
        cleanupResources(); // Ensure cleanup on component unmount
      };
    }
  }, [isAuthenticated, isCheckingAuth]); // Ne démarre l'enregistrement que lorsque l'utilisateur est authentifié et la vérification terminée
  


  const handleLogout = async() => {
    await logout();
    setIsAuthenticated(false);
    router.push('/'); // Redirect to home page after logout
  };

  



  const cleanupResources = () => {
    // Stop MediaRecorder if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop all tracks in the media stream
    if (userStreamRef.current) {
      userStreamRef.current.getTracks().forEach((track) => track.stop());
      userStreamRef.current = null;
    }
  };


  const initializeMedia = async () => {
    try {

      if (!isAuthenticated) {
      return; // Don't initialize media if not authenticated
    }
      // Check for media devices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Media devices are not supported on this browser.");
        return;
      }

      // Request camera and microphone
      const userStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      userStreamRef.current = userStream; // Store the stream reference

      // Attach the stream to the video element
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
      }

      // MIME type setup
      let mimeType = "video/webm;codecs=\"vp8, opus\""; // Default codec

      // Check if the selected codec is supported
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to supported codec
        mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9")
          ? "video/webm; codecs=vp9"
          : MediaRecorder.isTypeSupported("video/webm; codecs=vp8")
          ? "video/webm; codecs=vp8"
          : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : ""; // Fallback if no codec is supported
      }

      if (!mimeType) {
        setErrorMessage("Your browser does not support any compatible video codecs.");
        return;
      }

      // Combine valid audio and video tracks
// send request with brearer token to /api/video/getEncryptedSymetric
      const token = localStorage.getItem('token');
      const response = await axios.get('https://localhost:8080/getSymetric', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const encrypted_symmetric_key_videos = response.data.encryptedSymmetricKey;
      const private_key = localStorage.getItem(response.data.username + '_' + 'private_key');
      
      if (!private_key) {
        throw new Error("Private key not found for the user.");
      }

      const imported_private_key = await importPrivateKey(private_key, 'decrypt');
      const symmetric_key_base64 = await decryptWithPrivateKey(encrypted_symmetric_key_videos, imported_private_key);

      const symmetric_key = await importKey(base64ToArrayBuffer(symmetric_key_base64));


      const videoTracks = userStream.getVideoTracks();
      const audioTracks = userStream.getAudioTracks();

      if (audioTracks.length === 0) {
        setErrorMessage("Audio track is missing. Cannot start recording.");
        return;
      }

      const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);
      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = async (event) => {
        if (!isAuthenticated) {
          // Stop the recorder if the user is not authenticated
          mediaRecorder.stop();
          return;
        }

        if (event.data.size > 0) {
          chunks.push(event.data);
          console.warn("Chunk size:", event.data.size);

          // Metadata
          const timestamp = Date.now();
          const chunkSize = event.data.size;
          const chunkIndex = chunks.length; // Index prédéfini, ne dépend pas des données

          try {
            // Encrypt the video chunk with the symmetric key
            const encryptedChunk = await encryptDatachunk(event.data, symmetric_key);

            // Prepare metadata
            const metadata = {
              chunkIndex,
              timestamp,
              chunkSize,
              videoId,
            };

            // Convert encrypted chunk to Base64 for transmission
            const encryptedChunkData = JSON.stringify(encryptedChunk);


            // Send encrypted chunk with metadata to the backend
            const formData = new FormData();
            formData.append("encryptedChunk", encryptedChunkData); // Encrypted chunk as JSON string
            formData.append("metadata", JSON.stringify(metadata)); // Metadata as JSON string
            console.warn("encryptedchunkdatasize", encryptedChunkData.length);



            const response = await fetch("https://localhost:8080/stream", {
              method: "POST",
              body: formData,
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              console.error("Failed to send encrypted video chunk:", await response.text());
            }
          } catch (error) {
            console.error("Error encrypting or sending video chunk:", error);
          }
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setMediaUrl(url);
        setRecording(false);
      };

      // Start recording
      setRecording(true);
      mediaRecorder.start(500); // Capture chunks every 500ms
      setErrorMessage(null); // Clear any errors
    } catch (error) {
      console.error("Error accessing media devices:", error);
      if (error instanceof Error) {
      if (error.name === "NotReadableError") {
        setErrorMessage(
          "Could not access the camera or microphone. Ensure no other application is using them."
        );
      } else if (error.name === "NotAllowedError") {
        setErrorMessage(
          "Permission to access the camera or microphone was denied."
        );
      } else if (error.name === "OverconstrainedError") {
        setErrorMessage(
          "The requested media constraints could not be satisfied."
        );
      } else {
        setErrorMessage(`Unexpected error: ${error.message}`);
      }
    }
  }
  };

  useEffect(() => {
    initializeMedia();

    // Handle cleanup on unmount
    return () => {
      cleanupResources();
    };
  }, []); // Runs only once on mount

  return (
    <div className="h-screen w-full dark:bg-black bg-white dark:bg-grid-white/[0.2] bg-grid-black/[0.2] relative flex items-center justify-center">
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        <button
          onClick={() => router.back()} // Use Next.js router to navigate back
          className="absolute top-4 left-4 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition duration-300 shadow-lg"
        >
          Return
        </button>
      <div className="relative z-10 w-full max-w-7xl p-4">
        {/* Return Button */}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-neutral-800 bg-black/50 shadow-2xl">
          {errorMessage ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <p className="text-red-500 text-lg font-bold text-center">
                {errorMessage}
              </p>
            </div>
          ) : (
            <>
              {!videoRef.current?.srcObject && (
                <Image
                  src="/noise.gif"
                  alt="TV Noise"
                  fill
                  unoptimized
                  className="h-full w-full object-cover filter brightness-15"
                />
              )}
              <video
                ref={videoRef}
                className={`h-full w-full object-cover ${
                  videoRef.current?.srcObject ? "block" : "hidden"
                }`}
                autoPlay
                muted
                playsInline
              ></video>
              {mediaUrl && (
                <div>
                  <h2 className="text-white text-lg font-bold">
                    Recorded Video:
                  </h2>
                  <video
                    src={mediaUrl}
                    controls
                    className="h-full w-full mt-4 rounded-lg"
                  ></video>
                </div>
              )}
            </>
          )}
        </div>
        <div className="absolute left-4 top-4 flex items-center gap-2">
          {recording && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute left-4 top-4 flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-xs font-medium text-white/80">REC</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
