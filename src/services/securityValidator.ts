/**
 * Security Validator Service
 * ISO 27001 Compliant Input Validation & Sanitization
 */
import DOMPurify from 'dompurify';

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

export class SecurityValidator {
  /**
   * Validate and sanitize text input
   */
  static validateTextInput(
    input: string, 
    options: {
      minLength?: number;
      maxLength?: number;
      allowHtml?: boolean;
      required?: boolean;
    } = {}
  ): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = input;

    // Check if required
    if (options.required && (!input || input.trim().length === 0)) {
      errors.push('This field is required');
      return { isValid: false, sanitizedValue: '', errors };
    }

    // Trim whitespace
    sanitizedValue = input.trim();

    // Length validation
    if (options.minLength && sanitizedValue.length < options.minLength) {
      errors.push(`Minimum length is ${options.minLength} characters`);
    }

    if (options.maxLength && sanitizedValue.length > options.maxLength) {
      errors.push(`Maximum length is ${options.maxLength} characters`);
    }

    // HTML sanitization
    if (!options.allowHtml) {
      sanitizedValue = DOMPurify.sanitize(sanitizedValue, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitizedValue)) {
        errors.push('Input contains potentially dangerous content');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors
    };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email is required');
      return { isValid: false, sanitizedValue: '', errors };
    }

    const sanitizedEmail = email.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitizedEmail)) {
      errors.push('Invalid email format');
    }

    // Length validation
    if (sanitizedEmail.length > 254) {
      errors.push('Email address is too long');
    }

    // Check for dangerous characters
    const dangerousChars = /[<>'"&]/;
    if (dangerousChars.test(sanitizedEmail)) {
      errors.push('Email contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitizedEmail,
      errors
    };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string, isDevelopment: boolean = false): ValidationResult {
    const errors: string[] = [];

    if (!password || password.length === 0) {
      errors.push('Password is required');
      return { isValid: false, sanitizedValue: '', errors };
    }

    // Length validation
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password is too long');
    }

    // For development mode, use relaxed validation
    if (isDevelopment) {
      // Only check basic length for development
      return {
        isValid: errors.length === 0,
        sanitizedValue: password,
        errors
      };
    }

    // Production mode - strict validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak patterns
    const weakPatterns = [
      /(.)\1{2,}/, // Repeated characters
      /123456|abcdef|qwerty/i, // Common sequences
      /password|admin|user/i // Common words
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains weak patterns');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: password, // Don't modify password
      errors
    };
  }

  /**
   * Validate username
   */
  static validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
      return { isValid: false, sanitizedValue: '', errors };
    }

    const sanitizedUsername = username.trim().toLowerCase();

    // Length validation
    if (sanitizedUsername.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (sanitizedUsername.length > 50) {
      errors.push('Username must be less than 50 characters');
    }

    // Character validation (alphanumeric and underscore only)
    const validUsernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!validUsernameRegex.test(sanitizedUsername)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    // Check for reserved usernames (excluding admin for development)
    const reservedUsernames = ['root', 'system', 'api', 'www', 'mail', 'ftp'];
    if (reservedUsernames.includes(sanitizedUsername)) {
      errors.push('This username is reserved');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitizedUsername,
      errors
    };
  }

  /**
   * Validate SQL input to prevent injection
   */
  static validateSQLInput(input: string): ValidationResult {
    const errors: string[] = [];

    if (!input) {
      return { isValid: true, sanitizedValue: '', errors };
    }

    // SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\/\*|\*\/|;)/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\w+['"]\s*=\s*['"]\w+['"])/i,
      /(UNION\s+SELECT)/i,
      /(INSERT\s+INTO)/i,
      /(UPDATE\s+SET)/i,
      /(DELETE\s+FROM)/i
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        errors.push('Input contains potentially dangerous SQL patterns');
        break;
      }
    }

    // Sanitize by escaping dangerous characters
    const sanitizedValue = input
      .replace(/'/g, "''")
      .replace(/"/g, '""')
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');

    return {
      isValid: errors.length === 0,
      sanitizedValue,
      errors
    };
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): ValidationResult {
    const errors: string[] = [];

    if (!file) {
      errors.push('No file selected');
      return { isValid: false, sanitizedValue: '', errors };
    }

    // Size validation
    if (options.maxSize && file.size > options.maxSize) {
      const maxSizeMB = Math.round(options.maxSize / (1024 * 1024));
      errors.push(`File size must be less than ${maxSizeMB}MB`);
    }

    // Type validation
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    // Extension validation
    if (options.allowedExtensions) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !options.allowedExtensions.includes(fileExtension)) {
        errors.push(`File extension .${fileExtension} is not allowed`);
      }
    }

    // Check for dangerous file types
    const dangerousTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-winexe',
      'application/x-javascript',
      'text/javascript'
    ];

    if (dangerousTypes.includes(file.type)) {
      errors.push('This file type is not allowed for security reasons');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: file.name,
      errors
    };
  }

  /**
   * Validate URL
   */
  static validateURL(url: string): ValidationResult {
    const errors: string[] = [];

    if (!url || url.trim().length === 0) {
      errors.push('URL is required');
      return { isValid: false, sanitizedValue: '', errors };
    }

    const sanitizedURL = url.trim();

    try {
      const urlObj = new URL(sanitizedURL);
      
      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push('Only HTTP and HTTPS protocols are allowed');
      }

      // Check for dangerous protocols
      const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
      if (dangerousProtocols.some(protocol => sanitizedURL.toLowerCase().startsWith(protocol))) {
        errors.push('URL contains dangerous protocol');
      }

    } catch (error) {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitizedURL,
      errors
    };
  }
}
