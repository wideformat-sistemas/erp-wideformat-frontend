import { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, X, Plus, Search, Filter, Shield, Eye, Trash2, Printer, Maximize, Minimize, Activity, LogOut, Users, Mail, CalendarClock, AlertTriangle, Bell, Loader2, Info, UploadCloud, ImageIcon, Edit, Download, Lock, History } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const defaultOrders = [
    {
        id: 'WF-101', client: 'Coca Cola', material: 'Lona 13oz', size: '3x2m', status: 'Pre-prensa', assigned: 'Ana (Diseño)', urgent: false, notes: 'Revisar perfil de color.', createdAt: new Date().toISOString(), deadline: '2026-10-20T17:00', evidence: [],
        history: [{ action: 'Orden Creada', user: 'Ventas', date: new Date().toLocaleString('es-EC') }, { action: 'Movido a Pre-prensa', user: 'Jefe Producción', date: new Date().toLocaleString('es-EC') }]
    },
    {
        id: 'WF-102', client: 'Banco Pichincha', material: 'Vinil Adhesivo', size: '1x1m', status: 'Instalación', assigned: 'Carlos (Conductor)', urgent: true, notes: 'Instalación en agencia matriz.', createdAt: new Date().toISOString(), deadline: '2026-10-01T12:00', evidence: [],
        history: [{ action: 'Orden Creada', user: 'Ventas', date: new Date().toLocaleString('es-EC') }, { action: 'Movido a Instalación', user: 'Conductor', date: new Date().toLocaleString('es-EC') }]
    }
];

// 7 Estaciones exactas del Flujo BPMN End-to-End
const columns = ['Revisión', 'Pre-prensa', 'Impresión', 'Acabados', 'Calidad', 'Despacho', 'Instalación'];

const getMaterialColor = (material) => {
    switch (material) {
        case 'Lona 13oz': return 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
        case 'Vinil Adhesivo': return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold';
        case 'Microperforado': return 'bg-purple-100 text-purple-800 border-purple-300 font-semibold';
        case 'Acrílico': return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
        default: return 'bg-slate-100 text-slate-800 border-slate-300 font-semibold';
    }
};

