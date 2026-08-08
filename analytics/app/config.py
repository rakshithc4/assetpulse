import os

MOCK_MODE = os.environ.get("MOCK_MODE", "0") == "1"
SAP_BASE_URL = os.environ.get("SAP_BASE_URL", "")
SAP_SERVICE_PATH = os.environ.get("SAP_SERVICE_PATH", "")
SAP_USER = os.environ.get("SAP_USER", "")
SAP_PASS = os.environ.get("SAP_PASS", "")
CORS_ORIGIN = os.environ.get("CORS_ORIGIN", "http://localhost:3000")
