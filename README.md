````markdown
# PharmaLoop 💊

> Smart medicine management with scheduled refills, subscriptions, automatic payments, and notifications.

PharmaLoop is a medicine management platform that helps users discover medicines, purchase them, schedule recurring refills, manage subscriptions, automate payments, and track orders.

## 🚀 Project Status

**Sprint 2 — Development 🚧**

### Completed
- [x] PRD & User Stories
- [x] UX Flow
- [x] UI Wireframes
- [x] Page Descriptions
- [x] Next.js Setup
- [x] Prisma Setup
- [x] Neon PostgreSQL Setup

### In Progress
- [ ] Database Schema
- [ ] API Contracts
- [ ] Authentication
- [ ] Subscription System
- [ ] Orders & Payments
- [ ] Notifications

---

## ✨ Core Features

- 🔐 Authentication & Authorization
- 💊 Medicine Search & Discovery
- 📋 Medicine Details
- 🛒 One-Time Purchases
- 🔄 Recurring Medicine Subscriptions
- 📅 Refill Scheduling
- 💳 Automatic Payments
- 📦 Order & Delivery Tracking
- 🔔 Event-Based Notifications
- 👤 Address & Account Management

### Payment Flow

```text
PENDING
   ↓
PAYMENT ATTEMPT
   ↓
 ┌───────┴────────┐
 ↓                ↓
SUCCESS          FAILED
 ↓                ↓
ORDER CREATED    RETRYING
                   ↓
              ┌────┴────┐
              ↓         ↓
           SUCCESS   FINAL FAILURE
````

Every important process must end in a clear state and notify the user of the outcome.

---

## 🏗️ Architecture

PharmaLoop uses a single Next.js application for both frontend and backend.

```text
Frontend
   ↓
Next.js API Routes
   ↓
Service Layer
   ↓
Repository Layer
   ↓
Prisma
   ↓
PostgreSQL (Neon)
```

### Project Structure

```text
Aditya_PharmaLoop_Kalvium-Community/
│
├── app/
│   ├── api/
│   └── ...pages
├── components/
├── lib/
├── services/
├── repositories/
├── types/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── .env
├── .env.example
└── package.json
```

---

## 🛠️ Tech Stack

| Layer            | Technology         |
| ---------------- | ------------------ |
| Frontend         | Next.js + React    |
| Language         | TypeScript         |
| Styling          | Tailwind CSS       |
| Backend          | Next.js API Routes |
| API              | REST               |
| ORM              | Prisma             |
| Database         | PostgreSQL         |
| Database Hosting | Neon               |
| Version Control  | Git + GitHub       |

---

## 🗄️ Database

Core entities:

```text
User
Medicine
Subscription
SubscriptionItem
Order
OrderItem
Payment
Notification
Address
```

Main relationships:

```text
User
 ├── Subscriptions
 ├── Orders
 ├── Payments
 ├── Notifications
 └── Addresses

Subscription
 └── SubscriptionItems

Medicine
 ├── SubscriptionItems
 └── OrderItems

Order
 └── OrderItems
```

Prisma migrations are used to manage database changes.

---

## 🔌 API

PharmaLoop follows REST principles.

Example endpoints:

```text
POST   /api/auth/register
POST   /api/auth/login

GET    /api/medicines
GET    /api/medicines/:id

POST   /api/orders
GET    /api/orders
GET    /api/orders/:id

POST   /api/subscriptions
GET    /api/subscriptions
GET    /api/subscriptions/:id
PATCH  /api/subscriptions/:id
DELETE /api/subscriptions/:id

POST   /api/payments

GET    /api/notifications
PATCH  /api/notifications/:id
```

---

## ⚙️ Getting Started

### 1. Clone

```bash
git clone <repository-url>
cd Aditya_PharmaLoop_Kalvium-Community
```

### 2. Install

```bash
npm install
```

### 3. Environment

Create `.env`:

```env
DATABASE_URL="your-neon-postgresql-connection-string"
```

Never commit `.env`.

### 4. Prisma

```bash
npx prisma generate
```

### 5. Database

```bash
npx prisma migrate dev
```

### 6. Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 👥 Development Workflow

```text
Feature
   ↓
Branch
   ↓
Implementation
   ↓
Testing
   ↓
Pull Request
   ↓
Review
   ↓
Merge
```

Example branches:

```text
feature/authentication
feature/medicines
feature/subscriptions
feature/orders
feature/payments
feature/notifications
```

---

## 📋 Roadmap

### Sprint 1 — Product & UX

**Completed ✅**

### Sprint 2 — Foundation

**In Progress 🚧**

* Database
* API Contract
* Architecture
* Authentication

### Sprint 3 — Backend

* Medicine APIs
* Subscription APIs
* Order APIs
* Payment System
* Notification System

### Sprint 4 — Frontend

* Dashboard
* Medicine Discovery
* Cart
* Subscriptions
* Payments
* Notifications

### Sprint 5 — Testing & Deployment

* Integration Testing
* Error Handling
* Security
* Performance
* Deployment

---

## 👨‍💻 Team

**PharmaLoop Team**

* Aditya — Project Admin / Development
* Aman — Development
* Anshika Bagga — Designer / Frontend Development

## 📄 Documentation

* Product Requirements Document
* UX Flow
* UI Wireframes
* Page Descriptions
* API Contract
* System Design
* Database Design

---

> **PharmaLoop: Making medicine management simple, reliable, and automatic.**

