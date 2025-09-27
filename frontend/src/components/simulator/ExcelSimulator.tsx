import React, { useState, useRef } from 'react';
import { SimulatorAction } from '../../types/simulator';

interface ExcelSimulatorProps {
  recordAction: (action: Omit<SimulatorAction, 'participant_id' | 'session_id'>) => Promise<void>;
  showHint?: { highlight_selector?: string; animation_path?: Record<string, unknown>[] } | null;
}

interface CellData {
  value: string;
  formula?: string;
}

export const ExcelSimulator: React.FC<ExcelSimulatorProps> = ({ recordAction, showHint }) => {
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [cells, setCells] = useState<Record<string, CellData>>({
    'A1': { value: 'Nome' },
    'B1': { value: 'Cognome' },
    'C1': { value: 'Presenze' },
    'A2': { value: 'Mario' },
    'B2': { value: 'Rossi' },
    'C2': { value: '15' },
    'A3': { value: 'Luigi' },
    'B3': { value: 'Verdi' },
    'C3': { value: '8' },
    'A4': { value: 'Anna' },
    'B4': { value: 'Bianchi' },
    'C4': { value: '12' },
  });
  const [, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [filterActive, setFilterActive] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  
  const tableRef = useRef<HTMLTableElement>(null);

  const handleClick = async (event: React.MouseEvent, elementId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    await recordAction({
      action_type: 'click',
      target_element: elementId,
      coordinates: { x: event.clientX - rect.left, y: event.clientY - rect.top }
    });

    switch (elementId) {
      case '.ribbon-tab-data':
        setActiveTab('data');
        break;
      case '.ribbon-tab-insert':
        setActiveTab('insert');
        break;
      case '.ribbon-tab-home':
        setActiveTab('home');
        break;
      case '.sort-az-button':
        handleSort('asc');
        break;
      case '.filter-button':
        setFilterActive(!filterActive);
        break;
      case '.insert-chart':
        setShowChart(true);
        break;
    }
  };

  const handleCellClick = async (cellId: string) => {
    setSelectedCell(cellId);
    await recordAction({
      action_type: 'click',
      target_element: `.cell-${cellId}`,
      action_metadata: { selected_cell: cellId }
    });
  };

  const handleCellEdit = async (cellId: string, value: string) => {
    setCells(prev => ({
      ...prev,
      [cellId]: { value }
    }));
    
    await recordAction({
      action_type: 'type',
      target_element: `.cell-${cellId}`,
      input_value: value,
      action_metadata: { cell_edited: cellId }
    });
  };

  const handleSort = (order: 'asc' | 'desc') => {
    setSortOrder(order);
    const dataRows = ['2', '3', '4'];
    const sortedRows = dataRows.sort((a, b) => {
      const valueA = cells[`B${a}`]?.value || '';
      const valueB = cells[`B${b}`]?.value || '';
      return order === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
    });
    
    const newCells = { ...cells };
    sortedRows.forEach((row, index) => {
      const newRow = (index + 2).toString();
      ['A', 'B', 'C'].forEach(col => {
        newCells[`${col}${newRow}`] = cells[`${col}${row}`];
      });
    });
    setCells(newCells);
  };

  const addSumFormula = async () => {
    const formula = '=SOMMA(C2:C4)';
    setCells(prev => ({
      ...prev,
      'C10': { value: '35', formula }
    }));
    setSelectedCell('C10');
    
    await recordAction({
      action_type: 'type',
      target_element: '.cell-C10',
      input_value: formula,
      action_metadata: { formula_added: 'SOMMA' }
    });
  };

  const isHighlighted = (selector: string) => {
    return showHint?.highlight_selector === selector;
  };

  const getCellValue = (cellId: string) => {
    return cells[cellId]?.value || '';
  };

  const getColumnLetter = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  const renderCell = (row: number, col: number) => {
    const cellId = `${getColumnLetter(col)}${row}`;
    const isSelected = selectedCell === cellId;
    const cellValue = getCellValue(cellId);
    
    return (
      <td
        key={cellId}
        className={`cell-${cellId}`}
        style={{
          border: '1px solid #d1d1d1',
          padding: '4px 8px',
          minWidth: '80px',
          height: '24px',
          backgroundColor: isSelected ? '#e3f2fd' : 'white',
          cursor: 'pointer',
          fontSize: '12px'
        }}
        onClick={() => handleCellClick(cellId)}
      >
        {cellValue}
      </td>
    );
  };

  return (
    <div className="excel-simulator" style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f3f2f1',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Title Bar */}
      <div className="title-bar" style={{
        height: '32px',
        backgroundColor: '#217346',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '14px'
      }}>
        <span>📊 Cartella1 - Excel</span>
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
              borderBottom: activeTab === 'home' ? '2px solid #217346' : 'none',
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
              borderBottom: activeTab === 'insert' ? '2px solid #217346' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-insert')}
          >
            Inserisci
          </button>
          <button
            className="ribbon-tab-data"
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === 'data' ? 'white' : 'transparent',
              borderBottom: activeTab === 'data' ? '2px solid #217346' : 'none',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onClick={(e) => handleClick(e, '.ribbon-tab-data')}
          >
            Dati
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
          {activeTab === 'data' && (
            <div className="data-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="sort-az-button"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.sort-az-button') ? 'rgba(255, 255, 0, 0.3)' : 'white',
                  borderColor: isHighlighted('.sort-az-button') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.sort-az-button') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.sort-az-button')}
                title="Ordina A→Z"
              >
                🔤 A→Z
              </button>
              
              <button
                className="filter-button"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.filter-button') ? 'rgba(255, 255, 0, 0.3)' : filterActive ? '#e3f2fd' : 'white',
                  borderColor: isHighlighted('.filter-button') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.filter-button') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.filter-button')}
                title="Filtro"
              >
                🔽 Filtro
              </button>
            </div>
          )}

          {activeTab === 'insert' && (
            <div className="insert-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="insert-chart"
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d1d1',
                  backgroundColor: isHighlighted('.insert-chart') ? 'rgba(255, 255, 0, 0.3)' : 'white',
                  borderColor: isHighlighted('.insert-chart') ? 'yellow' : '#d1d1d1',
                  borderWidth: isHighlighted('.insert-chart') ? '2px' : '1px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  borderRadius: '2px'
                }}
                onClick={(e) => handleClick(e, '.insert-chart')}
                title="Inserisci grafico"
              >
                📊 Grafico
              </button>
            </div>
          )}

          <div className="formula-group" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              className="sum-formula"
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d1d1',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                borderRadius: '2px'
              }}
              onClick={addSumFormula}
              title="Inserisci formula SOMMA"
            >
              Σ SOMMA
            </button>
          </div>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="formula-bar" style={{
        height: '24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #d1d1d1',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        fontSize: '12px'
      }}>
        <span style={{ minWidth: '60px', fontWeight: '500' }}>{selectedCell}</span>
        <input
          type="text"
          value={cells[selectedCell]?.formula || cells[selectedCell]?.value || ''}
          onChange={(e) => handleCellEdit(selectedCell, e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '2px 8px',
            fontSize: '12px'
          }}
        />
      </div>

      {/* Worksheet Area */}
      <div className="worksheet-area" style={{
        flex: 1,
        backgroundColor: 'white',
        overflow: 'auto',
        position: 'relative'
      }}>
        <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', height: '20px', backgroundColor: '#f0f0f0', border: '1px solid #d1d1d1' }}></th>
              {Array.from({ length: 10 }, (_, i) => (
                <th key={i} style={{
                  minWidth: '80px',
                  height: '20px',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #d1d1d1',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {getColumnLetter(i)}
                  {filterActive && i < 3 && (
                    <span style={{ marginLeft: '4px', fontSize: '10px' }}>🔽</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 15 }, (_, rowIndex) => {
              const row = rowIndex + 1;
              return (
                <tr key={row}>
                  <td style={{
                    width: '40px',
                    height: '24px',
                    backgroundColor: '#f0f0f0',
                    border: '1px solid #d1d1d1',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {row}
                  </td>
                  {Array.from({ length: 10 }, (_, colIndex) => renderCell(row, colIndex))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Chart Placeholder */}
        {showChart && (
          <div className="chart-placeholder" style={{
            position: 'absolute',
            top: '200px',
            right: '50px',
            width: '300px',
            height: '200px',
            backgroundColor: 'white',
            border: '2px solid #217346',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Grafico a Colonne</div>
            <div style={{ fontSize: '12px', color: '#666' }}>Dati: Presenze</div>
            <div style={{
              width: '200px',
              height: '100px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'end',
              justifyContent: 'space-around',
              borderBottom: '1px solid #ccc',
              borderLeft: '1px solid #ccc'
            }}>
              <div style={{ width: '30px', height: '75px', backgroundColor: '#217346', marginBottom: '2px' }}></div>
              <div style={{ width: '30px', height: '40px', backgroundColor: '#217346', marginBottom: '2px' }}></div>
              <div style={{ width: '30px', height: '60px', backgroundColor: '#217346', marginBottom: '2px' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Sheet Tabs */}
      <div className="sheet-tabs" style={{
        height: '24px',
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #d1d1d1',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px'
      }}>
        <div style={{
          padding: '2px 12px',
          backgroundColor: 'white',
          border: '1px solid #d1d1d1',
          borderBottom: 'none',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
          Foglio1
        </div>
      </div>
    </div>
  );
};
