# AI Color Catalog 🎨

**AI Color Catalog** is a web-based solution for interior designers, blending artificial intelligence with curated design standards. This project generates aesthetic color palettes and room inspirations based on textual descriptions.

## ✨ Key Features
* **Dual Palette Engine:** * **AI Mode:** Direct integration with **Google Gemini API** for dynamic palette generation.
* **Curated Mode:** A built-in catalog of professional color schemes for continuous use (API limit friendly).
* **Designer-Centric UI:** Tailored interface for visualizing room concepts and color harmonies.
* **Instant Export:** Easily grab hex codes and palette metadata for interior projects.

## 🛠 Project Status & Implementation Note
The core logic is complete. To ensure a seamless user experience and bypass API rate limits, the application features a **hybrid data model**:
1. It attempts to fetch a unique palette via the **Gemini API**.
2. If the API quota is reached, the system intelligently falls back to a high-quality, **pre-defined static color catalog** to ensure the designer's workflow is never interrupted.

## 🚀 Tech Stack
* **Frontend:** React.js
* **AI Engine:** Google Gemini API
* **Data Management:** Static JSON Catalog & API Fetching Logic
* **Styling:** CSS3 / Modern UI Principles

## 📌 How to Run
1. Clone the repository: `git clone https://github.com/your-username/ai-color-catalog.git`
2. Install dependencies: `npm install`
3. Add your Gemini API Key in the `.env` file.
4. Run the app: `npm start`

---
*Developed by a Software Engineering student at Ankara University, focusing on AI-driven creative tools.*
