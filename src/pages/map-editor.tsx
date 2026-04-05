import { RTSMapEditor } from '@/components/rts-map-editor';

export default function MapEditorPage() {
  return (
    <div className="h-full p-4 overflow-auto">
      <RTSMapEditor width={60} height={40} />
    </div>
  );
}
