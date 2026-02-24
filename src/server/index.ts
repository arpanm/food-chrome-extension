/**
 * Optional backend proxy for Anthropic API. Run with: npm run server
 * Set ANTHROPIC_API_KEY in environment. Extension can set backend URL to http://localhost:3000
 */

import express from "express";
import { createRouter } from "./routes";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json({ limit: "1mb" }));

// Allow extension origin (chrome-extension://*)
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.options("*", (_req, res) => res.sendStatus(204));

app.use(createRouter());

app.listen(PORT, () => {
  console.log(`Swiggy Agent proxy listening on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("ANTHROPIC_API_KEY is not set. Set it to proxy API calls.");
  }
});
