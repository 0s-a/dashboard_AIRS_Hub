# AI-Driven Admin Dashboard & CRM

This project is the core "Brain" for an intelligent application ecosystem. It serves as a centralized Inventory and CRM system that powers both an administrative dashboard and an automated Chatbot via a secure API.

## 🚀 Key Features

### 1. Live Inventory Management
*   **Real-time Data Grid**: View, search, and filter products instantly.
*   **CRUD Operations**: Full Add, Edit, and Update capabilities.
*   **AI Integration**: Generates professional product marketing descriptions in Arabic using Google Gemini.
*   **Image Support**: Visual thumbnails and URL-based image management.
*   **Optimistic UI**: Instant feedback on availability toggles.

### 2. CRM (Customer Relationship Management)
*   **Customer Profiles**: Manage customer details and history.
*   **Dynamic Tiering**: Assign tiers (RETAIL, WHOLESALE, VIP) that automatically dictate pricing.
*   **Soft Delete**: Safely deactivate customers without losing historical data.
*   **Visual Enhancements**: Initials-based avatars and color-coded tier badges.

### 3. External "Bot" API Layer
*   **Product Feed**: Secure endpoint (`GET /api/v1/bot/products`) for the chatbot to query availability.
*   **Smart Pricing**: Endpoint (`POST /api/v1/bot/check-price`) that calculates the exact price for a customer based on their tier.
*   **Security**: Protected by a customizable `x-api-key`.

### 4. Modern UI/UX
*   **Tech Stack**: Next.js 14, TypeScript, Prisma, Tailwind CSS, Shadcn/ui.
*   **Dark Mode**: Fully supported with a seamless toggle.
*   **Responsive**: Mobile-friendly sidebar and layouts.

---

## 🛠️ Getting Started

### Prerequisites
*   Node.js 18+
*   PostgreSQL

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repo-url>
    cd dash
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/dash"
    GOOGLE_GEMINI_API_KEY="your-gemini-api-key"
    BOT_API_KEY="your-secret-bot-key"
    ```

4.  **Database Setup:**
    ```bash
    # Push schema to database
    npx prisma db push

    # (Optional) Seed with sample data
    npx prisma db seed
    ```

5.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Visit `http://localhost:3000`

---

## 📚 API Documentation

### Authentication
All requests to `/api/v1/bot/*` must include the header:
`x-api-key: <your-BOT_API_KEY>`

### Endpoints

#### `GET /api/v1/bot/products`
Returns a list of all *available* products with their details.

#### `POST /api/v1/bot/check-price`
Calculates the price for a specific customer/product combination.

**Body:**
```json
{
  "phoneNumber": "+1234567890",
  "productId": "uuid-of-product"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "...",
    "customerTier": "VIP",
    "price": 900.00,
    "currency": "SAR"
  }
}
```
# dashboard_AIRS_Hub
