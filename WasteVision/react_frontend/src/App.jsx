import React, { useState } from 'react';
import StartPage from './pages/StartPage';
import { Routes, Route, useNavigate } from "react-router-dom";
import './App.css';

export default function App() {

  return (
    <div className="app-container">
          <div className="content">
            <Routes>
              <Route path="/" element={<StartPage />} />
            
            </Routes>
          </div>
    </div>
        
  );
}
