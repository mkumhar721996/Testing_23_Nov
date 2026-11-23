import iconsUrl from '../../design/icons.svg?url';

export type IconName = 'plus' | 'home' | 'kanban' | 'check' | 'sliders' | 'search' | 'bell';

/** Decorative glyph from the project's sprite; pair it with text or an aria-label on its control. */
export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" aria-hidden="true">
      <use href={`${iconsUrl}#i-${name}`} />
    </svg>
  );
}