const KanbanBoard = ({ currentUser, onLogout, users, setUsers }) => {
    const [orders, setOrders] = useState(() => {
        const saved = localStorage.getItem('wideformat_erp_v3') || localStorage.getItem('wideformat_erp_v2');
        return saved ? JSON.parse(saved) : defaultOrders;
    });

    const [completedOrders, setCompletedOrders] = useState(() => {
        const saved = localStorage.getItem('wideformat_completed_v1');
        return saved ? JSON.parse(saved) : [];
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null); // Estado para ampliar imágenes
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUrgent, setFilterUrgent] = useState(false);
    const [filterMine, setFilterMine] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: () => {} });
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
    };

    const closeDialog = () => setDialog({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: () => {} });
    const showAlert = (title, message) => setDialog({ isOpen: true, type: 'alert', title, message, inputValue: '', onConfirm: closeDialog });
    const showConfirm = (title, message, onConfirm) => setDialog({ isOpen: true, type: 'confirm', title, message, inputValue: '', onConfirm });
    const showPrompt = (title, message, onConfirm) => setDialog({ isOpen: true, type: 'prompt', title, message, inputValue: '', onConfirm });

    const [newFormData, setNewFormData] = useState({ client: '', material: 'Lona 13oz', size: '', assigned: currentUser.name, urgent: false, notes: '', deadline: '' });
    const [userFormData, setUserFormData] = useState({ id: null, username: '', password: '', role: 'Impresor', name: '' });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('wideformat_erp_v3', JSON.stringify(orders));
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                showAlert("Memoria Llena", "Se ha alcanzado el límite de memoria del prototipo.");
            }
        }
    }, [orders]);

    useEffect(() => {
        try {
            localStorage.setItem('wideformat_completed_v1', JSON.stringify(completedOrders));
        } catch (e) {}
    }, [completedOrders]);

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

    const handleExportCSV = () => {
        const headers = ['ID Orden', 'Cliente', 'Material', 'Dimensiones', 'Estado Actual', 'Responsable', 'Urgente', 'Límite Entrega', 'Notas'];
        const csvRows = [headers.join(',')];

        orders.forEach(o => {
            const row = [
                o.id,
                `"${o.client}"`,
                o.material,
                `"${o.size}"`,
                o.status,
                `"${o.assigned}"`,
                o.urgent ? 'SI' : 'NO',
                `"${o.deadline ? new Date(o.deadline).toLocaleString('es-EC') : 'Sin fecha'}"`,
                `"${o.notes ? o.notes.replace(/"/g, '""') : ''}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Reporte_Produccion_WF_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast("Reporte descargado exitosamente.");
    };

    const canModifyOrder = (status) => {
        const role = currentUser.role;
        if (role === 'Gerente') return true;
        if (role === 'Ventas' && status === 'Revisión') return true;
        if (role === 'Jefe Producción' && (status === 'Revisión' || status === 'Pre-prensa')) return true;
        if (role === 'Diseñador' && status === 'Pre-prensa') return true;
        if (role === 'Impresor' && status === 'Impresión') return true;
        if (role === 'Acabados' && status === 'Acabados') return true;
        if (role === 'Manufactura' && status === 'Calidad') return true;
        return role === 'Conductor' && (status === 'Despacho' || status === 'Instalación');
    };

    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        if (!canModifyOrder(source.droppableId)) {
            showAlert("Acceso Restringido", "Tu rol actual no tiene permisos para procesar órdenes en esta estación.");
            return;
        }

        const sourceIndex = columns.indexOf(source.droppableId);
        const destinationIndex = columns.indexOf(destination.droppableId);

        if (destinationIndex < sourceIndex) {
            if (currentUser.role === 'Gerente' || currentUser.role === 'Jefe Producción') {
                showPrompt(
                    "Acción Gerencial",
                    "Ingrese el motivo para forzar el retroceso de esta orden:",
                    (reason) => {
                        const updatedOrders = orders.map(o => {
                            if (o.id === draggableId) {
                                const newHistory = [...(o.history || []), { action: `Retrocedido a ${destination.droppableId} (Motivo: ${reason})`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }];
                                return { ...o, status: destination.droppableId, history: newHistory };
                            }
                            return o;
                        });
                        setOrders(updatedOrders);
                        closeDialog();
                        showToast("Retroceso aplicado", "warning");
                    }
                );
                return;
            } else {
                showPrompt(
                    "Autorización Requerida",
                    `Para devolver esta orden a "${destination.droppableId}", requiere autorización de Jefatura.\nIndique el motivo:`,
                    (reason) => {
                        const updatedOrders = orders.map(o => {
                            if (o.id === draggableId) {
                                const newHistory = [...(o.history || []), { action: `Solicitó retroceso a ${destination.droppableId}`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }];
                                return { ...o, overrideRequested: true, requestedStatus: destination.droppableId, overrideReason: reason, history: newHistory };
                            }
                            return o;
                        });
                        setOrders(updatedOrders);
                        closeDialog();
                        showToast("Solicitud enviada a Jefatura", "warning");
                    }
                );
                return;
            }
        }

        if (destinationIndex > sourceIndex + 1) {
            showAlert("Restricción del Sistema", "El proceso debe ser secuencial según el flujograma BPMN.");
            return;
        }

        const updatedOrders = orders.map(order => {
            if (order.id === draggableId) {
                const newHistory = [...(order.history || []), { action: `Movido a ${destination.droppableId}`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }];
                return { ...order, status: destination.droppableId, history: newHistory };
            }
            return order;
        });
        setOrders(updatedOrders);
    };

    const handleApproveOverride = (orderId, requestedStatus) => {
        const updatedOrders = orders.map(o => {
            if (o.id === orderId) {
                const newHistory = [...(o.history || []), { action: `Aprobó retroceso a ${requestedStatus}`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }];
                return { ...o, status: requestedStatus, overrideRequested: false, requestedStatus: null, overrideReason: null, history: newHistory };
            }
            return o;
        });
        setOrders(updatedOrders);
        setSelectedOrder(null);
        showToast(`Orden retrocedida a ${requestedStatus}`);
    };

    const handleRejectOverride = (orderId) => {
        const updatedOrders = orders.map(o => {
            if (o.id === orderId) {
                const newHistory = [...(o.history || []), { action: `Rechazó solicitud de retroceso`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }];
                return { ...o, overrideRequested: false, requestedStatus: null, overrideReason: null, history: newHistory };
            }
            return o;
        });
        setOrders(updatedOrders);
        setSelectedOrder(null);
        showToast("Solicitud rechazada", "warning");
    };

    const handleFileUpload = (e, orderId) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showAlert("Imagen muy pesada", "Seleccione una imagen menor a 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result;
            const updatedOrders = orders.map(o => {
                if (o.id === orderId) {
                    const newEvidence = { id: Date.now(), image: base64String, uploadedBy: currentUser.name, date: new Date().toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) };
                    const newHistory = [...(o.history || []), { action: `Subió evidencia visual (${currentUser.role})`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }];
                    return { ...o, evidence: [...(o.evidence || []), newEvidence], history: newHistory };
                }
                return o;
            });
            setOrders(updatedOrders);
            setSelectedOrder(updatedOrders.find(o => o.id === orderId));
            showToast("Evidencia guardada exitosamente");
        };
        reader.readAsDataURL(file);
    };

    const handleCreateOrder = (e) => {
        e.preventDefault();
        if(!newFormData.deadline) { showAlert("Error", "Establezca fecha y hora límite."); return; }

        setIsSubmitting(true);

        setTimeout(() => {
            const newId = `WF-${Math.floor(Math.random() * 900) + 100}`;
            const initialHistory = [{ action: 'Generó Nueva Orden', user: currentUser.name, date: new Date().toLocaleString('es-EC') }];
            const newOrder = { id: newId, ...newFormData, status: 'Revisión', createdAt: new Date().toISOString(), evidence: [], history: initialHistory };

            setOrders([...orders, newOrder]);
            setIsModalOpen(false);
            setNewFormData({ client: '', material: 'Lona 13oz', size: '', assigned: currentUser.name, urgent: false, notes: '', deadline: '' });
            setIsSubmitting(false);
            showToast("Orden generada exitosamente");
        }, 800);
    };

    const handleDeleteOrder = (id) => {
        showConfirm("Eliminar Orden", "¿Está seguro de eliminar esta orden del sistema de forma permanente?", () => {
            setOrders(orders.filter(o => o.id !== id));
            setSelectedOrder(null);
            closeDialog();
            showToast("Orden eliminada del sistema", "warning");
        });
    };

    const handleSaveUser = (e) => {
        e.preventDefault();
        if (userFormData.id) {
            setUsers(users.map(u => u.id === userFormData.id ? { ...userFormData } : u));
            showToast(`Datos de ${userFormData.name} actualizados`);
        } else {
            const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
            setUsers([...users, { ...userFormData, id: newId }]);
            showToast("Empleado registrado exitosamente");
        }
        setUserFormData({ id: null, username: '', password: '', role: 'Impresor', name: '' });
    };

    const handleEditClick = (user) => {
        setUserFormData({ ...user });
    };

    const handleDeleteUser = (userId, userName) => {
        showConfirm(
            "Revocar Acceso",
            `¿Está seguro de eliminar al empleado "${userName}" del sistema?`,
            () => {
                setUsers(users.filter(u => u.id !== userId));
                if (userFormData.id === userId) {
                    setUserFormData({ id: null, username: '', password: '', role: 'Impresor', name: '' });
                }
                closeDialog();
                showToast("Empleado eliminado");
            }
        );
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.client.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUrgent = filterUrgent ? order.urgent : true;
        const matchesMine = filterMine ? order.assigned.toLowerCase().includes(currentUser.name.toLowerCase()) : true;
        return matchesSearch && matchesUrgent && matchesMine;
    });

    const pendingApprovals = orders.filter(o => o.overrideRequested).length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#1e3a8a] to-[#1e293b] p-4 md:p-8 relative print:bg-white print:p-0 overflow-x-hidden flex flex-col text-slate-100">

            {/* Cabecera Principal */}
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <img src="/logo.svg" alt="Wide Format" className="h-12 w-auto object-contain bg-white/10 backdrop-blur-sm p-2 rounded-lg" />
                    <div>
                        <h1 className="text-2xl font-bold text-white shadow-sm">Torre de Control de Producción</h1>
                        <p className="text-blue-300 font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /> Rol: {currentUser.role}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {(currentUser.role === 'Gerente' || currentUser.role === 'Jefe Producción') && pendingApprovals > 0 && (
                        <div className="bg-orange-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 font-bold animate-pulse shadow-lg cursor-pointer transition-transform hover:scale-105">
                            <Bell className="w-5 h-5" /> {pendingApprovals} Solicitud(es)
                        </div>
                    )}

                    <button onClick={() => setIsHistoryModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg border border-slate-700 transition-colors">
                        <History className="w-4 h-4 text-emerald-400" /> Registro Completado ({completedOrders.length})
                    </button>

                    {(currentUser.role === 'Gerente' || currentUser.role === 'Jefe Producción') && (
                        <div className="flex gap-2">
                            <button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 p-2 rounded-lg text-white shadow-lg transition-colors" title="Exportar a Excel (CSV)"><Download className="w-5 h-5" /></button>
                            <button onClick={handlePrint} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-colors" title="Exportar Reporte de Producción"><Printer className="w-5 h-5" /></button>
                        </div>
                    )}

                    <button onClick={toggleFullScreen} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-colors" title="Modo Kiosko">
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>

                    {currentUser.role === 'Gerente' && (
                        <button onClick={() => setIsUsersModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg border border-slate-700 transition-colors">
                            <Users className="w-4 h-4" /> Gestión de Personal
                        </button>
                    )}

                    <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
                        <span className="text-white text-sm font-bold">{currentUser.name}</span>
                        <button onClick={onLogout} className="text-slate-300 hover:text-red-400 ml-2 border-l border-slate-700 pl-2 transition-colors"><LogOut className="w-4 h-4" /></button>
                    </div>

                    {(currentUser.role === 'Ventas' || currentUser.role === 'Gerente') && (
                        <button onClick={() => setIsModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-lg font-extrabold flex items-center gap-2 shadow-lg text-sm transition-transform hover:scale-105">
                            <Plus className="w-5 h-5" /> Nueva Orden
                        </button>
                    )}
                </div>
            </div>

            {/* Mini-Dashboard KPIs */}
            {(currentUser.role === 'Gerente' || currentUser.role === 'Jefe Producción') && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl flex items-center justify-between border border-slate-700/80 shadow-lg">
                        <div>
                            <p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Total Activas</p>
                            <h3 className="text-white text-3xl font-black">{orders.length}</h3>
                        </div>
                        <Activity className="w-8 h-8 text-blue-400 opacity-90" />
                    </div>
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl flex items-center justify-between border border-slate-700/80 shadow-lg">
                        <div>
                            <p className="text-red-300 text-xs font-bold uppercase tracking-wider mb-1">Urgentes</p>
                            <h3 className="text-white text-3xl font-black">{orders.filter(o => o.urgent).length}</h3>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-400 opacity-90" />
                    </div>
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl flex items-center justify-between border border-slate-700/80 shadow-lg">
                        <div>
                            <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Completadas e Historial</p>
                            <h3 className="text-white text-3xl font-black">{completedOrders.length}</h3>
                        </div>
                        <CheckCircle className="w-8 h-8 text-emerald-400 opacity-90" />
                    </div>
                </div>
            )}

            {/* Barra de Filtros Inteligente */}
            <div className="bg-slate-900/80 backdrop-blur-md p-3 rounded-xl mb-6 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden shadow-lg border border-slate-700/80">
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-300 absolute left-3 top-3" />
                    <input
                        type="text" placeholder="Buscar por cliente o código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 text-white pl-9 pr-4 py-2 rounded-lg border border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 transition-shadow font-medium"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button onClick={() => setFilterMine(!filterMine)} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${filterMine ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'}`}>
                        <Users className="w-4 h-4" />
                        {filterMine ? 'Todas las Órdenes' : 'Mis Tareas'}
                    </button>
                    <button onClick={() => setFilterUrgent(!filterUrgent)} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${filterUrgent ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'}`}>
                        <Filter className="w-4 h-4" />
                        {filterUrgent ? 'Mostrar Todas' : 'Solo Urgentes'}
                    </button>
                </div>
            </div>

            {/* ENCABEZADO EXCLUSIVO PARA IMPRESIÓN */}
            <div className="hidden print:block text-center mb-6 border-b-2 border-slate-800 pb-4">
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Reporte de Producción - Wide Format</h1>
                <p className="text-sm text-slate-700 font-bold mt-1">Generado por: {currentUser.name} | Fecha: {currentTime.toLocaleString('es-EC')}</p>
            </div>

            {/* Tablero Kanban con 7 Columnas que crecen con el contenido */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto overflow-y-visible print:overflow-visible pb-12">
                    <div className="flex gap-6 min-w-max items-start print:grid print:grid-cols-7 print:gap-2">
                        {columns.map(column => {
                            const columnOrders = filteredOrders.filter(o => o.status === column);

                            return (
                                <Droppable droppableId={column} key={column}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`w-[300px] print:w-auto bg-slate-100 print:bg-white rounded-xl p-4 transition-colors print:border-2 print:border-slate-300 shadow-xl flex flex-col shrink-0 ${snapshot.isDraggingOver ? 'bg-slate-200 ring-2 ring-blue-600' : ''}`}
                                        >
                                            <h2 className="font-extrabold text-slate-900 print:text-black mb-4 flex justify-between items-center print:border-b-2 print:border-slate-300 print:pb-2 print:text-xs shrink-0 text-sm">
                                                {column} <span className="bg-white print:bg-slate-100 print:border text-slate-800 text-xs py-0.5 px-2.5 rounded-full font-bold shadow-sm">{columnOrders.length}</span>
                                            </h2>

                                            <div className="flex flex-col gap-4 pr-1 pb-2">
                                                {columnOrders.length === 0 && !snapshot.isDraggingOver && (
                                                    <div className="h-24 flex flex-col items-center justify-center text-slate-400 print:text-slate-300 border-2 border-dashed border-slate-300 rounded-xl opacity-80 p-4 text-center print:border-none print:opacity-100">
                                                        <Info className="w-6 h-6 mb-1 opacity-50 print:hidden text-slate-400" />
                                                        <span className="text-xs font-semibold text-slate-500 print:text-[10px]">Sin órdenes</span>
                                                    </div>
                                                )}

                                                {columnOrders.map((order, index) => {
                                                    const isOverdue = order.deadline && new Date(order.deadline) < currentTime && order.status !== 'Instalación';
                                                    const hasEvidence = order.evidence && order.evidence.length > 0;
                                                    const isLocked = !canModifyOrder(order.status);

                                                    return (
                                                        <Draggable draggableId={order.id} index={index} key={order.id} isDragDisabled={isLocked}>
                                                            {(provided, snapshot) => (
                                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setSelectedOrder({ ...order, isLocked })}
                                                                     className={`bg-white p-4 rounded-xl shadow-md border-l-4 transition-all relative group print:border print:border-l-4 print:shadow-none print:break-inside-avoid print:p-2
                                  ${isLocked ? 'cursor-not-allowed opacity-85 hover:bg-slate-50' : 'cursor-grab hover:shadow-lg'}
                                  ${order.overrideRequested ? 'border-orange-500 ring-2 ring-orange-300 bg-orange-50 print:bg-orange-50 print:border-orange-500' : (isOverdue ? 'border-red-600 ring-1 ring-red-500 print:border-red-600' : (order.urgent ? 'border-orange-500' : 'border-blue-600 print:border-slate-400'))} 
                                  ${snapshot.isDragging ? 'shadow-2xl rotate-3 scale-105 opacity-95 z-50' : ''}`}>

                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <span className="font-extrabold text-sm text-slate-900 print:text-black print:text-xs">{order.id}</span>
                                                                        <div className="flex items-center gap-1.5 print:hidden">
                                                                            {isLocked && <Lock className="w-4 h-4 text-slate-400" title="Bloqueado: Estación de otro empleado" />}
                                                                            {hasEvidence && <ImageIcon className="w-4 h-4 text-emerald-600" title="Contiene evidencia visual" />}
                                                                            {order.overrideRequested && <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" title="Esperando Autorización" />}
                                                                            {isOverdue && !order.overrideRequested && <Mail className="w-4 h-4 text-red-600 animate-bounce" />}
                                                                            {!order.overrideRequested && !isOverdue && !isLocked && <Eye className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                                        </div>
                                                                    </div>

                                                                    <h3 className="font-extrabold text-slate-900 print:text-black mb-2 leading-tight text-sm print:text-[11px]">{order.client}</h3>
                                                                    <div className="mb-3 flex flex-wrap gap-1.5">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getMaterialColor(order.material)}`}>{order.material}</span>
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-800 border-slate-300">{order.size}</span>
                                                                    </div>

                                                                    {order.overrideRequested && (
                                                                        <div className="mb-3 bg-orange-100 text-orange-900 text-[10px] font-bold p-1.5 rounded border border-orange-300 flex items-center gap-1">
                                                                            <Shield className="w-3 h-3" /> ESPERANDO JEFATURA
                                                                        </div>
                                                                    )}

                                                                    <div className="flex flex-col gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200/80 p-2 rounded-lg">
                                                                        <div className="flex items-center justify-between font-medium">
                                                                            <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-blue-600" /><span>{order.assigned}</span></div>
                                                                        </div>
                                                                        {order.deadline && (
                                                                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200">
                                                                                <CalendarClock className={`w-3 h-3 ${isOverdue ? 'text-red-600' : 'text-slate-500'}`} />
                                                                                <span className={isOverdue ? 'text-red-700 font-bold' : 'text-slate-700 font-medium'}>
                                      Vence: {new Date(order.deadline).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
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
                </div>
            </DragDropContext>

            {/* ========================================= */}
            {/* MODAL 1: DETALLES DE LA ORDEN Y TRAZABILIDAD */}
            {/* ========================================= */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className={`p-4 flex justify-between items-center text-white shrink-0 ${selectedOrder.isLocked ? 'bg-slate-800' : 'bg-slate-950 border-b border-slate-800'}`}>
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded font-bold">{selectedOrder.id}</span>
                                <h2 className="font-bold text-lg text-white">{selectedOrder.client}</h2>
                                {selectedOrder.isLocked && <span className="flex items-center gap-1 ml-2 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full"><Lock className="w-3 h-3" /> Solo Lectura</span>}
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-slate-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 space-y-4 text-slate-200 overflow-y-auto">
                            {selectedOrder.overrideRequested && (currentUser.role === 'Gerente' || currentUser.role === 'Jefe Producción') && (
                                <div className="bg-orange-950/60 border-l-4 border-orange-500 p-4 rounded-r-lg mb-4 shadow-sm border border-orange-500/30">
                                    <div className="flex items-center gap-2 text-orange-300 font-bold mb-2"><AlertTriangle className="w-5 h-5 text-orange-400" /> Solicitud de Retroceso a: {selectedOrder.requestedStatus}</div>
                                    <p className="text-sm text-orange-200 mb-4 font-medium italic">Motivo: "{selectedOrder.overrideReason}"</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApproveOverride(selectedOrder.id, selectedOrder.requestedStatus)} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded font-bold text-xs flex-1 shadow transition-colors">Aprobar Retroceso</button>
                                        <button onClick={() => handleRejectOverride(selectedOrder.id)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-4 py-2 rounded font-bold text-xs flex-1 transition-colors">Rechazar</button>
                                    </div>
                                </div>
                            )}

                            {/* Validación estricta para el Conductor: No puede finalizar sin foto */}
                            {(selectedOrder.status === 'Despacho' || selectedOrder.status === 'Instalación') && (currentUser.role === 'Conductor' || currentUser.role === 'Gerente') && (
                                <div className="bg-emerald-950/60 border border-emerald-500/40 p-4 rounded-xl mb-4 text-center">
                                    <p className="text-xs text-emerald-300 font-bold mb-2">📦 Cierre de Logística e Instalación en Sitio</p>
                                    {currentUser.role === 'Conductor' && (!selectedOrder.evidence || selectedOrder.evidence.length === 0) ? (
                                        <div className="bg-amber-950/80 border border-amber-500/50 p-3 rounded-xl text-amber-300 text-xs font-semibold flex items-center justify-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                            Debe subir obligatoriamente una foto del acta firmada o instalación para poder finalizar.
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                showConfirm("Finalizar e Instalar", "¿Confirma que el producto fue instalado y entregado exitosamente? Se guardará en el registro histórico con sus evidencias y trazabilidad.", () => {
                                                    const finishedOrder = {
                                                        ...selectedOrder,
                                                        status: 'Completado',
                                                        completedAt: new Date().toLocaleString('es-EC'),
                                                        completedBy: currentUser.name
                                                    };
                                                    setCompletedOrders([finishedOrder, ...completedOrders]);
                                                    setOrders(orders.filter(o => o.id !== selectedOrder.id));
                                                    setSelectedOrder(null);
                                                    closeDialog();
                                                    showToast("¡Orden finalizada y registrada en el historial!");
                                                });
                                            }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Marcar como Instalado y Registrar en Historial
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                <div><span className="text-xs text-slate-400 block font-semibold">Material</span><span className={`inline-block text-xs font-bold px-2.5 py-1 rounded border mt-1 ${getMaterialColor(selectedOrder.material)}`}>{selectedOrder.material}</span></div>
                                <div><span className="text-xs text-slate-400 block font-semibold">Dimensiones</span><strong className="text-sm text-white">{selectedOrder.size}</strong></div>
                                <div><span className="text-xs text-slate-400 block font-semibold">Estado actual</span><span className="inline-block bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-bold mt-1">{selectedOrder.status}</span></div>
                                <div><span className="text-xs text-slate-400 block font-semibold">Límite Estimado</span><strong className="text-sm text-white">{new Date(selectedOrder.deadline).toLocaleString('es-EC')}</strong></div>
                            </div>

                            {selectedOrder.notes && (
                                <div><span className="text-xs text-slate-400 block font-semibold mb-1">Requerimientos de Taller</span><p className="bg-slate-950/60 p-3 rounded-xl text-sm border border-slate-800 italic text-slate-300">{selectedOrder.notes}</p></div>
                            )}

                            <div className="mt-4 border-t pt-4 border-slate-800">
                                <h3 className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-2">
                                    <History className="w-4 h-4 text-blue-400" /> Historial de Trazabilidad BPMN
                                </h3>
                                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                                    {selectedOrder.history && selectedOrder.history.map((log, i) => (
                                        <div key={i} className="flex gap-3 text-xs relative">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1"></div>
                                                {i !== selectedOrder.history.length - 1 && <div className="w-0.5 h-full bg-slate-800 mt-1"></div>}
                                            </div>
                                            <div className="pb-3">
                                                <p className="font-bold text-white">{log.action}</p>
                                                <p className="text-slate-400">{log.user} • {log.date}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 border-t pt-4 border-slate-800">
                                <h3 className="font-bold text-sm text-slate-200 mb-3 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-emerald-400" /> Evidencia Fotográfica / Acta de Entrega
                                </h3>

                                {selectedOrder.evidence && selectedOrder.evidence.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {selectedOrder.evidence.map(ev => (
                                            <div key={ev.id} onClick={() => setZoomedImage(ev.image)} className="relative group rounded border border-slate-700 overflow-hidden shadow-sm cursor-pointer hover:border-blue-500 transition-colors" title="Clic para ampliar imagen">
                                                <img src={ev.image} alt="Evidencia" className="w-full h-24 object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                                                    <Maximize className="w-4 h-4" /> Ampliar
                                                </div>
                                                <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] text-white p-1 truncate text-center backdrop-blur-sm">
                                                    {ev.uploadedBy} • {ev.date}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!selectedOrder.isLocked && (
                                    <div className="relative">
                                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, selectedOrder.id)} title="Subir foto de evidencia" />
                                        <div className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-slate-300 px-4 py-3 rounded-lg text-xs font-bold transition-colors border border-slate-700 border-dashed">
                                            <UploadCloud className="w-4 h-4 text-blue-400" /> Subir Acta Firmada o Foto de Instalación
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
                                <div className="flex gap-2 ml-auto">
                                    {(currentUser.role === 'Gerente' || currentUser.role === 'Jefe Producción') && <button onClick={() => handleDeleteOrder(selectedOrder.id)} className="bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"><Trash2 className="w-4 h-4" /> Eliminar Orden</button>}
                                    <button onClick={() => setSelectedOrder(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors">Cerrar Panel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL: REGISTRO HISTÓRICO CON TRAZABILIDAD Y FOTOS */}
            {/* ========================================================= */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold text-lg flex items-center gap-2"><History className="w-5 h-5 text-emerald-400" /> Registro Histórico y Auditoría de Órdenes Completadas</h2>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {completedOrders.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Info className="w-10 h-10 mx-auto mb-3 opacity-40 text-blue-400" />
                                    <p className="text-sm font-semibold">No hay órdenes completadas registradas todavía.</p>
                                    <p className="text-xs text-slate-500 mt-1">Las órdenes aparecerán aquí con sus fotos y trazabilidad en cuanto se finalice el proceso en la columna de Instalación.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {completedOrders.map(order => (
                                        <div key={order.id} className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded font-bold">{order.id}</span>
                                                        <h3 className="font-bold text-white text-lg">{order.client}</h3>
                                                    </div>
                                                    <p className="text-xs text-slate-400">Material: <span className="text-slate-200 font-medium">{order.material}</span> ({order.size}) • Responsable taller: <span className="text-slate-200 font-medium">{order.assigned}</span></p>
                                                    <p className="text-xs text-emerald-400 font-semibold mt-1">✓ Instalado y Finalizado por <strong className="text-white">{order.completedBy}</strong> el {order.completedAt}</p>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        showConfirm("Eliminar del Registro", `¿Desea eliminar la orden ${order.id} del historial permanente?`, () => {
                                                            setCompletedOrders(completedOrders.filter(o => o.id !== order.id));
                                                            closeDialog();
                                                            showToast("Registro eliminado del historial", "warning");
                                                        });
                                                    }}
                                                    className="bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                                                    title="Eliminar del historial"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Eliminar Registro
                                                </button>
                                            </div>

                                            {/* Galería de Fotos / Evidencias con Zoom */}
                                            {order.evidence && order.evidence.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
                                                        <ImageIcon className="w-4 h-4 text-emerald-400" /> Evidencias Fotográficas y Actas de Entrega ({order.evidence.length}) - Clic para ampliar
                                                    </h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                        {order.evidence.map(ev => (
                                                            <div key={ev.id} onClick={() => setZoomedImage(ev.image)} className="relative rounded-xl border border-slate-700 overflow-hidden shadow-md bg-slate-900 group cursor-pointer hover:border-emerald-500 transition-colors" title="Clic para ampliar imagen">
                                                                <img src={ev.image} alt="Evidencia de instalación" className="w-full h-32 object-cover transition-transform group-hover:scale-105" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                                                                    <Maximize className="w-4 h-4" /> Ampliar
                                                                </div>
                                                                <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] text-white p-1.5 truncate text-center backdrop-blur-sm font-medium">
                                                                    {ev.uploadedBy} • {ev.date}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
                                                    <History className="w-4 h-4 text-blue-400" /> Trazabilidad Completa del Flujo BPMN
                                                </h4>
                                                <div className="space-y-2.5 bg-slate-900/90 p-4 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                                                    {order.history && order.history.map((log, i) => (
                                                        <div key={i} className="flex gap-3 text-xs relative">
                                                            <div className="flex flex-col items-center">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-0.5"></div>
                                                                {i !== order.history.length - 1 && <div className="w-0.5 h-full bg-slate-800 mt-1"></div>}
                                                            </div>
                                                            <div className="pb-2">
                                                                <p className="font-bold text-white">{log.action}</p>
                                                                <p className="text-slate-400">{log.user} • {log.date}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL LIGHTBOX / ZOOM DE IMAGEN CON OPCIÓN DE DESCARGA */}
            {/* ========================================================= */}
            {zoomedImage && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
                        <button
                            onClick={() => setZoomedImage(null)}
                            className="absolute -top-12 right-0 text-white hover:text-red-400 p-2 transition-colors cursor-pointer"
                            title="Cerrar visor"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <div className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center max-w-full">
                            <img src={zoomedImage} alt="Evidencia Ampliada" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-inner" />
                            <div className="p-4 flex gap-4 w-full justify-between items-center border-t border-slate-800 mt-2">
                                <span className="text-xs text-slate-400 font-medium">Vista detallada de evidencia fotográfica / acta</span>
                                <a
                                    href={zoomedImage}
                                    download={`Evidencia_Instalacion_${Date.now()}.png`}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                    <Download className="w-4 h-4" /> Descargar Imagen
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* MODAL 2: GESTIÓN DE PERSONAL */}
            {/* ========================================= */}
            {isUsersModalOpen && currentUser.role === 'Gerente' && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /> Gestión de Personal (Cuentas)</h2>
                            <button onClick={() => { setIsUsersModalOpen(false); setUserFormData({ id: null, username: '', password: '', role: 'Impresor', name: '' }); }} className="text-slate-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
                                    {userFormData.id ? <><Edit className="w-4 h-4 text-blue-400" /> Editar Empleado</> : <><Plus className="w-4 h-4 text-blue-400" /> Crear Nuevo Empleado</>}
                                </h3>
                                <form onSubmit={handleSaveUser} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label>
                                        <input required type="text" value={userFormData.name} onChange={(e) => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ej. Roberto (Instalador)" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1">Usuario de Acceso (Login)</label>
                                        <input required type="text" value={userFormData.username} onChange={(e) => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ej. conductor1" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                                        <input required type="text" value={userFormData.password} onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white outline-none focus:ring-1 focus:ring-blue-500" placeholder="1234" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1">Rol en la Planta</label>
                                        <select value={userFormData.role} onChange={(e) => setUserFormData({...userFormData, role: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm font-bold text-white outline-none focus:ring-1 focus:ring-blue-500">
                                            <option value="Ventas">Ejecutivo de Ventas</option>
                                            <option value="Jefe Producción">Jefe de Área / Producción</option>
                                            <option value="Diseñador">Diseñador (Pre-prensa)</option>
                                            <option value="Impresor">Impresor (Maquinista)</option>
                                            <option value="Acabados">Operario de Acabados</option>
                                            <option value="Manufactura">Armado y Control de Calidad</option>
                                            <option value="Conductor">Conductor / Instalador</option>
                                            <option value="Gerente">Gerente (Administrador Total)</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        {userFormData.id && (
                                            <button type="button" onClick={() => setUserFormData({ id: null, username: '', password: '', role: 'Impresor', name: '' })} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded text-sm transition-colors shadow-sm">
                                                Cancelar
                                            </button>
                                        )}
                                        <button type="submit" className={`flex-1 text-white font-bold py-2.5 rounded text-sm transition-colors shadow-md ${userFormData.id ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-800 hover:bg-slate-700 border border-slate-600'}`}>
                                            {userFormData.id ? 'Actualizar Datos' : 'Registrar Empleado'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div>
                                <h3 className="font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Personal Activo</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {users.map(u => (
                                        <div key={u.id} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${userFormData.id === u.id ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80'}`}>
                                            <div>
                                                <p className="font-bold text-sm text-white">{u.name}</p>
                                                <p className="text-xs text-slate-400">Usuario: <span className="font-mono text-slate-300">{u.username}</span></p>
                                            </div>
                                            <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${u.role === 'Gerente' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                          {u.role}
                        </span>
                                                <button onClick={() => handleEditClick(u)} className="text-slate-400 hover:text-blue-400 transition-colors" title="Editar datos">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                {u.username !== currentUser.username && (
                                                    <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-slate-400 hover:text-red-400 transition-colors" title="Revocar acceso">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold text-lg text-white">Ingresar Nueva Orden</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre del Cliente / Proyecto</label>
                                <input required type="text" value={newFormData.client} onChange={(e) => setNewFormData({...newFormData, client: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Ej. Pronaca" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Material</label>
                                    <select value={newFormData.material} onChange={(e) => setNewFormData({...newFormData, material: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all">
                                        <option>Lona 13oz</option><option>Vinil Adhesivo</option><option>Microperforado</option><option>Acrílico</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">Dimensiones</label>
                                    <input required type="text" value={newFormData.size} onChange={(e) => setNewFormData({...newFormData, size: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Ej. 2x1.5m" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha y Hora Límite de Entrega</label>
                                <input required type="datetime-local" value={newFormData.deadline} onChange={(e) => setNewFormData({...newFormData, deadline: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1">Notas / Requerimientos de Taller</label>
                                <textarea value={newFormData.notes} onChange={(e) => setNewFormData({...newFormData, notes: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Ej. Requiere ojales cada 50cm..." rows="2" />
                            </div>

                            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded border border-slate-800">
                                <input type="checkbox" id="urgent" checked={newFormData.urgent} onChange={(e) => setNewFormData({...newFormData, urgent: e.target.checked})} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                <label htmlFor="urgent" className="text-sm font-bold text-red-400 cursor-pointer">Marcar como Prioridad Urgente</label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="flex-1 bg-slate-800 text-slate-200 py-2.5 rounded font-bold hover:bg-slate-700 transition-colors disabled:opacity-50">Cancelar</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded font-bold shadow-lg transition-colors disabled:opacity-80 flex justify-center items-center gap-2">
                                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : "Generar Orden"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* MODAL 4: SISTEMA DE DIÁLOGOS DE ALERTA */}
            {/* ========================================= */}
            {dialog.isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className={`p-4 text-white flex items-center gap-2 font-bold ${dialog.type === 'alert' ? 'bg-red-900 border-b border-red-700' : 'bg-slate-950 border-b border-slate-800'}`}>
                            {dialog.type === 'alert' ? <AlertCircle className="w-5 h-5 text-red-300" /> : <Info className="w-5 h-5 text-blue-400" />}
                            {dialog.title}
                        </div>
                        <div className="p-6 text-slate-200">
                            <p className="text-sm mb-4 whitespace-pre-wrap">{dialog.message}</p>

                            {dialog.type === 'prompt' && (
                                <textarea
                                    autoFocus
                                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white mb-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    rows="3"
                                    placeholder="Escriba aquí..."
                                    value={dialog.inputValue}
                                    onChange={(e) => setDialog({...dialog, inputValue: e.target.value})}
                                />
                            )}

                            <div className="flex justify-end gap-2 mt-2">
                                {(dialog.type === 'confirm' || dialog.type === 'prompt') && (
                                    <button onClick={closeDialog} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded transition-colors">
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
                                    className={`px-4 py-2 text-white text-sm font-bold rounded shadow transition-colors ${dialog.type === 'alert' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                                >
                                    {dialog.type === 'alert' ? 'Entendido' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* COMPONENTE 5: NOTIFICACIONES TOAST FLOTANTES */}
            {toast.visible && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-5 fade-in duration-300 border ${toast.type === 'success' ? 'bg-emerald-900 border-emerald-500/50' : 'bg-orange-900 border-orange-500/50'}`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-300" /> : <AlertTriangle className="w-5 h-5 text-orange-300" />}
                    {toast.message}
                </div>
            )}

        </div>
    );
};

export default KanbanBoard;