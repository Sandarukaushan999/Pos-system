# Build Configuration

## Icons
To create a proper Windows installer, you need to add an icon file:

1. Create or obtain a `.ico` file (256x256 pixels recommended)
2. Name it `icon.ico`
3. Place it in this `build/` directory

## Building the Installer

### Prerequisites
- Node.js installed
- All dependencies installed (`npm install`)

### Commands

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Create Windows installer:**
   ```bash
   npm run electron:build-installer
   ```

3. **Create portable version:**
   ```bash
   npm run electron:build-portable
   ```

4. **Build everything:**
   ```bash
   npm run dist
   ```

### Output Files
- **Installer**: `dist/VOXO POS System Setup 1.0.0.exe`
- **Portable**: `dist/VOXO-POS-Portable.exe`

### Features
- Professional installer with custom branding
- Desktop and Start Menu shortcuts
- Database and backup files included
- Portable version available
- Automatic uninstaller

