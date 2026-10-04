import { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, X, Plus, Search, Filter, Shield, Eye, Trash2, Printer, Maximize, Minimize, Activity, LogOut, Users, Mail, CalendarClock, AlertTriangle, Bell, Loader2, Info, UploadCloud, ImageIcon, Edit, Download, Lock, History, FileText, Layers, GitMerge } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import emailjs from '@emailjs/browser';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Importamos tu nueva base de datos

const defaultOrders = [
    {
        id: 'OP-15371', type: 'Estándar', client: 'Banco Guayaquil', product: 'Afiches Campaña', quantity: '500', openSize: '33 x 48 cm', closedSize: 'N/A', vendor: 'Ventas 1',
        status: 'Pre-prensa', assigned: 'Ana (Diseño)', urgent: false, notes: 'Impresión full color.', createdAt: new Date().toISOString(), deadline: '2026-10-18T17:00', evidence: [],
        stdData: {
            oTrab: '001-15371', designer: 'Ana', colorProof: false,
            matCoucheB: true, matCoucheBGr: '150', medida: '33 X 48 CM',
            cantPlanas1: '250', cantPlanas2: '', cantAdicionales: '10', totalPlanas: '260',
            impAccurio: true, accTiro: true, accRetiro: true,
            lamMate: true, lamTiro: true,
            medioCorte: true, medioCorteText: 'Corte recto',
            refilado: true, refiladoText: 'A ras', empacado: true, empacadoText: 'En paquetes de 100', distribucion: true, distribucionText: 'Agencia matriz'
        },
        history: [{ action: 'Orden Creada (Estándar)', user: 'Ventas', date: new Date().toLocaleString('es-EC') }]
    }
];

const columns = ['Revisión', 'Pre-prensa', 'Impresión', 'Acabados', 'Calidad', 'Despacho', 'Instalación'];

