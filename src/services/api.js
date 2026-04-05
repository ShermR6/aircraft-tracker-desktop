import axios from 'axios';

const API_BASE_URL = 'https://aircraft-tracker-backend-production.up.railway.app';

class APIService {
  constructor() {
    this.token = null;
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  // Version Check
  async getLatestVersion() {
    const response = await this.client.get('/api/app/version');
    return response.data;
  }

  // Auth & License
  async login(email, password) {
    const response = await this.client.post('/api/auth/login', {
      email: email,
      password: password,
    });
    this.setToken(response.data.access_token);
    return response.data;
  }

  async activateLicense(licenseKey, email) {
    const response = await this.client.post('/api/activate', {
      license_key: licenseKey,
      email: email
    });
    this.setToken(response.data.access_token);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/user/me');
    return response.data;
  }

  // Aircraft Management
  async getAircraft() {
    const response = await this.client.get('/api/aircraft');
    return response.data;
  }

  async addAircraft(tailNumber, icao24, friendlyName = null) {
    const response = await this.client.post('/api/aircraft', {
      tail_number: tailNumber,
      icao24: icao24,
      friendly_name: friendlyName
    });
    return response.data;
  }

  async updateAircraft(aircraftId, tailNumber, icao24, friendlyName = null) {
    const response = await this.client.put(`/api/aircraft/${aircraftId}`, {
      tail_number: tailNumber,
      icao24: icao24,
      friendly_name: friendlyName
    });
    return response.data;
  }

  async deleteAircraft(aircraftId) {
    const response = await this.client.delete(`/api/aircraft/${aircraftId}`);
    return response.data;
  }

  async getLiveAircraft() {
    const response = await this.client.get('/api/aircraft/live');
    return response.data;
  }

  // Airport Configuration
  async getAirportConfig() {
    const response = await this.client.get('/api/airport/config');
    return response.data;
  }

  async updateAirportConfig(config) {
    const response = await this.client.post('/api/airport/config', config);
    return response.data;
  }

  // Alert Settings
  async getAlertSettings() {
    const response = await this.client.get('/api/settings/alerts');
    return response.data;
  }

  async updateAlertSetting(alertType, enabled, messageTemplate) {
    const response = await this.client.post('/api/settings/alerts', {
      alert_type: alertType,
      enabled: enabled,
      message_template: messageTemplate
    });
    return response.data;
  }

  // Integrations
  async getIntegrations() {
    const response = await this.client.get('/api/integrations');
    return response.data;
  }

  async createIntegration(type, config, enabled = true) {
    const response = await this.client.post('/api/integrations', {
      type: type,
      config: config,
      enabled: enabled
    });
    return response.data;
  }

  async updateIntegration(integrationId, config, enabled) {
    const response = await this.client.put(`/api/integrations/${integrationId}`, {
      config: config,
      enabled: enabled
    });
    return response.data;
  }

  async deleteIntegration(integrationId) {
    const response = await this.client.delete(`/api/integrations/${integrationId}`);
    return response.data;
  }

  async testIntegration(integrationId) {
    const response = await this.client.post(`/api/integrations/${integrationId}/test`);
    return response.data;
  }

  // Health Check — uses plain fetch so no auth token is required
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  }

  async getRecentNotifications(limit = 8) {
    const response = await this.client.get(`/api/notifications/recent?limit=${limit}`);
    return response.data;
  }

  async getNotificationStats() {
    const response = await this.client.get('/api/notifications/stats');
    return response.data;
  }
}

export default new APIService();
