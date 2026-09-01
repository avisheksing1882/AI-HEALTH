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

  public getGoogleClientId(): string {
    return localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY) || DEFAULT_CLIENT_ID;
  }

  public setGoogleClientId(clientId: string): void {
    localStorage.setItem(GOOGLE_CLIENT_ID_STORAGE_KEY, clientId.trim());
  }

  /**
   * Loads the Google Identity Services SDK script dynamically
   */
  public async loadGoogleScript(): Promise<void> {
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
        console.warn('Google Identity Services script failed to load (offline or blocked). Fallback auth will be used.');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initializes Google One Tap and renders button if container is provided
   */
  public initGoogleOneTap(
    onSuccess: (session: AuthSession, profile: UserProfile) => void,
    buttonContainer?: HTMLElement | null
  ): void {
    if (!window.google?.accounts?.id) return;

    const clientId = this.getGoogleClientId();

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        if (response.credential) {
          const payload = decodeJwt(response.credential);
          if (payload) {
            const { session, profile } = await this.processGoogleLogin({
              email: payload.email,
              name: payload.name,
              avatarUrl: payload.picture,
              googleId: payload.sub,
              token: response.credential,
              method: 'google_gis'
            });
            onSuccess(session, profile);
          }
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    if (buttonContainer) {
      window.google.accounts.id.renderButton(buttonContainer, {
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: 280
      });
    }

    // Attempt One-Tap prompt
    try {
      window.google.accounts.id.prompt();
    } catch {
      // Ignored
    }
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
