# Support CRM

A customer support ticket management system designed to help support
executives create, manage, escalate, track, and resolve customer support
tickets.

The project includes ticket management, authentication, CSV import,
escalation handling, automated customer resolution notifications, and a
database-backed FastAPI backend.

------------------------------------------------------------------------

## 1. Features

### Ticket Management

-   Create new support tickets.
-   View all existing tickets.
-   View individual ticket details.
-   Edit existing tickets.
-   Delete tickets.
-   Update ticket status and priority.
-   Track ticket-related notes and activity.

### Escalation

-   Escalate tickets that require additional support.
-   Store escalation information with the ticket.
-   Support an extensible L1/L2 support workflow.

### CSV Import

-   Import ticket/customer information from CSV files.
-   Useful for initial data migration and bulk ticket creation.

### Authentication

-   User login/authentication.
-   Password reset workflow.
-   Protected application functionality.

### Automated Resolution Email

When a support executive marks a ticket as **Closed/Resolved**, the
backend triggers a customer notification email.

The email informs the customer that their ticket has been resolved and
provides instructions for following up if the issue occurs again.

The email operation is handled separately from the ticket update so that
an email failure does not prevent the ticket from being resolved.

### System Notes

Important actions, including email delivery attempts, can be recorded as
system notes against the ticket.

------------------------------------------------------------------------

# 2. Technology Stack

## Backend

-   Python
-   FastAPI
-   Uvicorn
-   SQLAlchemy
-   Pydantic
-   Passlib
-   Bcrypt
-   Python-dotenv

## Frontend

The frontend is a web-based CRM interface that communicates with the
FastAPI backend through REST APIs.

## Database

SQLAlchemy is used as the database abstraction layer.

The database connection is configured through environment variables.

## Email

Transactional email is handled through an email API using HTTPS rather
than direct SMTP connectivity.

This is particularly useful when deploying the backend on hosting
environments where outbound SMTP ports may be restricted.

------------------------------------------------------------------------

# 3. Prerequisites

Before running the project locally, install:

-   Python 3.10+ recommended
-   pip
-   Git
-   A database supported by the project's SQLAlchemy configuration
-   Node.js and npm if the frontend requires a separate Node environment

Check installations:

``` bash
python --version
pip --version
git --version
```

If your system uses `python3` instead of `python`, use:

``` bash
python3 --version
```

------------------------------------------------------------------------

# 4. Clone the Repository

Clone the project:

``` bash
git clone https://github.com/sirishti746/crm-system
```

Move into the project:

``` bash
cd support-crm
```

If your repository has a different name, replace `support-crm` with the
actual directory name.

------------------------------------------------------------------------

# 5. Backend Environment Setup

Open a terminal in the backend directory:

``` bash
cd backend
```

## Create a Virtual Environment

Windows:

``` bash
python -m venv venv
```

Activate it:

``` bash
venv\Scripts\activate
```

macOS/Linux:

``` bash
python3 -m venv venv
source venv/bin/activate
```

After activation, your terminal should show something similar to:

``` text
(venv)
```

------------------------------------------------------------------------

# 6. Install Backend Dependencies

With the virtual environment activated:

``` bash
pip install --upgrade pip
```

Then install the project dependencies:

``` bash
pip install -r requirements.txt
```

If the project uses a separate email API package, install the package
specified by the final `requirements.txt`.

------------------------------------------------------------------------

# 7. Configure Environment Variables

Create a `.env` file in the backend directory.

Example:

``` env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your gmail
SMTP_PASSWORD=App password

FROM_EMAIL=your gmail
FROM_NAME=Support CRM

FRONTEND_URL=http://localhost:3000
```

The exact database and email variable names should match the variables
used by the backend code.

### Important

Never commit your real `.env` file to GitHub.

Your `.gitignore` should contain:

``` gitignore
.env
venv/
__pycache__/
*.pyc
```

You can provide a safe `.env.example` file instead:

