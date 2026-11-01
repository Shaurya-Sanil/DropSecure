import { config } from '../config/index.js';
import {
  StorageProvider,
  QueueProvider,
  NotificationProvider,
  SecretsProvider,
} from './types.js';

import { S3StorageProvider } from './storage/s3StorageProvider.js';
import { LocalStorageProvider } from './storage/localStorageProvider.js';

import { SqsQueueProvider } from './queue/sqsQueueProvider.js';
import { LocalQueueProvider } from './queue/localQueueProvider.js';

import { SnsNotificationProvider } from './notification/snsNotificationProvider.js';
import { LocalNotificationProvider } from './notification/localNotificationProvider.js';

import { SsmSecretsProvider } from './secrets/ssmSecretsProvider.js';
import { LocalSecretsProvider } from './secrets/localSecretsProvider.js';

export interface Providers {
  storage: StorageProvider;
  queue: QueueProvider;
  notification: NotificationProvider;
  secrets: SecretsProvider;
}

let cachedProviders: Providers | null = null;

export function getProviders(): Providers {
  if (cachedProviders) {
    return cachedProviders;
  }

  const isAws = config.providerMode === 'aws';
  console.log(`[PROVIDERS] Initializing providers in ${isAws ? 'AWS (SDK v3)' : 'LOCAL (Dev / In-Memory)'} mode...`);

  cachedProviders = {
    storage: isAws ? new S3StorageProvider() : new LocalStorageProvider(),
    queue: isAws ? new SqsQueueProvider() : new LocalQueueProvider(),
    notification: isAws ? new SnsNotificationProvider() : new LocalNotificationProvider(),
    secrets: isAws ? new SsmSecretsProvider() : new LocalSecretsProvider(),
  };

  return cachedProviders;
}

export * from './types.js';
