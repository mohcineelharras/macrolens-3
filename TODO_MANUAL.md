# 📝 Manual Tasks Required for Monster Upgrade (Macrolens 3)

## 🔑 AI Configuration
- [ ] **Gemini API Key:**
    -   Open `src/features/scanner/ai.service.ts`.
    -   Replace `YOUR_GEMINI_API_KEY` with a valid key from Google AI Studio.

## 📱 Build & Run
- [ ] **Install Deps:** (If not finished)
    ```bash
    npm install
    ```
- [ ] **Run:**
    ```bash
    npx expo start
    ```
- [ ] **Physical Device:**
    -   Scan the QR code with your phone (Expo Go).
    -   **Note:** The camera and food scanning will ONLY work on a real device, not the simulator.

## 🧪 Testing
- [ ] **Permissions:** Accept the Camera permission prompt.
- [ ] **Scan:** Point at food (e.g., a banana or coffee) and tap the shutter.
- [ ] **Verify:** Check if the alert shows the correct food name and calories.
