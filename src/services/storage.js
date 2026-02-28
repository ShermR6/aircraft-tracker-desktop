class StorageService {
  // Remove the constructor entirely, or keep it empty

  get isElectron() {
    // Getter checks every time it's called, not just at import time
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  async get(key) {
    if (this.isElectron) {
      return await window.electronAPI.storeGet(key);
    } else {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  }

  async set(key, value) {
    if (this.isElectron) {
      return await window.electronAPI.storeSet(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    }
  }

  async delete(key) {
    if (this.isElectron) {
      return await window.electronAPI.storeDelete(key);
    } else {
      localStorage.removeItem(key);
      return true;
    }
  }

  async clear() {
    if (this.isElectron) {
      return await window.electronAPI.storeClear();
    } else {
      localStorage.clear();
      return true;
    }
  }

  async getToken() {
    return await this.get('auth_token');
  }

  async setToken(token) {
    return await this.set('auth_token', token);
  }

  async getUserData() {
    return await this.get('user_data');
  }

  async setUserData(userData) {
    return await this.set('user_data', userData);
  }

  async logout() {
    await this.delete('auth_token');
    await this.delete('user_data');
    return true;
  }
}

export default new StorageService();