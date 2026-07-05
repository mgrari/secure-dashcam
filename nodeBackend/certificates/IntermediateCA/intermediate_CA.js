const https = require("https"); // Use HTTPS
const express = require("express");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const crypto = require("crypto");

const app = express();
app.use(express.json());

// Paths
const CA_KEY_PATH = path.join(__dirname, "private/intermediateCA.key");
const CA_CERT_PATH = path.join(__dirname, "private/intermediateCA.crt");
const CERT_DIR = path.join(__dirname, "certificates/issued/");
const CSR_DIR = path.join(__dirname, "csr/");
const EXT_FILE_PATH = path.join(__dirname, "trusted_usr_ext.cnf");
const CHAIN_PATH = path.join(__dirname, "chain.crt"); // Path to the pre-generated chain.crt
const HTTPS_KEY_PATH = path.join(__dirname, "private/intermediateCA.key"); // Path to the HTTPS private key
const HTTPS_CERT_PATH = path.join(__dirname, "intermediateCA.crt"); // Path to the HTTPS certificate

// Ensure directories exist
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

// Middleware for Authentication
app.use((req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    console.error("[ERROR] Unauthorized access attempt detected.");
    return res.status(403).send("Unauthorized");
  }
  next();
});

// Helper function to generate unique filenames
const generateUniqueFilename = (prefix, extension) => {
  const uniqueId = crypto.randomBytes(8).toString("hex");
  return `${prefix}_${uniqueId}.${extension}`;
};

// Endpoint to issue certificates
app.post("/api/issueCertificate", async (req, res) => {
  const { csr, metadata } = req.body;

  // Validate the request
  if (!csr || !metadata || !metadata.username) {
    return res.status(400).send({ message: "CSR and metadata (with username) are required" });
  }

  const csrFilePath = path.join(CSR_DIR, generateUniqueFilename(metadata.username, "csr"));
  const certFilePath = path.join(CERT_DIR, generateUniqueFilename(metadata.username, "pem"));

  try {
    // Save the CSR to a temporary file
    fs.writeFileSync(csrFilePath, csr);

    // Use OpenSSL to sign the certificate
    const command = `
      openssl x509 -req -in ${csrFilePath} \
      -CA ${CA_CERT_PATH} -CAkey ${CA_KEY_PATH} -CAcreateserial \
      -out ${certFilePath} -days 365 -sha256 -extfile ${EXT_FILE_PATH}
    `;
    execSync(command);

    // Read the issued certificate
    const issuedCert = fs.readFileSync(certFilePath, "utf-8");
    console.log(`[INFO] Certificate issued for ${metadata.username}`);

    // Respond with the issued certificate
    res.status(200).send({ message: "Certificate issued successfully", cert: issuedCert });
  } catch (error) {
    console.error("[ERROR] Failed to issue certificate:", error.message);
    res.status(500).send({ message: "Certificate signing failed", error: error.message });
  }
});

// Serve the CA chain
app.get("/ca-chain", (req, res) => {
  if (fs.existsSync(CHAIN_PATH)) {
    res.sendFile(CHAIN_PATH);
  } else {
    res.status(404).send("CA chain not found");
  }
});
console.log("process.env.KEY_PASSPHRASE: ", process.env.KEY_PASSPHRASE)

// HTTPS Options
const httpsOptions = {
  key: fs.readFileSync(HTTPS_KEY_PATH), // Load HTTPS private key
  cert: fs.readFileSync(HTTPS_CERT_PATH), // Load HTTPS certificate
  passphrase: process.env.KEY_PASSPHRASE, // Add passphrase to environment
};


console.log("priv key: ", HTTPS_KEY_PATH)
console.log("cert path: ", HTTPS_CERT_PATH)
// Start HTTPS server
const PORT = 3200;
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`Intermediate CA server running on https://localhost:${PORT}`);
});
