# NarumateAI

NarumateAI is a modern AI-powered web application for content creation, narration, and emotional well-being. It features chat-based AI assistance, mood tracking, and a beautiful, production-ready UI built with React, Tailwind CSS, and Supabase.

## Features

- **AI Chat Assistant:**  
  Engage with an AI assistant for storytelling, narration, script writing, and emotional support. Powered by Hugging Face models. 

- **Mood Tracking:**  
  Log your daily moods, intensities, triggers, and notes. Visualize mood trends and statistics in a dashboard.

- **Conversation Management:**  
  Organize your chats into conversations, rename or delete them, and view message history.

- **Supabase Integration:**  
  All conversations and mood data are saved to Supabase. If not connected, the app runs in local mode (data not saved).

- **Responsive UI:**  
  Beautiful, mobile-friendly design using Tailwind CSS and Lucide React icons.

## Project Structure

```
project/
  ├── .env                  # Environment variables (Supabase keys)
  ├── src/
  │   ├── App.tsx
  │   ├── main.tsx
  │   ├── index.css
  │   ├── components/
  │   │   ├── ChatInterface.tsx
  │   │   ├── ConversationSidebar.tsx
  │   │   ├── MoodDashboard.tsx
  │   │   └── MoodSelector.tsx
  │   └── lib/
  │       ├── huggingface.ts
  │       ├── moodService.ts
  │       └── supabase.ts
  ├── supabase/
  │   └── migrations/       # Database schema migrations
  ├── index.html
  ├── package.json
  ├── tailwind.config.js
  ├── postcss.config.js
  ├── tsconfig*.json
  └── vite.config.ts
```

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 2. Installation

Clone the repository and install dependencies:

```sh
git clone <your-repo-url>
cd project
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory with your Supabase credentials:

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
# Optional: Hugging Face API Key for higher rate limits
# VITE_HUGGINGFACE_API_KEY=your-huggingface-api-key
```

### 4. Running the App

Start the development server:

```sh
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Building for Production

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Database

Supabase is used for storing conversations, messages, and mood entries.  
Database schemas are defined in [`supabase/migrations/`](supabase/migrations/).

- Conversations and messages: see [`20250629114541_maroon_hill.sql`](supabase/migrations/20250629114541_maroon_hill.sql)
- Mood tracking: see [`20250629115435_warm_lake.sql`](supabase/migrations/20250629115435_warm_lake.sql)

## Customization

- **AI Models:**  
  You can select different Hugging Face models in the AI settings modal.
- **Mood Types & Triggers:**  
  Edit [`MOOD_TYPES`](src/lib/moodService.ts) and [`COMMON_TRIGGERS`](src/lib/moodService.ts) to customize moods and triggers.

## License

This project is for educational and demonstration purposes.

---

**Made with React, Tailwind CSS, Supabase, and Hugging Face.**