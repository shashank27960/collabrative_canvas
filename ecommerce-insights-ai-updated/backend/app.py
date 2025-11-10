
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import random, time

app = FastAPI(title="E-commerce Insights AI - Backend (FastAPI)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock KPI data
@app.get("/api/metrics")
def metrics():
    data = {
        "total_products": 200,
        "total_orders": 1000,
        "customers": 500,
        "reviews": 355,
        "top_categories": [
            {"name": "Sports", "items_sold": 27, "sales_value": 7828.06},
            {"name": "Books", "items_sold": 26, "sales_value": 6025.86},
            {"name": "Fashion", "items_sold": 24, "sales_value": 5736.84}
        ]
    }
    return data

class ChatRequest(BaseModel):
    message: str
    session_id: str = None

# Very small rule-based / mock "AI" for chat demonstration.
@app.post("/api/chat")
def chat(req: ChatRequest):
    msg = req.message.lower()
    # simple canned responses
    if "top selling" in msg or "top-selling" in msg or "top selling product" in msg:
        resp = {
            "answer": "Top selling categories are Sports, Books, and Fashion. Sports leads with highest sales value.",
            "source": "mock"
        }
    elif "co2" in msg or "co₂" in msg or "carbon" in msg:
        resp = {
            "answer": "Estimated CO2 footprint: 12.4 tons for last month (mock estimate). Consider route consolidation to reduce emissions.",
            "source": "mock"
        }
    elif "predict" in msg or "delay" in msg or "eta" in msg:
        resp = {
            "answer": "Model predicts 8% probability of delay for shipments in the next 48 hours in region APAC (mock).",
            "source": "mock"
        }
    else:
        # fallback: return a short analytic style reply
        resp = {
            "answer": "I analyzed the available data and found that Sports category shows a high average order value and consistent demand. Ask me about CO2, top-selling categories, or predict delays.",
            "source": "mock"
        }
    # add small simulated latency
    time.sleep(random.uniform(0.1, 0.6))
    return resp

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
