// server.js
const express = require("express");
const pool = require("./db");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 测试接口
app.get("/", (req, res) => {
  res.send("✅ CRM 系统后端运行中...");
});

// 获取所有客户
app.get("/api/customers", async (req, res) => {
  const result = await pool.query("SELECT * FROM customers ORDER BY id DESC");
  res.json(result.rows);
});

// 添加客户
app.post("/api/customers", async (req, res) => {
  const { name, phone, email, status, color, price_level_id } = req.body;
  const sql = `INSERT INTO customers (name, phone, email, status, color, price_level_id)
               VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`;
  const values = [name, phone, email, status, color, price_level_id];
  const result = await pool.query(sql, values);
  res.json(result.rows[0]);
});

// 获取商品
app.get("/api/products", async (req, res) => {
  const result = await pool.query("SELECT * FROM products WHERE is_active = TRUE");
  res.json(result.rows);
});

// 添加商品
app.post("/api/products", async (req, res) => {
  const { name, description, market_price, stock } = req.body;
  const sql = `INSERT INTO products (name, description, market_price, stock)
               VALUES ($1,$2,$3,$4) RETURNING *`;
  const result = await pool.query(sql, [name, description, market_price, stock]);
  res.json(result.rows[0]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 服务器运行在 http://localhost:${PORT}`));
