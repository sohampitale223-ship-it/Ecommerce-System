# ShopEase – E-commerce Management System

> A full-stack e-commerce web application being developed as part of the **IT Vedant Integrated Internship Program**.

## 📖 Project Introduction

ShopEase is an e-commerce management system designed to provide a responsive, convenient, and user-friendly online shopping experience. The project currently includes the initial React frontend, Express backend, and frontend–backend communication setup.

Steps 1–3 are complete. The Category Management module has been implemented in code and is awaiting final local database verification after MySQL credentials are configured.

## 🎯 Project Objectives

The long-term objectives of ShopEase are to:

- Build a responsive e-commerce platform.
- Provide a clear and user-friendly shopping experience.
- Add secure user authentication in a future module.
- Support product and category management.
- Provide shopping cart functionality.
- Support checkout and order management.
- Integrate online payment services.
- Provide administration and role-based management tools.

> Product management, authentication, cart, orders, payments, and administration are future objectives and are not part of the current implementation.

## 🚧 Current Project Status

| Step | Module | Status |
| --- | --- | --- |
| 1 | Project Setup | ✅ Completed |
| 2 | React Frontend Setup | ✅ Completed |
| 3 | Express Backend Setup | ✅ Completed |
| — | Category Management | ⚠️ Implemented; database verification pending |
| 4 | MySQL Database | ⏳ Pending |
| 5 | Authentication | ⏳ Pending |
| 6 | Product Management | ⏳ Pending |
| 7 | Shopping Cart | ⏳ Pending |
| 8 | Checkout & Orders | ⏳ Pending |
| 9 | Admin Dashboard | ⏳ Pending |
| 10 | Testing & Security | ⏳ Pending |
| 11 | Deployment | ⏳ Pending |

## 🛠️ Technology Stack

| Area | Technologies |
| --- | --- |
| Frontend | React.js, Vite, Bootstrap, React Router DOM, Axios, JavaScript, HTML, CSS |
| Backend | Node.js, Express.js, CORS, dotenv |
| Database | MySQL with mysql2 — category schema included; local setup required |
| Development tools | npm, Nodemon, ESLint, Git, Visual Studio Code |

## 📁 Project Folder Structure

Generated dependency folders such as `node_modules` are omitted for readability.

```text
ecommerce-system/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── categories/
│   │   │   │   └── CategoryDashboard.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── categoryService.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── categoryController.js
│   ├── database/
│   │   └── shopease.sql
│   ├── middleware/
│   ├── routes/
│   │   └── categoryRoutes.js
│   ├── .env
│   ├── .gitignore
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
└── README.md
```

## ✅ Installation Requirements

Install the following before running the project:

