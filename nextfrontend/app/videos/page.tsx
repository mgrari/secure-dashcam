"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {decryptDataChunk, generateSymmetricKey, generateHMACKey, encryptData, verifyMAC, decryptData, importKey, encryptAndSignKey, importHmacKey} from '@/crypto/symKeyUtils';
import {base64ToArrayBuffer, arrayBufferToBase64, decryptWithPrivateKey, verifySignatureWithPublicKey, importPrivateKey, importPublicKey} from '@/crypto/rsaUtils';
import { LineShadowText } from "@/components/ui/line-shadow-text";
import { AnimatePresence, motion } from "framer-motion";
import { Play, XIcon } from "lucide-react";
  import { AlertCircle } from "lucide-react"
 
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "@/components/ui/alert"
import { formatDate } from "@/utils/dateUtils";

export default function VideoPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTrustedUser, setIsTrustedUser] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [trustedUserVideos, setTrustedUserVideos] = useState([]);
  const [name, setName] = useState("");
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [decryptedVideoUrl, setDecryptedVideoUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);


  // Close alert after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Fetch the current user's info
  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      try {
        if (!token) {
          setIsCheckingAuth(false);
          return router.push("/");
        }

        const response = await axios.get("https://localhost:8080/api/user/current", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 200) {
          setIsAuthenticated(true);
          setIsTrustedUser(response.data.isTrustedUser);
          setName(response.data.username);
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error("Error verifying authentication:", error);
        router.push("/");
      } finally {
        setIsCheckingAuth(false);
      }
    })();
  }, []);

  // Fetch user's videos
  const fetchUserVideos = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem("token");
      let response ;
      if (!isTrustedUser) {
        response = await axios.get("https://localhost:8080/api/video/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        response = await axios.get("https://localhost:8080/api/video/trustedList", {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (response.status === 200) {
        if(!isTrustedUser)
          setVideos(response.data.videos);
        else {
          setTrustedUserVideos(response.data);
          const list_videos = [];

          for (let item of response.data) {
            list_videos.push(...item.videos);
          }
          setVideos(list_videos);
        }
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      setErrorMessage("An error occurred while fetching your videos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserVideos();
    }
  }, [isAuthenticated]);

  // Handle video selection and decryption
  const handleVideoSelect = async (video : any) => {
  setSelectedVideo(video);
  setDecryptedVideoUrl(null);
  setLoading(true);
  setErrorMessage(null);

  try {
    const token = localStorage.getItem("token");
    let symKeyResponse;
    let encryptedSymmetricKey;
    let privateKey;
    let owner_username;
    if (!isTrustedUser){
      // Fetch encrypted symmetric key
      symKeyResponse = await axios.get("https://localhost:8080/getSymetric", {
        headers: { Authorization: `Bearer ${token}` },
      });
      encryptedSymmetricKey = symKeyResponse.data.encryptedSymmetricKey;
      privateKey = localStorage.getItem(`${symKeyResponse.data.username}_private_key`);
    }
    else {
      for(let item of trustedUserVideos) { //search for the symmetric key
        for(let itemb of item.videos) {
          if (itemb == video) {
            encryptedSymmetricKey = item.encrypted_symmetric_key;
            owner_username = item.username;
            break;
          }
        }
      }
      privateKey = localStorage.getItem(`${name}_private_key`);
    }
    if (!privateKey) {
      throw new Error("Private key not found for the user.");
    }

    // Decrypt symmetric key
    const importedPrivateKey = await importPrivateKey(privateKey, "decrypt");
    const symmetricKeyBase64 = await decryptWithPrivateKey(encryptedSymmetricKey, importedPrivateKey);
    const symmetricKey = await importKey(base64ToArrayBuffer(symmetricKeyBase64));

    // Fetch video chunks
    let chunkResponse;
    if (!isTrustedUser) {
      chunkResponse = await axios.get(`https://localhost:8080/api/video/${video.name}/${symKeyResponse.data.username}/chunks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      chunkResponse = await axios.get(`https://localhost:8080/api/video/${video.name}/${owner_username}/chunks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (chunkResponse.status !== 200 || !chunkResponse.data || chunkResponse.data.length === 0) {
      throw new Error("No chunks found for this video.");
    }

    const encryptedChunks = chunkResponse.data;

    // Decrypt video chunks
    const decryptedChunks = await Promise.all(
      encryptedChunks.map((chunk : any) => decryptDataChunk(chunk.chunk, symmetricKey))
    );

    // Combine all decrypted Blob chunks into a single Blob
    const combinedBlob = new Blob(decryptedChunks, { type: "video/webm" });

    // Create a URL for the video Blob
    const videoUrl = URL.createObjectURL(combinedBlob);
    setDecryptedVideoUrl(videoUrl);
  } catch (error) {
    console.error("Error decrypting video:", error);
    setErrorMessage("Failed to decrypt the video.");
  } finally {
    setLoading(false);
  }
};



const handleDeleteVideo = async () => {
  try {
    const response = await axios.delete(`https://localhost:8080/api/video/${selectedVideo.name}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    if (response.status === 200) {
      setAlert({ type: "success", message: "Video deleted successfully!" });

      // Update the videos list in state by removing the deleted video
      setVideos((prevVideos) =>
        prevVideos.filter((video) => video.name !== selectedVideo.name)
      );

      // Clear the selected video
      setSelectedVideo(null);
    } else if (response.status === 401) {
      setAlert({ type: "error", message: "You cannot delete the video." });
    }
  } catch (error) {
    console.error("Error deleting video:", error);
    setAlert({ type: "error", message: "An error occurred while deleting the video." });
  }
};


  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Go Back
        </button>
        <h1 className="text-3xl font-bold">Welcome, {name}!</h1>
        <button
          onClick={() => router.push("/logout")}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </header>

            <main>
        <div className="text-center mt-10 text-9xl space-x-6 w-full">
          <LineShadowText className="italic" shadowColor="white" >Your</LineShadowText>
          <LineShadowText className="italic" shadowColor="white">Videos</LineShadowText>
        </div>

        {!loading && videos.length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
    {videos.map((video, index) => (
      <motion.div
        key={index}
        className="bg-gray-800 p-4 rounded-lg shadow-lg hover:shadow-xl transition duration-300"
        whileHover={{ scale: 1.05 }}
      >
        <h3 className="text-lg font-semibold mb-4 text-center text-gray-100">
          {formatDate(video.name)}
        </h3>
        <p className="text-sm text-center text-gray-400">
          Shared by: {video.sharedBy || "No one, it's yours"}
        </p>
        <button
          onClick={() => handleVideoSelect(video)}
          className="block w-full py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition"
        >
          View Video
        </button>
      </motion.div>
    ))}
  </div>
)}

        {selectedVideo && decryptedVideoUrl && (
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="relative bg-transparent rounded-lg shadow-lg z-50"
                style={{ maxWidth: "66vw", maxHeight: "66vh", width: "auto", height: "auto" }}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
              >
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute top-[-20px] right-[-20px] bg-neutral-800/80 p-3 text-white rounded-full shadow-lg hover:bg-neutral-700 transition-all"
                >
                  <XIcon className="size-6" />
                </button>
                <video
                  src={decryptedVideoUrl}
                  autoPlay
                  controls
                  className="w-full h-full rounded-lg"
                  style={{ objectFit: "contain" }}
                />
                <div className="flex justify-evenly gap-4 mt-4">
                  <a
                    href={decryptedVideoUrl}
                    download={`${selectedVideo.name}.webm`}
                    className="px-4 py-2 text-white rounded-md shadow-md hover:bg-green-600 transition bg-green-500"
                  >
                    Download Video
                  </a>
                  {
                    !isTrustedUser && 
                    <button
                      onClick={handleDeleteVideo}
                      className="px-4 py-2 text-white rounded-md shadow-md hover:bg-red-600 transition bg-red-500"
                    >
                      Delete Video
                    </button>
                  }
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

    </div>
  );
}
