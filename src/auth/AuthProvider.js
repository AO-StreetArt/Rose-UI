import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createAuth0Client } from '@auth0/auth0-spa-js';

const defaultState = {
  isAuthenticated: false,
  isLoading: true,
  accessToken: null,
  user: null,
  error: null,
};

const AuthContext = createContext({
  ...defaultState,
  login: () => {},
  logout: () => {},
  getAccessToken: async () => null,
});

const buildConfig = () => {
  const domain = process.env.REACT_APP_AUTH0_DOMAIN;
  const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
  const redirectUri =
    process.env.REACT_APP_AUTH0_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  let scope = process.env.REACT_APP_AUTH0_SCOPE || 'openid profile email';

  const scopeSet = new Set(scope.split(/\s+/).filter(Boolean));
  if (!scopeSet.has('offline_access')) {
    scopeSet.add('offline_access');
  }
  scope = Array.from(scopeSet).join(' ');

  if (!domain || !clientId) {
    return null;
  }

  const authorizationParams = {
    redirect_uri: redirectUri,
    scope,
  };

  if (audience) {
    authorizationParams.audience = audience;
  }

  return {
    domain,
    clientId,
    authorizationParams,
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  };
};

const isMissingRefreshTokenError = (error) => {
  if (!error) {
    return false;
  }

  if (error.error === 'missing_refresh_token') {
    return true;
  }

  if (typeof error.message === 'string') {
    return error.message.toLowerCase().includes('missing refresh token');
  }

  return false;
};

export const AuthProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    const config = buildConfig();
    if (!config) {
      setState({
        isAuthenticated: true,
        isLoading: false,
        accessToken: null,
        user: null,
        error: null,
      });
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      let auth0Client;
      try {
        auth0Client = await createAuth0Client(config);
        if (!isMounted) {
          return;
        }

        setClient(auth0Client);

        if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
          await auth0Client.handleRedirectCallback();
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const isAuthenticated = await auth0Client.isAuthenticated();
        if (!isAuthenticated) {
          await auth0Client.loginWithRedirect();
          return;
        }

        const [user, accessToken] = await Promise.all([
          auth0Client.getUser(),
          auth0Client.getTokenSilently(),
        ]);

        if (!isMounted) {
          return;
        }

        setState({
          isAuthenticated: true,
          isLoading: false,
          accessToken,
          user,
          error: null,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Auth0 authentication error', error);

        const needsRelogin = auth0Client && isMissingRefreshTokenError(error);
        if (needsRelogin) {
          try {
            await auth0Client.loginWithRedirect({
              authorizationParams: {
                ...config.authorizationParams,
                prompt: 'consent',
              },
            });
            return;
          } catch (redirectError) {
            // eslint-disable-next-line no-console
            console.error('Auth0 re-login after missing refresh token failed', redirectError);
          }
        }

        if (isMounted) {
          setState({
            isAuthenticated: false,
            isLoading: false,
            accessToken: null,
            user: null,
            error,
          });
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (options) => {
    if (!client) {
      return;
    }
    try {
      await client.loginWithRedirect(options);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Auth0 login error', error);
      setState((prev) => ({
        ...prev,
        error,
        isLoading: false,
      }));
    }
  }, [client]);

  const logout = useCallback(
    (options) => {
      if (!client) {
        return;
      }
      client.logout({
        logoutParams: {
          returnTo: window.location.origin,
          ...options,
        },
      });
    },
    [client]
  );

  const getAccessToken = useCallback(
    async (options) => {
      if (!client) {
        return null;
      }
      try {
        const token = await client.getTokenSilently(options);
        setState((prev) => ({
          ...prev,
          accessToken: token,
        }));
        return token;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Auth0 token retrieval error', error);

        const needsRelogin = isMissingRefreshTokenError(error);
        if (needsRelogin) {
          try {
            const config = buildConfig();
            await client.loginWithRedirect({
              authorizationParams: {
                ...(config?.authorizationParams ?? {}),
                prompt: 'consent',
              },
            });
            return null;
          } catch (redirectError) {
            // eslint-disable-next-line no-console
            console.error('Auth0 re-login after missing refresh token failed', redirectError);
          }
        }

        setState((prev) => ({
          ...prev,
          error,
        }));
        return null;
      }
    },
    [client]
  );

  const contextValue = useMemo(
    () => ({
      ...state,
      login,
      logout,
      getAccessToken,
      auth0Client: client,
    }),
    [state, login, logout, getAccessToken, client]
  );

  if (state.isLoading) {
    return <div className="app-loading">Signing you in...</div>;
  }

  if (state.error) {
    return (
      <div className="app-error">
        <p>Authentication failed. Check the console for details.</p>
      </div>
    );
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
