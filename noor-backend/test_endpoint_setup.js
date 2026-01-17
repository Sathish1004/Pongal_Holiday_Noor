const axios = require("axios");
const db = require("./config/db");

async function testEndpoint() {
  try {
    // 1. Login to get token
    console.log("Logging in...");
    const loginRes = await axios.post(
      "http://localhost:5000/api/auth/login",
      {
        email: "admin@test.com", // Replace with valid admin email
        password: "password123", // Replace with valid admin password
      }
    );
    const token = loginRes.data.token;
    console.log("Login successful. Token obtained.");

    // 2. Call Add File Endpoint
    console.log("Calling Add File Endpoint...");
    const siteId = 2; // Chennai
    const res = await axios.post(
      `http://localhost:5000/api/sites/${siteId}/files`,
      {
        url: "/uploads/test-debug-endpoint.jpg",
        type: "image",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("Response:", res.data);
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
}

// Check for admin user to use
async function getAdmin() {
  const [rows] = await db.query(
    "SELECT email FROM employees WHERE role='Admin' LIMIT 1"
  );
  if (rows.length > 0) {
    // We don't have password. We can't login easily unless we know a password.
    // Plan B: Mock Req/Res or use internal function calling?
    // Actually, let's just inspect the controller file first.
    // If we can't login, we can't test API easily without resetting password.
    console.log("Admin email:", rows[0].email);
  }
  process.exit();
}

// testEndpoint(); // Commented out because we don't know password
getAdmin();
