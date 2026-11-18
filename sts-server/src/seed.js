import bcrypt from 'bcryptjs';
import Account from './models/Account.js';
import Tourist from './models/Tourist.js';
import ServiceProvider from './models/ServiceProvider.js';
import Service from './models/Service.js';
import Package from './models/Package.js';
import Attraction from './models/Attraction.js';

// Seed demo data. Used by `npm run seed` and auto-run on startup with memory:// MONGO_URI.
export const seed = async () => {
  const hash = (p) => bcrypt.hash(p, 10);

  const [adminAcc, staffAcc, provAcc, touristAcc] = await Promise.all([
    Account.findOneAndUpdate(
      { email: 'admin@sts.local' },
      { email: 'admin@sts.local', passwordHash: await hash('admin123'), role: 'admin', status: 'active' },
      { upsert: true, new: true }
    ),
    Account.findOneAndUpdate(
      { email: 'staff@sts.local' },
      { email: 'staff@sts.local', passwordHash: await hash('staff123'), role: 'staff', status: 'active' },
      { upsert: true, new: true }
    ),
    Account.findOneAndUpdate(
      { email: 'provider@sts.local' },
      { email: 'provider@sts.local', passwordHash: await hash('provider123'), role: 'service_provider', status: 'active' },
      { upsert: true, new: true }
    ),
    Account.findOneAndUpdate(
      { email: 'tourist@sts.local' },
      { email: 'tourist@sts.local', passwordHash: await hash('tourist123'), role: 'tourist', status: 'active' },
      { upsert: true, new: true }
    ),
  ]);

  const tourist = await Tourist.findOneAndUpdate(
    { account: touristAcc._id },
    { account: touristAcc._id, name: 'Demo Tourist', email: 'tourist@sts.local', phone: '+60123456789', nationality: 'Malaysian' },
    { upsert: true, new: true }
  );
  touristAcc.tourist = tourist._id;
  await touristAcc.save();

  const provider = await ServiceProvider.findOneAndUpdate(
    { account: provAcc._id },
    { account: provAcc._id, businessName: 'Borneo Trails Sdn Bhd', description: 'Tour operator and accommodation provider in Sarawak', contactEmail: 'provider@sts.local', phone: '+60198765432' },
    { upsert: true, new: true }
  );
  provAcc.provider = provider._id;
  await provAcc.save();

  const attractions = await Promise.all(
    [
      { name: 'Bako National Park', location: 'Kuching', type: 'nature', description: 'World-famous proboscis monkey sanctuary', openingHours: '08:00-17:00', status: 'open' },
      { name: 'Gunung Mulu National Park', location: 'Miri', type: 'nature', description: 'UNESCO site with giant cave chambers', openingHours: '07:00-18:00', status: 'open' },
      { name: 'Kuching Waterfront', location: 'Kuching', type: 'culture', description: 'Riverside promenade and market', openingHours: 'Open 24 hours', status: 'open' },
      { name: 'Sarawak Cultural Village', location: 'Damai', type: 'cultural', description: 'Living museum of Sarawak ethnic cultures', openingHours: '09:00-17:00', status: 'open' },
    ].map((a) => Attraction.findOneAndUpdate({ name: a.name }, a, { upsert: true, new: true }))
  );

  const svc = (data) => Service.findOneAndUpdate({ name: data.name, provider: provider._id }, { ...data, provider: provider._id }, { upsert: true, new: true });
  const s1 = await svc({ name: 'Rainforest Treehouse Lodge', description: 'Eco-lodge near Bako National Park', type: 'accommodation', price: 450, location: 'Kuching', maxGuests: 4, status: 'verified', cancellationPolicy: { freeCancelHours: 48, refundPercent: 80 } });
  const s2 = await svc({ name: 'Miri to Mulu Longboat Transfer', description: 'Boat transfer to Gunung Mulu park entrance', type: 'transportation', price: 120, location: 'Miri', maxGuests: 6, status: 'verified' });
  const s3 = await svc({ name: 'Kampung Food Tour', description: 'Guided tasting tour of local dishes', type: 'food', price: 65, location: 'Kuching', maxGuests: 8, status: 'verified' });
  const s4 = await svc({ name: 'Cultural Village Full-Day Tour', description: 'Visit all longhouses with dance performances', type: 'guided_tour', price: 180, location: 'Damai', maxGuests: 20, status: 'pending' });

  await Package.findOneAndUpdate(
    { name: 'Bako Explorer Package', provider: provider._id },
    { provider: provider._id, name: 'Bako Explorer Package', description: 'Lodge stay + park tour + transfers', price: 899, includedServices: [s1._id, s2._id], maxGuests: 4, status: 'verified', cancellationPolicy: { freeCancelHours: 72, refundPercent: 70 } },
    { upsert: true, new: true }
  );

  return { attractions: attractions.length };
};

// CLI entry: node src/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const { connectDB } = await import('./config/db.js');
  await connectDB();
  const result = await seed();
  console.log('Seed complete.');
  console.log('Logins -> admin@sts.local/admin123 | staff@sts.local/staff123 | provider@sts.local/provider123 | tourist@sts.local/tourist123');
  console.log('Attractions seeded:', result.attractions);
  process.exit(0);
}
