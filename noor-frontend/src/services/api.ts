// import axios from 'axios';
// import { Platform } from 'react-native';

// // ✅ PRODUCTION BACKEND URL (AWS)
// const PROD_API_URL = "https://noorclient.prolync.in/api";

// // ✅ Decide API based on environment
// const getApiUrl = () => {
//     if (__DEV__) {
//         if (Platform.OS === 'web') {
//             return 'http://localhost:5000/api';
//         } else if (Platform.OS === 'android') {
//             return 'http://10.0.2.2:5000/api'; // Android Emulator localhost
//         } else {
//             return 'http://localhost:5000/api'; // iOS Simulator
//         }
//     }
//     return PROD_API_URL;
// };

// const API_URL = getApiUrl();

// const api = axios.create({
//     baseURL: API_URL,
//     headers: {
//         'Content-Type': 'application/json',
//     },
//     timeout: 10000,
// });

// // ✅ Auth token handler
// export const setAuthToken = (token: string | null) => {
//     if (token) {
//         api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//     } else {
//         delete api.defaults.headers.common['Authorization'];
//     }
// };

// export default api;



import axios from "axios";
import { Platform } from "react-native";

// ✅ PRODUCTION BACKEND URL (AWS)
// const PROD_API_URL = "https://noorclient.prolync.in/api";
const PROD_API_URL = "https://noorbuilders.com/api";

// ✅ Optional: local dev URL (ONLY for local testing)
const DEV_API_URL = "https://noorbuilders.com";

// ✅ Decide API based on environment
const getApiUrl = () => {
    // When running locally in dev mode
    // if (__DEV__) {
    //     if (Platform.OS === "web") {
    //         return DEV_API_URL;
    //     }
    //     // Android emulator local testing
    //     if (Platform.OS === "android") {
    //         return "http://10.0.2.2:5000/api";
    //     }
    // }

    // ✅ Production (APK / Netlify / real devices)
    return PROD_API_URL;
};

export const API_URL = getApiUrl();
export const BASE_URL = API_URL.replace(/\/api$/, "");

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000,
});

// ✅ Auth token handler
export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common["Authorization"];
    }
};

export default api;