import { Router } from 'express';
import Service from '../models/Service.js';
import Package from '../models/Package.js';
import Account from '../models/Account.js';
import { auth, requireRole } from '../middleware/auth.js';
import { asyncHandler, InvalidDataError } from '../utils/errors.js';

const router = Router();
const TYPES = ['accommodation', 'transportation', 'food', 'guided_tour'];

const providerIdFor = async (accountId) => {
  const account = await Account.findById(accountId);
  if (!account?.provider) throw new InvalidDataError('account', 'No provider profile linked to this account');
  return account.provider;
};

const validateServiceBody = (body) => {
  const { name, type, price, maxGuests } = body || {};
  if (!name || name.length > 120) throw new InvalidDataError('name', 'Name is required (max 120 chars)');
  if (!TYPES.includes(type)) throw new InvalidDataError('type', `type must be one of: ${TYPES.join(', ')}`);
  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) throw new InvalidDataError('price', 'Price must be a non-negative number (MYR)');
  if (maxGuests !== undefined && (!Number.isInteger(Number(maxGuests)) || Number(maxGuests) < 1)) {
    throw new InvalidDataError('maxGuests', 'maxGuests must be a positive whole number');
  }
};

const validatePackageBody = (body) => {
  const { name, price, maxGuests } = body || {};
  if (!name || name.length > 120) throw new InvalidDataError('name', 'Name is required (max 120 chars)');
  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) throw new InvalidDataError('price', 'Price must be a non-negative number (MYR)');
  if (maxGuests !== undefined && (!Number.isInteger(Number(maxGuests)) || Number(maxGuests) < 1)) {
    throw new InvalidDataError('maxGuests', 'maxGuests must be a positive whole number');
  }
};

// ---- Public listings: only admin-verified items are shown to tourists (A9) ----
router.get('/services', asyncHandler(async (req, res) => {
  const { type, q } = req.query;
  const filter = { status: 'verified' };
  if (type && TYPES.includes(type)) filter.type = type;
  if (q) filter.name = { $regex: q, $options: 'i' };
  const services = await Service.find(filter).populate('provider', 'businessName').sort({ createdAt: -1 });
  res.json({ services });
}));

router.get('/packages', asyncHandler(async (req, res) => {
  const packages = await Package.find({ status: 'verified' })
    .populate('provider', 'businessName')
    .populate('includedServices', 'name type price')
    .sort({ createdAt: -1 });
  res.json({ packages });
}));

router.get('/services/:id', asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id).populate('provider', 'businessName');
  if (!service) throw new InvalidDataError('id', 'Service not found');
  res.json({ service });
}));

router.get('/packages/:id', asyncHandler(async (req, res) => {
  const pkg = await Package.findById(req.params.id)
    .populate('provider', 'businessName')
    .populate('includedServices', 'name type price');
  if (!pkg) throw new InvalidDataError('id', 'Package not found');
  res.json({ package: pkg });
}));

// ---- Service Provider: manage own listings ----
router.post('/services', auth, requireRole('service_provider'), asyncHandler(async (req, res) => {
  validateServiceBody(req.body);
  const provider = await providerIdFor(req.user.accountId);
  const service = await Service.create({ ...req.body, provider });
  res.status(201).json({ service });
}));

router.put('/services/:id', auth, requireRole('service_provider'), asyncHandler(async (req, res) => {
  validateServiceBody(req.body);
  const provider = await providerIdFor(req.user.accountId);
  const service = await Service.findOneAndUpdate(
    { _id: req.params.id, provider },
    { ...req.body, status: 'pending' }, // modifications go back for admin review (ODD 3.3.3)
    { new: true, runValidators: true }
  );
  if (!service) throw new InvalidDataError('id', 'Service not found or not owned by you');
  res.json({ service });
}));

router.get('/mine/services', auth, requireRole('service_provider'), asyncHandler(async (req, res) => {
  const provider = await providerIdFor(req.user.accountId);
  const services = await Service.find({ provider }).sort({ createdAt: -1 });
  res.json({ services });
}));

router.post('/packages', auth, requireRole('service_provider'), asyncHandler(async (req, res) => {
  validatePackageBody(req.body);
  const provider = await providerIdFor(req.user.accountId);
  const pkg = await Package.create({ ...req.body, provider });
  res.status(201).json({ package: pkg });
}));

router.put('/packages/:id', auth, requireRole('service_provider'), asyncHandler(async (req, res) => {
  validatePackageBody(req.body);
  const provider = await providerIdFor(req.user.accountId);
  const pkg = await Package.findOneAndUpdate(
    { _id: req.params.id, provider },
    { ...req.body, status: 'pending' },
    { new: true, runValidators: true }
  );
  if (!pkg) throw new InvalidDataError('id', 'Package not found or not owned by you');
  res.json({ package: pkg });
}));

router.get('/mine/packages', auth, requireRole('service_provider'), asyncHandler(async (req, res) => {
  const provider = await providerIdFor(req.user.accountId);
  const packages = await Package.find({ provider }).sort({ createdAt: -1 });
  res.json({ packages });
}));

export default router;
