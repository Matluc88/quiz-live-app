import React, { useState, useRef } from 'react';
import { SimulatorAction } from '../../types/simulator';

interface WordSimulatorProps {
  recordAction: (action: Omit<SimulatorAction, 'participant_id' | 'session_id'>) => Promise<void>;
  showHint?: { highlight_selector?: string; animation_path?: Record<string, unknown>[] } | null;
}

export const WordSimulator: React.FC<WordSimulatorProps> = ({ recordAction, showHint }) => {
  const [documentContent] = useState('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.');
  const [, setSelectedText] = useState('');
  const [margins, setMargins] = useState('normal');
  const [lineSpacing, setLineSpacing] = useState('1.0');
  const [alignment, setAlignment] = useState('left');
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [showMarginsDialog, setShowMarginsDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const documentRef = useRef<HTMLDivElement>(null);

  const handleClick = async (event: React.MouseEvent, elementId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    await recordAction({
      action_type: 'click',
      target_element: elementId,
      coordinates: { x: event.clientX - rect.left, y: event.clientY - rect.top }
    });

    switch (elementId) {
      case '.ribbon-tab-layout':
        setActiveTab('layout');
        break;
      case '.ribbon-tab-insert':
        setActiveTab('insert');
        break;
      case '.ribbon-tab-home':
        setActiveTab('home');
        break;
      case '.margins-button':
        setShowMarginsDialog(true);
        break;
      case '.margins-normal':
        setMargins('normal');
        setShowMarginsDialog(false);
        break;
      case '.line-spacing-1-5':
        setLineSpacing('1.5');
        break;
      case '.justify-button':
        setAlignment('justify');
        break;
      case '.insert-header':
        setShowPageNumbers(true);
        break;
      case '.save-as-pdf':
        setShowSaveDialog(true);
        break;
    }
  };

  const handleTextSelection = async () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      setSelectedText(selection.toString());
      await recordAction({
        action_type: 'text_selection',
        target_element: '.document-content',
        input_value: selection.toString()
      });
    }
  };

  const isHighlighted = (selector: string) => {
    return showHint?.highlight_selector === selector;
  };

  const getMarginStyle = () => {
    switch (margins) {
      case 'normal':
        return { padding: '96px 72px' }; // 1 inch margins
      case 'narrow':
        return { padding: '48px 36px' };
      case 'wide':
        return { padding: '144px 108px' };
      default:
        return { padding: '96px 72px' };
    }
  };

  const getLineHeightStyle = () => {
    switch (lineSpacing) {
      case '1.0':
        return { lineHeight: '1.0' };
      case '1.5':
        return { lineHeight: '1.5' };
      case '2.0':
        return { lineHeight: '2.0' };
      default:
        return { lineHeight: '1.0' };
    }
  };

  const getTextAlignStyle = () => {
    return { textAlign: alignment as React.CSSProperties['textAlign'] };
  };

  return (
    <div className="word-simulator" style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f3f2f1',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Title Bar */}
      <div className="title-bar" style={{
        height: '32px',
        backgroundColor: '#0078d4',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '14px'
      }}>
        <span>📄 Documento1 - Word</span>
      </div>

      {/* Ribbon */}
      <div className="ribbon" style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #d1d1d1'
      }}>
        {/* Ribbon Tabs */}
        <div className="ribbon-tabs" style={{
          display: 'flex',
          borderBottom: '1px solid #d1d1d1',
          backgroundColor: '#f8f9fa'
        }}>
          <button
            className="ribbon-tab-home"
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === 'home' ? 'white' : 'transparent',
              borderBottom: activeTab === 'home' ? '2px solid #0078d4' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-home')}
          >
            Home
          </button>
          <button
            className="ribbon-tab-insert"
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === 'insert' ? 'white' : 'transparent',
              borderBottom: activeTab === 'insert' ? '2px solid #0078d4' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-insert')}
          >
            Inserisci
          </button>
          <button
            className="ribbon-tab-layout"
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === 'layout' ? 'white' : 'transparent',
              borderBottom: activeTab === 'layout' ? '2px solid #0078d4' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-layout')}
          >
            Layout
          </button>
        </div>

        {/* Ribbon Content */}
        <div className="ribbon-content" style={{
          padding: '12px 16px',
          backgroundColor: 'white',
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          {activeTab === 'home' && (
            <>
              <div className="formatting-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="line-spacing-1-5"
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d1d1',
                    backgroundColor: isHighlighted('.line-spacing-1-5') ? 'rgba(255, 255, 0, 0.3)' : lineSpacing === '1.5' ? '#e3f2fd' : 'white',
                    borderColor: isHighlighted('.line-spacing-1-5') ? 'yellow' : '#d1d1d1',
                    borderWidth: isHighlighted('.line-spacing-1-5') ? '2px' : '1px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    borderRadius: '2px'
                  }}
                  onClick={(e) => handleClick(e, '.line-spacing-1-5')}
                  title="Interlinea 1,5"
                >
                  📏 1,5
                </button>
                
                <button
                  className="justify-button"
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d1d1',
                    backgroundColor: isHighlighted('.justify-button') ? 'rgba(255, 255, 0, 0.3)' : alignment === 'justify' ? '#e3f2fd' : 'white',
                    borderColor: isHighlighted('.justify-button') ? 'yellow' : '#d1d1d1',
                    borderWidth: isHighlighted('.justify-button') ? '2px' : '1px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    borderRadius: '2px'
                  }}
                  onClick={(e) => handleClick(e, '.justify-button')}
                  title="Giustifica"
                >
                  ≡
                </button>
              </div>
            </>
          )}

          {activeTab === 'insert' && (
            <div className="insert-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="insert-header"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.insert-header') ? 'rgba(255, 255, 0, 0.3)' : 'white',
                  borderColor: isHighlighted('.insert-header') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.insert-header') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.insert-header')}
                title="Intestazione e piè di pagina"
              >
                📄 Intestazione
              </button>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="layout-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="margins-button"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.margins-button') ? 'rgba(255, 255, 0, 0.3)' : 'white',
                  borderColor: isHighlighted('.margins-button') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.margins-button') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.margins-button')}
                title="Margini"
              >
                📐 Margini
              </button>
            </div>
          )}

          <div className="file-group" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              className="save-as-pdf"
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d1d1',
                backgroundColor: isHighlighted('.save-as-pdf') ? 'rgba(255, 255, 0, 0.3)' : 'white',
                borderColor: isHighlighted('.save-as-pdf') ? 'yellow' : '#d1d1d1',
                borderWidth: isHighlighted('.save-as-pdf') ? '2px' : '1px',
                cursor: 'pointer',
                fontSize: '12px',
                borderRadius: '2px'
              }}
              onClick={(e) => handleClick(e, '.save-as-pdf')}
              title="Salva come PDF"
            >
              💾 PDF
            </button>
          </div>
        </div>
      </div>

      {/* Document Area */}
      <div className="document-area" style={{
        flex: 1,
        backgroundColor: '#e5e5e5',
        padding: '20px',
        overflow: 'auto'
      }}>
        <div className="document-page" style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: 'white',
          margin: '0 auto',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
          position: 'relative',
          ...getMarginStyle()
        }}>
          {showPageNumbers && (
            <div className="header" style={{
              position: 'absolute',
              top: '20px',
              right: '72px',
              fontSize: '12px',
              color: '#666'
            }}>
              Pagina 1
            </div>
          )}
          
          <div
            ref={documentRef}
            className="document-content"
            style={{
              fontSize: '12pt',
              fontFamily: 'Calibri, sans-serif',
              ...getLineHeightStyle(),
              ...getTextAlignStyle()
            }}
            onMouseUp={handleTextSelection}
            contentEditable
            suppressContentEditableWarning={true}
          >
            {documentContent}
          </div>
        </div>
      </div>

      {/* Margins Dialog */}
      {showMarginsDialog && (
        <div className="margins-dialog" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000,
          minWidth: '300px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Margini</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              className="margins-normal"
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d1d1',
                backgroundColor: margins === 'normal' ? '#e3f2fd' : 'white',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '2px'
              }}
              onClick={(e) => handleClick(e, '.margins-normal')}
            >
              📐 Normali (2,54 cm)
            </button>
            <button
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d1d1',
                backgroundColor: 'white',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '2px'
              }}
              onClick={() => setShowMarginsDialog(false)}
            >
              Stretti (1,27 cm)
            </button>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button
              onClick={() => setShowMarginsDialog(false)}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d1d1',
                backgroundColor: 'white',
                cursor: 'pointer',
                borderRadius: '2px'
              }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="save-dialog" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000,
          minWidth: '400px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Salva con nome</h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Nome file:</label>
            <input
              type="text"
              defaultValue="Documento1.pdf"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d1d1',
                borderRadius: '2px'
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Tipo file:</label>
            <select style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d1d1',
              borderRadius: '2px'
            }}>
              <option value="pdf">PDF (*.pdf)</option>
              <option value="docx">Word Document (*.docx)</option>
            </select>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowSaveDialog(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d1d1',
                backgroundColor: 'white',
                cursor: 'pointer',
                borderRadius: '2px'
              }}
            >
              Annulla
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #0078d4',
                backgroundColor: '#0078d4',
                color: 'white',
                cursor: 'pointer',
                borderRadius: '2px'
              }}
            >
              Salva
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
