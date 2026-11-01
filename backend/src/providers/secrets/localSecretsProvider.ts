import { SecretsProvider } from '../types.js';

export class LocalSecretsProvider implements SecretsProvider {
  async getSecret(parameterName: string): Promise<string | undefined> {
    // Map SSM parameter paths to environment variables
    if (parameterName.includes('jwt')) {
      return process.env.JWT_SECRET || 'super-secret-jwt-key-for-dropsecure-development-only-32chars';
    }
    if (parameterName.includes('db') || parameterName.includes('password')) {
      return process.env.DB_PASSWORD || 'dropsecure_password';
    }
    return process.env[parameterName];
  }
}
