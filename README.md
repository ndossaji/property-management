# property-management

## Core Purpose
A business-management platform that automates client-linked billing, time tracking, and expense handling for you and your employees.

## Key Functions
	1.	Time Tracking
	•	Employees can track their hours.
	•	You assign permissions so only certain employees can bill specific clients.
	•	Hours can be routed directly to client invoices.
	2.	Expense Capture
	•	Employees can submit receipts manually.
	•	The system can automatically scan emails to detect receipts and ask whether to expense them.
	•	Receipts can also be matched to linked credit card transactions and prompt users to categorize them.
	3.	Billing + Client Management
	•	Automates the flow from tracked time and categorized expenses into client invoices.
	•	Allows you to control who can charge which client.
	•	Potentially handles approvals before billing.
	4.	Integrations
	•	Connects to selected company credit cards to ingest transactions.
	•	Connects to email accounts to identify receipts.
	•	Broadly similar to QuickBooks in function but more automated and designed around permissions and proactive prompts.

## Tech Stack
Frontend
	•	Next.js (React) + TypeScript
	•	Tailwind CSS + shadcn/ui
	•	React Query (TanStack Query) for server state
	•	Vercel for hosting

Auth
	•	Firebase Authentication (email/password, token-based)

API / Backend
	•	Python 3.11+ with FastAPI
	•	Uvicorn + Gunicorn (production ASGI server)

Workers / Automation
	•	Celery (or Dramatiq) with Redis broker & result backend
	•	Separate worker fleet for CPU-heavy tasks (OCR)

Database & Cache
	•	PostgreSQL (Supabase / Neon / AWS RDS)
	•	Redis (Upstash / ElastiCache) for Celery/broker + caching + rate-limiting

Storage
	•	S3-compatible storage (AWS S3 or DigitalOcean Spaces) for receipts, invoices; or Firebase Storage if you prefer unified Firebase usage

OCR & Document AI
	•	Tesseract + OpenCV + pdfplumber for initial OCR/parsing
	•	Optionally: AWS Textract or Google Document AI for improved accuracy on complex receipts

Integrations
	•	Gmail API + Microsoft Graph (Outlook) for email ingestion (OAuth tokens stored encrypted)
	•	Plaid or Stripe Financial Connections for credit-card transactions
	•	SendGrid / Postmark for transactional email

Logging, Monitoring, Error Tracking
	•	Sentry for errors
	•	Logtail / CloudWatch for logs
	•	Prometheus + Grafana or hosted metrics (Grafana Cloud) for metrics

CI / CD
	•	GitHub Actions for CI; Vercel/GitHub Actions for deployments
	•	Docker images for backend + workers
	•	Terraform or Pulumi for infra provisioning (optional)

Security & Secrets
	•	KMS (AWS KMS) or HashiCorp Vault for secret management
	•	HTTPS everywhere via managed certs (Vercel / CloudFront / ALB)



