import React, { useState } from "react";
import "./LoginPage.css";
import { FaArrowLeft } from "react-icons/fa";

export default function LoginPage({ role, onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLoginClick = () => {
    if ( username == "visva" && password == "admin123") {
      onLogin();
    } else {
      alert("Invalid username or password for Admin!");
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
        <h1 className="login-title">Admin Login</h1>

        <input
          type="text"
          placeholder="Type 'visva'"
          className="login-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{backgroundColor:'black'}}
        />
        <input
          type="password"
          placeholder="Type'admin123'"
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