- [Node.js](https://nodejs.org/) and npm
- [Git](https://git-scm.com/)
- A code editor such as Visual Studio Code

MySQL 8 or a compatible MySQL server is required for the Category Management module. The original Steps 1–3 health routes can still run without a database connection.

## 🚀 Getting Started

Clone the repository and enter its root directory:

```bash
git clone <repository-url>
cd ecommerce-system
```

Replace `<repository-url>` with the actual repository URL after the project is published.

### Frontend Installation

Open a terminal in the project root and run:

```bash
cd frontend
npm install
npm run dev -- --open
```

The frontend is available at approximately:

```text
http://localhost:5173
```

### Backend Installation

Open a second terminal in the project root and run:

```bash
cd backend
npm install
npm run dev
```

The backend is available at:

```text
http://localhost:5000
```

Keep both terminals running to test frontend–backend communication.

## 🔐 Environment Variables

The backend environment file is `backend/.env` and uses the following configuration:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=shopease_db
```

Never place real passwords, API keys, tokens, or other secrets in documentation. The `.env` file is excluded by the backend `.gitignore` and should not be committed.

If your local MySQL user has a password, enter it after `DB_PASSWORD=` in `backend/.env`. Do not add the password to this README or commit the environment file.

## 🔌 Current API Endpoints

### `GET /`

Checks whether the ShopEase API is running.

**URL:** `http://localhost:5000/`

```json
{
  "success": true,
  "message": "ShopEase Ecommerce API is running"
}
```

### `GET /api/test`

Verifies communication between the frontend and backend.

**URL:** `http://localhost:5000/api/test`

```json
{
  "success": true,
  "message": "Frontend and backend connection successful"
}
```

## 🔄 Frontend–Backend Communication

The current communication flow is:

```text
React UI
   ↓
Axios
   ↓
Express API
   ↓
JSON response
   ↓
React UI status message
```

When the Home page loads, Axios requests `http://localhost:5000/api/test`. A successful request displays:

```text
Frontend and backend connection successful
```

If the backend cannot be reached, the interface displays:

```text
Backend server is currently unavailable.
```

## 🖥️ Current Pages

| Route | Page | Current content |
| --- | --- | --- |
| `/` | Home | ShopEase branding, welcome message, tagline, introduction, Explore Products button, and backend status |
| `/login` | Login | Email field, password field, and Login button |
| `/register` | Register | Full Name, Email, Password, Confirm Password fields, and Register button |
| `/categories` | Category Management | Responsive category table plus create, edit, and deactivate workflows |

The Login and Register pages currently provide frontend forms only. Authentication and form submission logic are not implemented.

The responsive Bootstrap navbar provides navigation to Home, Login, and Register.

## 🧪 Testing

The current Steps 1–3 implementation has been verified for:

- Frontend development startup
- Backend development startup
- React Router navigation
- Responsive Bootstrap styling
- Axios API communication
- `GET /` response
- `GET /api/test` response
- Frontend handling when the backend is unavailable
- Frontend production build
- ESLint checks

To create a production frontend build:

```bash
cd frontend
npm run build
```

To run frontend lint checks:

```bash
cd frontend
npm run lint
```

## 🗂️ Category Management Module

### Introduction and features

The Category Management module organizes future products into manageable groups. It currently provides:

- A responsive Bootstrap category dashboard at `/categories`
- Category creation and editing with frontend and backend validation
- Case-insensitive prevention of duplicate active category names
- Soft deactivation with confirmation instead of permanent deletion
- Active and inactive status badges
- Loading, empty, success, validation, backend, and database error states
- A temporary `product_count` value of `0` until Product Management is implemented

### Database table

The SQL setup file is located at `backend/database/shopease.sql`. It creates the `shopease_db` database and a `categories` table with these fields:

| Field | Purpose |
| --- | --- |
| `category_id` | Auto-incrementing primary key |
| `category_name` | Required category name, maximum 100 characters |
| `description` | Optional description, maximum 300 characters |
| `created_at` | Creation timestamp |
| `updated_at` | Automatically updated timestamp |
| `status` | Active/inactive soft-delete flag |

Import the schema using MySQL Workbench by opening and executing `backend/database/shopease.sql`, or use the MySQL command line:

```bash
mysql -u root -p < backend/database/shopease.sql
```

### Category API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/categories` | Return all categories with `product_count` |
| `GET` | `/api/categories/:id` | Return one category |
| `POST` | `/api/categories` | Create a category |
| `PUT` | `/api/categories/:id` | Update a category name and description |
| `PATCH` | `/api/categories/:id/deactivate` | Soft-deactivate a category |

Create and update requests use this JSON structure:

```json
{
  "category_name": "Electronics",
  "description": "Electronic devices and accessories"
}
```

Deactivation updates `status` to `false`; it never deletes the database row. The controller includes a product-count check that currently returns `0` and can later be replaced with a real Product Management query.

### Category testing

After configuring MySQL and importing the schema:

1. Start the backend and confirm that it logs `MySQL database connected successfully`.
2. Open `http://localhost:5173/categories`.
3. Create a category and confirm it appears with `0` products and an Active badge.
4. Try the same active name again and confirm duplicate validation appears.
5. Edit the category and confirm the table refreshes.
6. Deactivate it and confirm the row remains with an Inactive badge.
7. Test invalid IDs and empty or over-length values through an API client if required.

The module must remain marked as awaiting verification until these database-backed tests pass locally.

## 🗺️ Future Modules

The planned development roadmap includes:

- Broader MySQL integration for future modules
- User registration and login functionality
- bcrypt password hashing
- JSON Web Token (JWT) authentication
- Product CRUD operations
- Product-to-category relationships and real product counts
- Search and filtering
- Shopping cart
- Checkout
- Order management
- Payment integration
- Admin dashboard
- Role-based authorization
- Application and API deployment

These modules are planned and are **not currently implemented**.

## 🛡️ Security

Current repository practices:

- Do not commit `.env` files.
- Do not commit `node_modules` directories.
- Never store credentials or secrets in source code or documentation.

Planned security features include:

- Secure password hashing
- JWT-based authentication
- Protected API endpoints
- Server-side input validation
- Role-based access control
- Parameterized SQL queries

## 🎓 Internship Information

This project follows the IT Vedant Integrated Internship workflow:

```text
Self Learning
     ↓
Implementation
     ↓
Testing
     ↓
GitHub Submission
     ↓
Live Deployment
     ↓
Documentation
     ↓
Mentor Review
```

The internship requirements include a clean GitHub repository, structured project folders, meaningful commits, clear documentation, live deployment, end-user documentation, and mentor review. This README is designed to be updated as each project module is completed.

## 👨‍💻 Developer

**Abhay Sonone**  
Computer Engineering Student  
Full Stack Developer

## 🌐 Deployment

| Service | Status |
| --- | --- |
| Live Application | Coming Soon |
| Backend API | Coming Soon |

Deployment URLs will be added after the deployment module is completed.

## 📸 Screenshots

Screenshots will be added as the application develops.

### Home Page

_Screenshot coming soon._

### Login Page

_Screenshot coming soon._

### Register Page

_Screenshot coming soon._

### Backend Connection Status

_Screenshot coming soon._

---

This documentation reflects the project after completion of Steps 1–3 only.
