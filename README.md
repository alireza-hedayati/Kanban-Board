# 📋 Kanban Board - Task Management Application

A lightweight, modern, responsive **Kanban Board** application built with pure Vanilla JavaScript, semantic HTML5, and CSS3. Features full drag-and-drop support, modal dialogs for CRUD operations, and persistent state management using browser `localStorage`. Zero external dependencies or frameworks required.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## ✨ Features

- 🎯 **Full Task CRUD**:
  - **Create**: Add new tasks with title, rich description, and column status.
  - **Read**: Live rendering across three structured workflows (**To Do**, **In Progress**, **Done**).
  - **Update**: Edit task details, title, and assigned status dynamically.
  - **Delete**: Safe task deletion with custom confirmation modal.
- 🖐️ **Native Drag & Drop**:
  - Reorder tasks within the same column or move smoothly across different columns.
  - Visual insertion placeholder and active drop indicators.
- 💾 **Persistent State**:
  - Uses `localStorage` to save tasks, order, and status automatically across sessions.
  - Pre-loaded with initial seed tasks on first launch.
- 🔢 **Dynamic Counters & Empty States**:
  - Real-time task count badges for every column.
  - Contextual empty state placeholders when columns have no tasks.
- 🎨 **Modern & Accessible UI**:
  - CSS custom properties (variables) for coherent theming.
  - Smooth transitions, card elevations, and hover states.
  - Accessible modal dialogs with keyboard support (`Escape` to close).
  - Responsive design adapting cleanly from mobile screens to ultrawide desktops.

---

## 🏗️ Architecture Overview

The JavaScript codebase follows clean modular separation of concerns without framework overhead:

```text
Kanban/
├── index.html       # Semantic HTML layout (Header, Board, Modals)
├── style.css        # Clean CSS with custom design system variables & responsive layout
├── app.js           # Modular JS logic (Storage, State, Renderer, DragDrop, Modals)
├── .gitignore       # System and editor ignore rules
└── README.md        # Documentation
```

### Module Breakdown (`app.js`):
1. **`StorageService`**: Handles serialization, reading, and persisting task data in `localStorage`.
2. **`StateManager`**: Single source of truth managing tasks in memory and broadcasting state mutations.
3. **`DOMRenderer`**: Responsible for DOM generation, XSS-safe text injection, empty states, and badge count updates.
4. **`DragDropController`**: Manages native HTML5 drag-and-drop lifecycle (`dragstart`, `dragover`, `drop`, `dragend`).
5. **`ModalController`**: Manages modal visibility, form validations, accessibility focus, and keyboard shortcuts.
6. **`App`**: Bootstraps the application and hooks up all controller events on `DOMContentLoaded`.

---

## 🚀 Getting Started

No build tools, bundlers, or package installations are required!

### Option 1: Direct in Browser
1. Clone or download the repository:
   ```bash
   git clone https://github.com/alireza-hedayati/Kanban-Board.git
   ```
2. Navigate into the directory:
   ```bash
   cd Kanban-Board
   ```
3. Open `index.html` in your favorite web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Live Server (VS Code)
1. Open the project folder in VS Code.
2. Right click `index.html` and select **"Open with Live Server"**.

---

## 🛠️ Built With

- **HTML5**: Semantic tags (`<main>`, `<section>`, `<header>`, `<dialog>`/aria roles).
- **CSS3**: Flexbox, CSS Grid, Custom Properties (Variables), Keyframe animations.
- **JavaScript (ES6+)**: Event delegation, HTML5 Drag and Drop API, LocalStorage API, IIFE module encapsulation.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
