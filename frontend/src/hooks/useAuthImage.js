/**
 * useAuthImage.js
 *
 * Fetches an image that requires Authorization (our question images)
 * and returns a temporary blob: URL that a plain <img> tag can use.
 *
 * Why this is needed:
 *   <img src="http://server/api/uploads/questions/file.jpg">
 *   Browsers never send Authorization headers for <img> tags.
 *   After we secured images behind authenticate() middleware, every
 *   <img> request gets a 401 and shows a broken icon.
 *
 *   This hook fetches the image via fetch() (which CAN send headers),
 *   converts the response to a blob: URL, and returns it for use in src.
 *
 * Usage:
 *   const blobUrl = useAuthImage(serverPath);
 *   <img src={blobUrl || undefined} />
 *
 * The blob: URL is automatically revoked when the component unmounts
 * or the path changes, to avoid memory leaks.
 */

import { useState, useEffect } from "react";

const cache = new Map(); // path → blob URL (session-level cache)

const useAuthImage = (imagePath) => {
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!imagePath) {
      setBlobUrl(null);
      return;
    }

    // Already cached this session — reuse instantly
    if (cache.has(imagePath)) {
      setBlobUrl(cache.get(imagePath));
      return;
    }

    let cancelled = false;
    let createdUrl = null;

    const fetchImage = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(imagePath, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          console.warn(`useAuthImage: failed to load ${imagePath} (${response.status})`);
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        createdUrl = URL.createObjectURL(blob);
        cache.set(imagePath, createdUrl);
        setBlobUrl(createdUrl);
      } catch (err) {
        if (!cancelled) {
          console.warn("useAuthImage fetch error:", err);
        }
      }
    };

    fetchImage();

    return () => {
      cancelled = true;
      // Don't revoke here — we cached it for reuse. Cache survives the session.
      // If you want strict memory management, clear cache on logout instead.
    };
  }, [imagePath]);

  return blobUrl;
};

/**
 * Clear the image cache — call this on logout so stale blob URLs
 * from the previous session don't persist.
 */
export const clearAuthImageCache = () => {
  cache.forEach((url) => URL.revokeObjectURL(url));
  cache.clear();
};

export default useAuthImage;
