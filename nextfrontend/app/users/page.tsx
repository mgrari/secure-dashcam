"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {decryptDataChunk, generateSymmetricKey, generateHMACKey, encryptData, verifyMAC, decryptData, importKey, encryptAndSignKey} from '@/crypto/symKeyUtils';
import {base64ToArrayBuffer, arrayBufferToBase64, decryptWithPrivateKey, verifySignatureWithPublicKey, importPrivateKey, importPublicKey, encryptWithPublicKey} from '@/crypto/rsaUtils';
import { LineShadowText } from "@/components/ui/line-shadow-text";
import { AnimatePresence, motion } from "framer-motion";
import { Play, XIcon } from "lucide-react";
import { logout } from '@/actions/auth';
  import { AlertCircle } from "lucide-react"
 
  import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "@/components/ui/alert"
import { formatDate } from "@/utils/dateUtils";

export default function EditUsers() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [name, setName] = useState("");
  const [users, setUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
          setName(response.data.isTrustedUser ? response.data.fullname : response.data.username);
          if (response.data.isTrustedUser){
            return router.push("/hometrusted");
          }    
          fetchUsers();      
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

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("https://localhost:8080/api/users/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 200) {
        setUsers(response.data);
      } else {
        setErrorMessage("Failed to fetch users.");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setErrorMessage("An error occurred while fetching your users.");
    } finally {
      setLoading(false);
    }
  };

  // Handle user selection and decryption
  const handleUserSelect = async (user) => {
  try {
    const token = localStorage.getItem("token");

    // Fetch encrypted symmetric key
    const symKeyResponse = await axios.get("https://localhost:8080/getSymetric", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const encryptedSymmetricKey = symKeyResponse.data.encryptedSymmetricKey;
    const privateKey = localStorage.getItem(`${symKeyResponse.data.username}_private_key`);

    if (!privateKey) {
      throw new Error("Private key not found for the user.");
    }

    // Decrypt symmetric key
    const importedPrivateKey = await importPrivateKey(privateKey, "decrypt");
    const symmetricKeyBase64 = await decryptWithPrivateKey(encryptedSymmetricKey, importedPrivateKey);
    //const symmetricKey = await importKey(base64ToArrayBuffer(symmetricKeyBase64));
    const trustedImportedPublicKey = await importPublicKey(user.public_key, 'encrypt');
    const encryptedKey = await encryptWithPublicKey(symmetricKeyBase64, trustedImportedPublicKey); 
    // Fetch encrypted symmetric key
    const sharedResponse = await axios.post("https://localhost:8080/api/users/share", {
      trusted_user: user.username,
      encrypted_symmetric_key: encryptedKey
    },{
      headers: { Authorization: `Bearer ${token}` },
    });
    if(sharedResponse.status == 200) {
      setAlert({
        type : "success",
        message: sharedResponse.data.message
      });
      fetchUsers();
    }
  } catch (error) {
    console.error("Error encrypting/decrypting keys:", error);
    setErrorMessage("Failed to encrypt/decrypt the keys." );
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
          <LineShadowText className="italic" shadowColor="white">Trusted</LineShadowText>
          <LineShadowText className="italic" shadowColor="white">Users</LineShadowText>
        </div>

        {loading && <p className="text-xl text-center animate-pulse">Loading users...</p>}
        {alert && (
  <div className="fixed top-0 left-0 right-0 z-[100] p-4">
    <Alert
      variant={ "destructive" }
      className="bg-black shadow-lg border border-gray-300 max-w-3xl mx-auto rounded-md"
    >
      <AlertCircle className="h-4 w-4 text-red-500" />
      <div>
        <AlertTitle className="text-lg font-bold text-red-500">
          {alert.type === "error" ? "Error" : "Success"}
        </AlertTitle>
        <AlertDescription className="text-sm text-red-500">
          {alert.message}
        </AlertDescription>
      </div>
    </Alert>
  </div>
)}



        {!loading && users.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {users.map((user, index) => (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-center text-gray-100">
                  {user.username}
                </h3>
                <button
                  onClick={() => handleUserSelect(user)}
                  className="block w-full py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 transition"
                >
                  Share with this User
                </button>
            </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
