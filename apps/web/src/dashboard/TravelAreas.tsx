const AREAS = [
  { id: 'packages', label: 'Packages' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'travelers', label: 'Travelers' },
  { id: 'guides', label: 'Guides' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'messages', label: 'Messages' },
  { id: 'deals', label: 'Deals' },
  { id: 'feedback', label: 'Feedback' },
];

export default function TravelAreas({ onComingSoon }: { onComingSoon: (featureName: string) => void }) {
  return (
    <nav className="areas" aria-label="Travel areas">
      {AREAS.map((area) => (
        <button className="btn btn-secondary" type="button" key={area.id} onClick={() => onComingSoon(area.label)}>
          {area.label}
        </button>
      ))}
    </nav>
  );
}
