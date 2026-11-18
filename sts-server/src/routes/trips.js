import { Router } from 'express';
import Trip from '../models/Trip.js';
import Attraction from '../models/Attraction.js';
import Tourist from '../models/Tourist.js';
import { auth, requireRole } from '../middleware/auth.js';
import { asyncHandler, InvalidDataError, AppError } from '../utils/errors.js';

const router = Router();

const touristFor = async (accountId) => {
  const tourist = await Tourist.findOne({ account: accountId });
  if (!tourist) throw new InvalidDataError('account', 'No tourist profile linked to this account');
  return tourist;
};

const ownTrip = async (req) => {
  const tourist = await touristFor(req.user.accountId);
  const trip = await Trip.findOne({ _id: req.params.id, tourist: tourist._id })
    .populate('stops.attraction');
  if (!trip) throw new InvalidDataError('id', 'Trip not found');
  return trip;
};

// Plan a Trip (ODD 7.1): Trip asks Attraction for schedule and detects conflicts
router.post('/', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const tourist = await touristFor(req.user.accountId);
  const { title, startDate, endDate, preferences, stops = [] } = req.body || {};
  if (!title) throw new InvalidDataError('title', 'Title is required');

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start && end && end < start) throw new InvalidDataError('endDate', 'End date cannot be earlier than start date');

  // Validate stops and detect schedule conflicts against attraction status/hours
  const conflicts = [];
  const cleanStops = [];
  for (const stop of stops) {
    const attraction = await Attraction.findById(stop.attraction);
    if (!attraction) throw new InvalidDataError('stops', `Attraction ${stop.attraction} not found`);
    const visitDate = stop.visitDate ? new Date(stop.visitDate) : null;
    if (visitDate && start && visitDate < start) {
      conflicts.push(`${attraction.name}: visit date is before the trip start`);
    }
    if (visitDate && end && visitDate > end) {
      conflicts.push(`${attraction.name}: visit date is after the trip end`);
    }
    if (attraction.status !== 'open') {
      conflicts.push(`${attraction.name} is currently ${attraction.status.replace('_', ' ')}`);
    }
    cleanStops.push({ attraction: attraction._id, visitDate });
  }

  const trip = await Trip.create({ tourist: tourist._id, title, startDate: start, endDate: end, preferences, stops: cleanStops });
  await trip.populate('stops.attraction');
  res.status(201).json({ trip, conflicts });
}));

router.get('/', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const tourist = await touristFor(req.user.accountId);
  const trips = await Trip.find({ tourist: tourist._id }).populate('stops.attraction').sort({ createdAt: -1 });
  res.json({ trips });
}));

router.get('/:id', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const trip = await ownTrip(req);
  res.json({ trip });
}));

router.put('/:id', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const trip = await ownTrip(req);
  const { title, startDate, endDate, preferences, stops } = req.body || {};
  if (stops) {
    for (const stop of stops) {
      if (!(await Attraction.exists({ _id: stop.attraction }))) {
        throw new InvalidDataError('stops', `Attraction ${stop.attraction} not found`);
      }
    }
    trip.stops = stops;
  }
  if (title !== undefined) trip.title = title;
  if (startDate !== undefined) trip.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) trip.endDate = endDate ? new Date(endDate) : null;
  if (preferences !== undefined) trip.preferences = preferences;
  if (trip.startDate && trip.endDate && trip.endDate < trip.startDate) {
    throw new InvalidDataError('endDate', 'End date cannot be earlier than start date');
  }
  await trip.save();
  await trip.populate('stops.attraction');
  res.json({ trip });
}));

router.delete('/:id', auth, requireRole('tourist'), asyncHandler(async (req, res) => {
  const trip = await ownTrip(req);
  await trip.deleteOne();
  res.json({ message: 'Trip deleted' });
}));

export default router;
