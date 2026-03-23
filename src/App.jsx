import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { CouncilProvider } from './context/CouncilContext';
import { ProjectProvider } from './context/ProjectContext';
import { UsageProvider } from './context/UsageContext';
import Sidebar from './components/Sidebar';
import ChatView from './pages/ChatView';
import SettingsView from './pages/SettingsView';
import AutomationView from './pages/AutomationView';
import ProjectsView from './pages/ProjectsView';
import StudyView from './pages/StudyView';
import LoginView from './pages/LoginView';
import { StudyProvider } from './context/StudyContext';
import { SkillsProvider } from './context/SkillsContext';
import SkillsView from './pages/SkillsView';
import ConfigsView from './pages/ConfigsView';
import UsageView from './pages/UsageView';
import GuestDisclaimer from './components/GuestDisclaimer';

function AppRoutes() {
    const { user, isGuest, loading } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 769) {
                setSidebarCollapsed(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (loading) return null;

    if (!user && !isGuest) return <LoginView />;

    return (
        <SkillsProvider>
        <UsageProvider>
        <ProjectProvider>
            <CouncilProvider>
                <StudyProvider>
                    <GuestDisclaimer />
                    <div className="app-layout">
                        <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
                        <main className="main-content">
                            <Routes>
                                <Route path="/" element={<ChatView />} />
                                <Route path="/study" element={<StudyView />} />
                                <Route path="/projects" element={<ProjectsView />} />
                                <Route path="/automations" element={<AutomationView />} />
                                <Route path="/skills" element={<SkillsView />} />
                                <Route path="/configs" element={<ConfigsView />} />
                                <Route path="/usage" element={<UsageView />} />
                                <Route path="/settings" element={<SettingsView />} />
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </main>
                    </div>
                </StudyProvider>
            </CouncilProvider>
        </ProjectProvider>
        </UsageProvider>
        </SkillsProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
