import React from "react";
import "./LandingPage.css";
import logoImg from "./Logo 1.png";

export default function LandingPage({ onDineIn, onTakeAway }) {
  return (
    <div className="landing-container">
      {/* Left Side - Logo */}
      <div className="landing-left">
        <div className="logo-box">
          <img src={logoImg} alt="Black Spicy Logo" className="logo-img" />
          <p className="logo-subtitle">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <p className="company-text">Hot. Crispy. Delicious.</p>
      </div>

      {/* Right Side - Welcome */}
      <div className="landing-right">
        <div className="welcome-box">
          <h2>WELCOME</h2>
          <p>Please choose your Order type</p>
          <div className="button-group">
            <button className="btn dine-in" onClick={onDineIn}>
              Dine-in
            </button>
            <button className="btn takeaway" onClick={onTakeAway}>
              Takeaway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}