const KanbanBoard = ({ currentUser, onLogout, users, setUsers }) => {

    // ESTADOS CONECTADOS A FIREBASE EN LUGAR DE LOCALSTORAGE
    const [orders, setOrdersState] = useState([]);
    const [completedOrders, setCompletedOrdersState] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterUrgent, setFilterUrgent] = useState(false);
    const [filterMine, setFilterMine] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: () => {} });
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const [newFormData, setNewFormData] = useState({
        orderType: 'Estándar', client: '', product: '', quantity: '1', vendor: currentUser.name,
        openSize: '', closedSize: '', notes: '', deadline: '', urgent: false, oTrab: '', designer: '', colorProof: false,
    });

    const [stdForm, setStdForm] = useState({
        matBond: false, matBondGr: '', matCoucheB: false, matCoucheBGr: '', matCoucheM: false, matCoucheMGr: '', matCartulina: false, matCartulinaGr: '', matAdhesivoSeg: false, adhSegTipo: '', matAdhesivoPoli: false, matOtros: false, matOtrosText: '', medida: '', medidaOtro: '', cantPlanas1: '', cantPlanas2: '', cantAdicionales: '', totalPlanas: '', obsMateriales: '', impAccurio: false, accTiro: false, accRetiro: false, impOffset: false, offTiro: false, offRetiro: false, impFlexo: false, flexoTiro: false, flexoRetiro: false, planasImpresas: '', planasDanadas: '', lamMate: false, lamBrillo: false, lamTiro: false, lamRetiro: false, uvMate: false, uvBrillo: false, uvTotal: false, uvTiro: false, uvRetiro: false, uvSect: false, troquelado: false, troqueladoText: '', medioCorte: false, medioCorteText: '', grafado: false, grafadoText: '', desprendible: false, desprendibleText: '', troqueladoOtros: false, troqueladoOtrosText: '', troqueladoObs: false, troqueladoObsText: '', grapado: false, grapadoText: '', numerado: false, numeradoText: '', doblado: false, dobladoText: '', anillado: false, anilladoText: '', perforado: false, perforadoText: '', plastificado: false, plastificadoText: '', acabadosOtros: false, acabadosOtrosText: '', acabadosObs: false, acabadosObsText: '', pegado: false, pegadoText: '', acetato: false, acetatoText: '', emblocado: false, emblocadoText: '', cintaDobleFaz: false, cintaDobleFazText: '', enfajillado: false, enfajilladoText: '', refilado: false, refiladoText: '', cordonCinta: false, cordonCintaText: '', manufOtros: false, manufOtrosText: '', empacado: false, empacadoText: '', distribucion: false, distribucionText: '', manufObs: false, manufObsText: ''
    });

    const [wfForm, setWfForm] = useState({
        camaOpciones: [], camaOtros: '', camaPliegos: '', camaCaras: [], plotterEquipos: [], plotterTintas: [], sustOpciones: [], sustOtros: '', sustPliegos: [], sustCaras: [], lonaOpciones: [], lonaOnz: '', vinilOpciones: [], vinilOtro: '', laminadoOpciones: [], laminadoCaras: [], otrosMatOpciones: [], otrosMatOtro: '', acabados: [], acabadosOtro: '', acabadosObs: '', entrega: [], indicaciones: ''
    });

    const [userFormData, setUserFormData] = useState({ id: null, username: '', password: '', role: 'Impresor', name: '', email: '' });

    const showToast = (message, type = 'success') => { setToast({ visible: true, message, type }); setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000); };
    const closeDialog = () => setDialog({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: () => {} });
    const showAlert = (title, message) => setDialog({ isOpen: true, type: 'alert', title, message, inputValue: '', onConfirm: closeDialog });
    const showConfirm = (title, message, onConfirm) => setDialog({ isOpen: true, type: 'confirm', title, message, inputValue: '', onConfirm });
    const showPrompt = (title, message, onConfirm) => setDialog({ isOpen: true, type: 'prompt', title, message, inputValue: '', onConfirm });

    // ==========================================
    // ESCUCHADOR DE FIREBASE EN TIEMPO REAL
    // ==========================================
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);

        // Conexión a órdenes activas
        const unsubOrders = onSnapshot(doc(db, "erp", "activeOrders"), (docSnap) => {
            if (docSnap.exists()) {
                setOrdersState(docSnap.data().list || []);
            } else {
                setDoc(doc(db, "erp", "activeOrders"), { list: defaultOrders }); // Crea la base si está vacía
            }
        });

        // Conexión a historial completado
        const unsubCompleted = onSnapshot(doc(db, "erp", "completedOrders"), (docSnap) => {
            if (docSnap.exists()) {
                setCompletedOrdersState(docSnap.data().list || []);
            } else {
                setDoc(doc(db, "erp", "completedOrders"), { list: [] });
            }
        });

        return () => {
            clearInterval(timer);
            unsubOrders();
            unsubCompleted();
        };
    }, []);

    // FUNCIONES GUARDADORAS EN LA NUBE
    const setOrders = (newOrders) => {
        setOrdersState(newOrders); // Actualiza pantalla al instante
        setDoc(doc(db, "erp", "activeOrders"), { list: newOrders }); // Guarda en la nube
    };

    const setCompletedOrders = (newCompleted) => {
        setCompletedOrdersState(newCompleted);
        setDoc(doc(db, "erp", "completedOrders"), { list: newCompleted });
    };
    // ==========================================

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); setIsFullscreen(true); }
        else if (document.exitFullscreen) { document.exitFullscreen().catch(() => {}); setIsFullscreen(false); }
    };

    const handlePrint = () => window.print();

    const notifyRole = (orderId, columnTarget, clientName, product, deadline) => {
        const rolesMap = { 'Revisión': 'Jefe Producción', 'Pre-prensa': 'Diseñador', 'Impresión': 'Impresor', 'Acabados': 'Acabados', 'Calidad': 'Manufactura', 'Despacho': 'Conductor', 'Instalación': 'Conductor' };
        const targetRole = rolesMap[columnTarget];
        if(!targetRole) return;

        const targetUsers = users.filter(u => u.role === targetRole);
        targetUsers.forEach(emp => {
            const emailToSend = emp.email || 'jorgehugo148@gmail.com';
            const templateParams = { to_email: emailToSend, nombre_empleado: emp.name, id_orden: orderId, cliente: clientName, producto: product, fecha_entrega: new Date(deadline).toLocaleString('es-EC') };
            emailjs.send('service_zomo514', 'template_8on9rfj', templateParams, '10EcePWRPRn0DbhL7').catch(err => console.error(err));
        });
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
        if (!canModifyOrder(source.droppableId)) { showAlert("Acceso Restringido", "No tienes permisos para esta estación."); return; }

        const sourceIndex = columns.indexOf(source.droppableId);
        const destinationIndex = columns.indexOf(destination.droppableId);

        if (destinationIndex < sourceIndex) {
            if (currentUser.role === 'Gerente' || currentUser.role === 'Jefe Producción') {
                showPrompt("Acción Gerencial", "Motivo de retroceso:", (reason) => {
                    const updatedOrders = orders.map(o => o.id === draggableId ? { ...o, status: destination.droppableId, history: [...(o.history || []), { action: `Retrocedido a ${destination.droppableId} (Motivo: ${reason})`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }] } : o);
                    setOrders(updatedOrders); closeDialog(); showToast("Retroceso aplicado", "warning");
                    const draggedOrder = orders.find(o => o.id === draggableId);
                    if(draggedOrder) notifyRole(draggedOrder.id, destination.droppableId, draggedOrder.client, draggedOrder.product, draggedOrder.deadline);
                });
            } else {
                showPrompt("Autorización", `Indique el motivo para devolver a "${destination.droppableId}":`, (reason) => {
                    const updatedOrders = orders.map(o => o.id === draggableId ? { ...o, overrideRequested: true, requestedStatus: destination.droppableId, overrideReason: reason, history: [...(o.history || []), { action: `Solicitó retroceso a ${destination.droppableId}`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }] } : o);
                    setOrders(updatedOrders); closeDialog(); showToast("Enviado a Jefatura", "warning");
                });
            }
            return;
        }

        if (destinationIndex > sourceIndex + 1) { showAlert("Restricción", "Debe avanzar de forma secuencial."); return; }

        const updatedOrders = orders.map(order => order.id === draggableId ? { ...order, status: destination.droppableId, history: [...(order.history || []), { action: `Movido a ${destination.droppableId}`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }] } : order);
        setOrders(updatedOrders);

        const draggedOrder = orders.find(o => o.id === draggableId);
        if(draggedOrder) notifyRole(draggedOrder.id, destination.droppableId, draggedOrder.client, draggedOrder.product, draggedOrder.deadline);
    };

    const handleFileUpload = (e, orderId) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showAlert("Imagen muy pesada", "Seleccione una imagen menor a 2MB."); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            const updatedOrders = orders.map(o => {
                if (o.id === orderId) return { ...o, evidence: [...(o.evidence || []), { id: Date.now(), image: reader.result, uploadedBy: currentUser.name, date: new Date().toLocaleString('es-EC') }], history: [...(o.history || []), { action: `Subió evidencia visual`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }] };
                return o;
            });
            setOrders(updatedOrders); setSelectedOrder(updatedOrders.find(o => o.id === orderId)); showToast("Evidencia guardada");
        };
        reader.readAsDataURL(file);
    };

    const handleToggleWF = (category, value) => { setWfForm(prev => { const array = prev[category]; return { ...prev, [category]: array.includes(value) ? array.filter(i => i !== value) : [...array, value] }; }); };

    const renderStdField = (key, label) => (
        <div className="flex items-center gap-2 w-full">
            <input type="checkbox" checked={stdForm[key]} onChange={(e) => setStdForm({...stdForm, [key]: e.target.checked})} className="w-3 h-3 text-cyan-600 border-slate-400"/>
            <span className="whitespace-nowrap text-[10px]">{label}</span>
            <input type="text" value={stdForm[`${key}Text`]} onChange={(e) => setStdForm({...stdForm, [`${key}Text`]: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none min-w-[30px] h-4 text-[10px]"/>
        </div>
    );

    const handleCreateOrder = (e) => {
        e.preventDefault();
        if(!newFormData.deadline) { showAlert("Error", "Establezca fecha límite."); return; }
        setIsSubmitting(true);

        setTimeout(() => {
            const isStd = newFormData.orderType === 'Estándar';
            const newId = isStd ? `OP-${Math.floor(Math.random() * 9000) + 1000}` : `WF-${Math.floor(Math.random() * 9000) + 1000}`;

            const newOrder = {
                id: newId, type: newFormData.orderType, client: newFormData.client, product: newFormData.product,
                quantity: newFormData.quantity, openSize: newFormData.openSize, closedSize: newFormData.closedSize,
                vendor: newFormData.vendor, status: 'Revisión', assigned: currentUser.name,
                urgent: newFormData.urgent, notes: newFormData.notes, deadline: newFormData.deadline, createdAt: new Date().toISOString(), evidence: [],
                history: [{ action: `Generó Orden (${newFormData.orderType})`, user: currentUser.name, date: new Date().toLocaleString('es-EC') }]
            };

            if(isStd) newOrder.stdData = { oTrab: newFormData.oTrab, designer: newFormData.designer, colorProof: newFormData.colorProof, ...stdForm };
            else newOrder.wfData = { oTrab: newFormData.oTrab, designer: newFormData.designer, colorProof: newFormData.colorProof, ...wfForm };

            setOrders([...orders, newOrder]); setIsModalOpen(false); setIsSubmitting(false); showToast("Orden generada");

            const designerUser = users.find(u => u.name === newFormData.designer);
            const emailToSend = (designerUser && designerUser.email) ? designerUser.email : 'jorgehugo148@gmail.com';

            const templateParams = { to_email: emailToSend, nombre_empleado: newFormData.designer || 'Equipo de Producción', id_orden: newId, cliente: newFormData.client, producto: newFormData.product, fecha_entrega: new Date(newFormData.deadline).toLocaleString('es-EC') };
            emailjs.send('service_zomo514', 'template_8on9rfj', templateParams, '10EcePWRPRn0DbhL7').catch((err) => console.error(err));

            setNewFormData({ orderType: newFormData.orderType, client: '', product: '', quantity: '1', vendor: currentUser.name, openSize: '', closedSize: '', notes: '', deadline: '', urgent: false, oTrab: '', designer: '', colorProof: false });
            setStdForm({ matBond: false, matBondGr: '', matCoucheB: false, matCoucheBGr: '', matCoucheM: false, matCoucheMGr: '', matCartulina: false, matCartulinaGr: '', matAdhesivoSeg: false, adhSegTipo: '', matAdhesivoPoli: false, matOtros: false, matOtrosText: '', medida: '', medidaOtro: '', cantPlanas1: '', cantPlanas2: '', cantAdicionales: '', totalPlanas: '', obsMateriales: '', impAccurio: false, accTiro: false, accRetiro: false, impOffset: false, offTiro: false, offRetiro: false, impFlexo: false, flexoTiro: false, flexoRetiro: false, planasImpresas: '', planasDanadas: '', lamMate: false, lamBrillo: false, lamTiro: false, lamRetiro: false, uvMate: false, uvBrillo: false, uvTotal: false, uvTiro: false, uvRetiro: false, uvSect: false, troquelado: false, troqueladoText: '', medioCorte: false, medioCorteText: '', grafado: false, grafadoText: '', desprendible: false, desprendibleText: '', troqueladoOtros: false, troqueladoOtrosText: '', troqueladoObs: false, troqueladoObsText: '', grapado: false, grapadoText: '', numerado: false, numeradoText: '', doblado: false, dobladoText: '', anillado: false, anilladoText: '', perforado: false, perforadoText: '', plastificado: false, plastificadoText: '', acabadosOtros: false, acabadosOtrosText: '', acabadosObs: false, acabadosObsText: '', pegado: false, pegadoText: '', acetato: false, acetatoText: '', emblocado: false, emblocadoText: '', cintaDobleFaz: false, cintaDobleFazText: '', enfajillado: false, enfajilladoText: '', refilado: false, refiladoText: '', cordonCinta: false, cordonCintaText: '', manufOtros: false, manufOtrosText: '', empacado: false, empacadoText: '', distribucion: false, distribucionText: '', manufObs: false, manufObsText: '' });
            setWfForm({ camaOpciones: [], camaOtros: '', camaPliegos: '', camaCaras: [], plotterEquipos: [], plotterTintas: [], sustOpciones: [], sustOtros: '', sustPliegos: '', sustCaras: [], lonaOpciones: [], lonaOnz: '', vinilOpciones: [], vinilOtro: '', laminadoOpciones: [], laminadoCaras: [], otrosMatOpciones: [], otrosMatOtro: '', acabados: [], acabadosOtro: '', acabadosObs: '', entrega: [], indicaciones: '' });
        }, 800);
    };

    const handleSaveUser = (e) => {
        e.preventDefault();
        if (userFormData.id) { setUsers(users.map(u => u.id === userFormData.id ? { ...userFormData } : u)); showToast(`Actualizado`); }
        else { setUsers([...users, { ...userFormData, id: Date.now() }]); showToast("Registrado"); }
        setUserFormData({ id: null, username: '', password: '', role: 'Impresor', name: '', email: '' });
    };

    const handleEditClick = (user) => { setUserFormData({ ...user, email: user.email || '' }); };

    const handleDeleteUser = (userId, userName) => {
        showConfirm("Eliminar Empleado", `¿Está seguro de eliminar a ${userName}? Perderá el acceso al sistema.`, () => {
            setUsers(users.filter(u => u.id !== userId));
            closeDialog(); showToast("Empleado eliminado del sistema", "warning");
        });
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
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <img src="/logo.svg" alt="WF" className="h-12 w-auto object-contain bg-white/10 backdrop-blur-sm p-2 rounded-lg" />
                    <div><h1 className="text-2xl font-bold text-white shadow-sm">Torre de Control ERP</h1><p className="text-blue-300 font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /> Rol: {currentUser.role}</p></div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {pendingApprovals > 0 && <div className="bg-orange-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 font-bold animate-pulse"><Bell className="w-5 h-5" /> {pendingApprovals} Solicitudes</div>}
                    <button onClick={() => setIsHistoryModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg border border-slate-700"><History className="w-4 h-4 text-emerald-400" /> Historial ({completedOrders.length})</button>
                    <button onClick={toggleFullScreen} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white">
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                    {currentUser.role === 'Gerente' && <button onClick={() => setIsUsersModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"><Users className="w-4 h-4" /> Personal</button>}
                    <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-700">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300 text-xs font-mono mr-2">{currentTime.toLocaleTimeString('es-EC', {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="text-white text-sm font-bold border-l border-slate-700 pl-2">{currentUser.name}</span>
                        <button onClick={onLogout} className="text-slate-300 hover:text-red-400 ml-2 border-l border-slate-700 pl-2"><LogOut className="w-4 h-4" /></button>
                    </div>
                    {(currentUser.role === 'Ventas' || currentUser.role === 'Gerente') && <button onClick={() => setIsModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-lg font-extrabold flex items-center gap-2"><Plus className="w-5 h-5" /> Nueva Orden</button>}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 print:hidden bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="Buscar por cliente o ID de orden..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <Filter className="w-4 h-4 text-slate-500 mr-1" />
                    <button onClick={() => setFilterUrgent(!filterUrgent)} className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm font-bold transition-colors ${filterUrgent ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'}`}><AlertCircle className="w-4 h-4" /> Urgentes</button>
                    <button onClick={() => setFilterMine(!filterMine)} className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-sm font-bold transition-colors ${filterMine ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'}`}><Eye className="w-4 h-4" /> Mis Órdenes</button>
                    <button onClick={handlePrint} className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors"><Printer className="w-4 h-4" /> Imprimir</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:hidden">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl flex items-center justify-between border border-slate-700/80 shadow-lg"><div><p className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">Total Activas</p><h3 className="text-white text-3xl font-black">{filteredOrders.length}</h3></div><Activity className="w-8 h-8 text-blue-400 opacity-90" /></div>
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl flex items-center justify-between border border-slate-700/80 shadow-lg"><div><p className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">Gran Formato (WF)</p><h3 className="text-white text-3xl font-black">{filteredOrders.filter(o => o.type === 'Gran Formato').length}</h3></div><Layers className="w-8 h-8 text-purple-400 opacity-90" /></div>
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl flex items-center justify-between border border-slate-700/80 shadow-lg"><div><p className="text-cyan-300 text-xs font-bold uppercase tracking-wider mb-1">Prod. Estándar (OP)</p><h3 className="text-white text-3xl font-black">{filteredOrders.filter(o => o.type === 'Estándar').length}</h3></div><FileText className="w-8 h-8 text-cyan-400 opacity-90" /></div>
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl flex items-center justify-between border border-slate-700/80 shadow-lg"><div><p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">Historial Completado</p><h3 className="text-white text-3xl font-black">{completedOrders.length}</h3></div><CheckCircle className="w-8 h-8 text-emerald-400 opacity-90" /></div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto overflow-y-visible pb-12">
                    <div className="flex gap-6 min-w-max items-start">
                        {columns.map(column => {
                            const columnOrders = filteredOrders.filter(o => o.status === column);
                            return (
                                <Droppable droppableId={column} key={column}>
                                    {(provided, snapshot) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps} className={`w-[300px] bg-slate-100 rounded-xl p-4 transition-colors shadow-xl flex flex-col shrink-0 ${snapshot.isDraggingOver ? 'bg-slate-200 ring-2 ring-blue-600' : ''}`}>
                                            <h2 className="font-extrabold text-slate-900 mb-4 flex justify-between items-center text-sm">{column} <span className="bg-white border text-slate-800 text-xs py-0.5 px-2.5 rounded-full font-bold shadow-sm">{columnOrders.length}</span></h2>
                                            <div className="flex flex-col gap-4 pr-1 pb-2">
                                                {columnOrders.length === 0 && !snapshot.isDraggingOver && (<div className="h-24 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl opacity-80"><Info className="w-6 h-6 mb-1 opacity-50" /><span className="text-xs font-semibold">Sin órdenes</span></div>)}
                                                {columnOrders.map((order, index) => {
                                                    const isLocked = !canModifyOrder(order.status);
                                                    const isOverdue = order.deadline && new Date(order.deadline) < currentTime && order.status !== 'Instalación';
                                                    const hasEvidence = order.evidence && order.evidence.length > 0;
                                                    return (
                                                        <Draggable draggableId={order.id} index={index} key={order.id} isDragDisabled={isLocked}>
                                                            {(provided, snapshot) => (
                                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setSelectedOrder({ ...order, isLocked })}
                                                                     className={`bg-white p-4 rounded-xl shadow-md border-l-4 transition-all relative group print:break-inside-avoid print:border ${isLocked ? 'cursor-not-allowed opacity-85 hover:bg-slate-50' : 'cursor-grab hover:shadow-lg'} ${order.overrideRequested ? 'border-orange-500 ring-2 ring-orange-300 bg-orange-50' : (isOverdue ? 'border-red-600 ring-1 ring-red-500' : (order.type === 'Gran Formato' ? 'border-purple-500' : 'border-cyan-500'))} ${snapshot.isDragging ? 'shadow-2xl rotate-3 scale-105 z-50' : ''}`}>
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`font-extrabold text-xs px-2 py-0.5 rounded ${order.type === 'Gran Formato' ? 'bg-purple-100 text-purple-800' : 'bg-cyan-100 text-cyan-800'}`}>{order.id}</span>
                                                                            {order.urgent && <AlertTriangle className="w-4 h-4 text-red-500" title="Prioridad Urgente" />}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 print:hidden">
                                                                            {isLocked && <Lock className="w-4 h-4 text-slate-400" title="Bloqueado: Estación de otro empleado" />}
                                                                            {hasEvidence && <ImageIcon className="w-4 h-4 text-emerald-600" title="Contiene evidencia visual" />}
                                                                            {order.overrideRequested && <AlertTriangle className="w-4 h-4 text-orange-500 animate-pulse" title="Esperando Autorización" />}
                                                                            {isOverdue && !order.overrideRequested && <Mail className="w-4 h-4 text-red-600 animate-bounce" title="Atrasado" />}
                                                                        </div>
                                                                    </div>
                                                                    <h3 className="font-extrabold text-slate-900 leading-tight text-sm mb-1">{order.client}</h3>
                                                                    <p className="text-xs text-slate-500 mb-3 font-medium truncate">{order.product}</p>
                                                                    <div className="flex flex-col gap-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                                                                        <div className="flex justify-between"><span>Responsable:</span> <strong className="text-blue-700">{order.assigned}</strong></div>
                                                                        {order.deadline && <div className={`flex justify-between items-center ${isOverdue ? 'text-red-600 font-bold' : ''}`}><span>Entrega:</span> <span><CalendarClock className="w-3 h-3 inline mr-1 opacity-70"/>{new Date(order.deadline).toLocaleString('es-EC', { dateStyle:'short', timeStyle:'short'})}</span></div>}
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <h2 className="font-bold text-xl flex items-center gap-2 text-white"><FileText className="w-6 h-6 text-brand-accent"/> Ingreso de Orden Física</h2>
                                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                                    <button onClick={(e)=>{e.preventDefault(); setNewFormData({...newFormData, orderType: 'Estándar'});}} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${newFormData.orderType === 'Estándar' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>OP Estándar</button>
                                    <button onClick={(e)=>{e.preventDefault(); setNewFormData({...newFormData, orderType: 'Gran Formato'});}} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${newFormData.orderType === 'Gran Formato' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>OP Gran Formato</button>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleCreateOrder} className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
                            <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-700 shadow-inner">
                                <h3 className="text-sm font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2 uppercase tracking-widest">
                                    FAVOR LLENAR TODOS LOS CAMPOS CORRESPONDIENTES
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-400 mb-1">CLIENTE</label><input required type="text" value={newFormData.client} onChange={(e) => setNewFormData({...newFormData, client: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"/></div>
                                    <div><label className="block text-xs font-semibold text-slate-400 mb-1">CANTIDAD</label><input required type="number" value={newFormData.quantity} onChange={(e) => setNewFormData({...newFormData, quantity: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"/></div>
                                    <div><label className="block text-xs font-semibold text-slate-400 mb-1">FECHA ENTREGA</label><input required type="datetime-local" value={newFormData.deadline} onChange={(e) => setNewFormData({...newFormData, deadline: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"/></div>

                                    <div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-400 mb-1">PRODUCTO</label><input required type="text" value={newFormData.product} onChange={(e) => setNewFormData({...newFormData, product: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"/></div>
                                    <div><label className="block text-xs font-semibold text-slate-400 mb-1">VENDEDOR</label><input type="text" value={newFormData.vendor} readOnly className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-400 cursor-not-allowed"/></div>
                                    <div><label className="block text-xs font-semibold text-slate-400 mb-1">O / TRAB #</label><input type="text" value={newFormData.oTrab} onChange={(e) => setNewFormData({...newFormData, oTrab: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"/></div>

                                    <div><label className="block text-xs font-semibold text-slate-400 mb-1">MEDIDA ABIERTA</label><input type="text" value={newFormData.openSize} onChange={(e) => setNewFormData({...newFormData, openSize: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"/></div>
                                    <div><label className="block text-xs font-semibold text-slate-400 mb-1">MEDIDA CERRADA</label><input type="text" value={newFormData.closedSize} onChange={(e) => setNewFormData({...newFormData, closedSize: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white"/></div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">DISEÑADOR ASIGNADO</label>
                                        <select required value={newFormData.designer} onChange={(e) => setNewFormData({...newFormData, designer: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500 font-bold">
                                            <option value="">Seleccione diseñador...</option>
                                            {users.filter(u => u.role === 'Diseñador').length > 0 ? (
                                                users.filter(u => u.role === 'Diseñador').map(u => (<option key={u.id} value={u.name}>{u.name}</option>))
                                            ) : (
                                                users.map(u => (<option key={u.id} value={u.name}>{u.name} ({u.role})</option>))
                                            )}
                                        </select>
                                    </div>

                                    {newFormData.orderType === 'Gran Formato' && (
                                        <div className="flex items-center justify-center bg-slate-800 rounded border border-slate-700 p-2">
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-200 cursor-pointer"><input type="checkbox" checked={newFormData.colorProof} onChange={(e) => setNewFormData({...newFormData, colorProof: e.target.checked})} className="w-4 h-4 rounded text-purple-500 bg-slate-900 border-slate-600"/> PRUEBA DE COLOR</label>
                                        </div>
                                    )}
                                    <div className="md:col-span-4"><label className="block text-xs font-semibold text-slate-400 mb-1">OBSERVACIONES</label><textarea value={newFormData.notes} onChange={(e) => setNewFormData({...newFormData, notes: e.target.value})} className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-sm text-white" rows="1"/></div>
                                </div>
                            </div>

                            {newFormData.orderType === 'Estándar' && (
                                <div className="space-y-4 animate-in fade-in duration-300 bg-slate-200 text-slate-900 p-3 rounded-lg font-sans border-2 border-slate-400 shadow-inner">
                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">MATERIALES</div>
                                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2"><input type="checkbox" checked={stdForm.matBond} onChange={(e)=>setStdForm({...stdForm, matBond: e.target.checked})} className="w-4 h-4 text-cyan-600 border-slate-400"/><span className="w-32">PAPEL BOND</span><input type="text" value={stdForm.matBondGr} onChange={(e)=>setStdForm({...stdForm, matBondGr: e.target.value})} className="border-b border-slate-400 bg-transparent w-12 text-center focus:outline-none"/> GR.</div>
                                                <div className="flex items-center gap-2"><input type="checkbox" checked={stdForm.matCoucheB} onChange={(e)=>setStdForm({...stdForm, matCoucheB: e.target.checked})} className="w-4 h-4 text-cyan-600 border-slate-400"/><span className="w-32">COUCHE BRILLO</span><input type="text" value={stdForm.matCoucheBGr} onChange={(e)=>setStdForm({...stdForm, matCoucheBGr: e.target.value})} className="border-b border-slate-400 bg-transparent w-12 text-center focus:outline-none"/> GR.</div>
                                                <div className="flex items-center gap-2"><input type="checkbox" checked={stdForm.matCoucheM} onChange={(e)=>setStdForm({...stdForm, matCoucheM: e.target.checked})} className="w-4 h-4 text-cyan-600 border-slate-400"/><span className="w-32">COUCHE MATE</span><input type="text" value={stdForm.matCoucheMGr} onChange={(e)=>setStdForm({...stdForm, matCoucheMGr: e.target.value})} className="border-b border-slate-400 bg-transparent w-12 text-center focus:outline-none"/> GR.</div>
                                                <div className="flex items-center gap-2"><input type="checkbox" checked={stdForm.matCartulina} onChange={(e)=>setStdForm({...stdForm, matCartulina: e.target.checked})} className="w-4 h-4 text-cyan-600 border-slate-400"/><span className="w-32">CARTULINA</span><input type="text" value={stdForm.matCartulinaGr} onChange={(e)=>setStdForm({...stdForm, matCartulinaGr: e.target.value})} className="border-b border-slate-400 bg-transparent w-12 text-center focus:outline-none"/> GR.</div>

                                                <div className="flex items-center gap-2 mt-2">
                                                    <input type="checkbox" checked={stdForm.matAdhesivoSeg} onChange={(e)=>setStdForm({...stdForm, matAdhesivoSeg: e.target.checked})} className="w-4 h-4 text-cyan-600 border-slate-400"/>
                                                    <div className="flex flex-col">
                                                        <span>PAPEL ADHESIVO DE SEGURIDAD</span>
                                                        <div className="flex gap-2 ml-4 mt-1">
                                                            <label><input type="radio" name="adhSeg" checked={stdForm.adhSegTipo==='Con PreCorte'} onChange={()=>setStdForm({...stdForm, adhSegTipo:'Con PreCorte'})}/> Con PreCorte</label>
                                                            <label><input type="radio" name="adhSeg" checked={stdForm.adhSegTipo==='Sin PreCorte'} onChange={()=>setStdForm({...stdForm, adhSegTipo:'Sin PreCorte'})}/> Sin PreCorte</label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <label className="flex items-center gap-2 mt-1"><input type="checkbox" checked={stdForm.matAdhesivoPoli} onChange={(e)=>setStdForm({...stdForm, matAdhesivoPoli: e.target.checked})} className="w-4 h-4 text-cyan-600"/> ADHESIVO POLIPROPILENO</label>
                                                <div className="flex items-center gap-2 mt-1"><input type="checkbox" checked={stdForm.matOtros} onChange={(e)=>setStdForm({...stdForm, matOtros: e.target.checked})} className="w-4 h-4 text-cyan-600"/> OTROS <input type="text" value={stdForm.matOtrosText} onChange={(e)=>setStdForm({...stdForm, matOtrosText: e.target.value})} className="border-b border-slate-400 flex-1 focus:outline-none"/></div>
                                            </div>
                                            <div className="space-y-2 border-l border-slate-300 pl-4">
                                                <div className="p-2 border border-slate-400 w-max space-y-1 bg-slate-50">
                                                    {['32,5 X 45 CM', '33 X 48 CM'].map(med => (<label key={med} className="flex items-center gap-2"><input type="radio" name="medida" checked={stdForm.medida===med} onChange={()=>setStdForm({...stdForm, medida: med})} className="w-4 h-4"/> {med}</label>))}
                                                    <div className="flex items-center gap-2 mt-1"><span className="border border-slate-400 px-1 bg-slate-200 cursor-pointer" onClick={()=>setStdForm({...stdForm, medida: 'OTRO'})}>OTRO</span> <input type="text" value={stdForm.medidaOtro} onChange={(e)=>{setStdForm({...stdForm, medidaOtro: e.target.value, medida:'OTRO'})}} className="border-b border-slate-400 w-24 focus:outline-none"/></div>
                                                </div>
                                                <div className="space-y-1 mt-4">
                                                    <div className="flex justify-between w-48"><span>Cant. Planas</span><input type="text" value={stdForm.cantPlanas1} onChange={(e)=>setStdForm({...stdForm, cantPlanas1: e.target.value})} className="border-b border-slate-400 w-16 focus:outline-none text-right"/></div>
                                                    <div className="flex justify-between w-48"><span>Cant. Planas</span><input type="text" value={stdForm.cantPlanas2} onChange={(e)=>setStdForm({...stdForm, cantPlanas2: e.target.value})} className="border-b border-slate-400 w-16 focus:outline-none text-right"/></div>
                                                    <div className="flex justify-between w-48"><span>Cant. Adicionales</span><input type="text" value={stdForm.cantAdicionales} onChange={(e)=>setStdForm({...stdForm, cantAdicionales: e.target.value})} className="border-b border-slate-400 w-16 focus:outline-none text-right"/></div>
                                                    <div className="flex justify-between w-48 font-bold mt-2"><span>TOTAL PLANAS</span><input type="text" value={stdForm.totalPlanas} onChange={(e)=>setStdForm({...stdForm, totalPlanas: e.target.value})} className="border-b border-slate-400 w-16 focus:outline-none text-right"/></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-3 pb-3 flex items-center gap-2 text-xs font-semibold">OBSERVACIONES <input type="text" value={stdForm.obsMateriales} onChange={(e)=>setStdForm({...stdForm, obsMateriales: e.target.value})} className="border-b border-slate-400 flex-1 bg-transparent focus:outline-none"/></div>
                                    </div>

                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">ÁREA DE IMPRESIÓN</div>
                                        <div className="grid grid-cols-3 divide-x divide-slate-400 text-xs font-semibold border-b border-slate-400 bg-slate-100">
                                            <div className="p-2 flex items-center justify-center gap-2"><input type="checkbox" checked={stdForm.impAccurio} onChange={(e)=>setStdForm({...stdForm, impAccurio: e.target.checked})}/> ACCURIO PRINT C3070L</div>
                                            <div className="p-2 flex items-center justify-center gap-2"><input type="checkbox" checked={stdForm.impOffset} onChange={(e)=>setStdForm({...stdForm, impOffset: e.target.checked})}/> OFFSET</div>
                                            <div className="p-2 flex items-center justify-center gap-2"><input type="checkbox" checked={stdForm.impFlexo} onChange={(e)=>setStdForm({...stdForm, impFlexo: e.target.checked})}/> FLEXO</div>
                                        </div>
                                        <div className="grid grid-cols-3 divide-x divide-slate-400 text-xs font-semibold border-b border-slate-400">
                                            <div className="p-2 grid grid-rows-2 gap-1 bg-slate-50"><label className="flex justify-center gap-2"><input type="checkbox" checked={stdForm.accTiro} onChange={(e)=>setStdForm({...stdForm, accTiro: e.target.checked})}/> TIRO</label><label className="flex justify-center gap-2"><input type="checkbox" checked={stdForm.accRetiro} onChange={(e)=>setStdForm({...stdForm, accRetiro: e.target.checked})}/> RETIRO</label></div>
                                            <div className="p-2 grid grid-rows-2 gap-1"><label className="flex justify-center gap-2"><input type="checkbox" checked={stdForm.offTiro} onChange={(e)=>setStdForm({...stdForm, offTiro: e.target.checked})}/> TIRO</label><label className="flex justify-center gap-2"><input type="checkbox" checked={stdForm.offRetiro} onChange={(e)=>setStdForm({...stdForm, offRetiro: e.target.checked})}/> RETIRO</label></div>
                                            <div className="p-2 grid grid-rows-2 gap-1 bg-slate-50"><label className="flex justify-center gap-2"><input type="checkbox" checked={stdForm.flexoTiro} onChange={(e)=>setStdForm({...stdForm, flexoTiro: e.target.checked})}/> TIRO</label><label className="flex justify-center gap-2"><input type="checkbox" checked={stdForm.flexoRetiro} onChange={(e)=>setStdForm({...stdForm, flexoRetiro: e.target.checked})}/> RETIRO</label></div>
                                        </div>
                                        <div className="p-2 space-y-1 text-xs font-semibold">
                                            <div className="flex w-64 border border-slate-400"><span className="bg-slate-200 px-2 border-r border-slate-400 w-48">Planas impresas</span><input type="text" value={stdForm.planasImpresas} onChange={(e)=>setStdForm({...stdForm, planasImpresas: e.target.value})} className="w-16 text-center focus:outline-none"/></div>
                                            <div className="flex w-64 border border-slate-400"><span className="bg-slate-200 px-2 border-r border-slate-400 w-48">Planas dañadas por máquina</span><input type="text" value={stdForm.planasDanadas} onChange={(e)=>setStdForm({...stdForm, planasDanadas: e.target.value})} className="w-16 text-center focus:outline-none"/></div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">ÁREA DE LAMINADO / BARNIZ</div>
                                        <div className="p-3 flex justify-between items-center text-[10px] font-bold">
                                            <div className="flex flex-col gap-2 border-r border-slate-300 pr-4">
                                                <div className="flex gap-4"><span className="w-16">LAMINADO</span><label className="flex gap-1 items-center">MATE <input type="checkbox" checked={stdForm.lamMate} onChange={(e)=>setStdForm({...stdForm, lamMate: e.target.checked})} className="w-3 h-3"/></label><label className="flex gap-1 items-center">BRILLO <input type="checkbox" checked={stdForm.lamBrillo} onChange={(e)=>setStdForm({...stdForm, lamBrillo: e.target.checked})} className="w-3 h-3"/></label></div>
                                                <div className="flex gap-4"><span className="w-16">LADOS</span><label className="flex gap-1 items-center">TIRO <input type="checkbox" checked={stdForm.lamTiro} onChange={(e)=>setStdForm({...stdForm, lamTiro: e.target.checked})} className="w-3 h-3"/></label><label className="flex gap-1 items-center">RETIRO <input type="checkbox" checked={stdForm.lamRetiro} onChange={(e)=>setStdForm({...stdForm, lamRetiro: e.target.checked})} className="w-3 h-3"/></label></div>
                                            </div>
                                            <div className="flex flex-col gap-2 pl-4">
                                                <div className="flex gap-4"><span className="w-8 text-center">UV</span><label className="flex gap-1 items-center">MATE <input type="checkbox" checked={stdForm.uvMate} onChange={(e)=>setStdForm({...stdForm, uvMate: e.target.checked})} className="w-3 h-3"/></label><label className="flex gap-1 items-center">BRILLO <input type="checkbox" checked={stdForm.uvBrillo} onChange={(e)=>setStdForm({...stdForm, uvBrillo: e.target.checked})} className="w-3 h-3"/></label><label className="flex gap-1 items-center">TOTAL <input type="checkbox" checked={stdForm.uvTotal} onChange={(e)=>setStdForm({...stdForm, uvTotal: e.target.checked})} className="w-3 h-3"/></label></div>
                                                <div className="flex gap-4"><span className="w-8 text-center">LADOS</span><label className="flex gap-1 items-center">TIRO <input type="checkbox" checked={stdForm.uvTiro} onChange={(e)=>setStdForm({...stdForm, uvTiro: e.target.checked})} className="w-3 h-3"/></label><label className="flex gap-1 items-center">RETIRO <input type="checkbox" checked={stdForm.uvRetiro} onChange={(e)=>setStdForm({...stdForm, uvRetiro: e.target.checked})} className="w-3 h-3"/></label><label className="flex gap-1 items-center">SECT <input type="checkbox" checked={stdForm.uvSect} onChange={(e)=>setStdForm({...stdForm, uvSect: e.target.checked})} className="w-3 h-3"/></label></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">ÁREA TROQUELADO</div>
                                        <div className="p-3 text-xs font-semibold space-y-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2 w-full">
                                                    {renderStdField('troquelado', 'TROQUELADO')}
                                                    {renderStdField('grafado', 'GRAFADO')}
                                                    {renderStdField('troqueladoOtros', 'OTROS')}
                                                </div>
                                                <div className="space-y-2 w-full">
                                                    {renderStdField('medioCorte', 'MEDIO CORTE')}
                                                    {renderStdField('desprendible', 'DESPRENDIBLE')}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full pt-1">
                                                <input type="checkbox" checked={stdForm.troqueladoObs} onChange={(e)=>setStdForm({...stdForm, troqueladoObs: e.target.checked})} className="w-3 h-3 text-cyan-600 border-slate-400"/>
                                                <span className="whitespace-nowrap text-[10px]">OBSERVACIONES</span>
                                                <input type="text" value={stdForm.troqueladoObsText} onChange={(e)=>setStdForm({...stdForm, troqueladoObsText: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none text-[10px] h-4"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">ÁREA ACABADOS VARIOS</div>
                                        <div className="p-3 text-xs font-semibold space-y-2">
                                            <div className="grid grid-cols-3 gap-3">
                                                {renderStdField('grapado', 'GRAPADO')}
                                                {renderStdField('numerado', 'NUMERADO')}
                                                {renderStdField('doblado', 'DOBLADO')}
                                                {renderStdField('anillado', 'ANILLADO')}
                                                {renderStdField('perforado', 'PERFORADO')}
                                                {renderStdField('plastificado', 'PLASTIFICADO')}
                                                <div className="col-span-3">{renderStdField('acabadosOtros', 'OTROS')}</div>
                                            </div>
                                            <div className="flex items-center gap-2 w-full pt-1">
                                                <input type="checkbox" checked={stdForm.acabadosObs} onChange={(e)=>setStdForm({...stdForm, acabadosObs: e.target.checked})} className="w-3 h-3 text-cyan-600 border-slate-400"/>
                                                <span className="whitespace-nowrap text-[10px]">OBSERVACIONES</span>
                                                <input type="text" value={stdForm.acabadosObsText} onChange={(e)=>setStdForm({...stdForm, acabadosObsText: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none text-[10px] h-4"/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">MANUFACTURA</div>
                                        <div className="p-3 text-xs font-semibold space-y-2">
                                            <div className="grid grid-cols-3 gap-3">
                                                {renderStdField('pegado', 'PEGADO')}
                                                {renderStdField('acetato', 'ACETATO')}
                                                {renderStdField('emblocado', 'EMBLOCADO')}
                                                {renderStdField('cintaDobleFaz', 'CINTA DOBLE FAZ')}
                                                {renderStdField('enfajillado', 'ENFAJILLADO')}
                                                {renderStdField('refilado', 'REFILADO')}
                                                {renderStdField('cordonCinta', 'CORDÓN/CINTA')}
                                                {renderStdField('manufOtros', 'OTROS')}
                                            </div>
                                            <div className="space-y-2 mt-2 pt-2 border-t border-slate-200">
                                                {renderStdField('empacado', 'EMPACADO')}
                                                {renderStdField('distribucion', 'DISTRIBUCIÓN')}
                                                <div className="flex items-center gap-2 w-full">
                                                    <input type="checkbox" checked={stdForm.manufObs} onChange={(e)=>setStdForm({...stdForm, manufObs: e.target.checked})} className="w-3 h-3 text-cyan-600 border-slate-400"/>
                                                    <span className="whitespace-nowrap text-[10px]">OBSERVACIONES</span>
                                                    <input type="text" value={stdForm.manufObsText} onChange={(e)=>setStdForm({...stdForm, manufObsText: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none text-[10px] h-4"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {newFormData.orderType === 'Gran Formato' && (
                                <div className="space-y-4 animate-in fade-in duration-300 bg-slate-200 text-slate-900 p-2 rounded-lg font-sans border-2 border-slate-400 shadow-inner">
                                    <div className="border border-slate-400 mb-2 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">IMPRESIÓN DIRECTA - CAMA PLANA</div>
                                        <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-semibold">
                                            {['PVC', 'FOMECORE', 'C. CORRUGADO FLAUTA', 'PLASTIPRO', 'POLIESTIRENO'].map(item => (<label key={item} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.camaOpciones.includes(item)} onChange={()=>handleToggleWF('camaOpciones', item)} className="w-3 h-3 text-purple-600 border-slate-400 rounded-sm"/> {item}</label>))}
                                            <div className="flex items-center gap-2"><label className="flex items-center gap-2"><input type="checkbox" checked={wfForm.camaOpciones.includes('OTROS')} onChange={()=>handleToggleWF('camaOpciones', 'OTROS')} className="w-3 h-3"/> OTROS</label><input type="text" value={wfForm.camaOtros} onChange={(e)=>setWfForm({...wfForm, camaOtros: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none"/></div>
                                            <div className="flex items-center gap-2">PLIEGOS <input type="text" value={wfForm.camaPliegos} onChange={(e)=>setWfForm({...wfForm, camaPliegos: e.target.value})} className="border-b border-slate-400 bg-transparent w-16 focus:outline-none"/></div>
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-1"><input type="checkbox" checked={wfForm.camaCaras.includes('TIRO')} onChange={()=>handleToggleWF('camaCaras', 'TIRO')} className="w-3 h-3"/> TIRO</label>
                                                <label className="flex items-center gap-1"><input type="checkbox" checked={wfForm.camaCaras.includes('RETIRO')} onChange={()=>handleToggleWF('camaCaras', 'RETIRO')} className="w-3 h-3"/> RETIRO</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div className="border border-slate-400 bg-white flex flex-col">
                                            <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase">IMPRESIÓN PLOTTER</div>
                                            <div className="p-3 grid grid-cols-2 gap-2 text-xs font-semibold flex-1">
                                                <div className="space-y-2">
                                                    {['GALAXY 160', 'GALAXY 180', 'GALAXY 320'].map(item => (<label key={item} className="flex items-center gap-2"><input type="checkbox" checked={wfForm.plotterEquipos.includes(item)} onChange={()=>handleToggleWF('plotterEquipos', item)} className="w-3 h-3"/> {item}</label>))}
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2"><input type="checkbox" checked={wfForm.plotterEquipos.includes('MIMAKI UJV 100')} onChange={()=>handleToggleWF('plotterEquipos', 'MIMAKI UJV 100')} className="w-3 h-3"/> MIMAKI UJV 100</label>
                                                    <div className="ml-5 flex flex-col gap-1">
                                                        {['CMYK', 'CLEAR', 'BLANCO'].map(item => (<label key={item} className="flex items-center gap-2"><input type="checkbox" checked={wfForm.plotterTintas.includes(item)} onChange={()=>handleToggleWF('plotterTintas', item)} className="w-3 h-3"/> {item}</label>))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="border border-slate-400 bg-white flex flex-col">
                                            <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase">SUSTRATOS</div>
                                            <div className="p-3 grid grid-cols-2 gap-2 text-xs font-semibold flex-1">
                                                <div className="space-y-2">
                                                    {['PVC', 'CARTON FLAUTA', 'FOMECORE', 'PLASTIPRO'].map(item => (<label key={item} className="flex items-center gap-2"><input type="checkbox" checked={wfForm.sustOpciones.includes(item)} onChange={()=>handleToggleWF('sustOpciones', item)} className="w-3 h-3"/> {item}</label>))}
                                                    <div className="flex items-center gap-2">PLIEGOS <input type="text" value={wfForm.sustPliegos} onChange={(e)=>setWfForm({...wfForm, sustPliegos: e.target.value})} className="border-b border-slate-400 bg-transparent w-16 focus:outline-none"/></div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2"><input type="checkbox" checked={wfForm.sustCaras.includes('TIRO')} onChange={()=>handleToggleWF('sustCaras', 'TIRO')} className="w-3 h-3"/> TIRO</label>
                                                    <label className="flex items-center gap-2"><input type="checkbox" checked={wfForm.sustCaras.includes('RETIRO')} onChange={()=>handleToggleWF('sustCaras', 'RETIRO')} className="w-3 h-3"/> RETIRO</label>
                                                    <div className="flex items-center gap-2 mt-2"><label className="flex items-center gap-2"><input type="checkbox" checked={wfForm.sustOpciones.includes('OTROS')} onChange={()=>handleToggleWF('sustOpciones', 'OTROS')} className="w-3 h-3"/> OTROS</label><input type="text" value={wfForm.sustOtros} onChange={(e)=>setWfForm({...wfForm, sustOtros: e.target.value})} className="border-b border-slate-400 bg-transparent w-16 focus:outline-none"/></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">MATERIALES</div>
                                        <div className="p-3 space-y-3 text-xs font-semibold">
                                            <div className="flex items-center gap-4 bg-slate-100 p-2 rounded">
                                                <span className="font-black bg-slate-300 px-3 py-1 uppercase">LONA</span>
                                                {['MATE', 'BRILLO', 'MESH', 'TRASLUCIDA'].map(item => (<label key={item} className="flex items-center gap-1"><input type="checkbox" checked={wfForm.lonaOpciones.includes(item)} onChange={()=>handleToggleWF('lonaOpciones', item)} className="w-3 h-3"/> {item}</label>))}
                                                <div className="flex items-center gap-1 ml-auto">ONZ <input type="text" value={wfForm.lonaOnz} onChange={(e)=>setWfForm({...wfForm, lonaOnz: e.target.value})} className="border-b border-slate-400 bg-transparent w-12 text-center focus:outline-none"/></div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 bg-slate-100 p-2 rounded">
                                                <span className="font-black bg-slate-300 px-3 py-1 uppercase">VINIL</span>
                                                {['MATE', 'BRILLO', 'TRANSPARENTE', 'REMOVIBLE', 'MICROPERFORADO', 'BLOCK OUT', 'FOTOLUMINISCENTE'].map(item => (<label key={item} className="flex items-center gap-1"><input type="checkbox" checked={wfForm.vinilOpciones.includes(item)} onChange={()=>handleToggleWF('vinilOpciones', item)} className="w-3 h-3"/> {item}</label>))}
                                                <div className="flex items-center gap-1 w-full mt-1">OTRO <input type="text" value={wfForm.vinilOtro} onChange={(e)=>setWfForm({...wfForm, vinilOtro: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none"/></div>
                                            </div>
                                            <div className="flex items-center gap-4 bg-slate-100 p-2 rounded">
                                                <span className="font-black bg-slate-300 px-3 py-1 uppercase">LAMINADO</span>
                                                {['MATE', 'BRILLO', 'FLOORGRAPHIC'].map(item => (<label key={item} className="flex items-center gap-1"><input type="checkbox" checked={wfForm.laminadoOpciones.includes(item)} onChange={()=>handleToggleWF('laminadoOpciones', item)} className="w-3 h-3"/> {item}</label>))}
                                                <div className="flex items-center gap-4 ml-auto border-l border-slate-400 pl-4">
                                                    {['TIRO', 'RETIRO'].map(item => (<label key={item} className="flex items-center gap-1"><input type="checkbox" checked={wfForm.laminadoCaras.includes(item)} onChange={()=>handleToggleWF('laminadoCaras', item)} className="w-3 h-3"/> {item}</label>))}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-4 bg-slate-100 p-2 rounded">
                                                <span className="font-black bg-slate-300 px-3 py-1 uppercase">OTROS</span>
                                                {['BLUEBACK', 'BACKLIGHT', 'PET BANNER', 'TELA', 'ARENADO', 'VINIL DE CORTE'].map(item => (<label key={item} className="flex items-center gap-1"><input type="checkbox" checked={wfForm.otrosMatOpciones.includes(item)} onChange={()=>handleToggleWF('otrosMatOpciones', item)} className="w-3 h-3"/> {item}</label>))}
                                                <div className="flex items-center gap-1 flex-1">OTRO <input type="text" value={wfForm.otrosMatOtro} onChange={(e)=>setWfForm({...wfForm, otrosMatOtro: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none"/></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">ACABADOS</div>
                                        <div className="p-3 text-xs font-semibold">
                                            <div className="grid grid-cols-3 gap-3 mb-2">
                                                {['REFILADO', 'MEDIO CORTE', 'DOBLADO', 'CINTA DOBLE FAZ', 'TROQUELADO', 'PEGADO', 'OJALES', 'GRAFADO', 'BOLSILLO'].map(item => (<label key={item} className="flex items-center gap-1"><input type="checkbox" checked={wfForm.acabados.includes(item)} onChange={()=>handleToggleWF('acabados', item)} className="w-3 h-3"/> {item}</label>))}
                                                <div className="flex items-center gap-1 col-span-3">OTRO <input type="text" value={wfForm.acabadosOtro} onChange={(e)=>setWfForm({...wfForm, acabadosOtro: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none"/></div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">OBSERVACIONES <input type="text" value={wfForm.acabadosObs} onChange={(e)=>setWfForm({...wfForm, acabadosObs: e.target.value})} className="border-b border-slate-400 bg-transparent flex-1 focus:outline-none"/></div>
                                        </div>
                                    </div>
                                    <div className="border border-slate-400 bg-white">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">ENTREGA FINAL</div>
                                        <div className="p-3 flex justify-between text-xs font-semibold">
                                            {['EMPACADO', 'ENFAJILLADO', 'DISTRIBUCIÓN', 'INSTALACIÓN'].map(item => (<label key={item} className="flex items-center gap-1"><input type="checkbox" checked={wfForm.entrega.includes(item)} onChange={()=>handleToggleWF('entrega', item)} className="w-3 h-3"/> {item}</label>))}
                                        </div>
                                    </div>
                                    <div className="border border-slate-400 bg-white flex flex-col h-24">
                                        <div className="bg-slate-300 text-center py-1 font-bold text-sm border-b border-slate-400 uppercase tracking-widest">INDICACIONES ADICIONALES</div>
                                        <textarea value={wfForm.indicaciones} onChange={(e)=>setWfForm({...wfForm, indicaciones: e.target.value})} className="w-full p-2 text-xs flex-1 focus:outline-none bg-transparent" placeholder="Escriba aquí..."></textarea>
                                    </div>
                                </div>
                            )}
                        </form>

                        <div className="bg-slate-950 border-t border-slate-800 p-4 flex gap-3 shrink-0 items-center justify-between">
                            <label className="flex items-center gap-2 text-sm font-bold text-red-500 cursor-pointer">
                                <input type="checkbox" checked={newFormData.urgent} onChange={(e) => setNewFormData({...newFormData, urgent: e.target.checked})} className="w-5 h-5 rounded text-red-600 bg-slate-900 border-slate-600"/> Marcar URGENTE
                            </label>
                            <div className="flex gap-3 w-1/2">
                                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="flex-1 bg-slate-800 text-slate-200 py-3 rounded-lg font-bold hover:bg-slate-700 transition-colors disabled:opacity-50">Cancelar</button>
                                <button onClick={handleCreateOrder} disabled={isSubmitting} className={`flex-1 text-white py-3 rounded-lg font-bold shadow-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-80 ${newFormData.orderType === 'Gran Formato' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}>
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Generar ${newFormData.orderType}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedOrder && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className={`p-4 flex justify-between items-center text-white shrink-0 ${selectedOrder.type === 'Gran Formato' ? 'bg-purple-950/80 border-b border-purple-800' : 'bg-cyan-950/80 border-b border-cyan-800'}`}>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs px-2.5 py-1 rounded font-black uppercase tracking-wider ${selectedOrder.type === 'Gran Formato' ? 'bg-purple-600' : 'bg-cyan-600'}`}>{selectedOrder.id}</span>
                                <h2 className="font-bold text-lg">{selectedOrder.client}</h2>
                                {selectedOrder.isLocked && <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full"><Lock className="w-3 h-3" /> Bloqueado</span>}
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-slate-300 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><span className="text-[10px] text-slate-500 block uppercase font-bold">O / TRAB #</span><strong className="text-sm text-brand-accent">{selectedOrder.wfData?.oTrab || selectedOrder.stdData?.oTrab || 'N/A'}</strong></div>
                                <div className="col-span-2"><span className="text-[10px] text-slate-500 block uppercase font-bold">Producto</span><strong className="text-sm text-white">{selectedOrder.product}</strong></div>
                                <div><span className="text-[10px] text-slate-500 block uppercase font-bold">Límite Entrega</span><strong className="text-sm text-red-400">{new Date(selectedOrder.deadline).toLocaleString('es-EC')}</strong></div>

                                <div><span className="text-[10px] text-slate-500 block uppercase font-bold">Cantidad</span><strong className="text-sm text-white">{selectedOrder.quantity}</strong></div>
                                <div><span className="text-[10px] text-slate-500 block uppercase font-bold">Medida Abierta</span><strong className="text-sm text-white">{selectedOrder.openSize || 'N/A'}</strong></div>
                                <div><span className="text-[10px] text-slate-500 block uppercase font-bold">Diseñador Asig.</span><strong className="text-sm text-cyan-300">{selectedOrder.wfData?.designer || selectedOrder.stdData?.designer || 'N/A'}</strong></div>
                                <div><span className="text-[10px] text-slate-500 block uppercase font-bold">Prueba Color</span><strong className={`text-sm ${selectedOrder.wfData?.colorProof || selectedOrder.stdData?.colorProof ? 'text-emerald-400' : 'text-slate-500'}`}>{selectedOrder.wfData?.colorProof || selectedOrder.stdData?.colorProof ? '✓ REQUERIDA' : 'NO'}</strong></div>
                            </div>

                            {selectedOrder.type === 'Estándar' && selectedOrder.stdData && (
                                <div className="bg-cyan-950/10 border border-cyan-900/30 p-4 rounded-xl space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400 flex items-center gap-2"><FileText className="w-4 h-4"/> Ficha Técnica OP Estándar</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div className="space-y-2">
                                            <div className="bg-slate-900 p-2 rounded"><strong className="text-slate-400 block mb-1">Materiales:</strong>
                                                <span className="text-white">
                                                    {selectedOrder.stdData.matBond && `Bond (${selectedOrder.stdData.matBondGr}g) `}
                                                    {selectedOrder.stdData.matCoucheB && `Couche Brillo (${selectedOrder.stdData.matCoucheBGr}g) `}
                                                    {selectedOrder.stdData.matCoucheM && `Couche Mate (${selectedOrder.stdData.matCoucheMGr}g) `}
                                                    {selectedOrder.stdData.matCartulina && `Cartulina (${selectedOrder.stdData.matCartulinaGr}g) `}
                                                    {selectedOrder.stdData.matAdhesivoSeg && `Adh. Seg. (${selectedOrder.stdData.adhSegTipo}) `}
                                                    {selectedOrder.stdData.matAdhesivoPoli && `Adh. Polipropileno `}
                                                </span>
                                            </div>
                                            <div className="bg-slate-900 p-2 rounded"><strong className="text-slate-400 inline">Medida:</strong> <span className="text-white">{selectedOrder.stdData.medida} {selectedOrder.stdData.medidaOtro}</span></div>
                                            <div className="bg-slate-900 p-2 rounded"><strong className="text-slate-400 inline">Total Planas:</strong> <span className="text-white font-bold">{selectedOrder.stdData.totalPlanas || '-'}</span></div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="bg-slate-900 p-2 rounded"><strong className="text-slate-400 block mb-1">Impresión:</strong>
                                                <span className="text-white">
                                                    {selectedOrder.stdData.impAccurio && `Accurio (${selectedOrder.stdData.accTiro?'Tiro':''}${selectedOrder.stdData.accRetiro?'/Retiro':''}) `}
                                                    {selectedOrder.stdData.impOffset && `Offset (${selectedOrder.stdData.offTiro?'Tiro':''}${selectedOrder.stdData.offRetiro?'/Retiro':''}) `}
                                                </span>
                                            </div>
                                            <div className="bg-slate-900 p-2 rounded"><strong className="text-slate-400 block mb-1">Laminado / UV:</strong>
                                                <span className="text-white">
                                                    Lam: {selectedOrder.stdData.lamMate?'Mate ':''}{selectedOrder.stdData.lamBrillo?'Brillo ':''} |
                                                    UV: {selectedOrder.stdData.uvMate?'Mate ':''}{selectedOrder.stdData.uvBrillo?'Brillo ':''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="col-span-2 grid grid-cols-3 gap-2 pt-2 border-t border-cyan-900/30">
                                            <div>
                                                <span className="text-[10px] text-cyan-500 uppercase font-bold block mb-1">Troquelado</span>
                                                <div className="flex flex-col gap-1 text-[9px]">
                                                    {selectedOrder.stdData.troquelado && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Troquelado: {selectedOrder.stdData.troqueladoText}</span>}
                                                    {selectedOrder.stdData.medioCorte && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Medio Corte: {selectedOrder.stdData.medioCorteText}</span>}
                                                    {selectedOrder.stdData.grafado && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Grafado: {selectedOrder.stdData.grafadoText}</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-cyan-500 uppercase font-bold block mb-1">Acabados</span>
                                                <div className="flex flex-col gap-1 text-[9px]">
                                                    {selectedOrder.stdData.grapado && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Grapado: {selectedOrder.stdData.grapadoText}</span>}
                                                    {selectedOrder.stdData.plastificado && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Plastificado: {selectedOrder.stdData.plastificadoText}</span>}
                                                    {selectedOrder.stdData.doblado && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Doblado: {selectedOrder.stdData.dobladoText}</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-cyan-500 uppercase font-bold block mb-1">Manufactura</span>
                                                <div className="flex flex-col gap-1 text-[9px]">
                                                    {selectedOrder.stdData.empacado && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Empacado: {selectedOrder.stdData.empacadoText}</span>}
                                                    {selectedOrder.stdData.distribucion && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Distribución: {selectedOrder.stdData.distribucionText}</span>}
                                                    {selectedOrder.stdData.refilado && <span className="bg-cyan-900/40 text-cyan-200 border border-cyan-800 px-1 rounded">Refilado: {selectedOrder.stdData.refiladoText}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedOrder.type === 'Gran Formato' && selectedOrder.wfData && (
                                <div className="bg-purple-950/10 border border-purple-900/30 p-4 rounded-xl space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2"><Layers className="w-4 h-4"/> Ficha Técnica WF (Digitalizada)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            {selectedOrder.wfData.camaOpciones?.length > 0 && <div className="bg-slate-900 p-2 rounded text-xs"><strong className="text-slate-400 block mb-1">Cama Plana:</strong> <span className="text-white">{selectedOrder.wfData.camaOpciones.join(', ')} {selectedOrder.wfData.camaCaras?.join(' ')}</span></div>}
                                            {selectedOrder.wfData.plotterEquipos?.length > 0 && <div className="bg-slate-900 p-2 rounded text-xs"><strong className="text-slate-400 block mb-1">Plotter:</strong> <span className="text-white">{selectedOrder.wfData.plotterEquipos.join(', ')} ({selectedOrder.wfData.plotterTintas?.join(', ')})</span></div>}
                                            {selectedOrder.wfData.sustOpciones?.length > 0 && <div className="bg-slate-900 p-2 rounded text-xs"><strong className="text-slate-400 block mb-1">Sustratos:</strong> <span className="text-white">{selectedOrder.wfData.sustOpciones.join(', ')} {selectedOrder.wfData.sustCaras?.join(' ')}</span></div>}
                                        </div>
                                        <div className="space-y-2">
                                            {selectedOrder.wfData.lonaOpciones?.length > 0 && <div className="bg-slate-900 p-2 rounded text-xs"><strong className="text-slate-400 block mb-1">Lona:</strong> <span className="text-white">{selectedOrder.wfData.lonaOpciones.join(', ')} ({selectedOrder.wfData.lonaOnz} ONZ)</span></div>}
                                            {selectedOrder.wfData.vinilOpciones?.length > 0 && <div className="bg-slate-900 p-2 rounded text-xs"><strong className="text-slate-400 block mb-1">Vinil:</strong> <span className="text-white">{selectedOrder.wfData.vinilOpciones.join(', ')}</span></div>}
                                            {selectedOrder.wfData.laminadoOpciones?.length > 0 && <div className="bg-slate-900 p-2 rounded text-xs"><strong className="text-slate-400 block mb-1">Laminado:</strong> <span className="text-white">{selectedOrder.wfData.laminadoOpciones.join(', ')}</span></div>}
                                        </div>
                                        <div className="col-span-2 flex flex-wrap gap-2 pt-2 border-t border-purple-900/30">
                                            <span className="text-[10px] text-purple-400 uppercase font-bold w-full">Acabados y Logística</span>
                                            {selectedOrder.wfData.acabados?.map(f => <span key={f} className="text-[10px] bg-purple-900/40 text-purple-200 border border-purple-800 px-2 py-0.5 rounded">{f}</span>)}
                                            {selectedOrder.wfData.entrega?.map(f => <span key={f} className="text-[10px] bg-emerald-900/40 text-emerald-200 border border-emerald-800 px-2 py-0.5 rounded">📦 {f}</span>)}
                                        </div>
                                    </div>
                                    {selectedOrder.wfData.indicaciones && <div className="bg-slate-900 p-3 rounded-lg text-xs border border-slate-700"><strong className="text-slate-400 block mb-1">Indicaciones Adicionales:</strong><span className="text-slate-200">{selectedOrder.wfData.indicaciones}</span></div>}
                                </div>
                            )}

                            {selectedOrder.notes && (<div><span className="text-xs text-slate-500 block mb-1">Observaciones Generales</span><p className="bg-slate-950/50 p-3 rounded-lg text-sm border border-slate-800 text-slate-300 italic">{selectedOrder.notes}</p></div>)}

                            {(selectedOrder.status === 'Despacho' || selectedOrder.status === 'Instalación') && (currentUser.role === 'Conductor' || currentUser.role === 'Gerente') && (
                                <div className="bg-emerald-950/40 border border-emerald-900 p-4 rounded-xl text-center">
                                    <p className="text-xs text-emerald-400 font-bold mb-3 uppercase tracking-wider">Logística e Instalación Final</p>
                                    {currentUser.role === 'Conductor' && (!selectedOrder.evidence || selectedOrder.evidence.length === 0) ? (
                                        <div className="bg-amber-950/50 border border-amber-800 p-3 rounded-lg text-amber-400 text-xs font-semibold flex items-center justify-center gap-2">
                                            <AlertTriangle className="w-4 h-4 shrink-0" /> Sube obligatoriamente una foto del acta o instalación para finalizar.
                                        </div>
                                    ) : (
                                        <button onClick={() => {
                                            showConfirm("Finalizar", "Se guardará en el registro histórico con sus evidencias.", () => {
                                                const finishedOrder = { ...selectedOrder, status: 'Completado', completedAt: new Date().toLocaleString('es-EC'), completedBy: currentUser.name };
                                                setCompletedOrders([finishedOrder, ...completedOrders]); setOrders(orders.filter(o => o.id !== selectedOrder.id)); setSelectedOrder(null); closeDialog(); showToast("Orden finalizada y archivada");
                                            });
                                        }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Marcar como Finalizado</button>
                                    )}
                                </div>
                            )}

                            <div className="border-t border-slate-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-bold text-sm text-slate-300 mb-3 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-emerald-400" /> Evidencias / Actas</h3>
                                    {selectedOrder.evidence && selectedOrder.evidence.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            {selectedOrder.evidence.map(ev => (
                                                <div key={ev.id} onClick={() => setZoomedImage(String(ev.image))} className="relative group rounded-lg border border-slate-700 overflow-hidden cursor-pointer hover:border-emerald-500">
                                                    <img src={String(ev.image)} alt="Evidencia" className="w-full h-24 object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1"><Maximize className="w-4 h-4" /> Ampliar</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!selectedOrder.isLocked && (
                                        <div className="relative">
                                            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, selectedOrder.id)} />
                                            <div className="flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-800 text-slate-300 px-4 py-3 rounded-lg text-xs font-bold transition-colors border border-slate-700 border-dashed"><UploadCloud className="w-4 h-4" /> Subir Acta o Foto</div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-300 mb-3 flex items-center gap-2"><GitMerge className="w-4 h-4 text-blue-400" /> Trazabilidad de Firmas</h3>
                                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                                        {selectedOrder.history?.map((log, i) => (
                                            <div key={i} className="flex gap-2 text-xs relative">
                                                <div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-blue-500 mt-1"></div>{i !== selectedOrder.history.length - 1 && <div className="w-0.5 h-full bg-slate-800 mt-1"></div>}</div>
                                                <div className="pb-2"><p className="font-bold text-slate-300">{log.action}</p><p className="text-slate-500 text-[10px]">{log.user} • {log.date}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="relative max-w-5xl w-full max-h-screen flex flex-col items-center">
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 text-white hover:text-red-400 p-2 z-50 bg-black/50 rounded-full"><X className="w-6 h-6" /></button>
                        <img src={String(zoomedImage)} alt="Ampliada" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
                        <div className="mt-4"><a href={String(zoomedImage)} download="Evidencia_ERP.png" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2"><Download className="w-4 h-4" /> Descargar</a></div>
                    </div>
                </div>
            )}

            {isHistoryModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center"><h2 className="font-bold text-lg flex items-center gap-2"><History className="w-5 h-5 text-emerald-400" /> Registro Histórico y Auditoría</h2><button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button></div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
                            {completedOrders.length === 0 ? (<div className="text-center py-16 text-slate-500">No hay órdenes completadas.</div>) : (
                                <div className="space-y-4">
                                    {completedOrders.map(order => (
                                        <div key={order.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg">
                                            <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-3">
                                                <div>
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${order.type==='Gran Formato'?'bg-purple-900/50 text-purple-300':'bg-cyan-900/50 text-cyan-300'}`}>{order.type}</span>
                                                    <h3 className="font-bold text-white text-lg mt-1">{order.client} - {order.product}</h3>
                                                    <p className="text-xs text-emerald-400 font-semibold mt-1">✓ Finalizado por {order.completedBy} el {order.completedAt}</p>
                                                </div>
                                                <button onClick={() => { showConfirm("Eliminar", `¿Desea eliminar la orden ${order.id}?`, () => { setCompletedOrders(completedOrders.filter(o => o.id !== order.id)); closeDialog(); showToast("Registro eliminado"); }); }} className="bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold flex gap-1.5 transition-colors"><Trash2 className="w-4 h-4" /> Eliminar</button>
                                            </div>
                                            {order.evidence?.length > 0 && (
                                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                                                    {order.evidence.map(ev => (
                                                        <img key={ev.id} src={String(ev.image)} onClick={()=>setZoomedImage(String(ev.image))} className="w-full h-16 object-cover rounded border border-slate-700 cursor-pointer hover:border-emerald-500" alt="evidencia"/>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="space-y-1 bg-slate-900/90 p-3 rounded-lg border border-slate-800 max-h-32 overflow-y-auto custom-scrollbar">
                                                {order.history?.map((log, i) => (<div key={i} className="text-[10px] text-slate-400"><strong className="text-slate-300">{log.action}</strong> - {log.user} ({log.date})</div>))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isUsersModalOpen && currentUser.role === 'Gerente' && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-40 p-4 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" /> Gestión de Personal (Cuentas)</h2>
                            <button onClick={() => { setIsUsersModalOpen(false); setUserFormData({ id: null, username: '', password: '', role: 'Impresor', name: '', email: '' }); }} className="text-slate-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">{userFormData.id ? <><Edit className="w-4 h-4 text-blue-400" /> Editar Empleado</> : <><Plus className="w-4 h-4 text-blue-400" /> Crear Nuevo Empleado</>}</h3>
                                <form onSubmit={handleSaveUser} className="space-y-3">
                                    <div><label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo</label><input required type="text" value={userFormData.name} onChange={(e) => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                                    <div><label className="block text-xs font-semibold text-slate-300 mb-1">Usuario de Acceso</label><input required type="text" value={userFormData.username} onChange={(e) => setUserFormData({...userFormData, username: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                                    <div><label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label><input required type="text" value={userFormData.password} onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500" /></div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico (Alertas)</label>
                                        <input type="email" value={userFormData.email} onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} placeholder="ej: operario@gmail.com" className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 mb-1">Rol en la Planta</label>
                                        <select value={userFormData.role} onChange={(e) => setUserFormData({...userFormData, role: e.target.value})} className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm font-bold text-white focus:outline-none focus:border-blue-500">
                                            <option value="Ventas">Ejecutivo de Ventas</option><option value="Jefe Producción">Jefe de Área / Producción</option><option value="Diseñador">Diseñador (Pre-prensa)</option><option value="Impresor">Impresor (Maquinista)</option><option value="Acabados">Operario de Acabados</option><option value="Manufactura">Armado y Control de Calidad</option><option value="Conductor">Conductor / Instalador</option><option value="Gerente">Gerente (Administrador Total)</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        {userFormData.id && (<button type="button" onClick={() => setUserFormData({ id: null, username: '', password: '', role: 'Impresor', name: '', email: '' })} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded text-sm">Cancelar</button>)}
                                        <button type="submit" className={`flex-1 text-white font-bold py-2.5 rounded text-sm shadow-md ${userFormData.id ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-800 hover:bg-slate-700 border border-slate-600'}`}>{userFormData.id ? 'Actualizar Datos' : 'Registrar Empleado'}</button>
                                    </div>
                                </form>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Personal Activo</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                    {users.map(u => (
                                        <div key={u.id} className={`flex justify-between items-center p-3 rounded-xl border ${userFormData.id === u.id ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-950/60 border-slate-800'}`}>
                                            <div>
                                                <p className="font-bold text-sm text-white">{u.name}</p>
                                                <p className="text-xs text-slate-400">Usuario: <span className="font-mono text-slate-300">{u.username}</span></p>
                                                {u.email && <p className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3"/> {u.email}</p>}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${u.role === 'Gerente' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>{u.role}</span>
                                                <button onClick={() => handleEditClick(u)} className="text-slate-400 hover:text-blue-400"><Edit className="w-4 h-4" /></button>
                                                {u.username !== currentUser.username && (<button onClick={() => handleDeleteUser(u.id, u.name)} className="text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {dialog.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 text-slate-200 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className={`p-4 flex gap-2 font-bold ${dialog.type === 'alert' ? 'bg-red-900' : 'bg-slate-950'}`}>{dialog.title}</div>
                        <div className="p-6"><p className="text-sm mb-4">{dialog.message}</p>
                            {dialog.type === 'prompt' && <textarea autoFocus className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-sm text-white mb-4" rows="3" value={dialog.inputValue} onChange={(e) => setDialog({...dialog, inputValue: e.target.value})}/>}
                            <div className="flex justify-end gap-2 mt-2">
                                {(dialog.type === 'confirm' || dialog.type === 'prompt') && <button onClick={closeDialog} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded">Cancelar</button>}
                                <button onClick={() => dialog.onConfirm(dialog.type === 'prompt' ? dialog.inputValue : undefined)} className={`px-4 py-2 text-white text-sm font-bold rounded ${dialog.type === 'alert' ? 'bg-red-600' : 'bg-blue-600'}`}>{dialog.type === 'alert' ? 'Entendido' : 'Confirmar'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast.visible && <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white font-bold text-sm border ${toast.type === 'success' ? 'bg-emerald-900 border-emerald-500/50' : 'bg-orange-900 border-orange-500/50'}`}>{toast.message}</div>}
        </div>
    );
};

export default KanbanBoard;