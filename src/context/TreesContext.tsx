"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Tree {
  _id: string;
  name: string;
  price: number;
  info: string;
  oxygenKgs: number;
  imageUrl: string;
  isActive: boolean;
}

interface TreesContextType {
  trees: Tree[];
  loading: boolean;
  error: string;
  refreshTrees: () => Promise<void>;
}

const TreesContext = createContext<TreesContextType | undefined>(undefined);

export function TreesProvider({ children }: { children: ReactNode }) {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTrees = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/trees');
      const data = await response.json();
      
      if (data.success) {
        setTrees(data.data);
      } else {
        setError('Failed to load trees');
      }
    } catch (error) {
      console.error('Error fetching trees:', error);
      setError('Failed to load trees');
    } finally {
      setLoading(false);
    }
  };

  const refreshTrees = async () => {
    await fetchTrees();
  };

  useEffect(() => {
    // Only fetch if we don't have trees yet
    if (trees.length === 0) {
      fetchTrees();
    }
    
    // Set up continuous loading every 30 seconds
    const interval = setInterval(() => {
      fetchTrees();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <TreesContext.Provider value={{ trees, loading, error, refreshTrees }}>
      {children}
    </TreesContext.Provider>
  );
}

export function useTrees() {
  const context = useContext(TreesContext);
  if (context === undefined) {
    throw new Error('useTrees must be used within a TreesProvider');
  }
  return context;
}
