import React, { useState, useEffect } from "react";
import "./CashFlowPage.css";
import axios from "axios";

export default function CashFlowPage({ onSignOut, onBack }) {
  const [cashflow, setCashflow] = useState({});

  useEffect(() => {
    const fetchCashflow = async () => {
      const res = await axios.get('http://localhost:5000/api/cashflow');
      setCashflow(res.data);
    };
    fetchCashflow();
  }, []);

  return (
    <div className="cashflow-page">
      <header className="cashflow-header">
        <h1>Cash Flow</h1>
        <button className="logout-btn" onClick={onSignOut}>Sign Out</button>
      </header>

      <button onClick={onBack}>Back to Table Management</button>

      <table className="cashflow-table">
        <thead>
          <tr>
            <th>Today Income</th>
            <th>Orders Count</th>
            <th>Dine-In Amount</th>
            <th>Takeaway Amount</th>
            <th>Monthly Income</th>
            <th>Yesterday Income</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>₹{cashflow.todayIncome}</td>
            <td>{cashflow.ordersCount}</td>
            <td>₹{cashflow.dineInAmount}</td>
            <td>₹{cashflow.takeawayAmount}</td>
            <td>₹{cashflow.monthlyIncome}</td>
            <td>₹{cashflow.yesterdayIncome}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}