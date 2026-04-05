import Joi from 'joi';

export class Validators {
  static email = Joi.string().email().required();
  static password = Joi.string().min(6).max(100).required();
  static name = Joi.string().min(2).max(100).required();
  static phone = Joi.string().pattern(/^[0-9]{10,15}$/);
  static url = Joi.string().uri();
  static objectId = Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required();

  static pagination = {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  };

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhone(phone: string): boolean {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 6) errors.push('Password must be at least 6 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*]/.test(password))
      errors.push('Password must contain at least one special character');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
