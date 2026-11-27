import { ComingSoonProvider } from './components/ComingSoonDialog';
import IconSprite from './components/IconSprite';
import TopBar from './components/TopBar';
import CreateDefectPage from './defects/CreateDefectPage';
import DefectPage from './defects/DefectPage';
import MyWorkPage from './my-work/MyWorkPage';
import { useMyWork } from './my-work/useMyWork';
import { useRoute } from './routes';

function CreateDefectRoute() {
  const { state } = useMyWork();
  return <CreateDefectPage projects={state.status === 'ready' ? state.data.projects : []} />;
}

export default function App() {
  const route = useRoute();
  return (
    <ComingSoonProvider>
      <IconSprite />
      <TopBar />
      {route.name === 'my-work' && <MyWorkPage />}
      {route.name === 'create-defect' && <CreateDefectRoute />}
      {route.name === 'defect' && <DefectPage id={route.id} />}
    </ComingSoonProvider>
  );
}
