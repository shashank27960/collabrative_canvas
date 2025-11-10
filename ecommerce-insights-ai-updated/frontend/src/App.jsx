
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Shipments from './pages/Shipments';
import Models from './pages/Models';
import Settings from './pages/Settings';

export default function App(){
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <h1>E-commerce Insights AI</h1>
          <div className="new-chat-btn">+ New Chat</div>
        </header>
        <main className="page-area">
          <Routes>
            <Route path="/" element={<Dashboard/>} />
            <Route path="/analytics" element={<Analytics/>} />
            <Route path="/shipments" element={<Shipments/>} />
            <Route path="/models" element={<Models/>} />
            <Route path="/settings" element={<Settings/>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
