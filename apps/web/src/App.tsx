import { AppShell } from './components/AppShell';
import { ExpenseCategoriesPage } from './pages/ExpenseCategoriesPage';

export default function App() {
  return (
    <AppShell current="settings">
      <ExpenseCategoriesPage />
    </AppShell>
  );
}
