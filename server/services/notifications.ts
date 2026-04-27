import { prisma } from '../lib/prisma'

export interface NotificationPreferences {
  new_releases: boolean
  playlist_updates: boolean
  account_security: boolean
  product_updates: boolean
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const prefs = await prisma.notificationPreferences.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      new_releases: true,
      playlist_updates: false,
      account_security: true,
      product_updates: false,
    },
    update: {},
    select: {
      new_releases: true,
      playlist_updates: true,
      account_security: true,
      product_updates: true,
    },
  })
  return prefs
}

export async function updateNotificationPreferences(
  userId: string,
  data: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const prefs = await prisma.notificationPreferences.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      new_releases: data.new_releases ?? true,
      playlist_updates: data.playlist_updates ?? false,
      account_security: data.account_security ?? true,
      product_updates: data.product_updates ?? false,
    },
    update: data,
    select: {
      new_releases: true,
      playlist_updates: true,
      account_security: true,
      product_updates: true,
    },
  })
  return prefs
}
