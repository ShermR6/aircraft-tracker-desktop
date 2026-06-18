import axios from 'axios';

const API_BASE_URL = 'https://aircraft-tracker-backend-production.up.railway.app';

class APIService {
  constructor() {
    this.token = null;
    this.connectionListeners = [];
    this.isConnected = true;

    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
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

    // Response interceptor — track connection state + auto-refresh expired tokens
    this.isRefreshing = false;
    this.refreshQueue = [];

    this.client.interceptors.response.use(
      (response) => {
        if (!this.isConnected) {
          this.isConnected = true;
          this.connectionListeners.forEach(fn => fn(true));
        }
        return response;
      },
      async (error) => {
        if (!error.response) {
          // Network error — no response from server
          if (this.isConnected) {
            this.isConnected = false;
            this.connectionListeners.forEach(fn => fn(false));
          }
          return Promise.reject(error);
        }

        // Got a response — server is reachable
        if (!this.isConnected) {
          this.isConnected = true;
          this.connectionListeners.forEach(fn => fn(true));
        }

        const originalRequest = error.config;

        // Auto-refresh on 401 "Token expired" (not license_expired or other auth errors)
        if (error.response.status === 401
            && error.response.data?.detail === 'Token expired'
            && !originalRequest._retry
            && this.token) {

          if (this.isRefreshing) {
            // Another refresh is in progress — queue this request
            return new Promise((resolve, reject) => {
              this.refreshQueue.push({ resolve, reject });
            }).then(() => {
              originalRequest.headers.Authorization = `Bearer ${this.token}`;
              return this.client(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const response = await this.client.post('/api/auth/refresh', {}, {
              headers: { Authorization: `Bearer ${this.token}` }
            });
            const newToken = response.data.access_token;
            this.setToken(newToken);

            // Save new token to storage
            if (typeof window !== 'undefined' && window.electronAPI) {
              await window.electronAPI.storeSet('auth_token', newToken);
            }

            // Retry all queued requests
            this.refreshQueue.forEach(({ resolve }) => resolve());
            this.refreshQueue = [];

            // Retry the original request
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed — clear queue and reject all
            this.refreshQueue.forEach(({ reject }) => reject(refreshError));
            this.refreshQueue = [];
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  onConnectionChange(fn) {
    this.connectionListeners.push(fn);
    return () => { this.connectionListeners = this.connectionListeners.filter(l => l !== fn); };
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

  async googleDesktopLogin(token, email) {
    const response = await this.client.post('/api/auth/google-desktop', { token, email });
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

  async addAircraft(tailNumber, icao24, friendlyName = null, aircraftType = null, alertDistances = null) {
    const response = await this.client.post('/api/aircraft', {
      tail_number: tailNumber,
      icao24: icao24,
      friendly_name: friendlyName,
      aircraft_type: aircraftType,
      alert_distances: alertDistances,
    });
    return response.data;
  }

  async updateAircraft(aircraftId, tailNumber, icao24, friendlyName = null, aircraftType = null, alertDistances = null) {
    const response = await this.client.put(`/api/aircraft/${aircraftId}`, {
      tail_number: tailNumber,
      icao24: icao24,
      friendly_name: friendlyName,
      aircraft_type: aircraftType,
      alert_distances: alertDistances,
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

  async deleteAirportConfig() {
    const response = await this.client.delete('/api/airport/config');
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

  // Health Check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  async getGroundStationStatus() {
    const response = await this.client.get('/api/ground/status');
    return response.data;
  }

  async getGroundStationRange() {
    const response = await this.client.get('/api/ground/range');
    return response.data;
  }

  async getRecentNotifications(limit = 8) {
    const response = await this.client.get(`/api/notifications/recent?limit=${limit}`);
    return response.data;
  }

  async getNotificationStats() {
    const response = await this.client.get('/api/notifications/stats');
    return response.data;
  }

  // ── Teams ─────────────────────────────────────────────────────────────────

  async getMyTeam() {
    const response = await this.client.get('/api/teams/me');
    return response.data;
  }

  // Members
  async getTeamMembers() {
    const team = await this.getMyTeam();
    return team.members;
  }

  async removeMember(memberId) {
    const response = await this.client.delete(`/api/teams/members/${memberId}`);
    return response.data;
  }

  async assignMemberRole(memberId, data) {
    const response = await this.client.put(`/api/teams/members/${memberId}/role`, data);
    return response.data;
  }

  async setMemberDuty(memberId, onDuty, until = null) {
    const response = await this.client.put(`/api/teams/members/${memberId}/duty`, { on_duty: onDuty, until });
    return response.data;
  }

  // Invites
  async createInviteToken(note = null) {
    const response = await this.client.post('/api/teams/invites', { note });
    return response.data;
  }

  async listInviteTokens() {
    const response = await this.client.get('/api/teams/invites');
    return response.data;
  }

  async deleteInviteToken(inviteId) {
    const response = await this.client.delete(`/api/teams/invites/${inviteId}`);
    return response.data;
  }

  // Channels
  async getTeamChannels() {
    const team = await this.getMyTeam();
    return team.channels;
  }

  async addTeamChannel(type, label, value) {
    const response = await this.client.post('/api/teams/channels', { integration_type: type, label, value });
    return response.data;
  }

  async removeTeamChannel(channelId) {
    const response = await this.client.delete(`/api/teams/channels/${channelId}`);
    return response.data;
  }

  // Routing
  async getTeamRouting() {
    const team = await this.getMyTeam();
    return team.routing;
  }

  async updateTeamRouting(routing) {
    const response = await this.client.put('/api/teams/routing', { routing });
    return response.data;
  }

  // Roles
  async getTeamRoles() {
    const response = await this.client.get('/api/teams/roles');
    return response.data;
  }

  async createTeamRole(name, permissions = [], color = null) {
    const response = await this.client.post('/api/teams/roles', { name, permissions, color });
    return response.data;
  }

  async updateTeamRole(roleId, data) {
    const response = await this.client.put(`/api/teams/roles/${roleId}`, data);
    return response.data;
  }

  async deleteTeamRole(roleId) {
    const response = await this.client.delete(`/api/teams/roles/${roleId}`);
    return response.data;
  }

  // Team Aircraft
  async getTeamAircraft() {
    const response = await this.client.get('/api/teams/aircraft');
    return response.data;
  }

  async addTeamAircraft(data) {
    const response = await this.client.post('/api/teams/aircraft', data);
    return response.data;
  }

  async updateTeamAircraft(id, data) {
    const response = await this.client.put(`/api/teams/aircraft/${id}`, data);
    return response.data;
  }

  async deleteTeamAircraft(id) {
    const response = await this.client.delete(`/api/teams/aircraft/${id}`);
    return response.data;
  }

  async getTeamLiveAircraft() {
    const response = await this.client.get('/api/teams/aircraft/live');
    return response.data;
  }

  // Multi-airport
  async getTeamAirports() {
    const response = await this.client.get('/api/teams/airports');
    return response.data;
  }

  async addTeamAirport(data) {
    const response = await this.client.post('/api/teams/airports', data);
    return response.data;
  }

  async updateTeamAirport(id, data) {
    const response = await this.client.put(`/api/teams/airports/${id}`, data);
    return response.data;
  }

  async deleteTeamAirport(id) {
    const response = await this.client.delete(`/api/teams/airports/${id}`);
    return response.data;
  }

  async setActiveAirport(id) {
    const response = await this.client.put(`/api/teams/airports/${id}/active`);
    return response.data;
  }

  // Alert Settings (team)
  async getTeamAlertSettings() {
    const response = await this.client.get('/api/teams/alert-settings');
    return response.data;
  }

  async updateTeamAlertSetting(alertType, enabled, template) {
    const response = await this.client.post('/api/teams/alert-settings', {
      alert_type: alertType, enabled, message_template: template
    });
    return response.data;
  }

  // Activity
  async getTeamActivity(limit = 50) {
    const response = await this.client.get(`/api/teams/activity?limit=${limit}`);
    return response.data;
  }

  async ackActivity(logId) {
    const response = await this.client.post(`/api/teams/activity/${logId}/ack`);
    return response.data;
  }

  // Claims
  async getTeamClaims() {
    const response = await this.client.get('/api/teams/claims');
    return response.data;
  }

  async claimAircraft(icao24, tailNumber, note = null) {
    const response = await this.client.post('/api/teams/claims', { icao24, tail_number: tailNumber, note });
    return response.data;
  }

  async releaseClaim(icao24) {
    const response = await this.client.delete(`/api/teams/claims/${icao24}`);
    return response.data;
  }

  // Shifts & on-duty
  async getTeamShifts() {
    const response = await this.client.get('/api/teams/shifts');
    return response.data;
  }

  async createTeamShift(data) {
    const response = await this.client.post('/api/teams/shifts', data);
    return response.data;
  }

  async updateTeamShift(id, data) {
    const response = await this.client.put(`/api/teams/shifts/${id}`, data);
    return response.data;
  }

  async deleteTeamShift(id) {
    const response = await this.client.delete(`/api/teams/shifts/${id}`);
    return response.data;
  }

  async setShiftMembers(shiftId, userIds) {
    const response = await this.client.put(`/api/teams/shifts/${shiftId}/members`, { user_ids: userIds });
    return response.data;
  }

  async getOnDutyMembers() {
    const response = await this.client.get('/api/teams/on-duty');
    return response.data;
  }

  // Expected Arrivals
  async getExpectedArrivals() {
    const response = await this.client.get('/api/teams/arrivals');
    return response.data;
  }

  async createExpectedArrival(data) {
    const response = await this.client.post('/api/teams/arrivals', data);
    return response.data;
  }

  async updateExpectedArrival(id, data) {
    const response = await this.client.put(`/api/teams/arrivals/${id}`, data);
    return response.data;
  }

  async deleteExpectedArrival(id) {
    const response = await this.client.delete(`/api/teams/arrivals/${id}`);
    return response.data;
  }

  // Escalation
  async getEscalationConfig() {
    const response = await this.client.get('/api/teams/escalation-config');
    return response.data;
  }

  async updateEscalationConfig(data) {
    const response = await this.client.put('/api/teams/escalation-config', data);
    return response.data;
  }
}

export default new APIService();
