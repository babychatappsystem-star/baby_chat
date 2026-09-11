interface AppConfig {
  apiUrl: string;
  features: {
    debugPanel: boolean;
    mockData: boolean;
    hotReload: boolean;
  };
}

class EnvironmentLoader {
  private static loadedConfig: AppConfig | null = null;

  static loadConfig(): AppConfig {
    if (this.loadedConfig) {
      return this.loadedConfig;
    }

    // import.meta.env.MODE is set by Vite: 'development' | 'production' | custom
    const mode = import.meta.env.MODE;

    const configs: Record<string, AppConfig> = {
      development: {
        apiUrl: import.meta.env.VITE_DEV_API_URL ?? '',
        features: { debugPanel: true,  mockData: true,  hotReload: true  },
      },
      staging: {
        apiUrl: import.meta.env.VITE_STAGING_API_URL ?? '',
        features: { debugPanel: true,  mockData: false, hotReload: false },
      },
      production: {
        apiUrl: import.meta.env.VITE_PROD_API_URL ?? '',
        features: { debugPanel: false, mockData: false, hotReload: false },
      },
    };

    this.loadedConfig = configs[mode] ?? configs['development'];
    return this.loadedConfig;
  }
}

export default EnvironmentLoader;