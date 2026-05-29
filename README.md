# PictureCull 📸

An AI-powered, high-performance desktop photo culling application for Windows. **PictureCull** is designed for photographers to quickly filter, analyze, and cull large volumes of images locally on their machine without any cloud APIs, ensuring absolute privacy and speed.

---

## ✨ Features

- **Local AI Analysis Engine**: 
  - **Blur Detection**: Calculates sharpness using Laplacian variance analysis.
  - **Exposure Profiling**: Analyzes image histograms to flag under-exposed or over-exposed images.
  - **Duplicate Detection**: Identifies near-duplicate images using a perceptual difference hashing (`dHash`) algorithm.
- **Fast Local Caching**: Powered by `sql.js` (WebAssembly SQLite) for fast retrieval of metadata and culling states.
- **Privacy First**: 100% offline analysis. No images or metadata ever leave your computer.
- **High-Performance Image Loading**: Leverages `sharp` for fast generation and loading of image thumbnails.
- **Keyboard-Driven Workflow**: Fast navigation, rating, and culling using optimized keyboard shortcuts.
- **Dual UI Views**: Toggle between a high-fidelity **Grid View** and a detailed **Loupe/Compare View**.

---

## 🛠️ Technology Stack

- **Framework**: [Electron](https://www.electronjs.org/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tooling**: [electron-vite](https://electron-vite.org/)
- **Database**: [sql.js](https://sql.js.org/) (SQLite compiled to WebAssembly)
- **Image Processing**: [sharp](https://sharp.pixelplumbing.com/) + [ExifReader](https://github.com/mattiasw/ExifReader)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Bundler/Packager**: [electron-builder](https://www.electron.build/)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- **Windows Developer Mode** enabled (highly recommended to compile and package dependencies seamlessly).
  - *To enable:* Go to **Settings** > **System** > **For developers** > Toggle **Developer Mode** to **On**.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/amrgunaweera/picture-culling.git
   cd "picture culling"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running in Development Mode

Launch the app with hot reloading for both the main Electron process and the React renderer:
```bash
npm run dev
```

---

## 📦 Packaging Standalone Executable

To bundle the application into a standalone Windows installer (`.exe`):

1. Make sure Developer Mode is enabled or run your terminal as an Administrator.
2. Run the package command:
   ```bash
   npm run package
   ```
3. Once completed, you will find your installer in the newly created `dist/` directory:
   - **Installer:** `dist/PictureCull Setup 1.0.0.exe`
   - **Portable Version (Unpacked):** `dist/win-unpacked/PictureCull.exe`

---

## 🎹 Keyboard Shortcuts

Designed for high-speed, mouse-free culling:

| Key | Action |
| --- | --- |
| `Left Arrow` / `A` | Move to previous image |
| `Right Arrow` / `D` | Move to next image |
| `1` - `5` | Set rating (1 to 5 stars) |
| `0` | Clear rating |
| `P` | Pick / Flag image |
| `X` | Reject / Mark for deletion |
| `U` | Unflag image |
| `Space` | Toggle Zoom / Loupe View |
| `Delete` | Move rejected images to trash / recycle bin |

---

## 📄 License

This project is licensed under the ISC License. See the [package.json](package.json) file for details.
