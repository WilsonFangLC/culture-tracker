# Lab Passage Tracker

A minimal viable lab-passage tracker for researchers to record and track cell culture passages.

## Quick Start

1. Install dependencies:

   ```bash
   # Install pre-commit hooks
   pre-commit install

   # Install Python dependencies
   cd api
   pip install -r requirements.txt

   # Install Node.js dependencies
   cd ../ui
   npm install
   ```

2. Start development servers:

   ```bash
   # From project root
   docker compose up
   ```

3. Access the application:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend: [http://localhost:8000](http://localhost:8000)

## Development

- Backend: FastAPI + SQLModel + SQLite
- Frontend: React + Vite + TypeScript + Tailwind CSS
- State Management: React Query
- Authentication: FastAPI-Users (JWT in http-only cookie)

## Project Structure

- **`api/`**: Contains the backend FastAPI application.
    - `app/`: Core application code.
        - `routers/`: API endpoint definitions.
    - `tests/`: Backend tests.
    - `venv/`: Python virtual environment (usually excluded from version control).
    - `requirements.txt`: Python dependencies.
- **`ui/`**: Contains the frontend React application (built with Vite).
    - `src/`: Frontend source code.
        - `components/`: Reusable React components.
        - `pages/`: Top-level page components.
        - `utils/`: Utility functions, including API interaction logic.
    - `dist/`: Production build output (usually excluded from version control).
    - `index.html`: Main HTML entry point for the frontend.
    - `package.json`: Node.js dependencies and scripts.
- **`src/`**: Seems to be an older or potentially unused source directory. Needs review. (If you know what this is for, please let me know, and I can update the description!)
- **`app.db`**: SQLite database file used in development.
- **`docker-compose.yml`**: Defines services for local development (API, UI).
- **`README.md`**: This file - project overview, setup, and documentation.

## Next Steps

1. **Database Upgrade**
   - Migrate from SQLite to PostgreSQL for production
   - Implement database migrations
   - Add connection pooling

2. **Progressive Web App**
   - Add service worker for offline support
   - Implement app manifest
   - Add push notifications for important updates

3. **Desktop Integration**
   - Create Electron wrapper
   - Add system tray integration
   - Implement local file system access

4. **Enhanced Features**
   - Add data export functionality
   - Implement advanced filtering and search
   - Add data visualization charts
   - Support for multiple lab locations 