/**
 * Componente de imagem com lazy loading e otimização
 */
import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon } from 'lucide-react';

export default function LazyImage({ 
  src, 
  alt = '', 
  className = '', 
  fallback = null,
  onLoad = null,
  aspectRatio = null,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Começar a carregar 50px antes de entrar na tela
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = () => {
    setError(true);
  };

  // Otimizar URL da imagem (Cloudinary)
  const optimizeImageUrl = (url) => {
    if (!url) return url;
    
    // Se for Cloudinary, adicionar transformações
    if (url.includes('cloudinary.com')) {
      // Adicionar transformações: auto quality, formato webp/avif
      const transformations = 'f_auto,q_auto:good,w_800';
      return url.replace('/upload/', `/upload/${transformations}/`);
    }
    
    return url;
  };

  const optimizedSrc = optimizeImageUrl(src);

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
      {...props}
    >
      {/* Skeleton enquanto carrega */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse">
          <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
        </div>
      )}

      {/* Imagem */}
      {isInView && !error && (
        <img
          src={optimizedSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}

      {/* Fallback em caso de erro */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          {fallback || (
            <div className="text-center text-gray-400 dark:text-gray-600">
              <ImageIcon className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">Imagem não disponível</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
