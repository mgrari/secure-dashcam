import axios from 'axios';
import { handleLogin, handleRegistration } from '@/crypto/handlers';
const config = {
    headers: {
        'Content-Type': 'application/json'
    }
};

export const login = async (username, code) => {
  const body = JSON.stringify({ username, code });

  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  try {
    const res = await axios.post('https://localhost:8080/api/user/login', body, config);
    const { accessToken } = res.data;
    localStorage.setItem('token', accessToken);
    return {
      status: res.status,
      message: 'Login successful',
    };
  } catch (err) {
    return {
      status: 500,
      message: 'Error authenticating',
    };
  }
};


export const register = async (userData) => {
    try {
        const user_data = await handleRegistration(userData);    
        const res = await axios.post('https://localhost:8080/api/user/register', user_data, config);
        // TODO: may be send an email for confirmation
        // console.log('User signed up successfully. : confirm the email sent to you, to complete your authentication'); 
        return res;
    } catch (error) {
        console.log('Error authenticating');
        return error;
    }
};

export const logout = async ()  => {    
    try{
        localStorage.removeItem('token');
        const res = await axios.post('https://localhost:8080/api/user/logout', user_data, config);
        console.log('Logout successful', 'success');
        return res;
    } catch(error) {
        return error
    }
};
