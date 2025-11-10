
import React, {useEffect, useState} from 'react';
import KPI from '../components/KPI';
import Chat from '../components/Chat';
import axios from 'axios';

export default function Dashboard(){
  const [metrics, setMetrics] = useState(null);
  useEffect(()=>{ fetchMetrics() },[]);
  async function fetchMetrics(){
    try{ const res = await axios.get('http://localhost:8000/api/metrics'); setMetrics(res.data); }
    catch(e){ console.error(e) }
  }
  return (
    <div className="dashboard-grid">
      <section className="kpis">
        <KPI title="Total Products" value={metrics?.total_products ?? '...'} />
        <KPI title="Total Orders" value={metrics?.total_orders ?? '...'} />
        <KPI title="Customers" value={metrics?.customers ?? '...'} />
        <KPI title="Reviews" value={metrics?.reviews ?? '...'} />
      </section>

      <section className="content">
        <div className="left-col">
          <Chat />
        </div>
        <aside className="right-col">
          <div className="card">
            <h3>Top Categories</h3>
            <ol>
              {metrics?.top_categories?.map((c, idx)=>(
                <li key={idx}>{c.name}: {c.items_sold} items sold — ${c.sales_value}</li>
              ))}
            </ol>
          </div>
          <div className="card">
            <h3>Real-time Analysis</h3>
            <p>Live metrics and streaming insights (mock). Use the Chat to ask questions.</p>
          </div>
        </aside>
      </section>
    </div>
  )
}
