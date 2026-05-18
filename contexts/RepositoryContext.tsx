import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { IStorageRepository } from '../services/repository';
import { LocalStorageRepository } from '../services/localRepo';
import { CloudStorageRepository } from '../services/cloudRepo';

const RepositoryContext = createContext<IStorageRepository | undefined>(undefined);

export const RepositoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const repository = useMemo<IStorageRepository>(() => {
    return user ? new CloudStorageRepository() : new LocalStorageRepository();
  }, [user]);

  return (
    <RepositoryContext.Provider value={repository}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepository = (): IStorageRepository => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepository must be used within RepositoryProvider');
  }
  return context;
};
