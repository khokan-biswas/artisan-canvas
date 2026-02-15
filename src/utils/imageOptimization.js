/**
 * Advanced Image Optimization Utilities
 * These tools help optimize images for fast loading on free tier
 */

/**
 * Check if browser supports WebP
 */
export const supportsWebP = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('image/webp') === 5;
};

/**
 * Generate optimized image URL with proper parameters
 * Works with Appwrite free tier using getFileView
 */
export const buildImageUrl = (fileId, options = {}) => {
  if (!fileId) return null;

  const {
    width = 0,
    height = 0,
    gravity = 'center',
    quality = 80,
    format = 'jpg'
  } = options;

  // Extract ID from full URL if needed
  let id = fileId;
  if (typeof fileId === 'string' && fileId.includes('/files/')) {
    const parts = fileId.split('/files/');
    if (parts[1]) {
      id = parts[1].split('/')[0];
    }
  }

  // Build Appwrite preview URL (free tier compatible)
  const baseUrl = `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${import.meta.env.VITE_APPWRITE_BUCKET_ID}/files/${id}/preview`;
  
  const params = new URLSearchParams({
    project: import.meta.env.VITE_APPWRITE_PROJECT_ID,
    ...(width && { width }),
    ...(height && { height }),
    gravity,
    quality
  });

  return `${baseUrl}?${params.toString()}`;
};

/**
 * Calculate optimal image dimensions based on container
 */
export const getOptimalDimensions = (containerWidth) => {
  if (containerWidth <= 480) {
    return { width: 480, height: 600 }; // Mobile
  } else if (containerWidth <= 768) {
    return { width: 768, height: 960 }; // Tablet
  } else {
    return { width: 1200, height: 1500 }; // Desktop
  }
};

/**
 * Preload images for faster display
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
};

/**
 * Convert image to WebP format (client-side)
 */
export const imageToWebP = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp'
            });
            resolve(webpFile);
          },
          'image/webp',
          0.8
        );
      };
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

/**
 * Calculate image dimensions preserving aspect ratio
 */
export const calculateDimensions = (originalWidth, originalHeight, maxWidth, maxHeight = 0) => {
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = height * ratio;
  }

  if (maxHeight && height > maxHeight) {
    const ratio = maxHeight / height;
    height = maxHeight;
    width = width * ratio;
  }

  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Estimate file size reduction from compression
 */
export const estimateCompressionSavings = (originalSize, quality = 0.75) => {
  // Rough estimation: each 10% quality reduction saves ~15-20%
  const qualityFactor = quality * 100;
  const estimatedReduction = 1 - (qualityFactor / 100) * 0.15;
  const estimatedSize = originalSize * estimatedReduction;
  const savings = originalSize - estimatedSize;
  const percentSaved = ((savings / originalSize) * 100).toFixed(1);

  return {
    originalSize: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
    estimatedSize: `${(estimatedSize / 1024 / 1024).toFixed(2)} MB`,
    savings: `${(savings / 1024 / 1024).toFixed(2)} MB`,
    percentSaved: `${percentSaved}%`
  };
};

/**
 * Performance metrics collection
 */
export const collectMetrics = () => {
  if (!window.performance) return null;

  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  const connectTime = perfData.responseEnd - perfData.requestStart;
  const renderTime = perfData.domComplete - perfData.domLoading;

  return {
    pageLoadTime: `${pageLoadTime}ms`,
    connectTime: `${connectTime}ms`,
    renderTime: `${renderTime}ms`,
    resourceCount: performance.getEntriesByType('resource').length
  };
};

/**
 * Log performance metrics to console
 */
export const logPerformanceMetrics = () => {
  const metrics = collectMetrics();
  if (metrics) {
    console.group('📊 Performance Metrics');
    console.log('Page Load Time:', metrics.pageLoadTime);
    console.log('Connect Time:', metrics.connectTime);
    console.log('Render Time:', metrics.renderTime);
    console.log('Total Resources:', metrics.resourceCount);
    console.groupEnd();
  }
};

export default {
  supportsWebP,
  buildImageUrl,
  getOptimalDimensions,
  preloadImage,
  imageToWebP,
  calculateDimensions,
  estimateCompressionSavings,
  collectMetrics,
  logPerformanceMetrics
};
