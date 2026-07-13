import connectDB from '@/lib/mongodb';
import SiteSettings from '@/models/SiteSettings';

const SETTINGS_KEY = 'global';

export type SiteSettingsData = {
  maintenanceMode: boolean;
};

const DEFAULT_SETTINGS: SiteSettingsData = {
  maintenanceMode: false,
};

export async function getSiteSettings(): Promise<SiteSettingsData> {
  try {
    await connectDB();

    const existing = await SiteSettings.findOne({ key: SETTINGS_KEY })
      .select('maintenanceMode')
      .lean<{ maintenanceMode?: boolean } | null>();

    if (existing) {
      return {
        maintenanceMode: Boolean(existing.maintenanceMode),
      };
    }

    try {
      const created = await SiteSettings.create({
        key: SETTINGS_KEY,
        maintenanceMode: false,
      });

      return {
        maintenanceMode: Boolean(created.maintenanceMode),
      };
    } catch {
      // Concurrent create — read the winner
      const fallback = await SiteSettings.findOne({ key: SETTINGS_KEY })
        .select('maintenanceMode')
        .lean<{ maintenanceMode?: boolean } | null>();

      return {
        maintenanceMode: Boolean(fallback?.maintenanceMode),
      };
    }
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSiteSettings(
  updates: Partial<SiteSettingsData>
): Promise<SiteSettingsData> {
  await connectDB();

  const settings = await SiteSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      $set: {
        maintenanceMode: Boolean(updates.maintenanceMode),
      },
      $setOnInsert: {
        key: SETTINGS_KEY,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  )
    .select('maintenanceMode')
    .lean<{ maintenanceMode?: boolean } | null>();

  if (!settings) {
    throw new Error('Failed to update site settings');
  }

  return {
    maintenanceMode: Boolean(settings.maintenanceMode),
  };
}
