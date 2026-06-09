import React from 'react';

const Logo = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl', xl: 'text-6xl' };
  return (
    <span className={`font-bold tracking-tight ${sizes[size]} ${className}`}>
      <span className="text-black dark:text-white">Jokko</span>
      <span className="text-jokko">Note.</span>
    </span>
  );
};

export default Logo;
