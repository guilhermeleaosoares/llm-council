import SourceManager from '../components/study/SourceManager';
import StudyMainArea from '../components/study/StudyMainArea';

export default function StudyView() {
    return (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <SourceManager />
            <StudyMainArea />
        </div>
    );
}
