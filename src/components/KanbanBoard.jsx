import { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, X, Plus, Search, Filter, Shield, Eye, Trash2, Printer, Maximize, Minimize, Activity, LogOut, Users, Mail, CalendarClock, AlertTriangle, Bell, Loader2, Info, UploadCloud, ImageIcon } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const defaultOrders = [
    {
        id: 'WF-101', client: 'Coca Cola', material: 'Lona 13oz', size: '3x2m', status: 'Pre-prensa', assigned: 'Ana (Diseño)', urgent: false, notes: 'Revisar perfil de color.', createdAt: 'Hace 2 días', deadline: '2026-10-20T17:00', evidence: []
    },
    {
        id: 'WF-102', client: 'Banco Pichincha', material: 'Vinil Adhesivo', size: '1x1m', status: 'Impresión', assigned: 'Carlos (Impresión)', urgent: true, notes: 'Entrega prioritaria.', createdAt: 'Ayer', deadline: '2026-10-01T12:00', evidence: []
    }
];

const columns = ['Pre-prensa', 'Impresión', 'Acabados', 'Despacho'];

const getMaterialColor = (material) => {
    switch (material) {
        case 'Lona 13oz': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'Vinil Adhesivo': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'Microperforado': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'Acrílico': return 'bg-amber-100 text-amber-700 border-amber-200';
        default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
};

const KanbanBoard = ({ currentUser, onLogout, users, setUsers }) => {
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('wideformat_orders_pro');
        return saved ? JSON.parse(saved) : defaultOrders;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUrgent, setFilterUrgent] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // === SISTEMA UI DE DIÁLOGOS MODERNOS ===
    const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: () => {} });

    const closeDialog = () => setDialog({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: () => {} });

    const showAlert = (title, message) => setDialog({ isOpen: true, type: 'alert', title, message, inputValue: '', onConfirm: closeDialog });

    const showConfirm = (title, message, onConfirm) => setDialog({ isOpen: true, type: 'confirm', title, message, inputValue: '', onConfirm });

    const showPrompt = (title, message, onConfirm) => setDialog({ isOpen: true, type: 'prompt', title, message, inputValue: '', onConfirm });

    const [newFormData, setNewFormData] = useState({ client: '', material: 'Lona 13oz', size: '', assigned: currentUser.name, urgent: false, notes: '', deadline: '' });
    const [newUserParams, setNewUserParams] = useState({ username: '', password: '', role: 'Operario', name: '' });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('wideformat_orders_pro', JSON.stringify(orders));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                showAlert("Memoria Llena", "Se ha alcanzado el límite de memoria del prototipo. Por favor, elimine algunas órdenes o fotos.");
            }
        }
    }, [orders]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    const handlePrint = () => window.print();

    // === MOTOR DE GOBERNANZA ===
    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const sourceIndex = columns.indexOf(source.droppableId);
        const destinationIndex = columns.indexOf(destination.droppableId);

        if (destinationIndex < sourceIndex) {
            if (currentUser.role === 'Gerente') {
                showPrompt(
                    "Acción Gerencial",
                    "Ingrese el motivo para forzar el retroceso de esta orden:",
                    (reason) => {
                        const updatedOrders = orders.map(o => o.id === draggableId ? { ...o, status: destination.droppableId, notes: `${o.notes} | ⚠ Retroceso por Gerencia: ${reason}` } : o);
                        setOrders(updatedOrders);
                        closeDialog();
                    }
                );
                return;
            } else {
                showPrompt(
                    "Autorización Requerida",
                    `Para devolver esta orden a "${destination.droppableId}", requiere autorización del Gerente.\nIndique el motivo:`,
                    (reason) => {
                        const updatedOrders = orders.map(o => o.id === draggableId ? { ...o, overrideRequested: true, requestedStatus: destination.droppableId, overrideReason: reason } : o);
                        setOrders(updatedOrders);
                        closeDialog();
                        showAlert("Solicitud Enviada", "La solicitud fue enviada a Gerencia. La orden permanecerá en espera de aprobación.");
                    }
                );
                return;
            }
        }

        if (destinationIndex > sourceIndex + 1) {
            showAlert("Restricción del Sistema", "El proceso debe ser secuencial. No puede saltarse áreas de producción.");
            return;
        }

        const updatedOrders = orders.map(order => order.id === draggableId ? { ...order, status: destination.droppableId } : order);
        setOrders(updatedOrders);
    };

    const handleApproveOverride = (orderId, requestedStatus, reason) => {
        const updatedOrders = orders.map(o => o.id === orderId ? {
            ...o, status: requestedStatus, overrideRequested: false, requestedStatus: null, overrideReason: null, notes: `${o.notes} | ✅ Aprobado retroceso a ${requestedStatus}: ${reason}`
        } : o);
        setOrders(updatedOrders);
        setSelectedOrder(null);
    };

    const handleRejectOverride = (orderId) => {
        const updatedOrders = orders.map(o => o.id === orderId ? {
            ...o, overrideRequested: false, requestedStatus: null, overrideReason: null, notes: `${o.notes} | ❌ Gerencia rechazó la solicitud de retroceso.`
        } : o);
        setOrders(updatedOrders);
        setSelectedOrder(null);
    };

    // === SISTEMA DE EVIDENCIA FOTOGRÁFICA ===
    const handleFileUpload = (e, orderId) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validación para el prototipo (Evitar que suban fotos gigantes de 10MB)
        if (file.size > 2 * 1024 * 1024) {
            showAlert("Imagen muy pesada", "Para esta demostración, por favor seleccione una imagen menor a 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            const updatedOrders = orders.map(o => {
                if (o.id === orderId) {
                    const newEvidence = {
                        id: Date.now(),
                        image: base64String,
                        uploadedBy: currentUser.name,
                        date: new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })
                    };
                    return { ...o, evidence: [...(o.evidence || []), newEvidence] };
                }
                return o;
            });
            setOrders(updatedOrders);
            setSelectedOrder(updatedOrders.find(o => o.id === orderId));
        };
        reader.readAsDataURL(file);
    };

    const handleCreateOrder = (e) => {
        e.preventDefault();
        if(!newFormData.deadline) { showAlert("Error", "Establezca fecha y hora límite."); return; }

        setIsSubmitting(true);

        setTimeout(() => {
            const newId = `WF-${Math.floor(Math.random() * 900) + 100}`;
            const newOrder = { id: newId, ...newFormData, status: 'Pre-prensa', createdAt: 'Justo ahora', evidence: [] };
            setOrders([...orders, newOrder]);
            setIsModalOpen(false);
            setNewFormData({ client: '', material: 'Lona 13oz', size: '', assigned: currentUser.name, urgent: false, notes: '', deadline: '' });
            setIsSubmitting(false);
        }, 800);
    };

    const handleDeleteOrder = (id) => {
        showConfirm("Eliminar Orden", "¿Está seguro de eliminar esta orden del sistema de forma permanente?", () => {
            setOrders(orders.filter(o => o.id !== id));
            setSelectedOrder(null);
            closeDialog();
        });
    };

    const handleCreateUser = (e) => {
        e.preventDefault();
        const newId = users.length + 1;
        setUsers([...users, { id: newId, ...newUserParams }]);
        setNewUserParams({ username: '', password: '', role: 'Operario', name: '' });
        showAlert("Éxito", "Empleado registrado exitosamente en la base de datos.");
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.client.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch && (filterUrgent ? order.urgent : true);
    });

    const pendingApprovals = orders.filter(o => o.overrideRequested).length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-dark via-brand-primary/90 to-brand-dark p-4 md:p-8 relative print:bg-white print:p-0">

            {/* Cabecera Principal */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <img src="/logo.svg" alt="Wide Format" className="h-12 w-auto object-contain bg-white/10 backdrop-blur-sm p-2 rounded-lg" />
                    <div>
                        <h1 className="text-2xl font-bold text-white shadow-sm">Torre de Control</h1>
                        <p className="text-brand-accent font-medium flex items-center gap-2"><Shield className="w-4 h-4" /> Rol: {currentUser.role}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {currentUser.role === 'Gerente' && (
                        <>
                            {pendingApprovals > 0 && (
                                <div className="bg-orange-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 font-bold animate-pulse shadow-lg cursor-pointer transition-transform hover:scale-105">
                                    <Bell className="w-5 h-5" /> {pendingApprovals} Solicitud(es)
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={handlePrint} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-colors" title="Exportar Reporte"><Printer className="w-5 h-5" /></button>
                                <button onClick={toggleFullScreen} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-colors" title="Modo Kiosko">{isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}</button>
                            </div>
                            <button onClick={() => setIsUsersModalOpen(true)} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition-colors">
                                <Users className="w-4 h-4" /> Gestión de Personal
                            </button>
                        </>
                    )}

                    <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-600">
                        <span className="text-white text-sm font-medium">{currentUser.name}</span>
                        <button onClick={onLogout} className="text-slate-300 hover:text-red-400 ml-2 border-l border-slate-600 pl-2 transition-colors"><LogOut className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="bg-brand-accent hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg text-sm transition-transform hover:scale-105">
                        <Plus className="w-5 h-5" /> Nueva Orden
                    </button>
                </div>
            </div>

            {/* Mini-Dashboard KPIs */}
            {currentUser.role === 'Gerente' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/10 print:bg-slate-100 backdrop-blur-sm p-4 rounded-xl flex items-center justify-between border border-white/5">
                        <div><p className="text-slate-300 text-xs font-bold uppercase mb-1">Total Activas</p><h3 className="text-white text-2xl font-black">{orders.length}</h3></div>
                        <Activity className="w-8 h-8 text-brand-accent opacity-80" />
                    </div>
                    <div className="bg-white/10 print:bg-red-50 backdrop-blur-sm p-4 rounded-xl flex items-center justify-between border border-white/5">
                        <div><p className="text-red-300 text-xs font-bold uppercase mb-1">Urgentes</p><h3 className="text-white text-2xl font-black">{orders.filter(o => o.urgent).length}</h3></div>
                        <AlertCircle className="w-8 h-8 text-red-400 opacity-80" />
                    </div>
                    <div className="bg-white/10 print:bg-green-50 backdrop-blur-sm p-4 rounded-xl flex items-center justify-between border border-white/5">
                        <div><p className="text-green-300 text-xs font-bold uppercase mb-1">Para Despacho</p><h3 className="text-white text-2xl font-black">{orders.filter(o => o.status === 'Despacho').length}</h3></div>
                        <CheckCircle className="w-8 h-8 text-green-400 opacity-80" />
                    </div>
                </div>
            )}

            {/* Barra de Filtros */}
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden shadow-sm">
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-300 absolute left-3 top-3" />
                    <input
                        type="text" placeholder="Buscar por cliente o código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 text-white pl-9 pr-4 py-2 rounded-lg border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent placeholder-slate-400 transition-shadow"
                    />
                </div>
                <button onClick={() => setFilterUrgent(!filterUrgent)} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${filterUrgent ? 'bg-red-600 text-white shadow-lg' : 'bg-white/10 text-slate-200 hover:bg-white/20'}`}>
                    <Filter className="w-4 h-4" />
                    {filterUrgent ? 'Mostrando solo Urgentes' : 'Filtrar Urgentes'}
                </button>
            </div>

            {/* Tablero Kanban */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {columns.map(column => {
                        const columnOrders = filteredOrders.filter(o => o.status === column);

                        return (
                            <Droppable droppableId={column} key={column}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className={`bg-slate-100 print:bg-white rounded-xl p-4 min-h-[500px] transition-colors print:border shadow-inner flex flex-col ${snapshot.isDraggingOver ? 'bg-slate-200 ring-2 ring-brand-primary' : ''}`}>
                                        <h2 className="font-bold text-slate-700 mb-4 flex justify-between items-center print:border-b print:pb-2">
                                            {column} <span className="bg-white text-slate-500 text-xs py-1 px-2 rounded-full shadow-sm">{columnOrders.length}</span>
                                        </h2>

                                        <div className="flex-1 flex flex-col gap-4">
                                            {columnOrders.length === 0 && !snapshot.isDraggingOver && (
                                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl opacity-70 p-4 text-center">
                                                    <Info className="w-8 h-8 mb-2 opacity-50" />
                                                    <span className="text-sm font-medium">Estación libre</span>
                                                    <span className="text-xs mt-1">Arrastre órdenes aquí</span>
                                                </div>
                                            )}

                                            {columnOrders.map((order, index) => {
                                                const isOverdue = order.deadline && new Date(order.deadline) < currentTime && order.status !== 'Despacho';
                                                const hasEvidence = order.evidence && order.evidence.length > 0;

                                                return (
                                                    <Draggable draggableId={order.id} index={index} key={order.id}>
                                                        {(provided, snapshot) => (
                                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setSelectedOrder(order)}
                                                                 className={`bg-white p-4 rounded-lg shadow-sm border-l-4 transition-all hover:shadow-md cursor-pointer relative group print:border 
                                ${order.overrideRequested ? 'border-orange-400 ring-2 ring-orange-300 bg-orange-50' : (isOverdue ? 'border-red-600 ring-1 ring-red-500' : (order.urgent ? 'border-orange-500' : 'border-brand-primary'))} 
                                ${snapshot.isDragging ? 'shadow-2xl rotate-3 scale-105 opacity-95 z-50' : ''}`}>

                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="font-bold text-sm text-slate-800">{order.id}</span>
                                                                    <div className="flex items-center gap-1 print:hidden">
                                                                        {hasEvidence && <ImageIcon className="w-4 h-4 text-emerald-500" title="Contiene evidencia visual" />}
                                                                        {order.overrideRequested && <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" title="Esperando Autorización" />}
                                                                        {isOverdue && !order.overrideRequested && <Mail className="w-4 h-4 text-red-600 animate-bounce" />}
                                                                        {!order.overrideRequested && !isOverdue && <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                                    </div>
                                                                </div>

                                                                <h3 className="font-bold text-brand-dark mb-2 leading-tight">{order.client}</h3>
                                                                <div className="mb-3 flex flex-wrap gap-1">
                                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded border ${getMaterialColor(order.material)}`}>{order.material}</span>
                                                                    <span className="text-[10px] font-bold px-2 py-1 rounded border bg-slate-100 text-slate-600 border-slate-200">{order.size}</span>
                                                                </div>

                                                                {order.overrideRequested && (
                                                                    <div className="mb-3 bg-orange-100 text-orange-800 text-[10px] font-bold p-1.5 rounded border border-orange-300 flex items-center gap-1">
                                                                        <Shield className="w-3 h-3" /> ESPERANDO GERENCIA
                                                                    </div>
                                                                )}

                                                                <div className="flex flex-col gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded print:bg-transparent">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-brand-primary print:text-black" /><span>{order.assigned}</span></div>
                                                                    </div>
                                                                    {order.deadline && (
                                                                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200">
                                                                            <CalendarClock className={`w-3 h-3 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`} />
                                                                            <span className={isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}>
                                    Límite: {new Date(order.deadline).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                )})}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        )})}
                </div>
            </DragDropContext>

            {/* ========================================= */}
            {/* MODAL 1: DETALLES DE LA ORDEN Y EVIDENCIA */}
            {/* ========================================= */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="bg-brand-dark p-4 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-2"><span className="bg-brand-primary text-xs px-2 py-1 rounded font-bold">{selectedOrder.id}</span><h2 className="font-bold text-lg">{selectedOrder.client}</h2></div>
                            <button onClick={() => setSelectedOrder(null)} className="text-slate-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 space-y-4 text-slate-700 overflow-y-auto">

                            {selectedOrder.overrideRequested && currentUser.role === 'Gerente' && (
                                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg mb-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-orange-800 font-bold mb-2"><AlertTriangle className="w-5 h-5" /> Solicitud de Retroceso a: {selectedOrder.requestedStatus}</div>
                                    <p className="text-sm text-orange-900 mb-4 font-medium italic">Motivo: "{selectedOrder.overrideReason}"</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApproveOverride(selectedOrder.id, selectedOrder.requestedStatus, selectedOrder.overrideReason)} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-bold text-xs flex-1 shadow transition-colors">Aprobar Retroceso</button>
                                        <button onClick={() => handleRejectOverride(selectedOrder.id)} className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded font-bold text-xs flex-1 transition-colors">Rechazar</button>
                                    </div>
                                </div>
                            )}

                            {selectedOrder.overrideRequested && currentUser.role !== 'Gerente' && (
                                <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-r-lg mb-4 flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-orange-500 animate-spin-slow" />
                                    <p className="text-sm font-bold text-orange-800">Solicitud enviada a Gerencia. Esperando aprobación...</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div><span className="text-xs text-slate-400 block font-medium">Material</span><span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border mt-0.5 ${getMaterialColor(selectedOrder.material)}`}>{selectedOrder.material}</span></div>
                                <div><span className="text-xs text-slate-400 block font-medium">Dimensiones</span><strong className="text-sm text-slate-800">{selectedOrder.size}</strong></div>
                                <div><span className="text-xs text-slate-400 block font-medium">Estado actual</span><span className="inline-block bg-brand-primary/10 text-brand-primary text-xs px-2 py-0.5 rounded-full font-bold mt-0.5">{selectedOrder.status}</span></div>
                                <div><span className="text-xs text-slate-400 block font-medium">Límite Estimado</span><strong className="text-sm text-slate-800">{new Date(selectedOrder.deadline).toLocaleString('es-EC')}</strong></div>
                            </div>

                            <div><span className="text-xs text-slate-400 block font-medium mb-1">Notas e Historial</span><p className="bg-slate-50 p-3 rounded-xl text-sm border italic">{selectedOrder.notes || 'Sin observaciones.'}</p></div>

                            {/* SECCIÓN DE EVIDENCIA FOTOGRÁFICA */}
                            <div className="mt-4 border-t pt-4 border-slate-100">
                                <h3 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-brand-primary" /> Evidencia Fotográfica
                                </h3>

                                {selectedOrder.evidence && selectedOrder.evidence.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {selectedOrder.evidence.map(ev => (
                                            <div key={ev.id} className="relative group rounded border border-slate-200 overflow-hidden shadow-sm">
                                                <img src={ev.image} alt="Evidencia" className="w-full h-24 object-cover" />
                                                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-white p-1 truncate text-center backdrop-blur-sm">
                                                    {ev.uploadedBy} • {ev.date}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="relative">
                                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, selectedOrder.id)} title="Subir foto de evidencia" />
                                    <div className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-3 rounded-lg text-xs font-bold transition-colors border border-slate-300 border-dashed">
                                        <UploadCloud className="w-4 h-4 text-slate-400" /> Subir Foto de Avance / Incidencia
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                                <div className="flex gap-2 ml-auto">
                                    {currentUser.role === 'Gerente' && <button onClick={() => handleDeleteOrder(selectedOrder.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"><Trash2 className="w-4 h-4" /> Eliminar Orden</button>}
                                    <button onClick={() => setSelectedOrder(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-colors">Cerrar Panel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* MODAL 2: GESTIÓN DE PERSONAL (SOLO GERENTE) */}
            {/* ========================================= */}
            {isUsersModalOpen && currentUser.role === 'Gerente' && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Gestión de Personal (Cuentas)</h2>
                            <button onClick={() => setIsUsersModalOpen(false)} className="text-slate-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Crear Nuevo Empleado</h3>
                                <form onSubmit={handleCreateUser} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Completo</label>
                                        <input required type="text" value={newUserParams.name} onChange={(e) => setNewUserParams({...newUserParams, name: e.target.value})} className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-slate-500" placeholder="Ej. Roberto (Acabados)" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Usuario de Acceso (Login)</label>
                                        <input required type="text" value={newUserParams.username} onChange={(e) => setNewUserParams({...newUserParams, username: e.target.value})} className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-slate-500" placeholder="Ej. roberto1" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña</label>
                                        <input required type="text" value={newUserParams.password} onChange={(e) => setNewUserParams({...newUserParams, password: e.target.value})} className="w-full p-2 border rounded text-sm outline-none focus:ring-1 focus:ring-slate-500" placeholder="1234" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Rol en la Planta</label>
                                        <select value={newUserParams.role} onChange={(e) => setNewUserParams({...newUserParams, role: e.target.value})} className="w-full p-2 border rounded text-sm font-bold outline-none focus:ring-1 focus:ring-slate-500">
                                            <option value="Operario">Operario (Planta)</option>
                                            <option value="Diseñador">Diseñador (Pre-prensa)</option>
                                            <option value="Gerente">Gerente (Administrador)</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded mt-2 text-sm transition-colors shadow-md">Registrar Empleado</button>
                                </form>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Personal Activo</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {users.map(u => (
                                        <div key={u.id} className="flex justify-between items-center bg-slate-50 p-3 rounded border hover:bg-slate-100 transition-colors">
                                            <div>
                                                <p className="font-bold text-sm text-brand-dark">{u.name}</p>
                                                <p className="text-xs text-slate-500">Usuario: <span className="font-mono">{u.username}</span></p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${u.role === 'Gerente' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`}>
                        {u.role}
                      </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* MODAL 3: CREAR NUEVA ORDEN DE PRODUCCIÓN */}
            {/* ========================================= */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-brand-dark p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold text-lg">Ingresar Nueva Orden</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del Cliente / Proyecto</label>
                                <input required type="text" value={newFormData.client} onChange={(e) => setNewFormData({...newFormData, client: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all" placeholder="Ej. Pronaca" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                                    <select value={newFormData.material} onChange={(e) => setNewFormData({...newFormData, material: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all">
                                        <option>Lona 13oz</option><option>Vinil Adhesivo</option><option>Microperforado</option><option>Acrílico</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Dimensiones</label>
                                    <input required type="text" value={newFormData.size} onChange={(e) => setNewFormData({...newFormData, size: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all" placeholder="Ej. 2x1.5m" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Fecha y Hora Límite de Entrega</label>
                                <input required type="datetime-local" value={newFormData.deadline} onChange={(e) => setNewFormData({...newFormData, deadline: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Notas / Requerimientos de Taller</label>
                                <textarea value={newFormData.notes} onChange={(e) => setNewFormData({...newFormData, notes: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all" placeholder="Ej. Requiere ojales cada 50cm..." rows="2" />
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                                <input type="checkbox" id="urgent" checked={newFormData.urgent} onChange={(e) => setNewFormData({...newFormData, urgent: e.target.checked})} className="w-4 h-4 text-brand-primary rounded cursor-pointer" />
                                <label htmlFor="urgent" className="text-sm font-bold text-red-600 cursor-pointer">Marcar como Prioridad Urgente</label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded font-bold hover:bg-slate-200 transition-colors disabled:opacity-50">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-primary text-white py-2.5 rounded font-bold shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-80 flex justify-center items-center gap-2">
                                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : "Generar Orden"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* MODAL 4: SISTEMA DE DIÁLOGOS MODERNOS UX */}
            {/* ========================================= */}
            {dialog.isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`p-4 text-white flex items-center gap-2 font-bold ${dialog.type === 'alert' ? 'bg-red-600' : 'bg-brand-dark'}`}>
                            {dialog.type === 'alert' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                            {dialog.title}
                        </div>
                        <div className="p-6 text-slate-700">
                            <p className="text-sm mb-4 whitespace-pre-wrap">{dialog.message}</p>

                            {dialog.type === 'prompt' && (
                                <textarea
                                    autoFocus
                                    className="w-full p-2 border border-slate-300 rounded text-sm mb-4 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                                    rows="3"
                                    placeholder="Escriba aquí..."
                                    value={dialog.inputValue}
                                    onChange={(e) => setDialog({...dialog, inputValue: e.target.value})}
                                />
                            )}

                            <div className="flex justify-end gap-2 mt-2">
                                {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                                    <button onClick={closeDialog} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded transition-colors">
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (dialog.type === 'prompt' && !dialog.inputValue.trim()) {
                                            const inputElement = document.querySelector('textarea');
                                            inputElement.classList.add('border-red-500', 'ring-red-500');
                                            setTimeout(() => inputElement.classList.remove('border-red-500', 'ring-red-500'), 1000);
                                            return;
                                        }
                                        if (dialog.onConfirm) {
                                            dialog.type === 'prompt' ? dialog.onConfirm(dialog.inputValue) : dialog.onConfirm();
                                        }
                                    }}
                                    className={`px-4 py-2 text-white text-sm font-bold rounded shadow transition-colors ${dialog.type === 'alert' ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-primary hover:bg-blue-700'}`}
                                >
                                    {dialog.type === 'alert' ? 'Entendido' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default KanbanBoard;