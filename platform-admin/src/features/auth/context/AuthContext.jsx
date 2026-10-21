import { usePlatformAuth } from '../../../auth/PlatformAuthContext';

export function useAuth() {
  const auth = usePlatformAuth();
  return { ...auth, user: auth.platformUser };
}

export default useAuth;
