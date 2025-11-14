// Session Manager with Security Logging
import { loggingService } from './loggingService';

export interface SessionData {
  userId: string;
  username: string;
  role: string;
  name: string;
  loginTime: Date;
  lastActivity: Date;
  ip: string;
  userAgent: string;
}

class SessionManager {
  private session: SessionData | null = null;
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private activityTimeout: NodeJS.Timeout | null = null;
  private warningTimeout: NodeJS.Timeout | null = null;

  private enableAutoTimeout: boolean = false;

  constructor() {
    this.setupActivityTracking();
  }

  // Create new session
  public createSession(userData: Omit<SessionData, 'loginTime' | 'lastActivity'>): void {
    const now = new Date();
    this.session = {
      ...userData,
      loginTime: now,
      lastActivity: now,
    };

    // Log session creation
    loggingService.logAuthentication('login_success', {
      username: userData.username,
      role: userData.role,
      name: userData.name,
      ip: userData.ip,
      userAgent: userData.userAgent,
      sessionId: this.getSessionId(),
      timestamp: now.toISOString()
    });

    this.resetActivityTimeout();
  }

  // Get current session
  public getSession(): SessionData | null {
    return this.session;
  }

  // Update last activity
  public updateActivity(): void {
    if (this.session) {
      this.session.lastActivity = new Date();
      this.resetActivityTimeout();
    }
  }

  // Logout and clear session
  public logout(): void {
    if (this.session) {
      // Log logout
      loggingService.logAuthentication('logout', {
        username: this.session.username,
        role: this.session.role,
        name: this.session.name,
        ip: this.session.ip,
        userAgent: this.session.userAgent,
        sessionId: this.getSessionId(),
        sessionDuration: Date.now() - this.session.loginTime.getTime(),
        timestamp: new Date().toISOString()
      });
    }

    this.clearSession();
  }

  // Clear session due to timeout
  public clearSessionDueToTimeout(): void {
    if (this.session) {
      // Log session timeout
      loggingService.logAuthentication('session_timeout', {
        username: this.session.username,
        role: this.session.role,
        name: this.session.name,
        ip: this.session.ip,
        userAgent: this.session.userAgent,
        sessionId: this.getSessionId(),
        sessionDuration: Date.now() - this.session.loginTime.getTime(),
        lastActivity: this.session.lastActivity.toISOString(),
        timestamp: new Date().toISOString()
      });
    }

    this.clearSession();
  }

  // Check if session is valid
  public isSessionValid(): boolean {
    if (!this.session) return false;
    if (!this.enableAutoTimeout) return true;

    const now = new Date();
    const timeSinceLastActivity = now.getTime() - this.session.lastActivity.getTime();
    
    return timeSinceLastActivity < this.sessionTimeout;
  }

  // Get session ID
  public getSessionId(): string {
    return this.session ? `session_${this.session.loginTime.getTime()}_${this.session.userId}` : '';
  }

  // Setup activity tracking
  private setupActivityTracking(): void {
    // Track mouse movement, clicks, and keyboard activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.updateActivity();
      }, true);
    });
  }

  // Reset activity timeout
  private resetActivityTimeout(): void {
    if (!this.enableAutoTimeout) return;
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }

    // Set warning timeout (5 minutes before session expires)
    this.warningTimeout = setTimeout(() => {
      if (this.session) {
        loggingService.logSecurityEvent('session_warning', {
          username: this.session.username,
          role: this.session.role,
          sessionId: this.getSessionId(),
          timeRemaining: 5 * 60 * 1000, // 5 minutes
          timestamp: new Date().toISOString()
        }, this.session.userId, 'Warning');
      }
    }, this.sessionTimeout - (5 * 60 * 1000));

    // Set session timeout
    this.activityTimeout = setTimeout(() => {
      this.clearSessionDueToTimeout();
    }, this.sessionTimeout);
  }

  // Clear session
  private clearSession(): void {
    this.session = null;
    
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = null;
    }

    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
      this.warningTimeout = null;
    }
  }

  // Log security events
  public logSecurityEvent(event: string, details?: Record<string, any>): void {
    const userId = this.session?.userId || 'anonymous';
    loggingService.logSecurityEvent(event, {
      sessionId: this.getSessionId(),
      ...details
    }, userId);
  }

  // Log suspicious activity
  public logSuspiciousActivity(activity: string, details?: Record<string, any>): void {
    const userId = this.session?.userId || 'anonymous';
    loggingService.logSecurityEvent('suspicious_activity', {
      activity,
      sessionId: this.getSessionId(),
      ...details
    }, userId, 'Warning');
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
