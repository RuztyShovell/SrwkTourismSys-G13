import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';
import Tourist from '../models/Tourist.js';
import ServiceProvider from '../models/ServiceProvider.js';
import { auth, requireRole } from '../middleware/auth.js';
import { asyncHandler, InvalidDataError, InvalidCredentialsError } from '../utils/errors.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (account) =>
  jwt.sign({ accountId: account._id, role: account.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const publicAccount = (a) => ({ id: a._id, email: a.email, role: a.role, status: a.status });

// Register an Account (tourist or service_provider self-registration)
router.post('/register', asyncHandler(async (req, res) => {
  const { role, email, password, name, businessName, phone, nationality } = req.body || {};

  if (!['tourist', 'service_provider'].includes(role)) {
    throw new InvalidDataError('role', 'role must be tourist or service_provider');
  }
  if (!email || !EMAIL_RE.test(email)) throw new InvalidDataError('email', 'A valid email address is required');
  if (!password || password.length < 8) throw new InvalidDataError('password', 'Password must be at least 8 characters');
  if (await Account.findOne({ email: email.toLowerCase() })) {
    throw new InvalidDataError('email', 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await Account.create({ email, passwordHash, role });

  if (role === 'tourist') {
    if (!name) throw new InvalidDataError('name', 'Name is required');
    const tourist = await Tourist.create({ account: account._id, name, email, phone, nationality });
    account.tourist = tourist._id;
    await account.save();
  } else {
    if (!businessName) throw new InvalidDataError('businessName', 'Business name is required');
    const provider = await ServiceProvider.create({ account: account._id, businessName, contactEmail: email, phone });
    account.provider = provider._id;
    await account.save();
  }

  res.status(201).json({ token: signToken(account), account: publicAccount(account) });
}));

// Login - Invalid Email or Password exception never reveals which credential failed
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const account = await Account.findOne({ email: (email || '').toLowerCase() });
  if (!account || !(await bcrypt.compare(password || '', account.passwordHash))) {
    throw new InvalidCredentialsError();
  }
  if (account.status !== 'active') {
    throw new InvalidCredentialsError();
  }
  res.json({ token: signToken(account), account: publicAccount(account) });
}));

router.get('/me', auth, asyncHandler(async (req, res) => {
  const account = await Account.findById(req.user.accountId).select('-passwordHash');
  if (!account) throw new InvalidCredentialsError();
  res.json({ account });
}));

// Staff/Admin: list accounts (Staff manages tourist profiles per CRC 3.3.9)
router.get('/accounts', auth, requireRole('staff', 'admin'), asyncHandler(async (req, res) => {
  const accounts = await Account.find().select('-passwordHash').sort({ createdAt: -1 });
  res.json({ accounts });
}));

// Staff: suspend / activate an account
router.patch('/accounts/:id/status', auth, requireRole('staff', 'admin'), asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended'].includes(status)) throw new InvalidDataError('status', 'status must be active or suspended');
  const account = await Account.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-passwordHash');
  if (!account) throw new InvalidDataError('id', 'Account not found');
  res.json({ account });
}));

export default router;
