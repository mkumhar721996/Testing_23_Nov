// Mirrors services/operations-api/openapi.yaml (Trip, Booking, SearchResults).
export type Trip = { id: string; name: string; startDate: string; endDate: string };
export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled';
export type Booking = {
  id: string;
  name: string;
  tripId: string;
  status: BookingStatus;
  bookedOn: string;
};
export type SearchResults = { trips: Trip[]; bookings: Booking[] };
