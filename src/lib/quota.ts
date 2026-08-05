import { connectToDatabase } from './db';
import Quota from '../models/Quota';
import appConfig from '../config/app.config.json';
import mongoose from 'mongoose';

export type ServiceType = 'palm_reading' | 'birth_chart' | 'marriage_bichar' | 'chatbot';

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getUserQuotaStatus(userId: string) {
  await connectToDatabase();
  const date = getTodayDateString();
  
  const userQuota = await Quota.findOne({ userId: new mongoose.Types.ObjectId(userId), date }).lean();
  
  const counts = userQuota?.counts || {
    palm_reading: 0,
    birth_chart: 0,
    marriage_bichar: 0,
    chatbot: 0,
  };

  const limits = appConfig.quotas;

  return {
    date,
    usage: {
      palm_reading: counts.palm_reading || 0,
      birth_chart: counts.birth_chart || 0,
      marriage_bichar: counts.marriage_bichar || 0,
      chatbot: counts.chatbot || 0,
    },
    limits,
    remaining: {
      palm_reading: Math.max(0, limits.palm_reading - (counts.palm_reading || 0)),
      birth_chart: Math.max(0, limits.birth_chart - (counts.birth_chart || 0)),
      marriage_bichar: Math.max(0, limits.marriage_bichar - (counts.marriage_bichar || 0)),
      chatbot: Math.max(0, limits.chatbot - (counts.chatbot || 0)),
    }
  };
}

export async function checkQuotaAvailability(userId: string, service: ServiceType): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  await connectToDatabase();
  const date = getTodayDateString();
  const limit = appConfig.quotas[service];

  const userQuota = await Quota.findOne({ userId: new mongoose.Types.ObjectId(userId), date }).lean();
  const currentCount = userQuota?.counts?.[service] || 0;

  return {
    allowed: currentCount < limit,
    remaining: Math.max(0, limit - currentCount),
    limit,
  };
}

export async function incrementQuotaUsage(userId: string, service: ServiceType): Promise<{ remaining: number; limit: number }> {
  await connectToDatabase();
  const date = getTodayDateString();
  const limit = appConfig.quotas[service];

  let userQuota = await Quota.findOne({ userId: new mongoose.Types.ObjectId(userId), date });

  if (!userQuota) {
    userQuota = new Quota({
      userId: new mongoose.Types.ObjectId(userId),
      date,
      counts: { palm_reading: 0, birth_chart: 0, marriage_bichar: 0, chatbot: 0 }
    });
  }

  const currentCount = userQuota.counts[service] || 0;

  if (currentCount >= limit) {
    throw new Error(`Daily limit reached for ${service}.`);
  }

  userQuota.counts[service] = currentCount + 1;
  await userQuota.save();

  return {
    remaining: limit - userQuota.counts[service],
    limit,
  };
}

export async function checkAndIncrementQuota(userId: string, service: ServiceType): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const quotaStatus = await checkQuotaAvailability(userId, service);

  if (!quotaStatus.allowed) {
    return quotaStatus;
  }

  const incrementedQuota = await incrementQuotaUsage(userId, service);

  return {
    allowed: true,
    remaining: incrementedQuota.remaining,
    limit: incrementedQuota.limit,
  };
}
