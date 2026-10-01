const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();


// =========================
// REGISTER
// =========================

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide name, email and password"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "Member"
    });

    await user.save();

    res.status(201).json({
      message: "Registration successful"
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      message: "Registration failed",
      error: error.message
    });
  }
});


// =========================
// LOGIN
// =========================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide email and password"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      message: "Login failed",
      error: error.message
    });
  }
});


// =========================
// PROFILE
// =========================

router.get("/profile", async (req, res) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization token is missing"
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Invalid authorization format"
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "Profile retrieved successfully",
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {

    console.error("PROFILE ERROR:", error);

    return res.status(401).json({
      message: "Invalid or expired token"
    });

  }
});


module.exports = router;