``` env
DATABASE_URL=
EMAIL_API_KEY=
FROM_EMAIL=
FROM_NAME=Support CRM
FRONTEND_URL=
```

------------------------------------------------------------------------

# 8. Start the FastAPI Backend

From the backend directory:

``` bash
uvicorn app.main:app --reload
```

If `main.py` is inside a package/module, use the corresponding module
path, for example:

``` bash
uvicorn backend.main:app --reload
```

The default local server is:

``` text
http://127.0.0.1:8000
```

FastAPI interactive API documentation is available at:

``` text
http://127.0.0.1:8000/docs
```

Alternative documentation:

``` text
http://127.0.0.1:8000/redoc
```

------------------------------------------------------------------------

# 9. Start the Frontend

If the frontend is a separate application, open a second terminal.

Navigate to the frontend:

``` bash
cd frontend
```

Install dependencies:

``` bash
npm install
```

Start the development server:

``` bash
npm run dev
```

The frontend will normally display the local URL in the terminal.

Make sure the frontend API/base URL points to the locally running
backend.

For example:

``` text
http://127.0.0.1:8000
```

The exact variable name depends on the frontend implementation.

------------------------------------------------------------------------

# 10. Local Development Workflow

Once both applications are running:

``` text
Start Database
      ↓
Start FastAPI Backend
      ↓
Start Frontend
      ↓
Open CRM
      ↓
Login
      ↓
Create Ticket
      ↓
View / Edit Ticket
      ↓
Escalate if Required
      ↓
Resolve / Close Ticket
      ↓
Resolution Email Triggered
      ↓
System Note Recorded
```

------------------------------------------------------------------------

# 11. Email Configuration

The project originally used Gmail SMTP.

During deployment, direct SMTP connectivity resulted in:

``` text
OSError: [Errno 101] Network is unreachable
```

The connection was tested directly from the deployed backend environment
using:

``` bash
python -c "import socket; print(socket.create_connection(('smtp.gmail.com', 587), 10))"
```

This confirmed that the deployed environment could not establish the
SMTP connection.

The email workflow was therefore designed to use an HTTPS-based email
API instead.

### Required Email Variables

Example:

``` env
EMAIL_API_KEY=your_api_key
FROM_EMAIL=your_verified_sender
FROM_NAME=Support CRM
```

Never put the API key directly in source code.
------------------------------------------------------------------------

# 12. Challenges Faced

## SMTP Connectivity

The initial implementation used Gmail SMTP. It worked conceptually in
local development but failed after deployment with a network-unreachable
error.

The issue was isolated by testing connectivity directly from the
deployed environment. Rather than changing the ticket logic, the email
architecture was changed to use an HTTPS email API.

## Reliable Ticket Updates

Email delivery should not determine whether a ticket can be closed.

The email function therefore handles exceptions separately and records
failures through logging/system notes rather than allowing an email
failure to break the ticket status update.

------------------------------------------------------------------------

# 13. Future Improvements


This would give support managers an immediate overview of workload and
performance.

## L1 / L2 Employee Assignment

When an L1 executive escalates a ticket, the ticket could be assigned to
a specific L2 employee.

The L2 employee's dashboard could then show:

-   Assigned tickets
-   Priority
-   Customer
-   Escalation reason
-   Escalation time
-   Current status
-   SLA status
-   Resolution notes

## Other Potential Improvements

-   Role-based access control.
-   SLA tracking and breach notifications.
-   Advanced ticket search and filtering.
-   Customer ticket history.
-   Audit logs.
-   Custom email templates.
-   Automatic ticket assignment.
-   Notifications for newly assigned tickets.
-   Advanced analytics and reporting.
-   Exportable reports.

------------------------------------------------------------------------

# 14. Project Links

### Deployed Application

`https://supportsystem.up.railway.app`

### Demo Video

`https://youtu.be/uQvEVErzusw`

------------------------------------------------------------------------

