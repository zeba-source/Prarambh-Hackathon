# Prarambh-Hackathon — Technical Implementation

This repository contains two primary applications for the Prarambh Hackathon project:

- `samadhan-app/` — A cross-platform mobile/desktop application built with Flutter (Dart).
- `samadhan-webapp/` — A web application built with Next.js (TypeScript) and Tailwind CSS; integrates with Firebase.

This README documents the technical stack, architecture, folder layout, environment/configuration, how to run and build each app, testing, suggested CI/CD, and troubleshooting notes.

## Table of contents

- Overview & high-level architecture
- Tech stack
- Repository layout
- samadhan-app (Flutter)
  - Requirements
  - Folder structure
  - Setup & run (pwsh)
  - Build & release
  - Testing and linting
- samadhan-webapp (Next.js)
  - Requirements
  - Folder structure
  - Environment variables
  - Setup & run (pwsh)
  - Build & deploy
  - Testing and linting
- CI/CD suggestions
- Security and secrets
- Troubleshooting
- Next steps & contributions

## Overview & high-level architecture

This project is a small monorepo containing a Flutter client app (`samadhan-app`) and a web frontend (`samadhan-webapp`) that likely share the same backend/services (Firebase is present in the webapp). The two frontends may operate independently but often share concepts such as authentication and issue reporting.

High-level components:

- Client apps (Flutter & Next.js) — UI, client-side validation, state management.
- Backend-as-a-Service (Firebase) — auth, firestore/database, storage, analytics (inferred from `src/lib/firebase.ts`).

The architecture favors serverless / BaaS for rapid iteration and simple deployment.

## Tech stack

- Flutter (Dart) — cross-platform mobile & desktop app located at `samadhan-app/`.
  - Uses `analysis_options.yaml` for linting rules.
- Android / Windows build configuration included under `samadhan-app/android/` and `samadhan-app/windows/`.
- Next.js (TypeScript) + Tailwind CSS — web app located at `samadhan-webapp/`.
  - Uses `eslint`, `postcss`, and `tailwind` for styling and linting.
- Firebase — present in the webapp (`samadhan-webapp/src/lib/firebase.ts`) and likely used by the Flutter app.

## Repository layout

Top-level files and folders:

- `samadhan-app/` — Flutter mobile/desktop app
  - `lib/` — Dart source for screens and app logic
  - `android/`, `windows/` — platform-specific files
  - `test/` — Flutter widget tests
- `samadhan-webapp/` — Next.js TypeScript web app
  - `src/` — Next.js pages and app code
  - `public/` — static assets
  - `package.json`, `tsconfig.json`, `tailwind.config.ts` — web config

## samadhan-app (Flutter)

### Requirements

