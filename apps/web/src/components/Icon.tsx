import iconsUrl from '../../design/icons.svg?url';

// Only glyphs that exist in design/icons.svg.
export type IconName =
  | 'home'
  | 'kanban'
  | 'check'
  | 'cal'
  | 'user'
  | 'users'
  | 'bell'
  | 'search'
  | 'sliders'
  | 'plus'
  | 'filter'
  | 'flag'
  | 'clock'
  | 'tag'
  | 'msg'
  | 'trash'
  | 'store';

export function Icon({ name, size }: { name: IconName; size?: 'sm' | 'lg' }) {
  return (
    <svg className={size ? `icon icon-${size}` : 'icon'} aria-hidden="true">
      <use href={`${iconsUrl}#i-${name}`} />
    </svg>
  );
}
