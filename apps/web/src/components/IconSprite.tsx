import sprite from '../../design/icons.svg?raw';

export default function IconSprite() {
  return <div hidden dangerouslySetInnerHTML={{ __html: sprite }} />;
}
