import zxcvbn from 'zxcvbn';

export const validatePassword = (password: string) => {
  const result = zxcvbn(password);
  
  const requirements = {
    length: password.length >= 12,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    score: result.score >= 3
  };

  const errors = [];
  if (!requirements.length) errors.push('Au moins 12 caractères');
  if (!requirements.hasNumber) errors.push('Au moins un chiffre');
  if (!requirements.hasSpecial) errors.push('Au moins un caractère spécial');
  if (!requirements.hasUppercase) errors.push('Au moins une majuscule');
  if (!requirements.hasLowercase) errors.push('Au moins une minuscule');
  if (!requirements.score) errors.push('Mot de passe trop faible');

  return {
    isValid: Object.values(requirements).every(Boolean),
    errors,
    score: result.score
  };
};

export const validatePhone = (phone: string) => {
  // Basic African phone number validation
  const phoneRegex = /^(\+|00)(225|228|229)\d{8}$/;
  return phoneRegex.test(phone);
};