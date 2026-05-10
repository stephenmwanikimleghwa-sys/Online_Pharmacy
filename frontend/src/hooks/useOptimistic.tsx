import React, { createContext, useContext, useState, useCallback } from 'react';

interface OptimisticState<T> {
  data: T[];
  optimistic: Set<string>;
}

interface OptimisticContextType {
  addOptimistic: <T>(items: T[], id: string) => T[];
  removeOptimistic: <T>(items: T[], id: string) => T[];
  updateOptimistic: <T>(items: T[], id: string, updates: Partial<T>) => T[];
  isOptimistic: (id: string) => boolean;
}

const OptimisticContext = createContext<OptimisticContextType | undefined>(undefined);

export const OptimisticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());

  const addOptimistic = useCallback(<T,>(items: T[], id: string): T[] => {
    setOptimisticIds(prev => new Set(prev).add(id));
    return [...items, { id, optimistic: true } as T];
  }, []);

  const removeOptimistic = useCallback(<T,>(items: T[], id: string): T[] => {
    setOptimisticIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    return items.filter(item => (item as any).id !== id);
  }, []);

  const updateOptimistic = useCallback(<T,>(items: T[], id: string, updates: Partial<T>): T[] => {
    return items.map(item => {
      if ((item as any).id === id) {
        return { ...item, ...updates } as T;
      }
      return item;
    });
  }, []);

  const isOptimistic = useCallback((id: string): boolean => {
    return optimisticIds.has(id);
  }, [optimisticIds]);

  return (
    <OptimisticContext.Provider value={{ addOptimistic, removeOptimistic, updateOptimistic, isOptimistic }}>
      {children}
    </OptimisticContext.Provider>
  );
};

export const useOptimistic = () => {
  const context = useContext(OptimisticContext);
  if (!context) {
    throw new Error('useOptimistic must be used within an OptimisticProvider');
  }
  return context;
};

// Hook for optimistic API calls
export function useOptimisticMutation<T, P = any>(
  mutationFn: (params: P) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(async (params: P) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(params);
      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('An error occurred');
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, options]);

  return { mutate, isLoading, error, data };
}
