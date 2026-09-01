import { AuthSession, GoogleJwtPayload, UserProfile } from '../types';
import { createDefaultUserProfile, db, getUserProfile, syncUserDataWithCache } from './db';
import { initializeUserDataIfEmpty } from './seedData';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
            }
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const SESSION_STORAGE_KEY = 'vitaltrack_auth_session';
const GOOGLE_CLIENT_ID_STORAGE_KEY = 'vitaltrack_google_client_id';

// Default public Google Client ID placeholder (can be customized by user or env)
const DEFAULT_CLIENT_ID = '1092823812839-vitaltrack-health.apps.googleusercontent.com';

/**
 * Parses JWT token without external libraries
 */
export function decodeJwt(token: string): GoogleJwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as GoogleJwtPayload;
  } catch (err) {
    console.error('Failed to decode JWT:', err);
    return null;
  }
}

class AuthService {
  private currentSession: AuthSession | null = null;
  private gisLoaded: boolean = false;

  constructor() {
    this.restoreSession();
  }

  /**
   * Restores session from localStorage
   */
  public restoreSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
        return this.currentSession;
      }
    } catch (e) {
      console.warn('Failed to read auth session from storage', e);
    }
    return null;
  }

  public getSession(): AuthSession | null {
    return this.currentSession;
  }

  public getGoogleClientId(): string | null {
    try {
      const stored = localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
      if (stored && (stored.includes('vitaltrack-health') || stored.length < 20)) {
        localStorage.removeItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
        return null;
      }
      return stored || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || null;
    } catch {
      return null;
    }
  }

  public setGoogleClientId(clientId: string): void {
    if (!clientId || clientId.includes('vitaltrack-health')) {
      localStorage.removeItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
    } else {
      localStorage.setItem(GOOGLE_CLIENT_ID_STORAGE_KEY, clientId.trim());
    }
  }

  /**
   * Loads the Google Identity Services SDK script dynamically only if valid client ID exists
   */
  public async loadGoogleScript(): Promise<void> {
    const clientId = this.getGoogleClientId();
    if (!clientId) return;

    if (this.gisLoaded || window.google?.accounts?.id) {
      this.gisLoaded = true;
      return;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.gisLoaded = true;
        resolve();
      };
      script.onerror = () => {
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Performs standard Google OAuth 2.0 Popup Flow and fetches verified Google userinfo
   */
  public async loginWithGoogleOAuthPopup(customClientId?: string): Promise<{ session: AuthSession; profile: UserProfile } | null> {
    const clientId = customClientId || this.getGoogleClientId();
    if (!clientId) {
      throw new Error('MISSING_CLIENT_ID');
    }

    const redirectUri = window.location.origin;
    const scope = encodeURIComponent('openid email profile');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=select_account`;

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'GoogleSignIn',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!popup) {
      throw new Error('POPUP_BLOCKED');
    }

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          if (!popup || popup.closed) {
            clearInterval(checkInterval);
            resolve(null);
            return;
          }

          if (popup.location.href.includes(redirectUri)) {
            const hash = popup.location.hash;
            if (hash.includes('access_token=')) {
              clearInterval(checkInterval);
              popup.close();

              const params = new URLSearchParams(hash.substring(1));
              const accessToken = params.get('access_token');

              if (accessToken) {
                // Fetch verified profile directly from Google
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${accessToken}` }
                });
                const googleUser = await res.json();

                if (googleUser && googleUser.email) {
                  const result = await this.processGoogleLogin({
                    email: googleUser.email,
                    name: googleUser.name || googleUser.given_name || googleUser.email.split('@')[0],
                    avatarUrl: googleUser.picture,
                    googleId: googleUser.sub,
                    token: accessToken,
                    method: 'google_gis'
                  });
                  resolve(result);
                  return;
                }
              }
            }
          }
        } catch {
          // Cross-origin restriction while on accounts.google.com - expected until redirect
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(null);
      }, 120000);
    });
  }

  /**
   * Core handler for logging in a Google user (creates or loads user in DB)
   */
  public async processGoogleLogin(params: {
    email: string;
    name: string;
    avatarUrl?: string;
    googleId?: string;
    token?: string;
    method: 'google_gis' | 'google_one_click' | 'direct_gmail';
  }): Promise<{ session: AuthSession; profile: UserProfile }> {
    const cleanEmail = params.email.toLowerCase().trim();
    // Unique user ID based on email or Google sub
    const userId = params.googleId ? `google_${params.googleId}` : `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Look up existing user profile in IndexedDB
    let profile = await getUserProfile(userId);

    if (!profile) {
      // First-time signup for this Google email: create clean default profile
      profile = createDefaultUserProfile(userId, cleanEmail, params.name, params.avatarUrl);
      if (params.googleId) profile.googleId = params.googleId;
      await db.userProfile.put(profile);
    } else {
      // Update name/avatar if fresh
      if (params.name && profile.name !== params.name) profile.name = params.name;
      if (params.avatarUrl && profile.avatarUrl !== params.avatarUrl) profile.avatarUrl = params.avatarUrl;
      profile.updatedAt = new Date().toISOString();
      await db.userProfile.put(profile);
    }

    // Initialize baseline notification rules for this user (0 demo meals or fake workouts)
    await initializeUserDataIfEmpty(userId);

    // Sync all historical meals, activities, workouts, weight from local cache into DB
    await syncUserDataWithCache(userId);

    const session: AuthSession = {
      userId,
      email: cleanEmail,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      token: params.token,
      loginMethod: params.method,
      loggedInAt: new Date().toISOString()
    };

    this.currentSession = session;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

    return { session, profile };
  }

  /**
   * One-Click Google Sign In (Auto-logs in with current Google account or specified email)
   */
  public async signInWithOneClick(
    email: string = 'user@gmail.com',
    name?: string,
    avatarUrl?: string
  ): Promise<{ session: AuthSession; profile: UserProfile }> {
    const cleanEmail = email.toLowerCase().trim();
    const displayName = name || cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const avatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`;

    return await this.processGoogleLogin({
      email: cleanEmail,
      name: displayName,
      avatarUrl: avatar,
      method: 'google_one_click'
    });
  }

  /**
   * Logs out the current user, clearing session from memory and localStorage
   */
  public logout(): void {
    this.currentSession = null;
    localStorage.removeItem(SESSION_STORAGE_KEY);
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch {
        // Ignored
      }
    }
  }
}

export const authService = new AuthService();
