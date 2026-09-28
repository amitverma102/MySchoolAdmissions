import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    // When running Vite dev server locally on port 5173, point to API Gateway port 5010
    if (window.location.port === '5173') {
      return `http://${window.location.hostname}:5010`;
    }
    // When running in Azure Container Apps, point to api-gateway
    if (window.location.hostname.includes('.azurecontainerapps.io')) {
      return `https://${window.location.hostname.replace(/^web-portal\./, 'api-gateway.')}`;
    }
    // When running on custom domain myschooladmissions.com
    if (window.location.hostname.includes('myschooladmissions.com')) {
      return 'https://api.myschooladmissions.com';
    }
  }
  // When accessed via public IP / Nginx, use relative URLs so Nginx proxies /api/ seamlessly
  return '';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const selectedInstitutionId = localStorage.getItem('selectedInstitutionId');
  if (selectedInstitutionId && selectedInstitutionId !== 'all') {
    config.headers['X-Tenant-Id'] = selectedInstitutionId;
    config.headers['X-Institution-Id'] = selectedInstitutionId;
  }
  return config;
});

export default api;
