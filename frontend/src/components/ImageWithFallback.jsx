import React from 'react';

const getInitials = (text) => {
  if (!text) return '??';
  return text
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const getRandomColor = (text) => {
  // List of pleasant, muted colors
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-yellow-100 text-yellow-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
  ];
  
  // Use text to generate a consistent color for the same text
  const index = text?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index] || colors[0];
};

const ImageWithFallback = ({ 
  src, 
  alt, 
  className = '', 
  initialsClassName = '',
  fallbackText,
  ...props 
}) => {
  const [hasError, setHasError] = React.useState(!src);
  const initials = getInitials(fallbackText || alt);
  const colorClass = getRandomColor(fallbackText || alt);

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center ${colorClass} ${className} ${initialsClassName}`}
        {...props}
      >
        <span className="text-2xl font-semibold">{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
};

export default ImageWithFallback;