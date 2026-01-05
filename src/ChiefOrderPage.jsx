import React, { useState, useEffect } from "react";
import "./ChiefOrderPage.css";
import axios from "axios";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function ChiefOrderPage({ onLogout }) {
  const [orders, setOrders] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/orders/today');
        // Ensure res.data is an array
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setOrders([]);
      }
    };
    fetchOrders();

    socket.on('new-order', fetchOrders);
    socket.on('resolve-order', fetchOrders);

    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
      fetchOrders();
    }, 5000);
    return () => {
      clearInterval(interval);
      socket.off('new-order', fetchOrders);
      socket.off('resolve-order', fetchOrders);
    };
  }, []);

  return (
    <div className="chief-order-container">
      <header className="chief-header">
        <h1>🍽 Chief Orders - {currentTime}</h1>
        <div className="chief-header-buttons">
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>
      <table className="orders-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Floor</th>
            <th>Table</th>
            <th>Items (Qty)</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(orders) && orders.length > 0 ? (
            orders.map((o, i) => (
              <tr key={i}>
                <td>{o.type}</td>
                <td>{o.floor || 'N/A'}</td>
                <td>{o.table_id || 'N/A'}</td>
                <td>{JSON.parse(o.items).map(item => `${item.name} (${item.qty})`).join(', ')}</td>
                <td>{o.time}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No orders available</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}