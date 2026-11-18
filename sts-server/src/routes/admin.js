import { Router } from 'express';
import Service from '../models/Service.js';
import Package from '../models/Package.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import Tourist from '../models/Tourist.js';
import Account from '../models/Account.js';
import Statistic from '../models/Statistic.js';
import { auth, requireRole } from '../middleware/auth.js';
import { asyncHandler, InvalidDataError } from '../utils/errors.js';

const router = Router();
router.use(auth, requireRole('admin'));

const MODELS = { service: Service, package: Package };

// Admin: list listings pending verification (ODD 7.4)
router.get('/listings', asyncHandler(async (req, res) => {
  const { type = 'service', status = 'pending' } = req.query;
  const Model = MODELS[type];
  if (!Model) throw new InvalidDataError('type', 'type must be service or package');
  const filter = {};
  if (status !== 'all') filter.status = status;
  const listings = await Model.find(filter).populate('provider', 'businessName contactEmail').sort({ createdAt: -1 });
  res.json({ listings });
}));

// Admin: approve or reject a listing
router.post('/listings/:type/:id/:action', asyncHandler(async (req, res) => {
  const { type, id, action } = req.params;
  const Model = MODELS[type];
  if (!Model) throw new InvalidDataError('type', 'type must be service or package');
  const status = { verify: 'verified', reject: 'rejected' }[action];
  if (!status) throw new InvalidDataError('action', 'action must be verify or reject');
  const listing = await Model.findByIdAndUpdate(id, { status }, { new: true });
  if (!listing) throw new InvalidDataError('id', 'Listing not found');
  res.json({ listing });
}));

// Admin: generate a tourism report (Statistic class, ODD 7.5)
router.get('/reports', asyncHandler(async (req, res) => {
  const reports = await Statistic.find().sort({ createdAt: -1 });
  res.json({ reports });
}));

router.post('/reports', asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.body || {};
  const from = dateFrom ? new Date(dateFrom) : new Date(0);
  const to = dateTo ? new Date(dateTo) : new Date();
  if (isNaN(from) || isNaN(to)) throw new InvalidDataError('dates', 'Valid dateFrom and dateTo are required');

  const bookingFilter = { createdAt: { $gte: from, $lte: to } };
  const [totalBookings, bookingsByStatus, revenueAgg, reviewsAgg, servicesByType, topItems, tourists, providers] =
    await Promise.all([
      Booking.countDocuments(bookingFilter),
      Booking.aggregate([{ $match: bookingFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { type: 'payment', status: 'successful', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      ]),
      Service.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $match: bookingFilter },
        { $group: { _id: { itemType: '$itemType', item: '$item' }, bookings: { $sum: 1 }, revenue: { $sum: '$totalCost' } } },
        { $sort: { bookings: -1 } },
        { $limit: 10 },
      ]),
      Tourist.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      Account.countDocuments({ role: 'service_provider', createdAt: { $gte: from, $lte: to } }),
    ]);

  // Resolve names for top items
  const topItemsDetailed = await Promise.all(
    topItems.map(async (t) => {
      const Model = MODELS[t._id.itemType];
      const doc = await Model.findById(t._id.item).select('name type').lean();
      return { name: doc?.name || 'Unknown', itemType: t._id.itemType, bookings: t.bookings, revenue: t.revenue };
    })
  );

  const data = {
    period: { from, to },
    bookings: {
      total: totalBookings,
      byStatus: Object.fromEntries(bookingsByStatus.map((s) => [s._id, s.count])),
    },
    revenue: { totalMYR: revenueAgg[0]?.total || 0, successfulPayments: revenueAgg[0]?.count || 0 },
    reviews: { count: reviewsAgg[0]?.count || 0, averageRating: reviewsAgg[0]?.avgRating ? +reviewsAgg[0].avgRating.toFixed(2) : null },
    servicesByType: Object.fromEntries(servicesByType.map((s) => [s._id, s.count])),
    topItems: topItemsDetailed,
    registrations: { tourists, serviceProviders: providers },
  };

  const report = await Statistic.create({
    title: `Tourism Report ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
    dateFrom: from,
    dateTo: to,
    data,
    createdBy: req.user.accountId,
  });
  res.status(201).json({ report });
}));

export default router;
