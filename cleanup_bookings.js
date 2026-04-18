db.bookings.updateMany(
  { status: { $in: ['PENDING_PAYMENT', 'REQUESTED', 'SEARCHING', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] } },
  { $set: { status: 'CANCELLED' } }
);
