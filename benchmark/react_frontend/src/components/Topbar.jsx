import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Topbar.css";

const Topbar = ({ navigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  
  return (
    <>
      {/* Header per Mobile */}
      <header className="header mobile">
        <div className="top-bar">
        <Link className="link" to="/" >
            <h1 className="logo">Waste food</h1>
        </Link>
          
        </div>
      </header>

      {/* Header per PC */}
      <header className="header pc">        
        <div className="top-bar">
          <Link className="link" to="/">
            <h1 className="logo">Waste food</h1>
          </Link>
        </div>
      </header>

      
    </>
  );
};

export default Topbar;