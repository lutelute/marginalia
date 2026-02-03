import { useState, useCallback } from 'react';

export function useFileSystem() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const readDirectory = useCallback(async (dirPath) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.readDirectory(dirPath);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const readFile = useCallback(async (filePath) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.readFile(filePath);
      if (!result.success) {
        setError(result.error);
        return null;
      }
      return result.content;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const writeFile = useCallback(async (filePath, content) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.writeFile(filePath, content);
      if (!result.success) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    readDirectory,
    readFile,
    writeFile,
    clearError,
  };
}
