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