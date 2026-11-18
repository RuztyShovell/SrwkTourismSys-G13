import { Router } from 'express';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Service from '../models/Service.js';
import Package from '../models/Package.js';
import Tourist from '../models/Tourist.js';
import { auth, requireRole } from '../middleware/auth.js';
import { asyncHandler, InvalidDataError, AppError } from '../utils/errors.js';
import { processPayment, processRefund } from '../utils/paymentProvider.js';

const router = Router();

const ITEM_MODELS = { service: Service, package: Package };

const touristFor = async (accountId) => {
  const tourist = await Tourist.findOne({ account: accountId });
  if (!tourist) throw new InvalidDataError('account', 'No tourist profile linked to this account');
  return tourist;
};

const loadItem = async (itemType, itemId) => {
  const Model = ITEM_MODELS[itemType];
  if (!Model) throw new InvalidDataError('itemType', 'itemType must be service or package');
  const item = await Model.findById(itemId);
  if (!item) throw new InvalidDataError('itemId', 'Service or package not found');
  return item;
};

// Availability: no overlapping pending/confirmed booking for the same item (ODD 2.3 reliability)
const hasConflict = async (itemType, itemId, startDate, endDate, excludeId = null) => {
  const filter = {
    itemType,
    item: itemId,
    status: { $in: ['pending', 'confirmed'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Booking.exists(filter);
};

const populateBooking = (b) =>
  b.populate([
    { path: 'tourist', select: 'name email phone nationality' },
    { path: 'item', select: 'name type price location provider', populate: { path: 'provider', select: 'businessName' } },
  ]);

// Create a Booking (pending) - bootstrap steps 1-5 of ODD section 6
router.post('/', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const { itemType, itemId, startDate, endDate, guests } = req.body || {};
  const tourist = await touristFor(req.user.accountId);

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!startDate || !endDate || isNaN(start) || isNaN(end)) throw new InvalidDataError('dates', 'Valid startDate and endDate are required');
  if (end < start) throw new InvalidDataError('endDate', 'End date cannot be earlier than start date');
  if (!Number.isInteger(Number(guests)) || Number(guests) < 1) {
    throw new InvalidDataError('guests', 'Number of guests must be a positive whole number');
  }

  const item = await loadItem(itemType, itemId);
  if (item.status !== 'verified') throw new AppError('This listing is not available for booking', 400);
  if (Number(guests) > item.maxGuests) {
    throw new InvalidDataError('guests', `Number of guests cannot exceed the limit of ${item.maxGuests}`);
  }
  if (await hasConflict(itemType, item._id, start, end)) {
    throw new AppError('The selected dates are not available for this listing', 409);
  }

  const bookingRef = `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const booking = await Booking.create({
    bookingRef,
    tourist: tourist._id,
    itemType,
    item: item._id,
    startDate: start,
    endDate: end,
    guests: Number(guests),
    totalCost: item.price * Number(guests),
    status: 'pending',
  });
  await Payment.create({ booking: booking._id, amount: booking.totalCost, status: 'pending' });

  await populateBooking(booking);
  res.status(201).json({ booking });
}));

// Pay for a booking through the external provider (bootstrap step 6-7)
// Observer pattern: on success the booking notifies (email/SMS stub) - ODD 5.2.2
router.post('/:id/pay', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const tourist = await touristFor(req.user.accountId);
  const booking = await Booking.findOne({ _id: req.params.id, tourist: tourist._id });
  if (!booking) throw new InvalidDataError('id', 'Booking not found');
  if (booking.status !== 'pending') throw new AppError(`Booking is already ${booking.status}`, 400);

  const method = ['card', 'fpx', 'duitnow'].includes(req.body?.method) ? req.body.method : 'card';
  const payment = await Payment.findOne({ booking: booking._id, type: 'payment', status: 'pending' });
  if (!payment) throw new AppError('No pending payment found for this booking', 400);

  const result = processPayment({ amount: payment.amount, method });
  payment.status = result.successful ? 'successful' : 'failed';
  payment.transactionRef = result.transactionRef;
  await payment.save();

  if (result.successful) {
    booking.status = 'confirmed';
    await booking.save();
    // Observer: notification listeners (external email/SMS service) - stubbed
    console.log(`[notify] Booking ${booking.bookingRef} confirmed. Receipt sent to tourist.`);
  }

  await populateBooking(booking);
  res.json({ booking, payment });
}));

// Cancel a booking - tourist (own) or staff/admin (on behalf, ODD 7.3)
router.post('/:id/cancel', auth, requireRole('tourist', 'staff', 'admin'), asyncHandler(async (req, res) => {
  const isStaff = ['staff', 'admin'].includes(req.user.role);
  let booking;
  if (isStaff) {
    booking = await Booking.findById(req.params.id);
  } else {
    const tourist = await touristFor(req.user.accountId);
    booking = await Booking.findOne({ _id: req.params.id, tourist: tourist._id });
  }
  if (!booking) throw new InvalidDataError('id', 'Booking not found');
  if (['cancelled', 'completed'].includes(booking.status)) {
    throw new AppError(`Booking cannot be cancelled (status: ${booking.status})`, 400);
  }

  const item = await loadItem(booking.itemType, booking.item);
  // Cancellation eligibility under provider rules (A10)
  const hoursToStart = (new Date(booking.startDate) - Date.now()) / 36e5;
  const withinFreeWindow = hoursToStart >= (item.cancellationPolicy?.freeCancelHours ?? 24);
  const refundPercent = withinFreeWindow ? (item.cancellationPolicy?.refundPercent ?? 100) : 0;

  const paid = await Payment.findOne({ booking: booking._id, type: 'payment', status: 'successful' });
  let refund = null;
  if (paid && refundPercent > 0) {
    const refundAmount = Math.round((paid.amount * refundPercent) / 100 * 100) / 100;
    const result = processRefund({ amount: refundAmount });
    refund = await Payment.create({
      booking: booking._id,
      amount: refundAmount,
      type: 'refund',
      status: result.successful ? 'refunded' : 'failed',
      transactionRef: result.transactionRef,
    });
  }

  booking.status = 'cancelled';
  await booking.save();
  console.log(`[notify] Booking ${booking.bookingRef} cancelled. Refund ${refund ? `MYR ${refund.amount} (${refundPercent}%)` : 'not applicable'}.`);

  await populateBooking(booking);
  res.json({ booking, refund, refundPercent });
}));

router.get('/', auth, asyncHandler(async (req, res) => {
  const { status, itemType } = req.query;
  const filter = {};
  if (req.user.role === 'tourist') {
    const tourist = await touristFor(req.user.accountId);
    filter.tourist = tourist._id;
  }
  if (status) filter.status = status;
  if (itemType) filter.itemType = itemType;
  const bookings = await populateBooking(Booking.find(filter).sort({ createdAt: -1 }));
  res.json({ bookings });
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) throw new InvalidDataError('id', 'Booking not found');
  if (req.user.role === 'tourist') {
    const tourist = await touristFor(req.user.accountId);
    if (String(booking.tourist._id) !== String(tourist._id)) throw new AppError('Booking not found', 404);
  }
  const payments = await Payment.find({ booking: booking._id }).sort({ createdAt: 1 });
  res.json({ booking, payments });
}));

export default router;
