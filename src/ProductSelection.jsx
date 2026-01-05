import React, { useState, useEffect } from "react";
import "./ProductSelection.css";
import axios from "axios";
import io from "socket.io-client";


const socket = io("http://localhost:5000");

export default function ProductSelection({
  tableNo,
  orderType,
  onEndSession,
  onGoMainMenu,
  onBack,
}) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("set");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/menu");
        setProducts(res.data.map((p) => ({ ...p, qty: 1 })));
      } catch (err) {
        console.error("Error fetching products:", err);
        alert("Failed to load products. Check console for details.");
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = (prod) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === prod.id);
      if (existing) {
        return prev.map((item) =>
          item.id === prod.id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, { ...prod, qty: 1 }];
      }
    });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert("Please add at least one item to the cart!");
      return ;
    }

    const items = cart.map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
    }));
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orderData = {
      table_id: orderType === "dine-in" ? (tableNo || 1) : null,
      items: JSON.stringify(items),
      total,
      type: orderType,
    };
    console.log("Sending order data:", orderData); // Debug log

    try {
      const orderRes = await axios.post(
        "http://localhost:5000/api/orders",
        orderData
      );
      if (orderRes.data.success) {
        await axios.post("http://localhost:5000/api/cashflow", {
          amount: total,
          type: orderType,
        });
        socket.emit("new-order");
        setShowSuccess(true);
        setCart([]); // Clear cart on success
      } else {
        alert("Order placement failed: " + orderRes.data.error);
      }
    } catch (err) {
      console.error("Order placement error:", err.response?.data || err.message);
      alert(
        "Order placement failed! Check console for details. " +
          (err.response?.data?.error || "")
      );
    }
  alert("YOUR PRODUCT AND AMOUT DETAILS UPDATED IN CASHFLOW");};

  const handleAddProduct = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const productName = prompt("Enter Product Name:");
    const productPrice = parseFloat(prompt("Enter Product Price:"));
    const description = prompt("Enter Description:");
    if (!productName || isNaN(productPrice)) {
      alert("Invalid product name or price!");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("name", productName);
    formData.append("price", productPrice);
    formData.append("description", description);
    formData.append("category", category);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/menu/add",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setProducts([...products, res.data]);
      alert("Product added successfully!");
    } catch (err) {
      console.error("Error adding product:", err);
      alert("Failed to add product. Check console for details.");
    }
  };

  const handleRemoveProduct = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/menu/${id}`);
      setProducts(products.filter((p) => p.id !== id));
      alert("Product removed successfully!");
    } catch (err) {
      console.error("Error removing product:", err);
      alert("Failed to remove product. Check console for details.");
    }
  };

  const handleQtyChange = (id, delta) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    );
  };

  if (showSuccess) {
    return (
      <div className="success-page">
        <h2>
          Order for{" "}
          {orderType === "takeaway" ? "Takeaway" : `Table ${tableNo || 1}`} Successfully
          Placed!
        </h2>
        <button onClick={onGoMainMenu}>Go to Main Menu</button>
      </div>
    );
  }

  return (
    <div className="product-page">
      <div className="product-navbar">
        <div className="nav-left">
          <button onClick={onBack} className="back-btn">
            ← Back
          </button>
          <button
            onClick={() => setCategory("set")}
            className={category === "set" ? "active" : ""}
          >
            Set
          </button>
          <button
            onClick={() => setCategory("drinks")}
            className={category === "drinks" ? "active" : ""}
          >
            Drinks
          </button>
          <button
            onClick={() => setCategory("foods")}
            className={category === "foods" ? "active" : ""}
          >
            Foods
          </button>
          <button
            onClick={() => setCategory("cart")}
            className={category === "cart" ? "active" : ""}
          >
            Cart
          </button>
        </div>
        <div className="nav-right">
          <button onClick={onEndSession}>End Session</button>
        </div>
      </div>

      {category !== "cart" ? (
        <div className="product-grid">
          {products
            .filter((p) => p.category === category)
            .map((prod) => (
              <div key={prod.id} className="product-card">
                {prod.image ? (
                  <img
                    src={`http://localhost:5000${prod.image}`}
                    alt={prod.name}
                    style={{
                      width: "100%",
                      height: "130px",
                      objectFit: "cover",
                      borderRadius: "6px",
                    }}
                  />
                ) : (
                  <div className="placeholder-img">No Image</div>
                )}
                <h3>{prod.name}</h3>
                <p>{prod.description}</p>
                <p>₹{prod.price}</p>
                <div className="qty-control">
                  <button onClick={() => handleQtyChange(prod.id, -1)}>
                    -
                  </button>
                  <span>
                    {cart.find((item) => item.id === prod.id)?.qty || 1}
                  </span>
                  <button onClick={() => handleQtyChange(prod.id, 1)}>+</button>
                </div>
                <button
                  className="add-btn"
                  onClick={() => handleAddToCart(prod)}
                >
                  Add to Cart
                </button>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveProduct(prod.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          <div className="add-product">
            <label htmlFor="file-upload" className="upload-btn">
              ➕ Add Product
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*"
              onChange={handleAddProduct}
            />
          </div>
        </div>
      ) : (
        <div className="cart-section">
          <h2>Cart</h2>
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <span>
                {item.name} x {item.qty}
              </span>
              <span>₹{item.price * item.qty}</span>
            </div>
          ))}
          <p>Total: ₹{cart.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2)}</p>
          <button className="place-order-btn" onClick={handlePlaceOrder}>
            🛒 Place Order
          </button>
        </div>
      )}
    </div>
  );
}