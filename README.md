<div align="center">
  <h1>✨ ZodiacSense ✨</h1>
  <p><strong>A comprehensive, interactive astrology and palmistry web application.</strong></p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
  
  <p>
    <a href="#-key-features">Features</a> • 
    <a href="#%EF%B8%8F-tech-stack">Tech Stack</a> • 
    <a href="#-getting-started">Getting Started</a>
  </p>
</div>

<br/>

**ZodiacSense** is an advanced astrology platform providing personalized insights, detailed birth chart generation, real-time AI palm reading, and relationship compatibility features, all wrapped in a highly engaging, multilingual interface.

## 🚀 Key Features

*   🔮 **Personalized Horoscopes**: Get daily, weekly, and monthly horoscopes tailored precisely to your zodiac profile.
*   🗺️ **Advanced Birth Chart Calculation**: Generate detailed astrological birth charts utilizing precise Swiss Ephemeris (`sweph`) data and interactive geolocation mapping (`leaflet`).
*   ✋ **AI-Powered Palm Reading**: Real-time hand tracking and palmistry analysis utilizing device cameras and Google's MediaPipe framework.
*   💞 **Marriage Compatibility (Bichar)**: Compare astrological charts to evaluate relationship and marriage compatibility based on traditional principles.
*   🤖 **Interactive Astrology Chatbot**: Converse with an intelligent, AI-driven assistant for personalized astrological guidance.
*   🌌 **Immersive UI/UX**: Features a beautiful 3D cosmic interface, interactive star maps, and smooth animations powered by Framer Motion.
*   🌍 **Multilingual Support**: Fully internationalized platform with real-time translation capabilities.
*   📄 **Exportable PDF Reports**: Generate, customize, and download comprehensive astrology reports directly to your device.
*   🔒 **Secure Authentication**: Robust user session management, signup, and login utilizing NextAuth.js.

## 🛠️ Tech Stack

### Frontend
*   **Framework**: [Next.js](https://nextjs.org/) (App Router)
*   **Library**: React 19, TypeScript
*   **Styling & UI**: CSS Modules, Framer Motion, Lucide React

### Backend & Data
*   **Database**: MongoDB (Mongoose)
*   **Authentication**: NextAuth.js

### Core Capabilities
*   **Astrology Engine**: `sweph` (Swiss Ephemeris), `astronomia`
*   **Computer Vision**: `@mediapipe/hands`, `@mediapipe/camera_utils`
*   **Mapping & Geolocation**: `leaflet`, `react-leaflet`
*   **Localization**: `i18next`, `next-i18n-router`, `google-translate-api-x`
*   **Document Generation**: `jspdf`, `html2canvas`

## 💻 Getting Started

### Prerequisites

Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v20 or higher recommended)
*   [MongoDB](https://www.mongodb.com/) instance (Local or Atlas)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/zodiac-sense.git
   cd zodiac-sense
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and configure your keys:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_SECRET=your_nextauth_secret_key
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

*   `src/app`: Next.js App Router pages (e.g., Horoscope, Birth Chart, Palm Reading) and API routes.
*   `src/components`: Reusable, feature-rich React components (`ZodiacWheelChart`, `CameraCapture`, `Cosmic3DScene`).
*   `src/config`: Global configuration settings, including AI prompts and localized resources.
*   `scripts`: Node.js utility scripts for data extraction and task automation.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
