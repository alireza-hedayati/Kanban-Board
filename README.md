# 📋 Kanban Flow - Board & Team Task Manager

A lightweight, modern, responsive **Kanban Board and Team Task Manager** application built with pure Vanilla JavaScript, semantic HTML5, and CSS3. Features full drag-and-drop support, collapsible sidebar navigation, user and team management, task assignment, modal dialogs for CRUD operations, and persistent state management using browser `localStorage`. Zero external dependencies or frameworks required.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## ✨ Features

- 📑 **Collapsible Sidebar & Navigation**:
  - Left-hand collapsible navigation sidebar with two views: **Tasks** board and **Users** directory.
  - Smooth desktop collapse/expand toggle (240px to 68px) with persistent preference memory.
  - Off-canvas mobile drawer with animated hamburger toggle and backdrop dismiss.
  - Real-time counter badges for both tasks and users.
- 👥 **User & Team Management**:
  - **Create**: Add team members with their full name and technical stack / role.
  - **Read**: Dedicated Users page with responsive user cards, colored initials avatars, and active assigned tasks count.
  - **Update**: Edit user names and stacks dynamically.
  - **Delete**: Safe removal with confirmation modal; automatically unassigns tasks belonging to deleted members without orphaned data.
- 👤 **Task Assignment**:
  - Assign any task to a team member directly from the Create and Edit Task modals.
  - Dynamic assignee dropdown reflecting the live users list.
  - Task cards display stylized assignee pills with initials, colors, and full name/stack tooltips.
- 🎯 **Full Task CRUD**:
  - **Create**: Add new tasks with title, rich description, assignee, and column status.
  - **Read**: Live rendering across three structured workflows (**To Do**, **In Progress**, **Done**).
  - **Update**: Edit task details, title, assignee, and status dynamically.
  - **Delete**: Safe task deletion with custom confirmation modal.
- 🖐️ **Native Drag & Drop**:
  - Reorder tasks within the same column or move smoothly across different columns.
  - Visual insertion placeholder and active drop indicators.
- 💾 **Persistent State**:
  - Uses `localStorage` to save tasks, users, assignee relations, and sidebar state automatically across sessions.
  - Pre-loaded with seed data on first launch.
- 🌙 **Dark & Light Mode Support**:
  - Seamless toggle with persistent user preference in `localStorage`.
  - Automatic detection and synchronization with system OS preferences (`prefers-color-scheme`).
  - Specially calibrated dark theme tokens with soft elevations and contrast ratios.

---

## 🏗️ Architecture Overview

The JavaScript codebase follows clean modular separation of concerns without framework overhead:

```text
Kanban/
├── index.html       # Semantic HTML layout (Header, Collapsible Sidebar, Pages, Modals)
├── style.css        # Pure CSS design system with CSS custom properties & responsive layout
├── app.js           # Modular JS architecture (Storage, State, Renderer, Navigation, Sidebar, Modals)
├── .gitignore       # System and editor ignore rules
└── README.md        # Project documentation
```

### Module Breakdown (`app.js`):
1. **`StorageService`**: Handles serialization, reading, and persisting tasks, users, and sidebar preferences in `localStorage`.
2. **`StateManager`**: Single source of truth managing tasks and users in memory, relational assignment integrity, and state subscriptions.
3. **`DOMRenderer`**: Responsible for DOM generation, XSS-safe text injection, user card rendering, assignee badges, empty states, and counter badges.
4. **`NavigationController`**: Manages view switching between Tasks and Users pages with URL hash synchronization.
5. **`SidebarController`**: Controls sidebar collapse/expand animations on desktop and mobile drawer toggles.
6. **`DragDropController`**: Manages native HTML5 drag-and-drop lifecycle (`dragstart`, `dragover`, `drop`, `dragend`).
7. **`ModalController`**: Manages task and user modal dialogs, validation, focus trapping, and keyboard shortcuts.
8. **`ThemeManager`**: Handles dark/light theme switching, system preference detection, and persistence.
9. **`App`**: Bootstraps the application and hooks up all controller events on `DOMContentLoaded`.

---

## 🚀 Getting Started

No build tools, bundlers, or package installations are required!

### Option 1: Direct in Browser
Double-click or open [index.html](file:///D:/FrontEnd/Kanban/index.html) in your browser (Chrome, Edge, Firefox, Safari).

### Option 2: Live Server (VS Code)
1. Open the project folder in VS Code.
2. Right click `index.html` and select **"Open with Live Server"**.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
