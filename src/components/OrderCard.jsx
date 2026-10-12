import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
    AlertTriangle,
    Pause,
    Play,
    Lock,
    ImageIcon,
    ArrowLeft,
    ArrowRight,
    Calendar,
    Truck,
    CheckCircle2
} from 'lucide-react';

const OrderCard = ({
                       order,
                       index,
                       column,
                       columns = [],
                       currentTime,
                       isGerente,
                       canModifyOrder,
                       handlePauseOrder,
                       handleResumeOrder,
                       handleRetrocedeOrder,
                       handleAdvanceOrder,
                       setSelectedOrder
                   }) => {
    const isLocked = !canModifyOrder(order.status);
    const stationDeadline = order.stationDeadlines?.[order.status] || order.deadline;
    const isOverdue = stationDeadline && new Date(stationDeadline) < currentTime;
    const hasEvidence = order.evidence && order.evidence.length > 0;

    const currentIndex = columns.indexOf(column);
    const isLastColumn = currentIndex === columns.length - 1;
    const nextColumn = !isLastColumn && currentIndex >= 0 ? columns[currentIndex + 1] : null;
    const prevColumn = currentIndex > 0 ? columns[currentIndex - 1] : null;

    // Detectar si la siguiente estación es Despacho o Entrega final
    const isNextDespacho = nextColumn && nextColumn.toLowerCase().includes('despacho');

    return (
        <Draggable draggableId={String(order.id)} index={index} isDragDisabled={isLocked || order.estaPausada}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onClick={() => setSelectedOrder({ ...order, isLocked })}
                    className={`bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 border-l-4 transition-all relative group print:break-inside-avoid print:border ${
                        order.estaPausada
                            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400'
                            : isLocked
                                ? 'cursor-not-allowed opacity-85 hover:bg-slate-50'
                                : 'cursor-grab hover:shadow-md hover:border-slate-300'
                    } ${
                        order.overrideRequested
                            ? 'border-orange-500 ring-2 ring-orange-300 bg-orange-50'
                            : isOverdue
                                ? 'border-red-600 ring-1 ring-red-500'
                                : order.type === 'Gran Formato'
                                    ? 'border-l-purple-500'
                                    : 'border-l-cyan-500'
                    } ${snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105 z-50 ring-2 ring-blue-500' : ''}`}
                >
                    {/* Cabecera de la Tarjeta */}
                    <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-1.5">
              <span
                  className={`font-mono font-black text-xs px-2 py-0.5 rounded ${
                      order.type === 'Gran Formato'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                  }`}
              >
                #{order.id}
              </span>
                            {order.urgent && (
                                <span className="flex items-center gap-0.5 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  URGENTE
                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1 print:hidden" onClick={(e) => e.stopPropagation()}>
                            {order.estaPausada ? (
                                <button
                                    type="button"
                                    onClick={() => handleResumeOrder(order)}
                                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow animate-pulse cursor-pointer"
                                >
                                    <Play className="w-3 h-3 fill-current" /> {isGerente ? 'Reanudar' : 'Pausada'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handlePauseOrder(order)}
                                    className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Pausar orden"
                                >
                                    <Pause className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {isLocked && <Lock className="w-3.5 h-3.5 text-slate-400" title="Bloqueado" />}
                            {hasEvidence && <ImageIcon className="w-3.5 h-3.5 text-emerald-600" title="Evidencia visual" />}
                        </div>
                    </div>

                    {/* Alerta de Pausa */}
                    {order.estaPausada && (
                        <div className="bg-amber-100/80 border border-amber-300 p-1.5 rounded-lg text-[10px] text-amber-900 mb-2 font-medium">
                            ⚠️ <strong>Pausada:</strong> {order.motivoPausa || 'En espera de material/aprobación'}
                        </div>
                    )}

                    {/* Datos del Cliente y Producto */}
                    <h3 className="font-bold text-slate-900 leading-snug text-sm mb-0.5 line-clamp-1" title={order.client}>
                        {order.client}
                    </h3>
                    <p className="text-xs text-slate-500 mb-2.5 font-medium truncate" title={order.product}>
                        {order.product}
                    </p>

                    {/* Metadatos (Responsable y Tiempo) */}
                    <div className="flex flex-col gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 p-2 rounded-lg mb-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">Responsable:</span>
                            <strong className="text-blue-700 font-medium truncate max-w-[140px]">
                                {order.assigned || 'Sin asignar'}
                            </strong>
                        </div>
                        {stationDeadline && (
                            <div className={`flex justify-between items-center pt-1 border-t border-slate-200/60 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                                <span className="text-slate-400 text-[10px] uppercase font-semibold">Entrega Área:</span>
                                <span className="font-mono text-[10px] flex items-center gap-1">
                  <Calendar className="w-3 h-3 opacity-70" />
                                    {new Date(stationDeadline).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                            </div>
                        )}
                    </div>

                    {/* BARRA DE ACCIÓN RÁPIDA 1-CLIC */}
                    {!isLocked && !order.estaPausada && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 print:hidden" onClick={(e) => e.stopPropagation()}>

                            {/* Botón sutil de retroceso */}
                            {currentIndex > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleRetrocedeOrder(order)}
                                    className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-xs transition-colors flex items-center justify-center cursor-pointer border border-slate-200"
                                    title={`Devolver a: ${prevColumn}`}
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Botón principal de avance contextual */}
                            {!isLastColumn ? (
                                <button
                                    type="button"
                                    onClick={() => handleAdvanceOrder(order)}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                                        isNextDespacho
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/20'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-700/20'
                                    }`}
                                    title={`Mover inmediatamente a: ${nextColumn}`}
                                >
                                    {isNextDespacho ? (
                                        <>
                                            <Truck className="w-3.5 h-3.5" />
                                            <span>A Despacho</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="truncate">A {nextColumn}</span>
                                            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="flex-1 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-center text-[11px] font-bold flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Estación Final</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );
};

export default OrderCard;