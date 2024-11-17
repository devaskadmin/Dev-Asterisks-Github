import axios from 'axios';

// Create an Axios instance
const apiClient = axios.create({
    baseURL: 'http://localhost:5000/api', // Adjust this URL for production
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
