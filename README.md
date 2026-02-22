# 🛫 AircraftTracker Desktop App

Beautiful desktop application for real-time aircraft tracking and notifications.

## ✨ Features

- 🔐 **License Activation** - Secure key-based authentication
- ✈️ **Aircraft Management** - Add, edit, and track multiple aircraft
- 📊 **Live Dashboard** - Real-time aircraft status and positions
- 🔔 **Alert Configuration** - Custom notifications (10nm, 5nm, 2nm, landing)
- 🔗 **Integrations** - Discord, Slack, Microsoft Teams webhooks
- 🎨 **Beautiful UI** - Modern, polished design with animations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Your AircraftTracker license key

### Installation

```bash
# Clone or download this folder
cd aircraft-tracker-desktop

# Install dependencies
npm install

# Start in development mode
npm start
```

The app will open automatically!

### Building for Production

```bash
# Build the React app
npm run build

# Package for your platform
npm run package
```

This creates installers in the `dist/` folder:
- Windows: `.exe` installer
- macOS: `.dmg` file
- Linux: `.AppImage`

## 📁 Project Structure

```
aircraft-tracker-desktop/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.js       # App window & lifecycle
│   │   └── preload.js    # Secure IPC bridge
│   ├── services/          # Business logic
│   │   ├── api.js        # Backend API client
│   │   └── storage.js    # Persistent storage
│   ├── screens/           # Main UI screens
│   │   ├── ActivationScreen.jsx
│   │   ├── Dashboard.jsx
│   │   ├── AircraftList.jsx
│   │   ├── AlertSettings.jsx
│   │   └── Integrations.jsx
│   ├── components/        # Reusable components
│   │   ├── Sidebar.jsx
│   │   ├── AircraftCard.jsx
│   │   └── ...
│   ├── App.jsx            # Main app component
│   └── index.js           # Entry point
├── public/
│   └── index.html
├── assets/                # Icons and images
└── package.json
```

## 🔧 Configuration

The app connects to:
```
API: https://aircraft-tracker-backend-production.up.railway.app
```

To change the API endpoint, edit `src/services/api.js`:
```javascript
const API_BASE_URL = 'your-api-url-here';
```

## 🎨 Customization

### Styling

The app uses Tailwind CSS. To customize:

1. Edit `tailwind.config.js` for theme colors
2. Modify components in `src/screens/` and `src/components/`

### Branding

1. Replace icons in `assets/` folder:
   - `icon.png` (512x512) - Linux
   - `icon.icns` - macOS
   - `icon.ico` - Windows

2. Update app name in `package.json`:
   ```json
   {
     "name": "your-app-name",
     "productName": "Your App Name"
   }
   ```

## 🐛 Troubleshooting

### App won't start
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build fails
```bash
# Make sure you have the latest Electron
npm install electron@latest --save-dev
```

### License activation fails
- Check your internet connection
- Verify the license key format: `KDTO-XXXX-XXXX-XXXX-XXXX`
- Ensure the backend API is running

## 📦 Dependencies

### Core
- **Electron** - Desktop app framework
- **React** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client

### UI
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Storage
- **electron-store** - Persistent local storage

## 🔐 Security

- JWT tokens stored securely via electron-store
- No sensitive data in localStorage
- Context isolation enabled
- Node integration disabled

## 🚢 Deployment

### Auto-update (Optional)

To add auto-updates, integrate with:
- **electron-updater** for GitHub Releases
- **update-electron-app** for Update.electronjs.org

### Code Signing

For production distribution:

**macOS:**
```bash
# Get a Developer ID certificate from Apple
# Then in package.json:
"mac": {
  "identity": "Developer ID Application: Your Name"
}
```

**Windows:**
```bash
# Get a code signing certificate
# Then in package.json:
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "your-password"
}
```

## 📝 License

Proprietary - All rights reserved

## 🆘 Support

- Email: support@aircrafttracker.app
- Docs: https://docs.aircrafttracker.app

## 🎯 Roadmap

- [ ] Real-time aircraft map view
- [ ] Historical tracking data
- [ ] Multiple airport support
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Mobile app companion
- [ ] Team collaboration features

---

**Built with ❤️ for aviation enthusiasts**
