export type Trip = { id: string; name: string; startDate: string; endDate: string }; // ISO dates
export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled';
export type Booking = {
  id: string;
  name: string;
  tripId: string;
  status: BookingStatus;
  bookedOn: string; // ISO date
};
export type SearchResults = { trips: Trip[]; bookings: Booking[] };
