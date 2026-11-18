import { Router } from 'express';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Tourist from '../models/Tourist.js';
import { auth, requireRole } from '../middleware/auth.js';
import { asyncHandler, InvalidDataError, AppError } from '../utils/errors.js';

const router = Router();

const touristFor = async (accountId) => {
  const tourist = await Tourist.findOne({ account: accountId });
  if (!tourist) throw new InvalidDataError('account', 'No tourist profile linked to this account');
  return tourist;
};

// Write a review - only for a stay the tourist has completed (A13)
router.post('/', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const tourist = await touristFor(req.user.accountId);
  const { bookingId, rating, comment } = req.body || {};

  if (!Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    throw new InvalidDataError('rating', 'Rating must be a whole number between 1 and 5');
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw new InvalidDataError('bookingId', 'Booking not found');
  if (String(booking.tourist) !== String(tourist._id)) throw new AppError('You can only review your own bookings', 403);
  if (!['confirmed', 'completed'].includes(booking.status)) {
    throw new AppError('You can only review a completed booking', 400);
  }
  if (await Review.exists({ booking: booking._id })) {
    throw new AppError('A review has already been submitted for this booking', 409);
  }

  const review = await Review.create({
    tourist: tourist._id,
    booking: booking._id,
    itemType: booking.itemType,
    item: booking.item,
    rating: Number(rating),
    comment: (comment || '').slice(0, 2000),
  });
  await review.populate([
    { path: 'tourist', select: 'name' },
    { path: 'item', select: 'name type' },
  ]);
  res.status(201).json({ review });
}));

// Public: reviews for a service or package
router.get('/', asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.query;
  const filter = {};
  if (itemType && ['service', 'package'].includes(itemType)) filter.itemType = itemType;
  if (itemId) filter.item = itemId;
  const reviews = await Review.find(filter).populate('tourist', 'name').populate('item', 'name type').sort({ createdAt: -1 });
  res.json({ reviews });
}));

// Tourist: my reviews
router.get('/mine', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const tourist = await touristFor(req.user.accountId);
  const reviews = await Review.find({ tourist: tourist._id }).populate('item', 'name type').sort({ createdAt: -1 });
  res.json({ reviews });
}));

export default router;
