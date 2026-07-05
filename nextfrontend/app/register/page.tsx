'use client';

import React, { useEffect, useState } from 'react';
import { countries } from 'countries-list';
import { register } from '@/actions/auth';
import { useRouter } from 'next/navigation'; // Use this for navigation in App Router
import axios from 'axios';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(''); // Email state
  const [isTrustedUser, setIsTrustedUser] = useState(false);
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('');
  const [emailError, setEmailError] = useState('');
  const [message, setMessage] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return ;

        const response = await axios.get('https://localhost:8080/api/user/current', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status == 200) {
          router.push('/home');
        }
      } catch (error) {
        localStorage.removeItem('token');
      }
    })();
  }, []);

  // Extract country names and codes from countries-list
  const countryList = Object.entries(countries).map(([code, country]) => ({
    code,
    name: country.name,
  }));

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleRegister = async (e: any) => {
    e.preventDefault();

    // Validate required fields
    if (
      !username ||
      !email ||
      (isTrustedUser && (!fullName || !organization || !country))
    ) {
      setMessage('Please fill in all required fields.');
      return;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      setEmailError('Invalid email address.');
      return;
    }

    // Prepare user data
    const userData = {
      username,
      email,
      ...(isTrustedUser && { fullName, organization, country }), // Add trusted user data if applicable
    };

    try {
      if (qrCode && secret) {
        setQrCode('');
        setSecret('');
      }

      const response:  any = await register(userData);
      
      if (response.status != 200) {
        setMessage('Registration failed');
      }
      const data = await response.data;
      
      if (data && data.qrcode_image && data.secret) {
        setQrCode(data.qrcode_image);
        setSecret(data.secret);
      }
      setMessage(data.message || 'Registration successful!');
    } catch (error : any) {
      setMessage(error.message || 'An error occurred. Please try again.');
    }
  };

  const handleEmailChange = (e: any) => {
  const value = e.target.value;
  setEmail(value);

  // Validate email format
  if (!emailRegex.test(value)) {
    setEmailError('Invalid email address.');
  } else {
    setEmailError('');
  }
};


  return (
    <div
      className="min-h-screen flex items-center justify-center bg-black"
      style={{
        backgroundImage: "url('https://source.unsplash.com/1920x1080/?dashboard,camera')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="max-w-md w-full bg-opacity-75 bg-gray-900 p-8 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Create Your DashSecure Account
        </h2>
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-400">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              required
              className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>
          <div className="flex items-center">
            <input
              id="isTrustedUser"
              type="checkbox"
              checked={isTrustedUser}
              onChange={(e) => setIsTrustedUser(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
            />
            <label htmlFor="isTrustedUser" className="text-sm font-medium text-gray-400">
              Register as a Trusted User
            </label>
          </div>
          {isTrustedUser && (
            <>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-400">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-gray-400">
                  Organization
                </label>
                <input
                  id="organization"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                  className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-400">
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required
                  className="mt-1 block w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" disabled>
                    Select your country
                  </option>
                  {countryList.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button
            type="submit"
            className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={!!emailError}
          >
            Sign Up
          </button>
          {qrCode && (
                <div>
                    <h2>Scan this QR Code with Google Authenticator</h2>
                    <img src={qrCode} />
                    <p>Or use this secret key: {secret}</p>
                </div>
            )} 
        </form>
        {message && (
          <p className="mt-4 text-center text-sm text-gray-300">{message}</p>
        )}
        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="text-blue-400 hover:text-blue-500">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
