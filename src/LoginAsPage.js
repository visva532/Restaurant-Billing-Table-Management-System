import React from "react";
import "./LoginAsPage.css";
import logo from "./Logo 1.png"; 

export default function LoginAsPage({ onSelectRole }) {
  return (
    <div className="loginas-container">
      <div className="loginas-box fade-in">
        {/* Logo with glow effect */}
        <div className="logo-wrapper">
          <div className="logo-glow"></div>
          <img
            src={logo}
            alt="Black Spicy Logo"
            className="restaurant-logo"
          />
        </div>

        <h1 className="loginas-title">BLACK SPICY</h1>
        

        {/* Admin Button */}
        <button
          className="loginas-btn admin-btn"
          onClick={() => onSelectRole("admin")}
        >
          Start
        </button>

        {/* Chief Button */}
        
        
      </div>
    </div>
  );
}