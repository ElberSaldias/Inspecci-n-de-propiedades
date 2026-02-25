import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import IdentifyUnit from './pages/IdentifyUnit';
import ProcessSelection from './pages/ProcessSelection';
import Inspection from './pages/Inspection';
import Summary from './pages/Summary';
import Signatures from './pages/Signatures';
import Login from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="identify" element={<IdentifyUnit />} />
          <Route path="process" element={<ProcessSelection />} />
          <Route path="inspection/:unitId" element={<Inspection />} />
          <Route path="summary/:unitId" element={<Summary />} />
          <Route path="sign/:unitId" element={<Signatures />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
