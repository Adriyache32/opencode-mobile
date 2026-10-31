// Auth types
export interface PairingStartResponse {
  pairingCode: string;
  expiresAt: string;
  challengeId: string;
}

export interface PairingVerifyRequest {
  code: string;
  deviceInfo: DeviceInfo;
}

export interface PairingVerifyResponse {
  deviceToken: string;
  refreshToken: string;
  deviceId: string;
  user: User;
}

export interface DeviceInfo {
  platform: string;
  userAgent: string;
  appVersion: string;
}

import { User } from './api';