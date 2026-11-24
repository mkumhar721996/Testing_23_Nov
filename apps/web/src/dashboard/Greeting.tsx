import { greetingText } from './greeting';

export default function Greeting({ name, now }: { name: string | null; now: Date }) {
  return <h1 className="page-title">{greetingText(now, name)}</h1>;
}
