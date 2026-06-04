# Cullexa Picture Organizer — Release Notes & Feature Guide

Welcome to **Cullexa Picture Organizer**, a premium, AI-powered photo culling and organization desktop application designed from the ground up for professional and enthusiast photographers.

---

## Core Features & Capabilities

### 1. 🤖 AI-Powered Photo Analysis
Cullexa leverages local machine learning and image processing algorithms (using TensorFlow.js, BlazeFace, and Sharp) to automatically evaluate and score your photos:
* **Sharpness (Blur Score):** Analyzes the focus and edge sharpness of each image to detect micro-blur and out-of-focus shots.
* **Exposure Score:** Evaluates highlight clipping and shadow detail to flag overexposed or underexposed photos.
* **Aesthetic Score:** Performs compositional analysis to score the overall visual quality of the image.
* **Composite Score:** Combines all metrics into an overall AI percentage badge to help you spot your best photos instantly.
* **Face Detection:** Automatically counts and highlights human faces detected in each photo (powered by BlazeFace).

### 2. 👥 Automatic Duplicate Grouping
Never waste time comparing identical burst shots manually:
* Scans for similar/identical photos during the AI analysis phase.
* Groups duplicates automatically and displays them in a dedicated **Duplicates View**.
* Automatically detects and highlights the **"Best Quality"** photo in each group based on its AI composite score.
* Provides a quick transition to **Compare Mode** for selecting which duplicates to keep and which to discard.

### 3. 🖥️ Four Specialized View Modes
Optimize your workflow by switching between distinct, high-performance view modes:
* **Grid View (G):** A fast thumbnail grid displaying all photos with AI badges, quick selection checkboxes, and drag-and-drop support. Configurable thumbnail sizes:
  * *Small:* Fit more items on screen for high-level sorting.
  * *Medium:* Balanced overview.
  * *Large:* Detailed preview.
* **Loupe View (E / Enter):** Fullscreen preview mode supporting up to 500% zoom and mouse panning. Features a scrollable/draggable filmstrip that synchronizes with the active image.
* **Compare Mode (C):** Side-by-side inspection of up to 4 selected photos to compare fine details (e.g., focus, facial expressions) side-by-side.
* **Duplicates Mode:** Dedicated dashboard showing duplicate photo clusters with quality rankings.

### 4. 🏷️ Culling & Flagging System
Organize and filter your photos using a standard, professional metadata system:
* **Flagging:** Mark photos as **Pick** (green badge/check) or **Reject** (red badge/cross).
* **Star Ratings:** Rate photos on a scale of **1 to 5 stars** (yellow glowing stars).
* **Color Labels:** Categorize images using five color labels (Red, Yellow, Green, Blue, Purple).
* **Filter Bar:** Instantly filter photos by Picks, Rejects, Unflagged, Minimum Star Rating, Duplicates Only, and Color Labels.
* **Trash & Culling:** Move all **Rejected** photos to the Windows Recycle Bin with one click, freeing up local disk space safely.

### 5. 📁 Session & File Management
* Scans and indexes directories without altering your original files.
* Supports **JPEG, PNG, TIFF, WebP, and RAW** image formats.
* Recent Sessions dashboard caches previous folders, photo counts, and paths for rapid switching.
* Extracts camera model, lens specifications, focal length, aperture, shutter speed, and ISO info automatically.

### 6. ⚡ Professional Keyboard Shortcuts
Accelerate your culling workflow with single-key shortcuts:
* **P:** Mark as Pick (Toggle)
* **X / Delete:** Mark as Reject (Toggle)
* **U:** Clear Flags
* **1 - 5:** Apply Star Rating (1 to 5)
* **0:** Clear Star Rating
* **Space:** Toggle Pick Flag
* **G:** Switch to Grid View
* **E / Enter:** Switch to Loupe View (on selected image)
* **C:** Toggle Compare View
* **Left / Right Arrows:** Navigate through the filmstrip
* **Escape:** Back to Grid View / Clear Selection

---

## Technical Specifications & UI Design
* **Engine:** Built with **Electron**, **React**, and **TypeScript** for native desktop performance on Windows.
* **Database:** Powered by **SQL.js** / SQLite for fast local queries and session state persistence.
* **UI styling:** Styled with a modern, tailor-made HSL-tailored Dark Theme using pure CSS custom variables (no Tailwind overhead).
* **Icons:** Powered by pixel-perfect, modern `@tabler/icons-react` SVG icon components.
