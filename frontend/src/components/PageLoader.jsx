import React from 'react';

const PageLoader = () => {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center bg-transparent">
      <div className="flex flex-col items-center gap-6 opacity-80 animate-fade-in">
        <div className="nav-logo-mark w-14 h-14 flex items-center justify-center text-white font-display font-bold text-lg animate-pulse shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30">
          TP
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
