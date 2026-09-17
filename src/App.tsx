import React from 'react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { SignedOut } from './screens/SignedOut';
import { Denied } from './screens/Denied';
import InApp from './InApp';

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { auth, signInWithGoogle, signOut } = useAuth();

  if (auth.status === 'loading') {
    return <SignedOut onSignIn={signInWithGoogle} isLoading />;
  }

  if (auth.status === 'signed_out') {
    return <SignedOut onSignIn={signInWithGoogle} error={auth.error} />;
  }

  if (auth.status === 'denied') {
    return <Denied email={auth.email} onSignOut={signOut} />;
  }

  // authorized
  return <InApp userId={auth.userId} email={auth.email} onSignOut={signOut} />;
}
