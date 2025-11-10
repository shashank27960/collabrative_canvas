
# E-commerce Insights AI - Updated (Router + Improved UI)

This updated ZIP adds:
- React Router for real navigation (Dashboard, Analytics, Shipments, Models, Settings)
- Improved modern UI (light theme) matching the screenshot style
- Working sidebar buttons and active states
- FastAPI backend (mock metrics and chat)

Run:
1. Start backend:
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app:app --reload --port 8000

2. Start frontend:
   cd frontend
   npm install
   npm run dev

Notes:
- Chat uses mock rule-based responses; replace backend /api/chat to integrate an LLM.
- To create a production build, run `npm run build` and serve the static files behind Nginx or any static host.
