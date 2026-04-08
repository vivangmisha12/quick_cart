# Blinkit Clone (MERN)

A full-stack Blinkit-inspired quick commerce web application built with React (Vite), Node.js, Express, and MongoDB.

This project supports:
- User authentication and profile management
- Product and category browsing
- Cart and checkout flow
- Order creation and order history
- Admin dashboard for categories/products
- Image upload support (Cloudinary + Multer)

## Tech Stack

### Frontend
- React 19
- React Router DOM 7
- Axios
- Vite

### Backend
- Node.js
- Express 5
- MongoDB + Mongoose
- JWT authentication
- bcryptjs
- Multer + Cloudinary

## Project Structure

```text
blinkit/
  backend/
    src/
      controllers/
      middleware/
      models/
      routes/
      utils/
      server.js
    .env.example
  frontend/
    src/
      api/
      components/
      context/
      hooks/
      pages/
      styles/
    .env.example
  .gitignore
  README.md
```

## Key Features

### User Side
- Register, login, logout
- Protected routes for cart, checkout, orders, profile, wishlist, addresses
- Product listing with filters/search support from API params
- Product details page
- Add to cart, update quantity, remove item, clear cart
- Checkout with payment method selection (COD, UPI, Card)
- Order history with status display
- Address management page
- Wishlist persistence via localStorage
- Location detection with geolocation + network fallback

### Admin Side
- Admin route guard in frontend
- Dashboard totals: categories, products, orders, users
- Category CRUD with image upload
- Product CRUD with image upload

## Authentication and Authorization

- JWT token-based auth
- Token stored in localStorage
- Axios interceptor automatically adds Authorization header
- Backend `authMiddleware` protects private routes
- Backend `adminMiddleware` protects admin-only routes

## Environment Variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`frontend/.env`)

Copy from `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Getting Started (Local Development)

## 1) Clone and install dependencies

```bash
git clone <your-repo-url>
cd blinkit

cd backend
npm install

cd ../frontend
npm install
```

## 2) Configure environment files

- Create `backend/.env` using `backend/.env.example`
- Create `frontend/.env` using `frontend/.env.example`

## 3) Run backend

```bash
cd backend
npm run dev
```

Backend runs on: `http://localhost:5000`

## 4) Run frontend

```bash
cd frontend
npm run dev
```

Frontend runs on Vite default URL (usually `http://localhost:5173`)

## API Base URL

Frontend uses:
- `VITE_API_URL` if defined
- fallback: `http://localhost:5000/api`

## API Routes Overview

Base prefix: `/api`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile` (auth)
- `PUT /auth/profile` (auth)

### Products
- `GET /products`
- `GET /products/trending`
- `GET /products/category/:categoryId`
- `GET /products/:id`
- `POST /products` (auth + admin + upload)
- `PUT /products/:id` (auth + admin + upload)
- `DELETE /products/:id` (auth + admin)

### Categories
- `GET /categories`
- `GET /categories/:id`
- `POST /categories` (auth + admin + upload)
- `PUT /categories/:id` (auth + admin + upload)
- `DELETE /categories/:id` (auth + admin)

### Cart
- `GET /cart` (auth)
- `POST /cart/add` (auth)
- `DELETE /cart/remove` (auth)
- `PUT /cart/update` (auth)
- `DELETE /cart/clear` (auth)

### Orders
- `POST /orders` (auth)
- `GET /orders` (auth)
- `GET /orders/admin/all` (auth)
- `GET /orders/:id` (auth)
- `PUT /orders/:id/status` (auth)

### Users (Admin)
- `GET /users/admin/count` (auth + admin)
- `GET /users/admin` (auth + admin)

## Build for Production

### Frontend build

```bash
cd frontend
npm run build
```

### Backend production start

```bash
cd backend
npm start
```

## Deployment Notes

- Set production values for `MONGODB_URI`, `JWT_SECRET`, and Cloudinary keys
- Set frontend `VITE_API_URL` to your deployed backend API URL
- Do not commit `.env` files
- Geolocation works best on HTTPS (or localhost in development)

## Security and Git Hygiene

This repository is configured to avoid committing sensitive files:
- `.env`
- `.env.*`
- `node_modules`
- logs and runtime artifacts

Safe to commit:
- `.env.example` files

## Current Scripts

### Backend
- `npm run dev` -> start with nodemon
- `npm start` -> start server

### Frontend
- `npm run dev` -> start Vite dev server
- `npm run build` -> build production bundle
- `npm run preview` -> preview build
- `npm run lint` -> run ESLint

## Future Improvements

- Add payment gateway integration
- Add order tracking backend workflow
- Add automated tests (unit and integration)
- Improve admin analytics and charts
- Add Docker support

## License

This project is currently unlicensed. Add a LICENSE file if you want to make usage terms explicit.
