import React, { useState, useRef } from 'react';
import { SimulatorAction } from '../../types/simulator';

interface Windows10SimulatorProps {
  recordAction: (action: Omit<SimulatorAction, 'participant_id' | 'session_id'>) => Promise<void>;
  showHint?: { highlight_selector?: string; animation_path?: Record<string, unknown>[] } | null;
}

export const Windows10Simulator: React.FC<Windows10SimulatorProps> = ({ recordAction, showHint }) => {
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [folders, setFolders] = useState<{ name: string; id: string }[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showExtensions, setShowExtensions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  
  const desktopRef = useRef<HTMLDivElement>(null);

  const handleClick = async (event: React.MouseEvent, elementId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    await recordAction({
      action_type: 'click',
      target_element: elementId,
      coordinates: { x: event.clientX - rect.left, y: event.clientY - rect.top }
    });

    if (elementId === '.taskbar-file-explorer') {
      setOpenWindows(prev => [...prev, 'file_explorer']);
    }
  };

  const handleRightClick = async (event: React.MouseEvent, elementId: string) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    
    await recordAction({
      action_type: 'right_click',
      target_element: elementId,
      coordinates: { x: event.clientX - rect.left, y: event.clientY - rect.top }
    });

    if (elementId === '.file-explorer-new-folder') {
      setContextMenu({ x: event.clientX, y: event.clientY, show: true });
    }
  };

  const createFolder = async () => {
    const newFolder = { name: 'PEKIT', id: `folder_${Date.now()}` };
    setFolders(prev => [...prev, newFolder]);
    setContextMenu({ x: 0, y: 0, show: false });
    
    await recordAction({
      action_type: 'click',
      target_element: '.context-menu-new-folder',
      action_metadata: { folder_created: 'PEKIT' }
    });
  };

  const renameFolder = async (folderId: string, newName: string) => {
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
    
    await recordAction({
      action_type: 'type',
      target_element: `.folder[data-name='${folderId}']`,
      input_value: newName,
      action_metadata: { folder_renamed: newName }
    });
  };

  const toggleExtensions = async () => {
    setShowExtensions(!showExtensions);
    
    await recordAction({
      action_type: 'click',
      target_element: '.view-menu',
      action_metadata: { extensions_visible: !showExtensions }
    });
  };

  const isHighlighted = (selector: string) => {
    return showHint?.highlight_selector === selector;
  };

  return (
    <div 
      ref={desktopRef}
      className="windows10-desktop"
      style={{
        width: '100%',
        height: '100%',
        backgroundImage: 'linear-gradient(135deg, #0078d4 0%, #106ebe 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={() => setContextMenu({ x: 0, y: 0, show: false })}
    >
      <div className="taskbar" style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '48px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        backdropFilter: 'blur(10px)'
      }}>
        <button
          className="start-button"
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
          onClick={(e) => handleClick(e, '.start-button')}
        >
          ⊞
        </button>
        
        <button
          className="taskbar-file-explorer"
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: isHighlighted('.taskbar-file-explorer') ? 'rgba(255, 255, 0, 0.3)' : 'transparent',
            border: isHighlighted('.taskbar-file-explorer') ? '2px solid yellow' : 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            borderRadius: '4px',
            marginLeft: '8px'
          }}
          onClick={(e) => handleClick(e, '.taskbar-file-explorer')}
          title="Esplora File"
        >
          📁
        </button>
      </div>

      {openWindows.includes('file_explorer') && (
        <div className="file-explorer-window" style={{
          position: 'absolute',
          top: '50px',
          left: '100px',
          width: '800px',
          height: '600px',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div className="window-header" style={{
            height: '40px',
            backgroundColor: '#f0f0f0',
            borderBottom: '1px solid #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderRadius: '8px 8px 0 0'
          }}>
            <span style={{ fontWeight: '500' }}>Esplora File</span>
            <button
              onClick={() => setOpenWindows(prev => prev.filter(w => w !== 'file_explorer'))}
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>

          <div className="toolbar" style={{
            height: '60px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '12px'
          }}>
            <button
              className="view-menu"
              style={{
                padding: '8px 16px',
                backgroundColor: isHighlighted('.view-menu') ? 'rgba(255, 255, 0, 0.3)' : '#e9ecef',
                border: isHighlighted('.view-menu') ? '2px solid yellow' : '1px solid #ced4da',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={toggleExtensions}
            >
              Visualizza
            </button>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={showExtensions}
                onChange={toggleExtensions}
              />
              Estensioni nomi file
            </label>
          </div>

          <div 
            className="file-explorer-content file-explorer-new-folder"
            style={{
              flex: 1,
              padding: '20px',
              backgroundColor: 'white',
              position: 'relative'
            }}
            onContextMenu={(e) => handleRightClick(e, '.file-explorer-new-folder')}
          >
            <div className="folders-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '16px'
            }}>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`folder`}
                  data-name={folder.name}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: selectedFolder === folder.id ? 'rgba(0, 120, 212, 0.1)' : 'transparent',
                    border: selectedFolder === folder.id ? '1px solid #0078d4' : '1px solid transparent'
                  }}
                  onClick={() => setSelectedFolder(folder.id)}
                  onDoubleClick={() => {
                    if (folder.name === 'PEKIT') {
                      renameFolder(folder.id, 'PEKIT_CANDIDATO');
                    }
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '4px' }}>📁</div>
                  <span style={{ fontSize: '12px', textAlign: 'center' }}>
                    {folder.name}{showExtensions ? '.folder' : ''}
                  </span>
                </div>
              ))}
            </div>

            {folders.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#6c757d',
                marginTop: '100px',
                fontSize: '16px'
              }}>
                Fai clic destro per creare una nuova cartella
              </div>
            )}
          </div>
        </div>
      )}

      {contextMenu.show && (
        <div
          className="context-menu"
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            zIndex: 1000,
            minWidth: '150px'
          }}
        >
          <button
            className="context-menu-new-folder"
            style={{
              width: '100%',
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={createFolder}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📁 Nuova cartella
          </button>
        </div>
      )}
    </div>
  );
};
