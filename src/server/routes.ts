/**
 * Express routes for proxying Anthropic API.
 */

import { Router, Request, Response } from "express";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export function createRouter(): Router {
  const router = Router();

  router.post("/api/chat", async (req: Request, res: Response) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        res.status(response.status).json(data);
        return;
      }

      res.json(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      res.status(502).json({ error: message });
    }
  });

  return router;
}
