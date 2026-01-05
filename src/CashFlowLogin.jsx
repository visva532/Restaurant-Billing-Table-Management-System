import React, { useState } from "react";
import "./CashFlowLogin.css"; // Assume same as LoginPage.css
import { FaArrowLeft } from "react-icons/fa";

export default function CashFlowLogin({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLoginClick = () => {
    if (username === "blackspicy4321" && password === "4321") {
      onLogin();
    } else {
      alert("Invalid username or password!");
    }
  };

  return (
    <div >
          {/* Back Button */}
          <button className="back-button" style={{ position: "absolute", zIndex: 10 }} onClick={onBack}>
            <FaArrowLeft /> Back
          </button>
    
          {/* Login Card */}
          <div className="login-card" style={{ display: "block", margin: "0 auto", textAlign: "center" }}>
            <h1 className="login-title">Cashflow Login</h1>
    
            <input
              type="text"
              placeholder="Type 'blackspicy4321'"
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{backgroundColor:'black'}}
            />
            <input
              type="password"
              placeholder="Type'4321'"
              className="login-input"
              value={password}
              style={{backgroundColor:'black'}}
              onChange={(e) => setPassword(e.target.value)}
            />
    
            <button className="login-btn" onClick={handleLoginClick}>
              Login
            </button>
          </div>
        </div>
      );
    }