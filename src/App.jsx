import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { CouncilProvider } from './context/CouncilContext';
import { ProjectProvider } from './context/ProjectContext';
import Sidebar from './components/Sidebar';
import ChatView from './pages/ChatView';
import SettingsView from './pages/SettingsView';
import AutomationView from './pages/AutomationView';
import ProjectsView from './pages/ProjectsView';
import StudyView from './pages/StudyView';
import LoginView from './pages/LoginView';
import { StudyProvider } from './context/StudyContext';

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) return null;

    if (!user) return <LoginView />;

    return (
        <ProjectProvider>
            <CouncilProvider>
                <StudyProvider>
                    <div className="app-layout">
                        <Sidebar />
                        <main className="main-content">
                            <Routes>
                                <Route path="/" element={<ChatView />} />
                                <Route path="/study" element={<StudyView />} />
                                <Route path="/settings" element={<SettingsView />} />
                                <Route path="/automations" element={<AutomationView />} />
                                <Route path="/projects" element={<ProjectsView />} />
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </main>
                    </div>
                </StudyProvider>
            </CouncilProvider>
        </ProjectProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
