import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple JSON Database Fallback
const DB_FILE = "signups.json";
let signups = [];

if (fs.existsSync(DB_FILE)) {
  try {
    signups = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    console.log("[DB] Loaded existing signups from JSON");
  } catch (err) {
    console.error("[DB] Error loading JSON DB:", err);
  }
}

function saveToDb(data) {
  signups.unshift({
    ...data,
    id: Date.now(),
    status: 'New',
    createdAt: new Date().toISOString()
  });
  fs.writeFileSync(DB_FILE, JSON.stringify(signups, null, 2));
}

async function startServer() {
  console.log("[SERVER] Starting server initialization...");
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple Request Logger
  app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    console.log("[SERVER] Health check requested");
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route for Signup
  app.post("/api/signup", async (req, res) => {
    console.log("[SERVER] Signup request received");
    const formData = req.body;
    const { email, firstName, lastName, summaryDetails, summaryTotal } = formData;

    try {
      console.log("[SERVER] Saving to database...");
      saveToDb(formData);
      console.log("[SERVER] Database save successful");

      // Create transporter (using SMTP settings from .env)
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // 1. Email to Business Owner
      const ownerMailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Tyne Clean'}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: process.env.BUSINESS_OWNER_EMAIL,
        subject: `New Signup: ${firstName} ${lastName}`,
        html: `
          <h2>New Customer Signup</h2>
          <p><strong>Name:</strong> ${formData.title} ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${formData.phone}</p>
          <p><strong>Address:</strong> ${formData.houseNumber} ${formData.streetName}, ${formData.townCity}, ${formData.postcode}</p>
          <p><strong>Hear About:</strong> ${formData.hearAbout}</p>
          <p><strong>Extra Notes:</strong> ${formData.extraNotes || 'None'}</p>
          <p><strong>General Notes:</strong> ${formData.generalNotes || 'None'}</p>
          <hr>
          <h3>Quote Summary</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            ${summaryDetails}
            <div style="margin-top: 10px; font-weight: bold; font-size: 1.2em;">${summaryTotal}</div>
          </div>
        `,
      };

      // 2. Email to Customer (Confirmation)
      const customerMailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Tyne Clean'}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        subject: `Welcome to Tyne Clean - Your Quote Confirmation`,
        html: `
          <h2>Hi ${firstName},</h2>
          <p>Thanks for choosing Tyne Clean! We've received your signup and quote details.</p>
          <p>We will email you shortly to confirm all the details and prices before adding you to our rounds. No payments are collected until after work is completed.</p>
          <p>You will receive a text reminder the evening before we are due to leave access available, a posted slip, and an email notification upon completion.</p>
          <hr>
          <h3>Your Quote Summary</h3>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
            ${summaryDetails}
            <div style="margin-top: 10px; font-weight: bold; font-size: 1.2em;">${summaryTotal}</div>
          </div>
          <p>If you have any questions, please reply to this email.</p>
          <p>Best regards,<br>The Tyne Clean Team</p>
        `,
      };

      /* 
      // EMAIL SENDING IS ON HOLD
      // To activate, provide SMTP credentials in environment variables
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        await Promise.all([
          transporter.sendMail(ownerMailOptions),
          transporter.sendMail(customerMailOptions)
        ]);
        console.log("Emails sent successfully to owner and customer.");
      } else {
        console.warn("SMTP not configured. Skipping email sending. (Check .env)");
      }
      */

      res.status(200).json({ success: true, message: "Signup processed successfully" });
    } catch (error) {
      console.error("[SERVER] Error processing signup:", error);
      res.status(500).json({ success: false, message: "Failed to process signup" });
    }
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  const distPath = path.join(__dirname, "dist");

  if (!isProd || !fs.existsSync(distPath)) {
    console.log("[SERVER] Initializing Vite middleware (Dev Mode)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[SERVER] Vite middleware initialized");
  } else {
    console.log("[SERVER] Serving static files from dist (Prod Mode)...");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
