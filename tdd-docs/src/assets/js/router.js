// Hash-based router

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        // Don't init here - will be called after routes are registered
    }

    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            console.log('Hash changed');
            this.handleRoute();
        });
        
        // Handle initial route
        this.handleRoute();
    }

    register(path, handler) {
        this.routes.set(path, handler);
    }

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        console.log('Handling route:', hash);
        
        // Parse hash: /modules/auth -> ['modules', 'auth']
        const parts = hash.split('/').filter(p => p);
        console.log('Route parts:', parts);
        
        let route = '/';
        let params = [];
        
        if (parts.length === 0) {
            route = '/';
        } else if (parts[0] === 'modules') {
            if (parts.length === 1) {
                route = '/modules';
                params = [];
            } else if (parts.length === 2) {
                route = '/modules/:module';
                params = [parts[1]];
            } else if (parts.length === 3) {
                route = '/modules/:module/:function';
                params = [parts[1], parts[2]];
            }
        }
        
        console.log('Resolved route:', route, 'with params:', params);
        
        const handler = this.routes.get(route);
        if (handler) {
            this.currentRoute = { path: route, params };
            handler(...params);
        } else {
            // Fallback to wildcard
            const fallback = this.routes.get('*');
            if (fallback) {
                fallback();
            } else {
                console.warn('No route handler found for:', route);
            }
        }
    }

    navigate(path) {
        console.log('Router navigate to:', path);
        // Ensure path starts with /
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        window.location.hash = normalizedPath;
        // Also trigger handleRoute immediately in case hashchange doesn't fire
        setTimeout(() => this.handleRoute(), 0);
    }

    getCurrentRoute() {
        return this.currentRoute;
    }
}

export const router = new Router();

