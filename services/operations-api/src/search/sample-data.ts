import type { Booking, Trip } from './search.types';

export const SAMPLE_TRIPS: Trip[] = [
  { id: 'T-101', name: 'Paris, France – Romantic getaway', startDate: '2028-07-05', endDate: '2028-07-10' },
  { id: 'T-102', name: 'Tokyo, Japan – Cultural exploration', startDate: '2028-07-12', endDate: '2028-07-19' },
  { id: 'T-087', name: 'Sydney, Australia – Harbour week', startDate: '2028-06-02', endDate: '2028-06-09' },
  { id: 'T-079', name: 'Venice, Italy – Lagoon escape', startDate: '2028-05-14', endDate: '2028-05-20' },
  { id: 'T-071', name: 'Paris, France – Spring walking tour', startDate: '2028-04-22', endDate: '2028-04-28' },
  { id: 'T-058', name: 'Rome, Italy – Winter city break', startDate: '2028-02-10', endDate: '2028-02-15' },
];

export const SAMPLE_BOOKINGS: Booking[] = [
  { id: 'B-2041', name: 'Laurent family – Paris romantic getaway', tripId: 'T-101', status: 'Confirmed', bookedOn: '2028-06-03' },
  { id: 'B-2038', name: 'Okafor group – Tokyo cultural tour', tripId: 'T-102', status: 'Pending', bookedOn: '2028-05-29' },
  { id: 'B-2022', name: 'Nakamura couple – Sydney harbour week', tripId: 'T-087', status: 'Confirmed', bookedOn: '2028-05-11' },
  { id: 'B-2009', name: 'Bianchi wedding party – Venice lagoon', tripId: 'T-079', status: 'Confirmed', bookedOn: '2028-04-02' },
  { id: 'B-1987', name: 'Hughes party – Paris spring walking tour', tripId: 'T-071', status: 'Cancelled', bookedOn: '2028-03-14' },
  { id: 'B-1950', name: 'Ricci family – Rome winter city break', tripId: 'T-058', status: 'Confirmed', bookedOn: '2028-01-09' },
];
