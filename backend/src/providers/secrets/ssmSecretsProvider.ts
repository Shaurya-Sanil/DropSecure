import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SecretsProvider } from '../types.js';
import { config } from '../../config/index.js';

export class SsmSecretsProvider implements SecretsProvider {
  private client: SSMClient;

  constructor() {
    const clientConfig: any = {
      region: config.aws.region,
    };

    if (config.aws.endpointUrl) {
      clientConfig.endpoint = config.aws.endpointUrl;
    }

    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      };
    }

    this.client = new SSMClient(clientConfig);
  }

  async getSecret(parameterName: string): Promise<string | undefined> {
    try {
      const command = new GetParameterCommand({
        Name: parameterName,
        WithDecryption: true,
      });

      const response = await this.client.send(command);
      return response.Parameter?.Value;
    } catch (error) {
      console.error(`[SSM] Failed to retrieve parameter "${parameterName}":`, error);
      return undefined;
    }
  }
}
