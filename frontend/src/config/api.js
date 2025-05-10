// Get the current hostname and port
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = 5000; // Backend port

  // Development environment
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://${hostname}:${port}/api`;
  }

  // If we're running on a specific IP address (development)
  if (hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
    return `http://${hostname}:${port}/api`;
  }

  // Production environment - use the same hostname as the frontend
  return `${window.location.protocol}//${hostname}:${port}/api`;
};

// Allow environment variable override
const API_BASE = import.meta.env.VITE_API_BASE || getBaseUrl();

export default API_BASE;
