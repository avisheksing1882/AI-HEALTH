import { AuthSession, GoogleJwtPayload, UserProfile } from '../types';
import { createDefaultUserProfile, db, getUserProfile, syncUserDataWithCache } from './db';
import { initializeUserDataIfEmpty } from './seedData';
import { fullSyncOnLogin, syncProfileToCloud } from './firestoreSync';

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

// Real Google OAuth 2.0 Client ID
const DEFAULT_CLIENT_ID = '937597518742-a8vm1rj2ke716htn8jm9up0d0fuu4o3e.apps.googleusercontent.com';

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
    return (
      localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY) ||
      (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
      DEFAULT_CLIENT_ID
    );
  }

  public setGoogleClientId(clientId: string): void {
    if (clientId && clientId.trim()) {
      localStorage.setItem(GOOGLE_CLIENT_ID_STORAGE_KEY, clientId.trim());
    }
  }

  /**
   * Initializes official Google Identity Services according to developers.google.com guidelines
   */
  public initGoogleIdentityServices(
    onSuccess: (session: AuthSession, profile: UserProfile) => void,
    buttonContainer?: HTMLElement | null
  ): void {
    const clientId = this.getGoogleClientId();
    if (!window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          if (response?.credential) {
            const payload = decodeJwt(response.credential);
            if (payload && payload.email) {
              const { session, profile } = await this.processGoogleLogin({
                email: payload.email,
                name: payload.name || payload.given_name || payload.email.split('@')[0],
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
        buttonContainer.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainer, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 300
        });
      }

      // Display official Google One Tap prompt
      window.google.accounts.id.prompt();
    } catch (err) {
      console.warn('[Google GIS] Initialization warning:', err);
    }
  }

  /**
   * Triggers Google GIS prompt directly
   */
  public triggerGooglePrompt(): void {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('Prompt error:', e);
      }
    }
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

    // ☁️ Cloud Firestore bi-directional sync (async, non-blocking)
    this.triggerCloudSync(userId, profile);

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
   * Triggers full Firestore cloud sync (bi-directional merge)
   */
  public async triggerCloudSync(userId: string, profile: UserProfile): Promise<void> {
    try {
      console.log('[Auth] Triggering cloud sync for user:', userId);
      // Gather all local data
      const [meals, dailyActivities, workouts, weightLogs, waterLogs, medications, medicationLogs, notificationRules] = await Promise.all([
        db.meals.where('userId').equals(userId).toArray(),
        db.dailyActivity.where('userId').equals(userId).toArray(),
        db.workouts.where('userId').equals(userId).toArray(),
        db.weightLogs.where('userId').equals(userId).toArray(),
        db.waterLogs.where('userId').equals(userId).toArray(),
        db.medications.where('userId').equals(userId).toArray(),
        db.medicationLogs.where('userId').equals(userId).toArray(),
        db.notificationRules.where('userId').equals(userId).toArray()
      ]);

      await fullSyncOnLogin(userId, {
        profile,
        meals,
        dailyActivities,
        workouts,
        weightLogs,
        waterLogs,
        medications,
        medicationLogs,
        notificationRules
      }, {
        putProfile: async (p) => { await db.userProfile.put(p); },
        putMeals: async (items) => { await db.meals.bulkPut(items); },
        putDailyActivities: async (items) => { await db.dailyActivity.bulkPut(items); },
        putWorkouts: async (items) => { await db.workouts.bulkPut(items); },
        putWeightLogs: async (items) => { await db.weightLogs.bulkPut(items); },
        putWaterLogs: async (items) => { await db.waterLogs.bulkPut(items); },
        putMedications: async (items) => { await db.medications.bulkPut(items); },
        putMedicationLogs: async (items) => { await db.medicationLogs.bulkPut(items); },
        putNotificationRules: async (items) => { await db.notificationRules.bulkPut(items); }
      });
      console.log('[Auth] Cloud sync completed successfully ✅');
    } catch (err) {
      console.warn('[Auth] Cloud sync error (data is safe locally):', err);
    }
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
