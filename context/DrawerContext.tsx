import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DrawerContextType {
  isOpen: boolean;
  toggle: () => void;
  close:  () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  toggle: () => {},
  close:  () => {},
});

export const DrawerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DrawerContext.Provider value={{
      isOpen,
      toggle: () => setIsOpen(v => !v),
      close:  () => setIsOpen(false),
    }}>
      {children}
    </DrawerContext.Provider>
  );
};

export const useDrawer = () => useContext(DrawerContext);
