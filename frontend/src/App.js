import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TeacherProvider, useTeacher } from './context/TeacherContext';
import { ThemeProvider } from './context/ThemeContext';
import TeacherLogin from './components/TeacherLogin';
import TeacherPortal from './pages/TeacherPortal';
import { Toaster } from './components/ui/sonner';

const Gate = () => {
  const { teacher } = useTeacher();
  return teacher ? <TeacherPortal /> : <TeacherLogin />;
};

function App() {
  return (
    <ThemeProvider>
      <TeacherProvider>
        <BrowserRouter basename={process.env.PUBLIC_URL || ''}>
          <Routes>
            <Route path="/" element={<Gate />} />
            <Route path="*" element={<Gate />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="bottom-right" />
      </TeacherProvider>
    </ThemeProvider>
  );
}

export default App;
