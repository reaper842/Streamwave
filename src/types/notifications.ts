export interface NotificationPreferences {
  new_releases: boolean
  playlist_updates: boolean
  account_security: boolean
  product_updates: boolean
}

export type NotificationPreferenceKey = keyof NotificationPreferences
