import Joi from 'joi';

export const customValidators = {
  // Nigerian phone number
  nigeriaPhone: Joi.string()
    .pattern(/^(?:\+234|0)[789]\d{9}$/)
    .message('Invalid Nigerian phone number'),

  // Strong password
  strongPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .message(
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character'
    ),

  // Nigerian NIN
  nin: Joi.string().length(11).pattern(/^\d+$/).message('Invalid NIN format'),

  // Nigerian BVN
  bvn: Joi.string().length(11).pattern(/^\d+$/).message('Invalid BVN format'),

  // Nigerian bank account
  bankAccount: Joi.string().length(10).pattern(/^\d+$/).message('Invalid bank account number'),

  // Email with Nigerian domains
  ngEmail: Joi.string()
    .email()
    .domain({ tlds: { allow: ['com'] } })
    .message('Invalid Nigerian email'),
};

// Usage: body('phone').custom(customValidators.nigeriaPhone)
