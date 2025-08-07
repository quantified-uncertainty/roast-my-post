// React 19 compatibility fixes
import * as React from 'react';
import { FC } from 'react';

// Force React types to be consistent
declare global {
  namespace React {
    type ReactNode = import('react').ReactNode;
  }
}

// Fix for specific components
declare module 'react' {
  // Suspense fix
  export const Suspense: FC<React.SuspenseProps>;
}

// Component compatibility fixes are no longer needed with consistent @types/react version