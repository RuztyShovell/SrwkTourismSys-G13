import { Router } from 'express';
import Attraction from '../models/Attraction.js';
import { auth, requireRole } from '../middleware/auth.js';
import { asyncHandler, InvalidDataError } from '../utils/errors.js';

const router = Router();
const STATUSES = ['open', 'temporarily_unavailable', 'inactive'];

// Public browse (tourists plan trips from these)
router.get('/', asyncHandler(async (req, res) => {
  const { status, type, q } = req.query;
  const filter = {};
  if (status && STATUSES.includes(status)) filter.status = status;
  if (type) filter.type = type;
  if (q) filter.name = { $regex: q, $options: 'i' };
  const attractions = await Attraction.find(filter).sort({ name: 1 });
  res.json({ attractions });
}));

// Staff: create attraction
router.post('/', auth, requireRole('staff', 'admin'), asyncHandler(async (req, res) => {
  const { name, location, type, description, openingHours, status } = req.body || {};
  if (!name) throw new InvalidDataError('name', 'Name is required');
  if (status && !STATUSES.includes(status)) throw new InvalidDataError('status', `status must be one of: ${STATUSES.join(', ')}`);
  const attraction = await Attraction.create({ name, location, type, description, openingHours, status });
  res.status(201).json({ attraction });
}));

// Staff: update details / toggle status (ODD 3.3.9)
router.put('/:id', auth, requireRole('staff', 'admin'), asyncHandler(async (req, res) => {
  const { name, location, type, description, openingHours, status } = req.body || {};
  if (status && !STATUSES.includes(status)) throw new InvalidDataError('status', `status must be one of: ${STATUSES.join(', ')}`);
  const attraction = await Attraction.findByIdAndUpdate(
    req.params.id,
    { name, location, type, description, openingHours, status },
    { new: true, runValidators: true }
  );
  if (!attraction) throw new InvalidDataError('id', 'Attraction not found');
  res.json({ attraction });
}));

export default router;
