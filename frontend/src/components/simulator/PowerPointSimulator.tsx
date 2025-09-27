import React, { useState, useRef } from 'react';
import { SimulatorAction } from '../../types/simulator';

interface PowerPointSimulatorProps {
  recordAction: (action: Omit<SimulatorAction, 'participant_id' | 'session_id'>) => Promise<void>;
  showHint?: { highlight_selector?: string; animation_path?: Record<string, unknown>[] } | null;
}

interface Slide {
  id: number;
  title: string;
  content: string;
  layout: 'title' | 'title-content' | 'content';
  hasImage: boolean;
}

export const PowerPointSimulator: React.FC<PowerPointSimulatorProps> = ({ recordAction, showHint }) => {
  const [slides, setSlides] = useState<Slide[]>([
    { id: 1, title: 'Titolo Presentazione', content: 'Sottotitolo', layout: 'title', hasImage: false },
    { id: 2, title: 'Slide 2', content: 'Contenuto della slide', layout: 'title-content', hasImage: false }
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [transition, setTransition] = useState('none');
  const [isPresenting, setIsPresenting] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  
  const slideRef = useRef<HTMLDivElement>(null);

  const handleClick = async (event: React.MouseEvent, elementId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    await recordAction({
      action_type: 'click',
      target_element: elementId,
      coordinates: { x: event.clientX - rect.left, y: event.clientY - rect.top }
    });

    switch (elementId) {
      case '.ribbon-tab-design':
        setActiveTab('design');
        break;
      case '.ribbon-tab-transitions':
        setActiveTab('transitions');
        break;
      case '.ribbon-tab-slideshow':
        setActiveTab('slideshow');
        break;
      case '.ribbon-tab-home':
        setActiveTab('home');
        break;
      case '.layout-button':
        setShowLayoutMenu(!showLayoutMenu);
        break;
      case '.layout-title-content':
        updateSlideLayout('title-content');
        setShowLayoutMenu(false);
        break;
      case '.insert-image':
        insertImage();
        break;
      case '.transition-fade':
        setTransition('fade');
        break;
      case '.start-slideshow':
        setIsPresenting(true);
        break;
      case '.exit-slideshow':
        setIsPresenting(false);
        break;
    }
  };

  const updateSlideLayout = (layout: 'title' | 'title-content' | 'content') => {
    setSlides(prev => prev.map((slide, index) => 
      index === currentSlide ? { ...slide, layout } : slide
    ));
  };

  const insertImage = () => {
    setSlides(prev => prev.map((slide, index) => 
      index === currentSlide ? { ...slide, hasImage: true } : slide
    ));
  };

  const handleSlideClick = async (slideIndex: number) => {
    setCurrentSlide(slideIndex);
    await recordAction({
      action_type: 'click',
      target_element: `.slide-thumbnail-${slideIndex}`,
      action_metadata: { slide_selected: slideIndex }
    });
  };

  const handleSlideEdit = async (field: 'title' | 'content', value: string) => {
    setSlides(prev => prev.map((slide, index) => 
      index === currentSlide ? { ...slide, [field]: value } : slide
    ));
    
    await recordAction({
      action_type: 'type',
      target_element: `.slide-${field}`,
      input_value: value,
      action_metadata: { slide_edited: currentSlide, field }
    });
  };

  const isHighlighted = (selector: string) => {
    return showHint?.highlight_selector === selector;
  };

  const getCurrentSlide = () => slides[currentSlide] || slides[0];

  if (isPresenting) {
    return (
      <div className="presentation-mode" style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div className="slide-presentation" style={{
          width: '80%',
          height: '80%',
          backgroundColor: 'white',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '24px'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>
            {getCurrentSlide().title}
          </h1>
          <p style={{ fontSize: '24px', textAlign: 'center' }}>
            {getCurrentSlide().content}
          </p>
          {getCurrentSlide().hasImage && (
            <div style={{
              width: '200px',
              height: '150px',
              backgroundColor: '#f0f0f0',
              border: '2px dashed #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '20px',
              fontSize: '16px',
              color: '#666'
            }}>
              🖼️ Immagine
            </div>
          )}
        </div>
        
        <button
          className="exit-slideshow"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={(e) => handleClick(e, '.exit-slideshow')}
        >
          Esci
        </button>
      </div>
    );
  }

  return (
    <div className="powerpoint-simulator" style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f3f2f1',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Title Bar */}
      <div className="title-bar" style={{
        height: '32px',
        backgroundColor: '#d83b01',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '14px'
      }}>
        <span>📊 Presentazione1 - PowerPoint</span>
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
              borderBottom: activeTab === 'home' ? '2px solid #d83b01' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-home')}
          >
            Home
          </button>
          <button
            className="ribbon-tab-design"
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === 'design' ? 'white' : 'transparent',
              borderBottom: activeTab === 'design' ? '2px solid #d83b01' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-design')}
          >
            Progettazione
          </button>
          <button
            className="ribbon-tab-transitions"
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === 'transitions' ? 'white' : 'transparent',
              borderBottom: activeTab === 'transitions' ? '2px solid #d83b01' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-transitions')}
          >
            Transizioni
          </button>
          <button
            className="ribbon-tab-slideshow"
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === 'slideshow' ? 'white' : 'transparent',
              borderBottom: activeTab === 'slideshow' ? '2px solid #d83b01' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-slideshow')}
          >
            Presentazione
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
            <div className="home-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="layout-button"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.layout-button') ? 'rgba(255, 255, 0, 0.3)' : 'white',
                  borderColor: isHighlighted('.layout-button') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.layout-button') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.layout-button')}
                title="Layout"
              >
                📐 Layout
              </button>
              
              <button
                className="insert-image"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.insert-image') ? 'rgba(255, 255, 0, 0.3)' : 'white',
                  borderColor: isHighlighted('.insert-image') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.insert-image') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.insert-image')}
                title="Inserisci immagine"
              >
                🖼️ Immagine
              </button>
            </div>
          )}

          {activeTab === 'transitions' && (
            <div className="transitions-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="transition-fade"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.transition-fade') ? 'rgba(255, 255, 0, 0.3)' : transition === 'fade' ? '#e3f2fd' : 'white',
                  borderColor: isHighlighted('.transition-fade') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.transition-fade') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.transition-fade')}
                title="Dissolvenza"
              >
                ✨ Dissolvenza
              </button>
            </div>
          )}

          {activeTab === 'slideshow' && (
            <div className="slideshow-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="start-slideshow"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.start-slideshow') ? 'rgba(255, 255, 0, 0.3)' : 'white',
                  borderColor: isHighlighted('.start-slideshow') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.start-slideshow') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.start-slideshow')}
                title="Avvia presentazione"
              >
                ▶️ Presenta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content" style={{
        flex: 1,
        display: 'flex'
      }}>
        {/* Slide Thumbnails */}
        <div className="slide-thumbnails" style={{
          width: '200px',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #d1d1d1',
          padding: '16px 8px',
          overflowY: 'auto'
        }}>
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`slide-thumbnail-${index}`}
              style={{
                width: '100%',
                height: '120px',
                backgroundColor: index === currentSlide ? '#e3f2fd' : 'white',
                border: index === currentSlide ? '2px solid #d83b01' : '1px solid #d1d1d1',
                borderRadius: '4px',
                marginBottom: '8px',
                cursor: 'pointer',
                padding: '8px',
                fontSize: '10px',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={() => handleSlideClick(index)}
            >
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                {index + 1}. {slide.title}
              </div>
              <div style={{ fontSize: '8px', color: '#666', flex: 1 }}>
                {slide.content}
              </div>
              {slide.hasImage && (
                <div style={{ fontSize: '8px', color: '#666', marginTop: '4px' }}>
                  🖼️ Con immagine
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Slide Editor */}
        <div className="slide-editor" style={{
          flex: 1,
          backgroundColor: '#e5e5e5',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div
            ref={slideRef}
            className="slide-canvas"
            style={{
              width: '720px',
              height: '540px',
              backgroundColor: 'white',
              boxShadow: '0 0 20px rgba(0,0,0,0.1)',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: getCurrentSlide().layout === 'title' ? 'center' : 'flex-start'
            }}
          >
            {getCurrentSlide().layout === 'title' && (
              <>
                <input
                  className="slide-title"
                  type="text"
                  value={getCurrentSlide().title}
                  onChange={(e) => handleSlideEdit('title', e.target.value)}
                  style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    marginBottom: '20px',
                    width: '100%'
                  }}
                  placeholder="Fai clic per aggiungere il titolo"
                />
                <input
                  className="slide-content"
                  type="text"
                  value={getCurrentSlide().content}
                  onChange={(e) => handleSlideEdit('content', e.target.value)}
                  style={{
                    fontSize: '24px',
                    textAlign: 'center',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    width: '100%'
                  }}
                  placeholder="Fai clic per aggiungere il sottotitolo"
                />
              </>
            )}

            {getCurrentSlide().layout === 'title-content' && (
              <>
                <input
                  className="slide-title"
                  type="text"
                  value={getCurrentSlide().title}
                  onChange={(e) => handleSlideEdit('title', e.target.value)}
                  style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    marginBottom: '30px',
                    width: '100%'
                  }}
                  placeholder="Fai clic per aggiungere il titolo"
                />
                
                <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                  <textarea
                    className="slide-content"
                    value={getCurrentSlide().content}
                    onChange={(e) => handleSlideEdit('content', e.target.value)}
                    style={{
                      fontSize: '18px',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      flex: 1,
                      resize: 'none'
                    }}
                    placeholder="Fai clic per aggiungere il contenuto"
                  />
                  
                  {getCurrentSlide().hasImage && (
                    <div style={{
                      width: '250px',
                      height: '200px',
                      backgroundColor: '#f0f0f0',
                      border: '2px dashed #ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      color: '#666'
                    }}>
                      🖼️ Immagine inserita
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Layout Menu */}
          {showLayoutMenu && (
            <div className="layout-menu" style={{
              position: 'absolute',
              top: '80px',
              left: '40px',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              zIndex: 1000,
              minWidth: '200px',
              padding: '8px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', padding: '4px' }}>
                Layout diapositiva
              </div>
              <button
                className="layout-title-content"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  marginBottom: '4px'
                }}
                onClick={(e) => handleClick(e, '.layout-title-content')}
              >
                📄 Titolo e contenuto
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar" style={{
        height: '24px',
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #d1d1d1',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '12px',
        justifyContent: 'space-between'
      }}>
        <span>Diapositiva {currentSlide + 1} di {slides.length}</span>
        <span>Transizione: {transition === 'fade' ? 'Dissolvenza' : 'Nessuna'}</span>
      </div>
    </div>
  );
};
