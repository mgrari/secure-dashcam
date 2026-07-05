"use client";
import React, { useState, useEffect } from "react";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { handleProfile, handleProfileTrusted } from '@/crypto/handlers';
import { useRouter } from 'next/navigation'; // Use this for navigation in App Router
import { logout } from '@/actions/auth';
import axios from 'axios';

const HomePage = () => {
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [name, setName] = useState('');
  const [showProjects, setShowProjects] = useState(false);
  const [fadeClass, setFadeClass] = useState("opacity-0");
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return router.push('/');

        const response = await axios.get('https://localhost:8080/api/user/current', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status == 200) {
          setIsAuthenticated(true);
          let decrypted_profile;
          if (response.data.isTrustedUser) {
            decrypted_profile = await handleProfileTrusted(response.data);
            setName(decrypted_profile.fullname);
            router.push('/hometrusted');
          }
          else{
            decrypted_profile = await handleProfile(response.data);
            setName(decrypted_profile.username);
          }
          const timer = setTimeout(() => {
            setShowProjects(true);
            setFadeClass("opacity-100 transition-opacity duration-1000");
          }, 1500);
      
          return () => clearTimeout(timer);      
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error verifying authentication:', error);
        await handleLogout();
      }
    })();
  }, []);


  const handleLogout = async() => {
    await logout();
    setIsAuthenticated(false);
    router.push('/'); // Redirect to home page after logout
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setCursorPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div>
    <div className="relative">
    {/* QoL Welcome and Logout Section */}
    <div className="absolute top-6 right-6 z-50 flex items-center gap-4 p-2 bg-gray-800 bg-opacity-90 rounded-lg shadow-lg">
      <p className="text-gray-200 text-sm font-medium">Hello, {name} !</p>
      <button
        onClick={handleLogout}
        className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Logout
      </button>
    </div>
  </div>

      <div
      className="absolute h-full w-full dark:bg-black bg-white dark:bg-dot-white/[0.2] bg-dot-black/[0.2] flex items-center justify-center"
      onMouseMove={handleMouseMove} // Track cursor globally
    >
      {/* Background Gradient */}
      <div className="absolute  inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_0%,black)]"></div>

      {/* Text Hover Effect */}
      <div className="absolute top-0 left-0 w-full h-full  z-10">
        <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 w-full max-w-[60%] ">
          <TextHoverEffect text="SSD" cursorPosition={cursorPosition} />
        </div>
      </div>

      {/* Projects Section */}
      <div
        className={`absolute w-full top-[50%] ${fadeClass} z-20`}
        style={{ visibility: showProjects ? "visible" : "hidden" }}
      >
        <div className="flex justify-center">
          <div className="max-w-4xl w-full ">
            <HoverEffect items={projects} />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

const projects = [
  {
    title: "DashCam",
    description: "This is a dashboard camera application",
    link: "/dashcam",
  },
  {
    title: "Edit User",
    description: "Here is where you can edit user information",
    link: "/users",
  },
  {
    title: "See Videos",
    description: "Here is where you can see the dashcam videos",
    link: "/videos",
  },
];

export default HomePage;
