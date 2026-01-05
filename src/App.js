import React, { useState } from "react";
import LoginAsPage from "./LoginAsPage";
import LoginPage from "./LoginPage";
import ChiefLoginPage from "./ChiefLoginPage";
import ChiefOrderPage from "./ChiefOrderPage";
import LandingPage from "./LandingPage";
import TableManagement from "./TableManagement";
import ProductSelection from "./ProductSelection";
import CashFlowLogin from "./CashFlowLogin";
import CashFlowPage from "./CashFlowPage";

import "./TableManagement.css";
import "./ProductSelection.css";
import "./LoginAsPage.css";
import "./LoginPage.css";
import "./ChiefOrderPage.css";
import "./CashFlowPage.css";

export default function App() {
  const [page, setPage] = useState("loginas");
  const [selectedTable, setSelectedTable] = useState(null);
  const [role, setRole] = useState(null);
  const [orderType, setOrderType] = useState(null); // dine-in or takeaway

  const renderPage = () => {
    switch (page) {
      case "loginas":
        return (
          <LoginAsPage
            onSelectRole={(r) => {
              setRole(r);
              if (r === "chief") {
                setPage("chieflogin");
              } else if (r === "cashflow") {
                setPage("cashflowlogin");
              } else {
                setPage("login");
              }
            }}
          />
        );

      case "login":
        return (
          <LoginPage
            role={role}
            onLogin={() => {
              if (role === "admin") setPage("landing");
              else alert("Invalid role for this login path!");
            }}
            onBack={() => setPage("loginas")}
          />
        );

      case "chieflogin":
        return (
          <ChiefLoginPage
            onLogin={() => {
              if (role === "chief") setPage("chieforders");
              else alert("Invalid role for Chief login!");
            }}
            onBack={() => setPage("loginas")}
          />
        );

      case "chieforders":
        return role === "chief" ? (
          <ChiefOrderPage
            onLogout={() => {
              setRole(null);
              setPage("loginas");
            }}
          />
        ) : (
          <div>Unauthorized access</div>
        );

      case "landing":
        return role === "admin" ? (
          <LandingPage
            onDineIn={() => {
              setOrderType("dine-in");
              setPage("tables");
            }}
            onTakeAway={() => {
              setOrderType("takeaway");
              setPage("products");
            }}
          />
        ) : (
          <div>Unauthorized access</div>
        );

      case "tables":
        return role === "admin" ? (
          <TableManagement
            onBack={() => setPage("landing")}
            onSignOut={() => setPage("loginas")}
            onTakeOrder={(tableNo) => {
              setSelectedTable(tableNo);
              setPage("products");
            }}
            onCashFlow={() => setPage("cashflowlogin")}
            role={role}
          />
        ) : (
          <div>Unauthorized access</div>
        );

      case "products":
        return role === "admin" ? (
          <ProductSelection
            tableNo={selectedTable}
            orderType={orderType}
            onBack={() =>
              orderType === "takeaway" ? setPage("landing") : setPage("tables")
            }
            onEndSession={() => setPage("loginas")}
            onGoMainMenu={() => setPage("tables")}
          />
        ) : (
          <div>Unauthorized access</div>
        );

      case "cashflowlogin":
        return role === "admin" ? (
          <CashFlowLogin
            onLogin={() => setPage("cashflow")}
            onBack={() => setPage("tables")}
          />
        ) : (
          <div>Unauthorized access</div>
        );

      case "cashflow":
        return role === "admin" ? (
          <CashFlowPage
            onSignOut={() => setPage("loginas")}
            onBack={() => setPage("tables")}
          />
        ) : (
          <div>Unauthorized access</div>
        );

      default:
        return <div style={{ color: "red", padding: 20 }}>Page not found</div>;
    }
  };

  return <div className="app-container">{renderPage()}</div>;
}