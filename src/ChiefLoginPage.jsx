import React, { useState } from "react";
import "./ChiefLoginPage.css";

export default function ChiefLoginPage({ onLogin, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLoginClick = () => {
    if (username === "chief1" && password === "1234") {
      onLogin();
    } else {
      alert("Invalid username or password for Chief!");
    }
  };

  return (
    <div className="chief-login-container">
      <h1>Chief Login</h1>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLoginClick}>Login</button>
      <button onClick={onBack}>Back</button>
    </div>
  );
}