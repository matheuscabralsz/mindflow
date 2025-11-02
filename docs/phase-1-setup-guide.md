# Phase 1: Development Environment Setup - Step-by-Step Guide

**Status:** Not Started
**Prerequisites:** None (can start independently)
**Estimated Time:** 2-4 hours
**Complexity:** Simple

---

## Overview

This guide will walk you through setting up your complete development environment for MindFlow. By the end, you'll have all the tools, accounts, and configurations needed to start building the app.

---

## Table of Contents

0. [WSL2 Setup (Windows Users)](#0-wsl2-setup-windows-users)
1. [Install Core Development Tools](#1-install-core-development-tools)
2. [Set Up React Native & Expo Environment](#2-set-up-react-native--expo-environment)
3. [Create Third-Party Service Accounts](#3-create-third-party-service-accounts)
4. [Initialize Project Structure](#4-initialize-project-structure)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Verify Setup](#6-verify-setup)
7. [Set Up Git Repository](#7-set-up-git-repository)
8. [Troubleshooting](#troubleshooting)

---

## 0. WSL2 Setup (Windows Users)

**If you're using Windows with WSL2, read this section first!**

### 0.1 Why WSL2 for Everything?

**Install ALL development tools in WSL2, NOT on Windows:**

✅ **Install in WSL2:**
- Node.js, npm, yarn
- Expo CLI, EAS CLI
- Git
- All project code (keep in `/home/mack/my_workspace/mindflow`)

❌ **Do NOT install in Windows:**
- Node.js (Windows version)
- Expo CLI (Windows version)

**Why?**
1. **Performance**: File operations are 10x faster in WSL2 than accessing Windows files from WSL2
2. **Consistency**: Same environment as production servers (Railway runs Linux)
3. **Compatibility**: Avoids Windows-specific path/permission issues
4. **Build Tools**: Native build tools work better in Linux

---

### 0.2 Verify WSL2 Setup

```bash
# Check you're in WSL2 (not Windows PowerShell or CMD)
uname -a
# Expected output: Linux ... microsoft-standard-WSL2

# Check your project is in WSL2 filesystem
pwd
# Should be: /home/mack/my_workspace/mindflow
# NOT: /mnt/c/Users/... (this is the Windows filesystem, avoid!)

# Check WSL version
wsl.exe -l -v
# Should show "Ubuntu" or your distro with VERSION 2
```

**Important:** Always work in WSL2 terminal, not Windows PowerShell/CMD!

---

### 0.3 VS Code Setup for WSL2

**Recommended: Use VS Code with WSL2 extension**

1. Install VS Code on Windows (https://code.visualstudio.com)
2. Install "WSL" extension in VS Code
3. Open WSL2 terminal and navigate to your project:
   ```bash
   cd /home/mack/my_workspace/mindflow
   code .
   ```
4. VS Code will open connected to WSL2 (you'll see "WSL: Ubuntu" in bottom-left corner)

**Recommended VS Code Extensions (install in WSL2):**
- ESLint
- Prettier
- React Native Tools
- JavaScript (ES6) code snippets
- GitLens

---

### 0.4 Mobile Development with WSL2

**For Android Development:**

You have two options:

**Option A: Physical Android Device (Easiest)**
- Install Expo Go from Play Store
- No need for Android Studio or emulator
- Just scan QR code when running `npx expo start`
- ✅ **Recommended for beginners**

**Option B: Android Studio on Windows + WSL2 ADB Bridge**
- Install Android Studio on Windows (section 2.3)
- Bridge Windows ADB to WSL2 (see section 0.5 below)
- More complex but allows using emulator

**For iOS Development:**
- Not possible on Windows/WSL2 (requires macOS)
- Use physical iOS device with Expo Go instead
- Or use EAS Build for cloud builds later

---

### 0.5 Connect WSL2 to Windows Android Studio (Optional)

**Only follow this if you're using Option B (Android emulator)**

**Step 1: Install Android Studio on Windows**
- Follow section 2.3 (Option B) but install on Windows
- Create an AVD (Android Virtual Device)

**Step 2: Install ADB in WSL2**

```bash
# In WSL2 terminal
sudo apt update
sudo apt install android-tools-adb android-tools-fastboot

# Verify
adb version
```

**Step 3: Connect WSL2 ADB to Windows ADB**

```bash
# Get your Windows IP address from WSL2
export WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
echo $WINDOWS_IP

# Kill any existing ADB server in WSL2
adb kill-server

# Connect to Windows ADB server
adb -H $WINDOWS_IP -P 5037 devices

# You should see your emulator listed
```

**Step 4: Create helper script (optional but recommended)**

```bash
# Create script to auto-connect to Windows ADB
cat > ~/connect-adb.sh << 'EOF'
#!/bin/bash
export WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
export ADB_SERVER_SOCKET=tcp:$WINDOWS_IP:5037
echo "Connecting to Windows ADB at $WINDOWS_IP"
adb devices
EOF

chmod +x ~/connect-adb.sh

# Run this script whenever you start a new terminal session
~/connect-adb.sh
```

**Step 5: Add to .bashrc or .zshrc (optional)**

```bash
# Add to ~/.bashrc or ~/.zshrc for automatic setup
echo 'export WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk "{print \$2}")' >> ~/.bashrc
echo 'export ADB_SERVER_SOCKET=tcp:$WINDOWS_IP:5037' >> ~/.bashrc

# Reload
source ~/.bashrc
```

**Verify it works:**

```bash
# Start Android emulator from Android Studio on Windows
# Then in WSL2:
adb devices

# You should see your emulator:
# List of devices attached
# emulator-5554    device
```

---

### 0.6 WSL2 Firewall Note

**If Expo QR code doesn't work on physical device:**

Windows Firewall might be blocking WSL2. Allow Expo through Windows Firewall:

1. Open Windows Defender Firewall
2. Go to "Allow an app through firewall"
3. Add Node.js (from WSL2) to allowed apps
4. Or temporarily disable firewall for testing

Alternatively, use tunnel mode:

```bash
# In WSL2, when starting Expo
npx expo start --tunnel
```

---

## 1. Install Core Development Tools

### 1.1 Install Node.js

**Why:** Node.js is required for running the backend API and mobile app development tools.

#### **For WSL2 Users (Recommended Method):**

**Option 1: Using NodeSource Repository (Easiest)**

```bash
# In WSL2 terminal
# Download and import the NodeSource GPG key
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify installation
node --version
# Expected output: v18.x.x or higher

npm --version
# Expected output: 9.x.x or higher
```

**Option 2: Using nvm (Recommended for managing multiple Node versions)**

```bash
# In WSL2 terminal
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Close and reopen terminal, or reload config:
source ~/.bashrc

# Install Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node

# Verify
node --version
npm --version
```

---

#### **For macOS Users:**

**Option 1: Direct Download**
1. Visit https://nodejs.org
2. Download the **LTS (Long Term Support)** version (18.x or higher)
3. Run the installer and follow the prompts

**Option 2: Using nvm (Recommended)**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Close and reopen terminal, or reload:
source ~/.zshrc  # or ~/.bash_profile

# Install Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node
```

**Option 3: Using Homebrew**

```bash
brew install node@18
```

---

#### **For Windows (NOT WSL2) - Not Recommended:**

If you must install on Windows (not recommended if using WSL2):

1. Visit https://nodejs.org
2. Download Windows installer (LTS version)
3. Run installer
4. Verify: `node --version` in PowerShell

**Or use nvm-windows:**
- Download from: https://github.com/coreybutler/nvm-windows

**Note:** If using WSL2, install Node.js in WSL2, not Windows!

---

### 1.2 Choose a Package Manager

**Why:** You'll need a package manager to install dependencies. Choose one:

**Option A: npm (comes with Node.js)**
- Already installed with Node.js
- No additional setup needed

**Option B: yarn (faster, more reliable)**

```bash
npm install -g yarn

# Verify installation
yarn --version
# Expected output: 1.22.x or higher
```

**Note:** This guide will use `npm` in examples, but you can substitute with `yarn` if preferred.

---

### 1.3 Install Git

**Why:** Version control for your code.

#### **For WSL2 Users:**

Git is usually pre-installed in WSL2. Verify first:

```bash
git --version
# Expected output: git version 2.x.x
```

If not installed:

```bash
sudo apt update
sudo apt install git

# Verify
git --version
```

**Configure Git:**

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify
git config --global user.name
git config --global user.email
```

---

#### **For macOS Users:**

**Option 1: Check if already installed**

```bash
git --version
# If installed, you'll see: git version 2.x.x
```

**Option 2: Install via Xcode Command Line Tools**

```bash
xcode-select --install
```

**Option 3: Install via Homebrew**

```bash
brew install git
```

---

#### **For Windows (NOT WSL2):**

1. Visit https://git-scm.com/downloads
2. Download Windows installer
3. Run installer with default options
4. Verify in PowerShell: `git --version`

**Important:** If using WSL2, use Git in WSL2, not Windows Git!

---

### 1.4 Install a Code Editor

**Recommended: Visual Studio Code**

#### **For WSL2 Users:**

1. Download VS Code for Windows from https://code.visualstudio.com
2. Install on Windows (not in WSL2)
3. Install the "WSL" extension in VS Code
4. Open your project from WSL2:
   ```bash
   cd /home/mack/my_workspace/mindflow
   code .
   ```
5. VS Code will automatically connect to WSL2 (you'll see "WSL: Ubuntu" in the bottom-left corner)

**Recommended Extensions (install in WSL2 mode):**
- WSL (required for WSL2 integration)
- ESLint
- Prettier - Code formatter
- React Native Tools
- JavaScript (ES6) code snippets
- GitLens

---

#### **For macOS/Linux Users:**

1. Download from https://code.visualstudio.com
2. Install for your operating system
3. Install recommended extensions above

---

#### **Alternative Editors:**
- **WebStorm** (paid, excellent for JavaScript)
- **Neovim/Vim** (for terminal enthusiasts)
- **Sublime Text**
- **Cursor** (AI-powered, based on VS Code)

---

## 2. Set Up React Native & Expo Environment

### 2.1 Install Expo CLI

**Why:** Expo simplifies React Native development and provides build services.

```bash
npm install -g expo-cli

# Verify installation
expo --version
# Expected output: 6.x.x or higher
```

**Note:** If you encounter permission errors on macOS/Linux, you may need to use `sudo`:

```bash
sudo npm install -g expo-cli
```

---

### 2.2 Install EAS CLI

**Why:** EAS (Expo Application Services) is used for building production apps.

```bash
npm install -g eas-cli

# Verify installation
eas --version
# Expected output: 5.x.x or higher
```

---

### 2.3 Set Up Mobile Development Environment

You'll need to set up either iOS or Android development tools (or both).

#### **Option A: iOS Development (macOS only)**

**Requirements:**
- macOS computer
- Xcode (large download, ~15GB)

**Steps:**

1. Install Xcode from the Mac App Store
2. Open Xcode and accept the license agreement
3. Install Xcode Command Line Tools:

```bash
xcode-select --install
```

4. Install iOS Simulator:
   - Open Xcode
   - Go to Xcode > Preferences > Components
   - Download the iOS Simulator version you want

5. Verify setup:

```bash
# Check if Xcode Command Line Tools are installed
xcode-select -p
# Expected output: /Applications/Xcode.app/Contents/Developer
```

#### **Option B: Android Development (All platforms)**

**For WSL2 Users:** See [Section 0.5](#05-connect-wsl2-to-windows-android-studio-optional) for connecting WSL2 to Windows Android Studio. **Or** just use a physical device (Option C below - much easier!)

**Requirements:**
- Android Studio
- Java Development Kit (JDK)

**Steps:**

1. **Install JDK:**

**macOS:**
```bash
brew install openjdk@11
```

**Linux/WSL2:**
```bash
sudo apt update
sudo apt install openjdk-11-jdk

# Verify
java -version
```

**Windows:**
- Download from https://www.oracle.com/java/technologies/javase-jdk11-downloads.html
- Or use OpenJDK: https://openjdk.org

2. **Install Android Studio:**
   - Download from https://developer.android.com/studio
   - **WSL2 users:** Install on Windows, not in WSL2
   - Run the installer
   - During setup, ensure these components are selected:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (AVD)

3. **Configure Android SDK:**
   - Open Android Studio
   - Go to Settings/Preferences > Appearance & Behavior > System Settings > Android SDK
   - Install SDK Platform for Android 13 (API Level 33) or higher
   - Install Android SDK Build-Tools

4. **Set up environment variables:**

**macOS:**

Add to `~/.zshrc` or `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Reload: `source ~/.zshrc`

**Linux (non-WSL2):**

Add to `~/.bashrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Reload: `source ~/.bashrc`

**WSL2:**

See [Section 0.5](#05-connect-wsl2-to-windows-android-studio-optional) for complete WSL2 ADB setup.

**Windows:**

Add these to System Environment Variables:
- `ANDROID_HOME`: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
- Add to PATH: `%ANDROID_HOME%\platform-tools`

5. **Create an Android Virtual Device (AVD):**
   - Open Android Studio
   - Go to Tools > AVD Manager
   - Click "Create Virtual Device"
   - Choose a device (e.g., Pixel 5)
   - Select a system image (e.g., Android 13)
   - Click Finish

6. **Verify setup:**

```bash
adb --version
# Expected output: Android Debug Bridge version x.x.x
```

**WSL2 users:** After setting up ADB bridge (Section 0.5), verify with:
```bash
adb devices
# Should show your emulator
```

#### **Option C: Use Your Physical Device (Easiest)**

**For iOS:**
1. Install Expo Go app from the App Store
2. Connect to the same WiFi as your computer

**For Android:**
1. Install Expo Go app from Google Play Store
2. Enable Developer Mode on your device
3. Connect to the same WiFi as your computer

---

## 3. Create Third-Party Service Accounts

### 3.1 Supabase (Database, Auth, Storage)

**Steps:**

1. Visit https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Create a new project:
   - **Organization name:** Your name or company
   - **Project name:** `mindflow` or `mindflow-dev`
   - **Database password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your location
   - **Pricing plan:** Free (sufficient for MVP)
5. Wait for project to be provisioned (2-3 minutes)

**Save these credentials (you'll need them later):**

Once project is ready:
- Go to Project Settings > API
- **Copy and save:**
  - Project URL (e.g., `https://xxxxx.supabase.co`)
  - `anon` public key
  - `service_role` secret key (keep this private!)

**Initialize Database:**
- Go to SQL Editor
- We'll create tables in Phase 2, but you can explore the interface now

---

### 3.2 OpenAI (AI Processing)

**Steps:**

1. Visit https://platform.openai.com
2. Sign up or log in
3. Go to API Keys section (https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. **Name:** `MindFlow Development`
6. **Copy the key immediately** (you won't be able to see it again!)
7. Save it securely

**Set up billing:**
1. Go to Settings > Billing
2. Add a payment method
3. Set a usage limit (e.g., $10/month for development)

**Note:** OpenAI API is pay-as-you-go. For MVP development, expect $5-20/month depending on usage.

---

### 3.3 Railway (Backend Hosting)

**Steps:**

1. Visit https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)
4. Complete account setup
5. You don't need to create a project yet (we'll do this in Phase 12)

**Note:** Railway offers $5 free credit per month, sufficient for MVP development.

---

### 3.4 Expo Account (App Builds)

**Steps:**

1. Visit https://expo.dev
2. Click "Sign Up"
3. Create account with email or GitHub
4. Verify your email

**Login to Expo CLI:**

```bash
expo login
# Enter your Expo credentials

# Verify
expo whoami
# Expected output: Your Expo username
```

---

## 4. Initialize Project Structure

### 4.1 Create Project Directories

```bash
# Navigate to your workspace
cd /home/mack/my_workspace/mindflow

# Create backend directory structure
mkdir -p backend/src/{routes,controllers,middleware,services,utils}
mkdir -p backend/{migrations,tests}

# Create mobile directory structure
mkdir -p mobile/{app,components,store,services,utils,assets}

# Verify structure
tree -L 2 -d
# Or use: ls -R (if tree is not installed)
```

---

### 4.2 Initialize Backend Project

```bash
cd backend

# Initialize package.json
npm init -y

# Install core dependencies
npm install express dotenv cors helmet morgan

# Install development dependencies
npm install --save-dev nodemon eslint prettier jest supertest

# Create basic files
touch src/server.js
touch .env.example
touch .gitignore
touch README.md
```

**Create `backend/package.json` scripts:**

Edit `backend/package.json` and add/update the `scripts` section:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --watchAll",
    "test:ci": "jest",
    "lint": "eslint ."
  }
}
```

**Create `backend/src/server.js`:**

```javascript
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MindFlow API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;
```

**Create `backend/.gitignore`:**

```
# Dependencies
node_modules/

# Environment variables
.env
.env.local
.env.production

# Logs
logs/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Testing
coverage/

# Build
dist/
build/
```

---

### 4.3 Initialize Mobile Project

```bash
cd ../mobile

# Create Expo project
npx create-expo-app@latest . --template blank

# This will initialize an Expo project in the current directory
# Choose "blank" template when prompted

# Install additional dependencies
npm install zustand axios react-navigation/native @react-navigation/native-stack

# Install Expo specific dependencies
npx expo install expo-secure-store expo-router

# Create basic files
touch .env.example
```

**Create `mobile/.gitignore`:**

```
# Dependencies
node_modules/

# Expo
.expo/
dist/
web-build/

# Environment variables
.env
.env.local

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Native
ios/
android/

# Logs
*.log
```

---

## 5. Configure Environment Variables

### 5.1 Backend Environment Variables

**Create `backend/.env.example`:**

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Security
JWT_SECRET=your-jwt-secret-key-change-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Create `backend/.env` (actual config):**

```bash
cd backend
cp .env.example .env

# Now edit .env and add your actual credentials
# Use VS Code or any text editor:
code .env

# Or use nano:
nano .env
```

Replace the placeholder values with your actual credentials from Supabase and OpenAI.

---

### 5.2 Mobile Environment Variables

**Create `mobile/.env.example`:**

```bash
# API Configuration
API_URL=http://localhost:3000
API_TIMEOUT=10000

# Supabase (if using direct client connection)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Environment
ENVIRONMENT=development
```

**Create `mobile/.env`:**

```bash
cd ../mobile
cp .env.example .env

# Edit with your local backend URL
code .env
```

**Important for WSL2 users:**

When testing on a physical device, you'll need to use your computer's IP address instead of `localhost`:

```bash
# Get your WSL2 IP address
hostname -I
# Use the first IP shown (e.g., 172.x.x.x)

# Then edit mobile/.env:
# API_URL=http://172.x.x.x:3000
```

**For physical devices (all platforms):**

```bash
# macOS/Linux: Get your local IP
ifconfig | grep inet
# or: ip addr show

# Windows (PowerShell):
ipconfig

# Update mobile/.env with your IP:
# API_URL=http://192.168.1.X:3000
```

**Note:** For Expo to read environment variables, you may need to install `react-native-dotenv`:

```bash
npm install react-native-dotenv

# Then configure in babel.config.js (we'll do this in Phase 5)
```

---

## 6. Verify Setup

### 6.1 Test Backend Server

```bash
cd backend

# Start the server
npm run dev

# You should see:
# 🚀 Server running on http://localhost:3000
```

**In another terminal, test the health endpoint:**

```bash
curl http://localhost:3000/health

# Expected output:
# {"status":"ok","message":"MindFlow API is running"}
```

Stop the server with `Ctrl+C`.

---

### 6.2 Test Mobile App

```bash
cd ../mobile

# Start Expo development server
npx expo start

# You should see:
# › Metro waiting on exp://192.168.x.x:8081
# › Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

**Test on device or simulator:**

**Option 1: Physical Device**
- Open Expo Go app
- Scan the QR code
- App should load

**Option 2: iOS Simulator (macOS only)**
- Press `i` in the terminal
- Simulator should open with the app

**Option 3: Android Emulator**
- Start Android emulator from Android Studio
- Press `a` in the terminal
- App should load in emulator

Stop Expo with `Ctrl+C`.

---

### 6.3 Verify All Tools

Run these commands to verify everything is installed:

```bash
# Core tools
node --version          # ✓ v18.x.x or higher
npm --version           # ✓ 9.x.x or higher
git --version           # ✓ git version 2.x.x

# Expo tools
expo --version          # ✓ 6.x.x or higher
eas --version           # ✓ 5.x.x or higher

# Android (if using Android)
adb --version           # ✓ Android Debug Bridge version x.x.x

# iOS (if using iOS)
xcode-select -p         # ✓ /Applications/Xcode.app/Contents/Developer
```

---

## 7. Set Up Git Repository

### 7.1 Verify Git Status

```bash
cd /home/mack/my_workspace/mindflow

# Check if already initialized
git status

# You should see the current branch and modified files
```

---

### 7.2 Update Root .gitignore

Make sure the root `.gitignore` includes:

```bash
# Root .gitignore
node_modules/
.env
.env.local
.DS_Store

# Backend specific
backend/dist/
backend/coverage/

# Mobile specific
mobile/.expo/
mobile/dist/
mobile/web-build/
```

---

### 7.3 Commit Initial Setup

```bash
# Check what will be committed
git status

# Add all new files
git add backend/ mobile/

# Commit the initial project structure
git commit -m "Phase 1: Initialize backend and mobile project structure

- Set up Node.js backend with Express
- Initialize Expo mobile project
- Configure environment variables templates
- Add .gitignore files
- Create basic server with health check endpoint"

# Verify commit
git log -1
```

---

## 8. Quality Gates Checklist

Before marking Phase 1 as complete, verify:

### ✅ WSL2 Setup (Windows users only)
- [ ] Verified running in WSL2 (`uname -a` shows microsoft-standard-WSL2)
- [ ] Project is in WSL2 filesystem (not /mnt/c/...)
- [ ] VS Code with WSL extension installed and working
- [ ] Can open project with `code .` from WSL2
- [ ] VS Code shows "WSL: Ubuntu" in bottom-left corner

### ✅ Development Tools
- [ ] Node.js 18+ installed and verified (in WSL2 if using Windows)
- [ ] npm or yarn installed and working
- [ ] Git installed and configured (in WSL2 if using Windows)
- [ ] Code editor installed with recommended extensions
- [ ] Expo CLI installed globally (in WSL2 if using Windows)
- [ ] EAS CLI installed globally (in WSL2 if using Windows)

### ✅ Mobile Development Environment
- [ ] iOS Simulator working (macOS) OR
- [ ] Android Emulator working OR
- [ ] Physical device with Expo Go installed
- [ ] Can run `npx expo start` successfully

### ✅ Third-Party Accounts
- [ ] Supabase account created and project provisioned
- [ ] Supabase credentials saved (URL, anon key, service key)
- [ ] OpenAI account created with API key
- [ ] OpenAI billing set up with usage limits
- [ ] Railway account created
- [ ] Expo account created and logged in via CLI

### ✅ Project Structure
- [ ] Backend directory structure created
- [ ] Backend `package.json` initialized with scripts
- [ ] Backend server.js created and runs successfully
- [ ] Mobile project initialized with Expo
- [ ] Both projects have .gitignore files

### ✅ Environment Variables
- [ ] Backend `.env.example` created
- [ ] Backend `.env` created with actual credentials
- [ ] Mobile `.env.example` created
- [ ] Mobile `.env` created with API URL
- [ ] All .env files added to .gitignore

### ✅ Verification
- [ ] Backend server starts: `npm run dev` works
- [ ] Health endpoint responds: `curl http://localhost:3000/health`
- [ ] Mobile app starts: `npx expo start` works
- [ ] Mobile app loads on device/simulator

### ✅ Git Repository
- [ ] Git repository initialized
- [ ] .gitignore configured correctly
- [ ] Initial commit created with project structure
- [ ] No sensitive data (API keys, .env) committed

---

## Troubleshooting

### Issue: "permission denied" when installing global packages

**Solution (macOS/Linux):**

```bash
# Option 1: Use sudo (quick fix)
sudo npm install -g expo-cli

# Option 2: Fix npm permissions (better long-term)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bash_profile
source ~/.bash_profile
```

---

### Issue: "Expo command not found"

**Solution:**

```bash
# Verify npm global path is in PATH
npm config get prefix

# If the output path is not in your PATH, add it:
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bash_profile
source ~/.bash_profile
```

---

### Issue: Android emulator won't start

**Solution:**

1. Open Android Studio
2. Go to AVD Manager
3. Delete existing AVD and create a new one
4. Ensure "Hardware - GLES 2.0" is selected
5. Increase RAM to 2048MB or higher

---

### Issue: iOS Simulator not opening

**Solution:**

```bash
# Open Simulator directly
open -a Simulator

# Or reset Xcode
sudo xcode-select --reset

# Re-accept license
sudo xcodebuild -license accept
```

---

### Issue: Backend server won't start

**Solution:**

```bash
# Check if port 3000 is already in use
lsof -i :3000

# If something is using it, kill the process:
kill -9 <PID>

# Or change the port in backend/.env:
PORT=3001
```

---

### Issue: Can't connect to backend from mobile app

**Solution:**

1. Ensure backend is running: `cd backend && npm run dev`
2. Get your computer's local IP address:
   - macOS/Linux: `ifconfig | grep inet`
   - Windows: `ipconfig`
3. Update `mobile/.env`:
   ```
   API_URL=http://192.168.1.X:3000
   ```
   (Replace X with your actual IP)
4. Ensure phone and computer are on the same WiFi network

---

### Issue: Supabase project creation fails

**Solution:**

1. Wait a few minutes and try again (high demand)
2. Check Supabase status: https://status.supabase.com
3. Try a different region
4. Contact Supabase support if issue persists

---

### WSL2-Specific Issues

#### Issue: "code: command not found" in WSL2

**Solution:**

```bash
# Make sure VS Code is installed on Windows
# Then add VS Code to PATH in WSL2:
export PATH=$PATH:"/mnt/c/Users/YourUsername/AppData/Local/Programs/Microsoft VS Code/bin"

# Or permanently add to ~/.bashrc:
echo 'export PATH=$PATH:"/mnt/c/Users/YourUsername/AppData/Local/Programs/Microsoft VS Code/bin"' >> ~/.bashrc
source ~/.bashrc
```

---

#### Issue: WSL2 is slow or npm install takes forever

**Solution:**

Make sure your project is in the WSL2 filesystem, NOT the Windows filesystem:

```bash
# Check current directory
pwd

# Should be: /home/mack/my_workspace/mindflow
# NOT: /mnt/c/Users/... (Windows filesystem)

# If in Windows filesystem, move to WSL2:
cd ~
mkdir -p my_workspace
cd my_workspace
# Clone or move your project here
```

---

#### Issue: Can't connect to Expo from phone when using WSL2

**Solution 1: Use tunnel mode**

```bash
npx expo start --tunnel
```

**Solution 2: Check Windows Firewall**
- Allow Node.js through Windows Firewall
- Allow port 19000 and 19001

**Solution 3: Use the same network**
- Ensure phone and computer are on the same WiFi
- Get WSL2 IP and use it in Expo Go:
  ```bash
  hostname -I
  # Use the first IP address shown
  ```

---

#### Issue: Android emulator doesn't show in `adb devices` (WSL2)

**Solution:**

```bash
# Make sure Android emulator is running on Windows
# Then connect WSL2 ADB to Windows ADB:

export WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
export ADB_SERVER_SOCKET=tcp:$WINDOWS_IP:5037

adb devices
# Should now show your emulator
```

---

#### Issue: Git line ending warnings in WSL2

**Solution:**

```bash
# Configure Git to handle line endings correctly
git config --global core.autocrlf input
git config --global core.eol lf

# For this repository
cd /home/mack/my_workspace/mindflow
git config core.autocrlf input
```

---

#### Issue: npm install fails with permission errors in WSL2

**Solution:**

```bash
# Don't use sudo with npm in WSL2
# If you get permission errors, fix npm permissions:

mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Now try installing global packages again:
npm install -g expo-cli
```

---

#### Issue: VS Code extensions not working in WSL2

**Solution:**

Make sure you install extensions in WSL2, not locally:

1. Open VS Code connected to WSL2 (`code .` from WSL2 terminal)
2. Check bottom-left corner says "WSL: Ubuntu"
3. When installing extensions, make sure they install to "WSL: Ubuntu"
4. Some extensions need to be installed in both Windows and WSL2

---

## Next Steps

Once all quality gates are checked:

1. **Update Progress Tracker:**
   - Open `docs/PROGRESS.md`
   - Mark Phase 1 as `[✓] Complete`
   - Update "Last Updated" date

2. **Proceed to Phase 2:**
   - Read `docs/planning.md` for Phase 2 details
   - Phase 2 focuses on Database Schema and Setup

3. **Optional: Set up development tools:**
   - Install Postman for API testing
   - Set up ESLint and Prettier in your editor
   - Explore Supabase dashboard

---

## Resources

### General Documentation
- **Node.js Documentation:** https://nodejs.org/docs
- **Expo Documentation:** https://docs.expo.dev
- **Supabase Documentation:** https://supabase.com/docs
- **OpenAI API Reference:** https://platform.openai.com/docs
- **Railway Documentation:** https://docs.railway.app
- **React Native Documentation:** https://reactnative.dev/docs

### WSL2 Resources
- **WSL2 Documentation:** https://docs.microsoft.com/en-us/windows/wsl/
- **VS Code WSL Extension:** https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl
- **Using Git with WSL2:** https://docs.microsoft.com/en-us/windows/wsl/tutorials/wsl-git
- **WSL2 Networking:** https://docs.microsoft.com/en-us/windows/wsl/networking

### WSL2 Quick Reference

**Key Commands:**
```bash
# Verify WSL2
uname -a                          # Should show microsoft-standard-WSL2
wsl.exe -l -v                    # Show WSL version

# Get WSL2 IP
hostname -I                       # For API_URL in mobile/.env

# Get Windows IP from WSL2
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'

# Connect to Windows ADB (if using Android emulator)
export WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}')
export ADB_SERVER_SOCKET=tcp:$WINDOWS_IP:5037
adb devices
```

**Remember:**
- ✅ Keep code in WSL2 filesystem: `/home/mack/my_workspace/mindflow`
- ✅ Install Node.js, npm, Expo CLI in WSL2, not Windows
- ✅ Use VS Code on Windows with WSL extension
- ✅ For mobile testing, use physical device or `--tunnel` mode
- ❌ Don't work in `/mnt/c/...` (Windows filesystem) - it's slow!

---

**Congratulations!** You've completed Phase 1. Your development environment is now ready for building MindFlow. 🎉
