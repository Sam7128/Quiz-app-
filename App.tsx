import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { SkeletonLoader } from './components/SkeletonLoader';
import { Login } from './components/Login';
import { AppSessionContainer } from './components/AppSessionContainer';

const App: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const [guestMode, setGuestMode] = useState(false);

  // When user logs in, ensure guestMode is reset
  useEffect(() => {
    if (user) {
      setGuestMode(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <SkeletonLoader width="12rem" height="12rem" count={1} />
      </div>
    );
  }

  if (!user && !guestMode) {
    return <Login onGuestMode={() => setGuestMode(true)} />;
  }

  const sessionKey = user ? `user-${user.id}` : 'guest';

  return (
    <AppSessionContainer
      key={sessionKey}
      user={user}
      guestMode={guestMode}
      onSignOut={async () => {
        setGuestMode(false);
        await signOut();
      }}
      onExitGuestMode={() => setGuestMode(false)}
    />
  );
};

export default App;