- Flutter SDK (install from https://flutter.dev). Recommended: stable channel.
- Android SDK/Studio for Android builds (when building APKs)
- For Windows desktop builds: Visual Studio with C++ workload.

You can check Flutter is available with:

```pwsh
# shows flutter version and setup info
flutter --version
flutter doctor
```

### Folder structure (high level)

- `lib/` — main Dart entrypoint and UI screens:
  - `main.dart` — app entry
  - `home_screen.dart`, `login_form.dart`, `signup_form.dart`, `report_issue_page.dart`, etc.
- `android/`, `windows/` — platform integration and packaging.

### Setup & run (pwsh)

From the project root run (pwsh):

```pwsh
# go to Flutter app
Set-Location samadhan-app

# fetch dependencies
flutter pub get

# run on connected device or desktop (auto-selects an available device)
flutter run

# or run on Windows desktop explicitly
flutter run -d windows

# run Android (ensure emulator or device connected)
flutter run -d android
```

### Build & release

- Android APK:

```pwsh
Set-Location samadhan-app
flutter build apk --release
# outputs to build/app/outputs/flutter-apk/app-release.apk
```

- Windows executable:

```pwsh
Set-Location samadhan-app
flutter build windows --release
# outputs to build/windows/runner/Release
```

For iOS, use `flutter build ios` from macOS with Xcode installed.

Note: Add platform-specific Firebase config files when using Firebase (e.g., `google-services.json` for Android and `GoogleService-Info.plist` for iOS). Do not commit these to source control.

### Testing and linting

- Run unit/widget tests:

```pwsh
Set-Location samadhan-app
flutter test
```

- Lint & analyzer:

```pwsh
Set-Location samadhan-app
flutter analyze
```

## samadhan-webapp (Next.js + TypeScript)

### Requirements

- Node.js (LTS recommended) and npm (or pnpm/yarn if you prefer). The project's `package.json` will indicate scripts.

Check node/npm versions:

```pwsh
node --version
npm --version
```

### Folder structure (high level)

- `samadhan-webapp/src/app/` — Next.js app directory (app router)
  - `globals.css`, `layout.tsx`, `page.tsx`
- `samadhan-webapp/src/lib/` — helper libs (includes `firebase.ts`)
- `samadhan-webapp/public/` — static assets
- `samadhan-webapp/package.json` — scripts and dependencies

### Environment variables

If the webapp uses Firebase, you should create a local `.env.local` in `samadhan-webapp/` with keys prefixed `NEXT_PUBLIC_` for browser-safe values (example names — open `samadhan-webapp/src/lib/firebase.ts` to confirm keys):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Never commit real keys to git. Use CI secrets for production deployments.

### Setup & run (pwsh)

```pwsh
Set-Location samadhan-webapp

# install dependencies
npm install

# development server (hot reload)
npm run dev

# build for production
npm run build

# preview production build locally
npm run start
```

If `package.json` uses `pnpm` or `yarn`, substitute the appropriate commands.

### Build & deploy

- Deploy to Vercel: Vercel handles Next.js seamlessly. Connect the GitHub repo & set environment variables in the Vercel dashboard.
- Alternatively, build (`npm run build`) and deploy static/SSR content to a hosting provider (Netlify, Firebase Hosting, or your own Node server).

### Testing and linting

- Lint with ESLint (project contains `eslint.config.mjs`):

```pwsh
Set-Location samadhan-webapp
npm run lint
```

Add unit / integration tests with Jest/Testing Library for React if required.

## CI/CD suggestions

- Create GitHub Actions workflows to build and test both projects on push/PR:
  - Flutter workflow: matrix for OS (windows, ubuntu, macos) if building desktop; run `flutter analyze`, `flutter test`, and optionally `flutter build` for a release artifact.
  - Web workflow: Node matrix (16/18/20), run `npm ci`, `npm run build`, `npm run lint`, optionally run tests.
- Use artifacts for release binaries (APK, Windows EXE) and create GitHub Releases.
- For deployments: use Vercel for `samadhan-webapp`, and Firebase Hosting if preferable. For mobile, use Play Store / App Store release flows.

Example (high-level) GitHub Actions jobs:

- `.github/workflows/flutter.yml` — runs `flutter analyze`, `flutter test`, builds APK for Android.
- `.github/workflows/web.yml` — runs `npm ci`, `npm run build`, `npm run lint`, and deploys to Vercel via `vercel-action` or to Firebase via `Firebase CLI`.

## Security and secrets

- Do NOT store `google-services.json`, `GoogleService-Info.plist`, or any private keys in git. Use encrypted secrets in CI and environment variables for hosting providers.
- Restrict Firebase rules in production and validate all client inputs server-side where possible.

## Troubleshooting (common issues)

- Flutter: "Missing Android SDK" — run `flutter doctor` and install Android Studio/SDK.
- Flutter: build errors on Windows — ensure Visual Studio with required C++ workloads is installed.
- Web: environment variables not available client-side — confirm keys are prefixed with `NEXT_PUBLIC_`.
- Web: CORS or Firebase auth errors — ensure Firebase origin is authorized in Firebase console.

## Next steps & contributions

Suggested next improvements (small, low-risk):

1. Add GitHub Actions workflows for both apps.
2. Add a CONTRIBUTING.md with dev environment setup and branch rules.
3. Add unit tests for critical flows (auth, issue reporting) and ensure they run in CI.
4. Add a simple deploy script for the webapp (Vercel CLI or Firebase CLI) and publish a release pipeline for Android.

Contributing:

1. Fork the repo and create a feature branch.
2. Run tests and lint locally.
3. Open a PR against `main` with a description and testing steps.

## Quick checklist for new devs

- Install Flutter SDK and Node.js.
- Open `samadhan-app/` and run `flutter pub get` and `flutter run`.
- Open `samadhan-webapp/` and run `npm install` and `npm run dev`.
- Add your local Firebase credentials in `.env.local` (web) and platform config files for Flutter (kept out of Git).

---

If you'd like, I can also:

- Create example GitHub Actions workflows for both apps.
- Add a `CONTRIBUTING.md` and `SECURITY.md`.
- Generate a minimal `Makefile` or scripts to run common dev tasks across both projects.

Tell me which follow-up you'd like and I'll implement it next.
# Prarambh-Hackathon

## 🚀 Garbage & Pothole Detector - API Integration Guide

A comprehensive guide for integrating Gradio-based Hugging Face Spaces into web applications with complete API endpoint documentation.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [API Endpoints Documentation](#api-endpoints-documentation)
4. [Implementation Guide](#implementation-guide)
5. [Integration Methods](#integration-methods)
6. [Code Examples](#code-examples)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## 🎯 Project Overview

This project demonstrates how to connect a web interface to Gradio-based machine learning models hosted on Hugging Face Spaces. The example uses a garbage and pothole detection model, but the same approach can be applied to any Gradio app.

**Hugging Face Space:** `utkarsh-23/garbage-pothole-detector-app`

### Features
- Upload images via drag-and-drop or file picker
- Real-time object detection using Gradio API
- Display processed images with bounding boxes
- Department classification based on detected objects
- Downloadable results

---

## 📁 Project Structure

```
PRARAMBH/
├── index.html              # Main web interface (simplified UI)
├── test-interface.html     # Advanced API testing interface
├── test-gradio.js         # Node.js testing script
├── package.json           # Node.js dependencies
├── package-lock.json      # Dependency lock file
└── README.md             # This documentation
```

---

## 🔌 API Endpoints Documentation

### Base Information

**Hugging Face Space:** `utkarsh-23/garbage-pothole-detector-app`
**API Base URL:** `https://utkarsh-23-garbage-pothole-detector-app.hf.space/api/`

### Available Endpoints

#### 1. `/detect_image` - Image Detection (Method 1)

**Purpose:** Detect garbage, potholes, and infrastructure in uploaded images

**Request:**
```javascript
{
  image: Blob | File | Buffer  // Required: Image file
}
```

**Response:**
```javascript
[
  {
    path: string,           // Server file path
    url: string,           // Public URL to access result image
    size: number | null,
    orig_name: string,
    mime_type: string | null,
    is_stream: boolean,
    meta: { _type: "gradio.FileData" }
  },
  string  // Department classification markdown text
]
```

#### 2. `/detect_image_1` - Image Detection (Method 2)

**Purpose:** Alternative endpoint for image detection (same functionality)

**Request/Response:** Same as `/detect_image`

#### 3. `/detect_video` - Video Detection

**Purpose:** Detect objects in video files

**Request:**
```javascript
{
  video_path: Blob | File | Buffer  // Required: Video file
}
```

**Response:**
```javascript
{
  path: string,           // Server file path
  url: string,           // Public URL to access result video
  size: number | null,
  orig_name: string,
  mime_type: string | null,
  is_stream: boolean,
  meta: { _type: "gradio.FileData" }
}
```

---

## 🛠️ Implementation Guide

### Prerequisites

**For Browser-Based Implementation:**
- Modern web browser with ES6 module support
- Internet connection (for CDN access)

**For Node.js Implementation:**
```bash
npm install -D @gradio/client
```

### Installation Steps

1. **Clone or download this repository**
```bash
git clone https://github.com/Rishiraj-Pathak-27/Prarambh-Hackathon.git
cd Prarambh-Hackathon
```

2. **Install dependencies (for Node.js testing)**
```bash
npm install
```

3. **Open the web interface**
```bash
# Windows
Start-Process index.html

# Mac/Linux
open index.html
```

---

## 🔗 Integration Methods

### Method 1: Browser-Based Integration (Recommended for Web Apps)

**File:** `index.html`

#### Key Components:

1. **Import Gradio Client from CDN**
```html
<script type="module">
  import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/+esm";
</script>
```

2. **Connect to Gradio Space**
```javascript
const client = await Client.connect("utkarsh-23/garbage-pothole-detector-app");
```

3. **Send Request with Image**
```javascript
const result = await client.predict("/detect_image_1", { 
    image: blob  // File or Blob object
});
```

4. **Parse Response**
```javascript
const [detectionImage, classification] = result.data;
const imageUrl = detectionImage.url;  // Display this image
const classificationText = classification;  // Display this text
```

### Method 2: Node.js Integration (Recommended for Backend/Testing)

**File:** `test-gradio.js`

#### Key Components:

1. **Import Gradio Client**
```javascript
import { Client } from "@gradio/client";
```

2. **Fetch and Prepare Image**
```javascript
const response = await fetch("IMAGE_URL");
const imageBlob = await response.blob();
```

3. **Connect and Predict**
```javascript
const client = await Client.connect("utkarsh-23/garbage-pothole-detector-app");
const result = await client.predict("/detect_image_1", { 
    image: imageBlob 
});
```

4. **Handle Response**
```javascript
const [detectionImage, classification] = result.data;
console.log("Image URL:", detectionImage.url);
console.log("Classification:", classification);
```

---

## 💻 Code Examples

### Example 1: Complete Browser Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Gradio API Integration</title>
</head>
<body>
    <input type="file" id="fileInput" accept="image/*">
    <button onclick="detectImage()">Detect</button>
    <div id="results"></div>

    <script type="module">
        import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/+esm";

        window.detectImage = async function() {
            const file = document.getElementById('fileInput').files[0];
            if (!file) return alert('Please select an image');

            try {
                // Connect to Gradio app
                const client = await Client.connect(
                    "utkarsh-23/garbage-pothole-detector-app"
                );

                // Convert file to blob
                const blob = new Blob([file], { type: file.type });

                // Call API
                const result = await client.predict("/detect_image_1", { 
                    image: blob 
                });

                // Display results
                const [detectionImage, classification] = result.data;
                document.getElementById('results').innerHTML = `
                    <img src="${detectionImage.url}" alt="Result">
                    <p>${classification}</p>
                `;
            } catch (error) {
                console.error('Error:', error);
                alert('Detection failed: ' + error.message);
            }
        };
    </script>
</body>
</html>
```

### Example 2: Node.js Script

```javascript
import { Client } from "@gradio/client";
import fs from 'fs';

async function detectImage(imagePath) {
    try {
        // Read local image file
        const imageBuffer = fs.readFileSync(imagePath);
        const blob = new Blob([imageBuffer]);

        // Connect to Gradio app
        const client = await Client.connect(
            "utkarsh-23/garbage-pothole-detector-app"
        );

        // Call API
        const result = await client.predict("/detect_image_1", { 
            image: blob 
        });

        // Parse results
        const [detectionImage, classification] = result.data;
        
        console.log("Detection Image URL:", detectionImage.url);
        console.log("Classification:", classification);

        return result.data;
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

// Usage
detectImage('./path/to/image.jpg');
```

### Example 3: React Integration

```jsx
import { Client } from "@gradio/client";
import { useState } from 'react';

function GradioDetector() {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleDetect = async (file) => {
        setLoading(true);
        try {
            const client = await Client.connect(
                "utkarsh-23/garbage-pothole-detector-app"
            );
            
            const blob = new Blob([file], { type: file.type });
            const response = await client.predict("/detect_image_1", { 
                image: blob 
            });
            
            setResult(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <input 
                type="file" 
                onChange={(e) => handleDetect(e.target.files[0])}
            />
            {loading && <p>Processing...</p>}
            {result && (
                <div>
                    <img src={result[0].url} alt="Detection" />
                    <p>{result[1]}</p>
                </div>
            )}
        </div>
    );
}

export default GradioDetector;
```

### Example 4: Vue.js Integration

```vue
<template>
  <div>
    <input type="file" @change="handleFileChange" accept="image/*">
    <button @click="detectImage" :disabled="loading">Detect</button>
    <div v-if="loading">Processing...</div>
    <div v-if="result">
      <img :src="result[0].url" alt="Detection Result">
      <p>{{ result[1] }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Client } from '@gradio/client';

const file = ref(null);
const result = ref(null);
const loading = ref(false);

const handleFileChange = (event) => {
  file.value = event.target.files[0];
};

const detectImage = async () => {
  if (!file.value) return;
  
  loading.value = true;
  try {
    const client = await Client.connect(
      "utkarsh-23/garbage-pothole-detector-app"
    );
    
    const blob = new Blob([file.value], { type: file.value.type });
    const response = await client.predict("/detect_image_1", { 
      image: blob 
    });
    
    result.value = response.data;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};
</script>
```

### Example 5: Flutter/Dart Integration

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<Map<String, dynamic>> detectImage(String imagePath) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('https://utkarsh-23-garbage-pothole-detector-app.hf.space/api/predict')
  );
  
  request.files.add(await http.MultipartFile.fromPath('image', imagePath));
  request.fields['fn_index'] = '0';
  
  var response = await request.send();
  var responseData = await response.stream.bytesToString();
  
  return json.decode(responseData);
}
```

---

## 🔍 How the Connection Works

### Step-by-Step Flow

```
1. User uploads image
   ↓
2. JavaScript converts image to Blob/Buffer
   ↓
3. Gradio Client connects to Hugging Face Space
   ↓
4. Client.predict() sends image to endpoint
   ↓
5. Hugging Face processes image with ML model
   ↓
6. API returns:
   - Processed image with bounding boxes
   - Classification text
   ↓
7. Display results in UI
```

### Data Flow Diagram

```
┌─────────────────┐
│   User Browser  │
│   (index.html)  │
└────────┬────────┘
         │ 1. Upload Image
         ↓
┌─────────────────┐
│ Gradio Client   │
│ (CDN Library)   │
└────────┬────────┘
         │ 2. API Request
         ↓
┌─────────────────────────────────┐
│  Hugging Face Space             │
│  utkarsh-23/garbage-pothole-    │
│  detector-app                   │
│                                 │
│  ┌─────────────────────────┐  │
│  │  Gradio API Server      │  │
│  └───────┬─────────────────┘  │
│          │                      │
│  ┌───────▼─────────────────┐  │
│  │  ML Detection Model      │  │
│  │  (YOLOv8/Custom)        │  │
│  └───────┬─────────────────┘  │
│          │                      │
│  ┌───────▼─────────────────┐  │
│  │  Process & Annotate     │  │
│  │  Image                  │  │
│  └─────────────────────────┘  │
└────────┬────────────────────────┘
         │ 3. API Response
         ↓
┌─────────────────┐
│   Results       │
│   - Image URL   │
│   - Text Data   │
└─────────────────┘
```

---

## 🧪 Testing

### Run Node.js Test Script

```bash
node test-gradio.js
```

**Expected Output:**
```
🚀 Starting Gradio API Test...
📥 Fetching test image from GitHub...
✅ Image fetched: 1951 bytes, type: image/png
🔗 Connecting to Hugging Face Space...
✅ Connected to Gradio app
📤 Sending image to /detect_image_1 endpoint...
✅ Response received from Hugging Face!
============================================================
RESPONSE DETAILS
============================================================
📸 Detection Results Image: {...}
🏢 Department Classification: {...}
============================================================
```

### Test in Browser

1. Open `index.html` in your browser
2. Upload a test image (preferably with garbage/potholes)
3. Click "Detect Objects"
4. View results with bounding boxes and classification

---

## ⚠️ Troubleshooting

### Common Issues and Solutions

#### 1. CORS Errors in Browser

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**
- Use the CDN import method (as shown in index.html)
- Gradio apps on Hugging Face have CORS enabled by default
- If hosting locally, ensure your server has CORS enabled

#### 2. Module Not Found (Node.js)

**Error:** `Cannot find module '@gradio/client'`

**Solution:**
```bash
npm install -D @gradio/client
```

Ensure `package.json` has:
```json
{
  "type": "module",
  "devDependencies": {
    "@gradio/client": "^2.0.0-dev.1"
  }
}
```

#### 3. Connection Timeout

**Error:** `Failed to connect to Gradio app`

**Solution:**
- Check internet connection
- Verify Hugging Face Space is running
- Wait a few moments (Space may be sleeping)
- Try again - Spaces auto-wake on first request

#### 4. Invalid Response Format

**Error:** `Cannot read property 'url' of undefined`

**Solution:**
```javascript
// Always check if response exists
if (result && result.data && result.data[0]) {
    const imageUrl = result.data[0].url;
} else {
    console.error("Invalid response format");
}
```

#### 5. File Size Too Large

**Error:** `Request entity too large`

**Solution:**
- Compress images before upload
- Limit file size (e.g., max 10MB)
- Implement client-side image compression

```javascript
// Validate file size
if (file.size > 10 * 1024 * 1024) {
    alert('File too large. Max 10MB');
    return;
}
```

---

## 🎯 Best Practices

### 1. Error Handling

Always wrap API calls in try-catch blocks:

```javascript
async function detectImage() {
    try {
        const client = await Client.connect("space-name");
        const result = await client.predict("/endpoint", { image: blob });
        // Handle success
    } catch (error) {
        console.error("Detection failed:", error);
        // Show user-friendly error message
        alert("Failed to process image. Please try again.");
    }
}
```

### 2. Loading States

Provide visual feedback during API calls:

```javascript
// Show loading
setLoading(true);

try {
    const result = await client.predict(...);
    // Handle result
} finally {
    // Always hide loading
    setLoading(false);
}
```

### 3. File Validation

Validate files before sending:

```javascript
function validateFile(file) {
    // Check file type
    if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
    }
    
    // Check file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
    }
    
    return true;
}
```

### 4. Response Caching

Cache responses to reduce API calls:

```javascript
const cache = new Map();

async function detectWithCache(imageHash) {
    if (cache.has(imageHash)) {
        return cache.get(imageHash);
    }
    
    const result = await client.predict(...);
    cache.set(imageHash, result);
    return result;
}
```

### 5. Timeout Handling

Implement request timeouts:

```javascript
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), ms)
        )
    ]);
}

// Usage
await withTimeout(
    client.predict("/endpoint", { image: blob }),
    30000  // 30 second timeout
);
```

---

## 🚀 Adapting for Your Own Projects

### Step 1: Identify Your Gradio Space

Replace with your Gradio Space name:
```javascript
const client = await Client.connect("YOUR-USERNAME/YOUR-SPACE-NAME");
```

### Step 2: Find Endpoint Names

Visit your Space's API page:
```
https://huggingface.co/spaces/YOUR-USERNAME/YOUR-SPACE-NAME
```

Click "Use via API" to see available endpoints.

### Step 3: Update Parameters

Match the parameters expected by your endpoint:

```javascript
// Example: Text generation endpoint
const result = await client.predict("/generate", { 
    prompt: "Your text here",
    max_length: 100
});

// Example: Image classification
const result = await client.predict("/classify", { 
    image: blob
});

// Example: Audio transcription
const result = await client.predict("/transcribe", { 
    audio: audioBlob
});
```

### Step 4: Parse Response Format

Each endpoint returns different data structures:

```javascript
// Image endpoints typically return
const [imageData, metadata] = result.data;

// Text endpoints typically return
const text = result.data;

// Classification endpoints typically return
const { label, confidence } = result.data;
```

### Step 5: Update UI Accordingly

Modify the HTML/React components to display your specific results.

---

## 📚 Additional Resources

### Official Documentation
- [Gradio Documentation](https://www.gradio.app/docs)
- [Gradio Client Library](https://www.gradio.app/guides/getting-started-with-the-python-client)
- [Hugging Face Spaces](https://huggingface.co/docs/hub/spaces)

### Example Gradio Spaces
- Image Classification: `gradio/image-classification`
- Text Generation: `gradio/text-generation`
- Object Detection: `utkarsh-23/garbage-pothole-detector-app`

### Community Support
- [Gradio Discord](https://discord.gg/gradio)
- [Hugging Face Forums](https://discuss.huggingface.co/)
- [GitHub Issues](https://github.com/gradio-app/gradio/issues)

---

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Author

**Rishiraj Pathak**
- GitHub: [@Rishiraj-Pathak-27](https://github.com/Rishiraj-Pathak-27)

---

## 🎓 Learning Outcomes

After studying this project, you'll understand:
- ✅ How to connect web apps to ML models on Hugging Face
- ✅ How to use Gradio Client library in browser and Node.js
- ✅ How to handle file uploads and API responses
- ✅ How to parse and display ML model outputs
- ✅ Best practices for API integration
- ✅ Error handling and user experience optimization

---

**Happy Coding! 🚀**
