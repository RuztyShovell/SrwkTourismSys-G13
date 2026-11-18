import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import attractionRoutes from './routes/attractions.js';
import bookingRoutes from './routes/bookings.js';
import tripRoutes from './routes/trips.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import { notFound, errorHandler } from './utils/errors.js';
import { seed } from './seed.js';

// MainController bootstrap (ODD 3.3.14, section 6): initialise components,
// establish the starting state, delegate requests to domain routes.
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'STS API' }));

app.use('/api/auth', authRoutes);
app.use('/api', listingRoutes); // /api/services, /api/packages (+ /api/mine/*)
app.use('/api/attractions', attractionRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(async () => {
    if ((process.env.MONGO_URI || '').startsWith('memory://')) {
      await seed();
      console.log('Demo data seeded (in-memory DB).');
    }
    app.listen(PORT, () => console.log(`STS server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
