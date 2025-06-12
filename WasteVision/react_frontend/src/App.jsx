import React, { useState } from 'react';
import InfoPage from './pages/InfoPage';
import { Routes, Route, useNavigate } from "react-router-dom";
import './App.css';

export default function App() {

  return (
    <div className="app-container">
          <div className="content">
            <Routes>
              <Route path="/" element={<InfoPage />} />
            
            </Routes>
          </div>
    </div>
        
  );
}
