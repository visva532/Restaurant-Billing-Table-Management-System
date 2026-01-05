import React, { useState, useEffect } from "react";
import "./TableManagement.css";
import axios from "axios";
import io from "socket.io-client";
import upiqr from "./upiqr.png";

const socket = io('http://localhost:5000');

export default function TableManagement({ onBack, onSignOut, onTakeOrder, onCashFlow, role }) {
  const [activeFloor, setActiveFloor] = useState(1);
  const [activeTab, setActiveTab] = useState("tables");
  const [tables, setTables] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUPI, setShowUPI] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billDetails, setBillDetails] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tablesRes = await axios.get('http://localhost:5000/api/tables');
        const grouped = tablesRes.data.reduce((acc, t) => {
          acc[t.floor] = acc[t.floor] || [];
          acc[t.floor].push(t);
          return acc;
        }, {});
        setTables(grouped);

        const notifRes = await axios.get('http://localhost:5000/api/notifications');
        setNotifications(notifRes.data || []);

        const ordersRes = await axios.get('http://localhost:5000/api/orders/recent');
        setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      } catch (err) {
        console.error('Fetch error:', err);
        setNotifications([]);
        setOrders([]);
      }
    };
    fetchData();

    socket.on('new-order', fetchData);
    socket.on('resolve-order', fetchData);

    const interval = setInterval(fetchData, 5000);
    return () => {
      clearInterval(interval);
      socket.off('new-order', fetchData);
      socket.off('resolve-order', fetchData);
    };
  }, [activeFloor]);

  const addTable = async () => {
    try {
      await axios.post('http://localhost:5000/api/tables/add', { floor: activeFloor });
      const tablesRes = await axios.get('http://localhost:5000/api/tables');
      const grouped = tablesRes.data.reduce((acc, t) => {
        acc[t.floor] = acc[t.floor] || [];
        acc[t.floor].push(t);
        return acc;
      }, {});
      setTables(grouped);
    } catch (err) {
      console.error('Add table error:', err);
    }
  };

  const removeTable = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/tables/${id}`);
      const tablesRes = await axios.get('http://localhost:5000/api/tables');
      const grouped = tablesRes.data.reduce((acc, t) => {
        acc[t.floor] = acc[t.floor] || [];
        acc[t.floor].push(t);
        return acc;
      }, {});
      setTables(grouped);
    } catch (err) {
      console.error('Remove table error:', err);
    }
  };

  const takeOrder = (number) => {
    onTakeOrder(number);
  };

  const payTable = async (tableId) => {
    try {
      const table = tables[activeFloor].find(t => t.id === tableId);
      if (table && table.order_id) {
        const orderRes = await axios.get(`http://localhost:5000/api/orders/${table.order_id}`);
        const order = orderRes.data;
        if (order && typeof order === 'object') {
          setBillDetails({ ...order, table_id: tableId });
          setShowPaymentModal(true);
        } else {
          console.error('Invalid order data for table:', tableId);
          alert("No valid order found for this table.");
        }
      }
    } catch (err) {
      console.error('Pay table error:', err);
      alert("Error fetching order details.");
    }
  };

  const handleUPI = () => {
    setShowPaymentModal(false);
    setSelectedPaymentMethod('upi');
    setShowUPI(true);
  };

  const handleCash = () => {
    setShowPaymentModal(false);
    setSelectedPaymentMethod('cash');
    setShowBillModal(true);
  };

  const confirmUPI = () => {
    setShowUPI(false);
    setShowBillModal(true);
  };

  const closeBillAndFree = async (tableId, paymentMethod) => {
    try {
      if (billDetails && billDetails.id) {
        const response = await axios.post(`http://localhost:5000/api/orders/pay/${billDetails.id}`, { paymentMethod, tableId });
        console.log('API Response:', response.data);
        if (response.data.success) {
          setShowBillModal(false);
          setShowUPI(false);
          setShowPaymentModal(false);
          setBillDetails(null);
          setSelectedPaymentMethod(null);
          // Refresh tables to reflect the updated status
          const tablesRes = await axios.get('http://localhost:5000/api/tables');
          const grouped = tablesRes.data.reduce((acc, t) => {
            acc[t.floor] = acc[t.floor] || [];
            acc[t.floor].push(t);
            return acc;
          }, {});
          setTables(grouped);
        } else {
          console.error('Payment failed:', response.data.error);
          alert(`Payment failed: ${response.data.error || 'Unknown error'}`);
        }
      } else {
        console.error('Missing billDetails or id:', billDetails);
        alert("Invalid bill details.");
      }
    } catch (err) {
      console.error('Close bill error:', err.response ? err.response.data : err.message);
      alert(`Error processing payment: ${err.response ? err.response.data.error : err.message}. Check console for details.`);
    }
  };

  const copyBill = () => {
    if (billDetails) {
      let items = JSON.parse(billDetails.items || '[]');
      if (!Array.isArray(items)) items = [];
      const text = `BlackSpicy Bill\nFloor: ${billDetails.floor || 'N/A'}\nTable: ${billDetails.table_id || 'N/A'}\nItems:\n${items.map(item => `${item.name} x ${item.qty} - ₹${item.price * item.qty}`).join('\n') || 'No items'}\nTotal: ₹${billDetails.total || 0}\nTime: ${billDetails.time || new Date().toLocaleTimeString()}`;
      navigator.clipboard.writeText(text).then(() => alert("Bill copied!"));
    }
  };

  const totalTables = tables[activeFloor]?.length || 0;
  const emptyTables = tables[activeFloor]?.filter((t) => t.status === "free").length || 0;
  const bookedTables = tables[activeFloor]?.filter((t) => t.status === "booked").length || 0;

  return (
    <div className="table-page">
      <div className="header-bar">
        <button onClick={onBack}
        style={{backgroundColor:'gold',borderRadius:"10px"}}>← Back</button>
        <div className="nav-tabs">
          <button className={activeTab === "tables" ? "active" : ""} onClick={() => setActiveTab("tables")}>Tables</button>
          
          {role === 'admin' && <button onClick={onCashFlow}>Cash Flow</button>}
        </div>
        <div>
          <button onClick={addTable}style={{backgroundColor:'gold',borderRadius:"10px"}}>➕</button>
          <button onClick={onSignOut}style={{backgroundColor:'gold',borderRadius:"10px"}}>Sign Out</button>
        </div>
      </div>

      {activeTab === "tables" && (
        <>
          <div className="floor-buttons">
            <button className={activeFloor === 1 ? "active" : ""} onClick={() => setActiveFloor(1)}>Floor 1</button>
            <button className={activeFloor === 2 ? "active" : ""} onClick={() => setActiveFloor(2)}>Floor 2</button>
          </div>

          <div className="content-section">
            <div className="tables-grid">
              {tables[activeFloor]?.map((table) => (
                <div key={table.id} className={`table-card ${table.status}`}>
                  <div className="table-header">
                    <h3>Table {table.number}</h3>
                    <button onClick={() => removeTable(table.id)}>➖</button>
                  </div>
                  {table.status === "free" && (
                    <button className="take-order-btn" onClick={() => takeOrder(table.number)}>Take Order</button>
                  )}
                  {table.status === "booked" && (
                    <button className="pay-btn" onClick={() => payTable(table.id)}>Pay & Free</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="stats-bar">
            <p>NO OF TABLE: {totalTables}</p>
            
          </div>
        </>
      )}

      {activeTab === "orders" && (
        <div className="orders-tab">
          {orders?.map((order, idx) => (
            <div key={idx} className="order-card">
              <h3>{order.type} - Table {order.table_id || 'N/A'} (Floor {order.floor || 'N/A'})</h3>
              <p>Time: {order.time || new Date().toLocaleTimeString()}</p>
              <p>Amount: ₹{order.total || 0}</p>
              <h4>Items:</h4>
              <ul>
                {Array.isArray(JSON.parse(order.items || '[]')) ? JSON.parse(order.items || '[]').map((item, i) => (
                  <li key={i}>{item.name} x {item.qty}</li>
                )) : <li>Invalid items data</li>}
              </ul>
            </div>
          )) || <p>No orders</p>}
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="notifications-tab">
          <h2>Notifications</h2>
          <div>
            <h3>New Orders</h3>
            {notifications.filter((n) => n.type === "new").map((n, i) => (
              <p key={i}>
                {n.isTakeaway ? 'Takeaway Order' : `Table ${n.table_id || 'N/A'} (Floor ${n.floor || 'N/A'})`} - Items: {Array.isArray(JSON.parse(n.items || '[]')) ? JSON.parse(n.items || '[]').map(item => `${item.name} (${item.qty})`).join(', ') : 'Invalid items'} - ₹{n.total || 0} - {n.time || new Date().toLocaleTimeString()}
                {n.isTakeaway && <button onClick={() => payTable(n.order_id, n)}>Pay & Free</button>}
              </p>
            ))}
          </div>
          <div>
            <h3>Resolved</h3>
            {notifications.filter((n) => n.type === "resolved").map((n, i) => (
              <p key={i}>
                {n.isTakeaway ? 'Takeaway Order' : `Table ${n.table_id || 'N/A'} (Floor ${n.floor || 'N/A'})`} - Items: {Array.isArray(JSON.parse(n.items || '[]')) ? JSON.parse(n.items || '[]').map(item => `${item.name} (${item.qty})`).join(', ') : 'Invalid items'} - ₹{n.total || 0} - {n.time || new Date().toLocaleTimeString()}
              </p>
            ))}
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="payment-modal">
          <div className="payment-content">
            <h2>Payment Methods</h2>
            <button className="payment-button upi-btn" onClick={handleUPI}>UPI</button>
            <button className="payment-button cash-btn" onClick={handleCash}>Cash</button>
          </div>
        </div>
      )}

      {showUPI && (
        <div className="upi-modal">
          <div className="upi-content">
            <h2>UPI Payment</h2>
            <img src={upiqr} alt="UPI QR Code" className="upi-qr" />
            <button className="confirm-btn" onClick={confirmUPI}>Confirm Payment</button>
          </div>
        </div>
      )}

      {showBillModal && billDetails && (
        <div className="bill-modal">
          <div className="bill-content">
            <h2>BlackSpicy Bill</h2>
            <p><strong>Amount of the Order:</strong> ₹{billDetails.total || 0}</p>
            <p><strong>Floor Number:</strong> {billDetails.floor || 'N/A'}</p>
            <p><strong>Table Number:</strong> {billDetails.table_id || 'N/A'}</p>
            <h3>Ordered Items:</h3>
            <ul>
              {Array.isArray(JSON.parse(billDetails.items || '[]')) ? JSON.parse(billDetails.items || '[]').map((item, i) => (
                <li key={i}>{item.name} x {item.qty} - ₹{item.price * item.qty}</li>
              )) : <li>No items</li>}
            </ul>
            <p><strong>Time:</strong> {billDetails.time || new Date().toLocaleTimeString()}</p>
            <button className="bill-action-btn" onClick={copyBill}>Copy Bill</button>
            {selectedPaymentMethod === 'cash' ? (
              <button className="bill-action-btn" onClick={() => closeBillAndFree(billDetails.table_id, 'cash')}>OK & Free (Cash)</button>
            ) : (
              <button className="bill-action-btn" onClick={() => closeBillAndFree(billDetails.table_id, 'upi')}>OK & Free (UPI)</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}