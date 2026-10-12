import { useState, useEffect } from 'react';
import {
    Clock, AlertCircle, CheckCircle, X, Plus, Search, Shield, ShieldCheck,
    Eye, Trash2, Printer, Maximize, Minimize, LogOut, Users, Phone,
    AlertTriangle, Bell, Loader2, Info, UploadCloud, ImageIcon, Edit, Download,
    Lock, History, FileText, Layers, GitMerge, ArrowRight, ArrowLeft, Pause, Play, Activity, Navigation, Truck
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import emailjs from '@emailjs/browser';
import LiveUberMap from './LiveUberMap';
import Setup2FA from './Setup2FA';

// Conexión directa para pruebas en la PC
const API_URL = 'http://localhost:3001';

const columns = [
    'Revisión',
    'Pre-prensa',
    'Bodega',
    'Impresión',
    'Secado',
    'Acabados',
    'Manufactura',
    'Calidad',
    'Despacho',
    'Instalación'
];

const stationStandardHours = {
    'Revisión': 2, 'Pre-prensa': 6, 'Bodega': 3, 'Impresión': 8, 'Secado': 4,
    'Acabados': 6, 'Manufactura': 8, 'Calidad': 2, 'Despacho': 2, 'Instalación': 4
};

const KanbanBoard = ({ currentUser = {}, onLogout, users = [], setUsers }) => {
    const userRole = (currentUser.rol || currentUser.role || 'GERENCIA').toString();
    const userName = currentUser.nombres || currentUser.nombre || currentUser.name || 'Usuario';
    const userEmail = currentUser.email || '';

    const isGerente = userRole.toUpperCase() === 'GERENCIA' || userRole.toUpperCase() === 'GERENTE';
    const isChofer = userRole.toUpperCase() === 'CHOFER' || userRole.toUpperCase() === 'CONDUCTOR';

    // Filtro dinámico: Gerencia ve las 10 estaciones; los operarios ven exclusivamente su estación asignada
    const getAccessibleColumns = () => {
        if (isGerente) return columns;
        const r = userRole.toUpperCase();
        if (r === 'VENTAS') return ['Revisión'];
        if (r.includes('DISENO') || r.includes('DISEÑADOR') || r.includes('DISENADOR')) return ['Pre-prensa'];
        if (r.includes('BODEGA') || r.includes('INVENTARIO')) return ['Bodega'];
        if (r.includes('IMPRESOR') || r.includes('OPERADOR')) return ['Impresión', 'Secado'];
        if (r.includes('ACABADOS')) return ['Acabados'];
        if (r.includes('MANUFACTURA')) return ['Manufactura', 'Calidad'];
        if (r.includes('CHOFER') || r.includes('CONDUCTOR') || r.includes('DESPACHO')) return ['Despacho', 'Instalación'];
        return columns;
    };

    const activeColumns = getAccessibleColumns();

    const [orders, setOrdersState] = useState([]);
    const [completedOrders, setCompletedOrdersState] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderModalTab, setOrderModalTab] = useState('produccion');
    const [zoomedImage, setZoomedImage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [filterUrgent, setFilterUrgent] = useState(false);
    const [filterMine, setFilterMine] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estados para GPS del conductor
    const [gpsActive, setGpsActive] = useState(false);
    const [driverLocations, setDriverLocations] = useState({});
    const [gerenciaTab, setGerenciaTab] = useState('kanban');
    const [selectedDriver, setSelectedDriver] = useState(null);

    // Control de Columnas Plegables para Gerencia
    const [collapsedColumns, setCollapsedColumns] = useState([]);

    const toggleCollapseColumn = (colName) => {
        setCollapsedColumns((prev) =>
            prev.includes(colName)
                ? prev.filter((c) => c !== colName)
                : [...prev, colName]
        );
    };

    const handleCollapseEmptyColumns = () => {
        if (collapsedColumns.length > 0) {
            setCollapsedColumns([]);
            return;
        }
        const listToEvaluate = typeof filteredOrders !== 'undefined' ? filteredOrders : orders;
        const emptyCols = (activeColumns || []).filter((col) => {
            const ordersInCol = listToEvaluate.filter(
                (o) => (o.status || '').toLowerCase() === col.toLowerCase()
            );
            return ordersInCol.length === 0;
        });
        setCollapsedColumns(emptyCols);
    };

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [dialog, setDialog] = useState({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: () => {} });

    // 🔥 MEJORA: Cambio de variables para usar enlace de Google Maps
    const [newFormData, setNewFormData] = useState({
        orderType: 'Estándar', client: '', product: '', quantity: '1', vendor: userName,
        openSize: '', closedSize: '', notes: '', deadline: '', urgent: false, oTrab: '', designer: '', colorProof: false,
        direccion: '', mapsLink: ''
    });

    const [stdForm, setStdForm] = useState({
        matBond: false, matBondGr: '', matCoucheB: false, matCoucheBGr: '', matCoucheM: false, matCoucheMGr: '', matCartulina: false, matCartulinaGr: '',
        matAdhesivoSeg: false, adhSegTipo: 'Con Precorte', matAdhesivoPoli: false, matAdhesivoPoliText: '', matOtros: false, matOtrosText: '', obsMateriales: '',
        medida: '33 X 48 CM', med32x45: false, med33x48: true, medOtro: false, medidaOtro: '', cantPlanas1: '', cantPlanas2: '', cantAdicionales: '', totalPlanas: '',
        impAccurio: false, accTiro: false, accRetiro: false, impOffset: false, offTiro: false, offRetiro: false, impFlexo: false, flexoTiro: false, flexoRetiro: false,
        planasImpresas: '', planasDanadas: '',
        lamMate: false, lamBrillo: false, lamTiro: false, lamRetiro: false, uvMate: false, uvBrillo: false, uvTotal: false, uvSect: false, uvTiro: false, uvRetiro: false,
        troqTroquelado: false, troqTroqueladoText: '', troqMedioCorte: false, troqMedioCorteText: '', troqGrafado: false, troqGrafadoText: '', troqDesprendible: false, troqDesprendibleText: '', troqOtros: false, troqOtrosText: '', troqObs: '',
        acabGrapado: false, acabGrapadoText: '', acabNumerado: false, acabNumeradoText: '', acabDoblado: false, acabDobladoText: '', acabAnillado: false, acabAnilladoText: '', acabPerforado: false, acabPerforadoText: '', acabPlastificado: false, acabPlastificadoText: '', acabOtros: false, acabOtrosText: '', acabObs: '',
        manfPegado: false, manfPegadoText: '', manfAcetato: false, manfAcetatoText: '', manfEmblocado: false, manfEmblocadoText: '', manfCinta: false, manfCintaText: '', manfEnfajillado: false, manfEnfajilladoText: '', manfRefilado: false, manfRefiladoText: '', manfCordon: false, manfCordonText: '', manfOtros: false, manfOtrosText: '', manfEmpacado: false, manfEmpacadoText: '', manfDistribucion: false, manfDistribucionText: '', manfObs: ''
    });

    const [wfForm, setWfForm] = useState({
        cpPvc: false, cpPvcText: '', cpPlastipro: false, cpPlastiproText: '', cpFomecore: false, cpFomecoreText: '', cpPoliestireno: false, cpPoliestirenoText: '', cpCorrugado: false, cpCorrugadoText: '', cpOtros: false, cpOtrosText: '', cpPliegos: '', cpTiro: false, cpRetiro: false,
        plotGalaxy160: false, plotGalaxy180: false, plotGalaxy320: false, plotMimaki: false, mimakiCmyk: false, mimakiClear: false, mimakiBlanco: false,
        sustPvc: false, sustPvcText: '', sustTiro: false, sustCarton: false, sustCartonText: '', sustRetiro: false, sustFomecore: false, sustFomecoreText: '', sustOtros: false, sustOtrosText: '', sustPlastipro: false, sustPlastiproText: '', sustPliegos: '',
        matLona: false, lonaMate: false, lonaBrillo: false, lonaMesh: false, lonaTraslucida: false, lonaOnz: '',
        matVinil: false, vinilMate: false, vinilBrillo: false, vinilTransp: false, vinilRemov: false, vinilMicro: false, vinilBlock: false, vinilFoto: false, vinilOtro: '',
        matLam: false, lamMate: false, lamBrillo: false, lamFloor: false, lamTiro: false, lamRetiro: false,
        matOtros: false, otroBlue: false, otroBack: false, otroPet: false, otroTela: false, otroArenado: false, otroVinilCorte: false, otroOtroText: '',
        acabRefilado: false, acabTroquelado: false, acabGrafado: false, acabMedioCorte: false, acabPegado: false, acabPegadoText: '', acabBolsillo: false, acabBolsilloText: '', acabDoblado: false, acabOjales: false, acabOjalesText: '', acabOtro: false, acabOtroText: '', acabCinta: false, acabCintaText: '', acabObs: '',
        entEmpacado: false, entEmpacadoText: '', entEnfajillado: false, entEnfajilladoText: '', entDistribucion: false, entInstalacion: false,
        indicaciones: ''
    });

    const [userFormData, setUserFormData] = useState({ id: null, role: 'OPERADOR', name: '', email: '', cedula: '', telefono: '' });

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
    };

    const closeDialog = () => setDialog({ isOpen: false, type: 'alert', title: '', message: '', inputValue: '', onConfirm: () => {} });
    const showAlert = (title, message) => setDialog({ isOpen: true, type: 'alert', title, message, inputValue: '', onConfirm: closeDialog });
    const showConfirm = (title, message, onConfirm) => setDialog({ isOpen: true, type: 'confirm', title, message, inputValue: '', onConfirm });
    const showPrompt = (title, message, onConfirm) => setDialog({ isOpen: true, type: 'prompt', title, message, inputValue: '', onConfirm });

    const formatTimeRemaining = (targetDateStr) => {
        if (!targetDateStr) return null;
        const diff = new Date(targetDateStr) - currentTime;
        const isOverdue = diff < 0;
        const totalMin = Math.floor(Math.abs(diff) / 60000);
        const hours = Math.floor(totalMin / 60);
        const mins = totalMin % 60;

        if (isOverdue) return { label: `Vencido hace ${hours > 0 ? `${hours}h ` : ''}${mins}m`, badgeClass: 'bg-red-500/20 text-red-300 border-red-500/50 font-bold' };
        if (hours === 0 && mins <= 60) return { label: `Quedan ${mins}m`, badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse font-bold' };
        return { label: `Faltan ${hours}h ${mins}m`, badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' };
    };

    const hasEvidenceForStation = (order, stationName) => {
        if (!order || !order.evidence || order.evidence.length === 0) return false;
        return order.evidence.some(ev => ev.station === stationName || (!ev.station && order.evidence.length > 0));
    };

    const getProgressPercentage = (status) => {
        if (status === 'Completado') return 100;
        const index = columns.indexOf(status);
        if (index === -1) return 0;
        return Math.round(((index + 1) / columns.length) * 100);
    };

    const cargarUsuariosDesdeBD = async () => {
        try {
            const res = await fetch(`${API_URL}/api/usuarios`);
            if (res.ok) {
                const data = await res.json();
                if (setUsers) setUsers(data);
            }
        } catch (err) {
            console.error("Error al cargar usuarios de MySQL:", err);
        }
    };

    const cargarOrdenesDesdeBD = async () => {
        try {
            const res = await fetch(`${API_URL}/api/ordenes`);
            if (res.ok) {
                const mysqlOrders = await res.json();
                const ordenesFormateadas = (mysqlOrders || []).map((o) => ({
                    ...o,
                    id: o.id || o.orderNumber,
                    client: o.cliente || o.client,
                    cliente: o.cliente || o.client,
                    product: o.producto || o.product,
                    producto: o.producto || o.product,
                    status: o.estado || o.status,
                    estado: o.estado || o.status,
                    address: o.direccion || o.address,
                    direccion: o.direccion || o.address,
                    assignedTo: o.chofer || o.conductor || o.assignedTo,
                    chofer: o.chofer || o.conductor || o.assignedTo,
                    destLat: o.destLat !== null ? o.destLat : o.dest_lat !== null ? o.dest_lat : null,
                    destLng: o.destLng !== null ? o.destLng : o.dest_lng !== null ? o.dest_lng : null
                }));

                setOrdersState((prev) => {
                    const map = new Map();
                    (prev || []).forEach((item) => map.set(String(item.id), item));
                    ordenesFormateadas.forEach((item) => map.set(String(item.id), item));
                    return Array.from(map.values());
                });
            }
        } catch (err) {
            console.error("Error al cargar órdenes de MySQL:", err);
        }
    };

    const reportarUbicacionGPS = async (lat, lng) => {
        try {
            const res = await fetch(`${API_URL}/api/gps/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverName: userName || 'Conductor',
                    lat: Number(lat),
                    lng: Number(lng)
                })
            });
            if (res.ok) {
                showToast("📍 Ubicación GPS transmitida a Gerencia");
            }
        } catch (err) {
            console.error("Error al transmitir GPS:", err);
        }
    };

    useEffect(() => {
        let watchId = null;
        if (isChofer && gpsActive && navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    reportarUbicacionGPS(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn("Sensor GPS tardío o sin señal satelital directa:", error.message);
                    reportarUbicacionGPS(-2.1894, -79.8891);
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
            );
        }
        return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); };
    }, [isChofer, gpsActive, userName]);

    useEffect(() => {
        let interval = null;
        if (isGerente) {
            const fetchGps = async () => {
                try {
                    const res = await fetch(`${API_URL}/api/gps/locations`);
                    if (res.ok) {
                        const data = await res.json();
                        setDriverLocations(data);
                    }
                    cargarOrdenesDesdeBD();
                } catch (e) {
                    console.error("Error al obtener ubicaciones GPS:", e);
                }
            };
            fetchGps();
            interval = setInterval(fetchGps, 3000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isGerente]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        cargarUsuariosDesdeBD();
        cargarOrdenesDesdeBD();
        return () => clearInterval(timer);
    }, []);

    const setOrders = (newOrders) => {
        setOrdersState(newOrders);
    };

    const setCompletedOrders = (newCompleted) => {
        setCompletedOrdersState(newCompleted);
    };

    const handleSecureLogout = () => {
        localStorage.removeItem('usuario');
        onLogout();
    };
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

    const descargarReporteGerencialProduccion = () => {
        if (!isGerente) {
            showAlert("Acceso Restringido", "Recurso exclusivo para Gerencia.");
            return;
        }
        try {
            const allOrders = [...orders, ...completedOrders];
            let reportContent = `====================================================\n`;
            reportContent += `   WIDE FORMAT - REPORTE GERENCIAL DE PRODUCCIÓN\n`;
            reportContent += `   Análisis de Rendimiento por Empleado\n`;
            reportContent += `   Fecha de Emisión: ${new Date().toLocaleString('es-EC')}\n`;
            reportContent += `====================================================\n\n`;

            const employeeStats = {};
            allOrders.forEach(o => {
                const designer = o.wfData?.designer || o.stdData?.designer || o.assigned || 'Sin Asignar';
                if (!employeeStats[designer]) {
                    employeeStats[designer] = { total: 0, completed: 0, active: 0, types: { std: 0, wf: 0 } };
                }
                employeeStats[designer].total += 1;
                if (o.status === 'Completado') employeeStats[designer].completed += 1;
                else employeeStats[designer].active += 1;

                if (o.type === 'Estándar') employeeStats[designer].types.std += 1;
                else employeeStats[designer].types.wf += 1;
            });

            Object.keys(employeeStats).forEach(emp => {
                const st = employeeStats[emp];
                reportContent += `COLABORADOR / DISEÑADOR: ${emp}\n`;
                reportContent += `----------------------------------------------------\n`;
                reportContent += ` - Total Órdenes Asignadas/Gestionadas: ${st.total}\n`;
                reportContent += ` - Órdenes Completadas: ${st.completed}\n`;
                reportContent += ` - Órdenes en Proceso Activo: ${st.active}\n`;
                reportContent += ` - Tipos: [Estándar OP: ${st.types.std}] | [Gran Formato WF: ${st.types.wf}]\n\n`;
            });

            reportContent += `====================================================\n`;
            reportContent += `Fin del Reporte Analítico de Planta.\n`;

            const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_Produccion_Empleados_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            showToast("Reporte analítico gerencial descargado con éxito");
        } catch (err) {
            showAlert("Error", "No se pudo generar el reporte analítico.");
        }
    };

    const notifyRole = (orderId, columnTarget, clientName, product, deadline) => {
        const rolesMap = {
            'Revisión': 'Ventas', 'Pre-prensa': 'Diseno', 'Bodega': 'Bodega',
            'Impresión': 'Operador', 'Secado': 'Operador', 'Acabados': 'Acabados',
            'Manufactura': 'Manufactura', 'Calidad': 'Manufactura',
            'Despacho': 'Chofer', 'Instalación': 'Chofer'
        };
        const targetRole = rolesMap[columnTarget];
        if (!targetRole) return;

        const targetUsers = (users || []).filter(u => u.role && u.role.toLowerCase().includes(targetRole.toLowerCase()));
        targetUsers.forEach(emp => {
            const emailToSend = emp.email || userEmail || 'jorgehugo148@gmail.com';
            const templateParams = { to_email: emailToSend, nombre_empleado: emp.name, id_orden: orderId, cliente: clientName, producto: product, fecha_entrega: new Date(deadline).toLocaleString('es-EC') };
            emailjs.send('service_zomo514', 'template_8on9rfj', templateParams, '10EcePWRPRn0DbhL7').catch(err => console.error(err));
        });
    };

    const canModifyOrder = (status) => {
        if (status === 'Completado') return false;
        const r = userRole.toUpperCase();
        if (r === 'GERENTE' || r === 'GERENCIA') return true;
        if (r === 'VENTAS' && status === 'Revisión') return true;
        if ((r === 'JEFE PRODUCCIÓN' || r === 'JEFE PRODUCCION') && (status === 'Revisión' || status === 'Pre-prensa')) return true;
        if ((r === 'DISEÑADOR' || r === 'DISENO' || r === 'DISENADOR') && status === 'Pre-prensa') return true;
        if ((r === 'BODEGA' || r === 'ANALISTA INVENTARIO' || r === 'INVENTARIO') && status === 'Bodega') return true;
        if ((r === 'IMPRESOR' || r === 'OPERADOR') && (status === 'Impresión' || status === 'Secado')) return true;
        if (r === 'ACABADOS' && status === 'Acabados') return true;
        if (r.includes('MANUFACTURA') && (status === 'Manufactura' || status === 'Calidad')) return true;
        return (r === 'CONDUCTOR' || r === 'CHOFER' || r === 'DESPACHO') && (status === 'Despacho' || status === 'Instalación');
    };

    const handlePauseOrder = (order) => {
        showPrompt("Pausar Orden", "Indique el motivo técnico o administrativo de la pausa:", (reason) => {
            if (!reason) return;
            const updatedOrders = orders.map(o => o.id === order.id ? {
                ...o, estaPausada: true, motivoPausa: reason, pausadaPor: userName,
                history: [...(o.history || []), { action: `Pausó la orden. Motivo: ${reason}`, user: userName, date: new Date().toLocaleString('es-EC') }]
            } : o);
            setOrders(updatedOrders);
            closeDialog();
            showToast("Orden puesta en PAUSA", "warning");
        });
    };

    const handleResumeOrder = (order) => {
        if (!isGerente) { showAlert("Acceso Restringido", "Solo Gerencia puede reanudar una orden en pausa."); return; }
        showConfirm("Reanudar Orden", `¿Confirmar reanudación de la orden ${order.id}?`, () => {
            const updatedOrders = orders.map(o => o.id === order.id ? {
                ...o, estaPausada: false, motivoPausa: '',
                history: [...(o.history || []), { action: `Reanudó la orden (Aprobado por Gerencia)`, user: userName, date: new Date().toLocaleString('es-EC') }]
            } : o);
            setOrders(updatedOrders);
            closeDialog();
            showToast("Orden reanudada con éxito");
        });
    };

    const handleAdvanceOrder = async (order) => {
        if (order.estaPausada) { showAlert("Orden Pausada", "Esta orden está en pausa y no puede modificarse."); return; }
        if (!canModifyOrder(order.status)) { showAlert("Acceso Restringido", "No tienes permisos para avanzar esta orden desde su estación actual."); return; }
        if (!isGerente && !hasEvidenceForStation(order, order.status)) { showAlert("Evidencia Obligatoria", `Es obligatorio subir foto de "${order.status}" antes de avanzar.`); return; }

        const currentIndex = columns.indexOf(order.status);
        if (currentIndex < 0 || currentIndex >= columns.length - 1) { showAlert("Aviso", "Esta orden no puede avanzar más."); return; }

        const nextColumn = columns[currentIndex + 1];
        const nowTimeStr = new Date().toLocaleString('es-EC');

        const updatedActuals = { ...(order.stationActuals || {}), [order.status]: { date: nowTimeStr, user: userName } };

        try {
            const res = await fetch(`http://localhost:3001/api/ordenes/${order.id}/avanzar`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nuevoEstado: nextColumn,
                    stationActualsJSON: updatedActuals
                })
            });

            if (!res.ok) throw new Error("Error al guardar avance en MySQL");

            const updatedOrders = orders.map(o => String(o.id) === String(order.id) ? {
                ...o,
                status: nextColumn,
                stationActuals: updatedActuals,
                history: [...(o.history || []), { action: `Avanzó de ${order.status} a ${nextColumn}`, user: userName, date: nowTimeStr }]
            } : o);

            setOrders(updatedOrders);
            showToast(`Orden avanzada a ${nextColumn}`);
            notifyRole(order.id, nextColumn, order.client, order.product, order.deadline);
            if (selectedOrder && String(selectedOrder.id) === String(order.id)) setSelectedOrder(null);

        } catch (error) {
            console.error('Error en handleAdvanceOrder:', error);
            showAlert("Error", "No se pudo avanzar la orden en la base de datos.");
        }
    };
    const handleRetrocedeOrder = (order) => {
        if (order.estaPausada) { showAlert("Orden Pausada", "Esta orden está en PAUSA y no puede modificarse."); return; }
        if (!canModifyOrder(order.status)) { showAlert("Acceso Restringido", "No tienes permisos para modificar esta orden desde su estación actual."); return; }

        const currentIndex = columns.indexOf(order.status);
        if (currentIndex <= 0) { showAlert("Aviso", "Esta orden ya se encuentra en la primera estación."); return; }

        const prevColumn = columns[currentIndex - 1];

        if (isGerente || userRole.toUpperCase().includes('JEFE')) {
            showPrompt("Acción Gerencial", `Motivo para retroceder a ${prevColumn}:`, (reason) => {
                const nowTimeStr = new Date().toLocaleString('es-EC');
                const updatedOrders = orders.map(o => o.id === order.id ? {
                    ...o, status: prevColumn,
                    history: [...(o.history || []), { action: `Retrocedido a ${prevColumn} (Motivo: ${reason})`, user: userName, date: nowTimeStr }]
                } : o);
                setOrders(updatedOrders);
                closeDialog();
                showToast("Retroceso aplicado", "warning");
                notifyRole(order.id, prevColumn, order.client, order.product, order.deadline);
                if (selectedOrder && selectedOrder.id === order.id) setSelectedOrder(null);
            });
        } else {
            showPrompt("Autorización", `Indique el motivo para devolver a "${prevColumn}":`, (reason) => {
                const updatedOrders = orders.map(o => o.id === order.id ? {
                    ...o, overrideRequested: true, requestedStatus: prevColumn, overrideReason: reason,
                    history: [...(o.history || []), { action: `Solicitó retroceso a ${prevColumn}`, user: userName, date: new Date().toLocaleString('es-EC') }]
                } : o);
                setOrders(updatedOrders);
                closeDialog();
                showToast("Enviado a Jefatura", "warning");
                if (selectedOrder && selectedOrder.id === order.id) setSelectedOrder(null);
            });
        }
    };

    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const draggedOrder = orders.find(o => String(o.id) === String(draggableId));
        if (draggedOrder?.estaPausada) { showAlert("Acción bloqueada", "La orden está en PAUSA. No puede moverse ni avanzar."); return; }
        if (!canModifyOrder(source.droppableId)) { showAlert("Acceso Restringido", "No tienes permisos para esta estación."); return; }

        const sourceIndex = columns.indexOf(source.droppableId);
        const destinationIndex = columns.indexOf(destination.droppableId);

        if (destinationIndex < sourceIndex) {
            if (isGerente || userRole.toUpperCase().includes('JEFE')) {
                showPrompt("Acción Gerencial", "Motivo de retroceso:", (reason) => {
                    const nowTimeStr = new Date().toLocaleString('es-EC');
                    const updatedOrders = orders.map(o => String(o.id) === String(draggableId) ? {
                        ...o, status: destination.droppableId,
                        history: [...(o.history || []), { action: `Retrocedido a ${destination.droppableId} (Motivo: ${reason})`, user: userName, date: nowTimeStr }]
                    } : o);
                    setOrders(updatedOrders);
                    closeDialog();
                    showToast("Retroceso aplicado", "warning");
                    if (draggedOrder) notifyRole(draggedOrder.id, destination.droppableId, draggedOrder.client, draggedOrder.product, draggedOrder.deadline);
                });
            } else {
                showPrompt("Autorización", `Indique el motivo para devolver a "${destination.droppableId}":`, (reason) => {
                    const updatedOrders = orders.map(o => String(o.id) === String(draggableId) ? {
                        ...o, overrideRequested: true, requestedStatus: destination.droppableId, overrideReason: reason,
                        history: [...(o.history || []), { action: `Solicitó retroceso a ${destination.droppableId}`, user: userName, date: new Date().toLocaleString('es-EC') }]
                    } : o);
                    setOrders(updatedOrders);
                    closeDialog();
                    showToast("Enviado a Jefatura", "warning");
                });
            }
            return;
        }

        if (destinationIndex > sourceIndex + 1) { showAlert("Restricción", "Debe avanzar de forma secuencial."); return; }

        if (!isGerente && !hasEvidenceForStation(draggedOrder, source.droppableId)) {
            showAlert("Evidencia Obligatoria", `Debes subir al menos una foto o acta en "${source.droppableId}" antes de mover la orden.`);
            return;
        }

        const nowTimeStr = new Date().toLocaleString('es-EC');
        const updatedActuals = { ...(draggedOrder.stationActuals || {}), [source.droppableId]: { date: nowTimeStr, user: userName } };

        const updatedOrders = orders.map(order => String(order.id) === String(draggableId) ? {
            ...order, status: destination.droppableId, stationActuals: updatedActuals,
            history: [...(order.history || []), { action: `Movido a ${destination.droppableId}`, user: userName, date: nowTimeStr }]
        } : order);

        setOrders(updatedOrders);
        if (draggedOrder) notifyRole(draggedOrder.id, destination.droppableId, draggedOrder.client, draggedOrder.product, draggedOrder.deadline);
    };

    const handleFileUpload = async (e, orderId) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            showAlert("Imagen muy pesada", "Seleccione o tome una foto menor a 10MB.");
            return;
        }

        const currentOrder = orders.find(o => String(o.id) === String(orderId));
        const currentStation = currentOrder ? currentOrder.status : 'Planta';

        try {
            showToast("⏳ Subiendo evidencia al servidor...", "warning");

            const formData = new FormData();
            formData.append('foto', file);

            const resUpload = await fetch(`${API_URL}/api/upload-foto`, { method: 'POST', body: formData });

            if (!resUpload.ok) {
                const errorData = await resUpload.text();
                throw new Error(`❌ Falló la subida del archivo (Multer): ${errorData}`);
            }

            const uploadData = await resUpload.json();
            const urlFoto = uploadData.url;

            const resData = await fetch(`${API_URL}/api/upload-pod`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orden_id: orderId,
                    chofer: userName,
                    estacion: currentStation,
                    imagen_base64: urlFoto
                })
            });

            if (!resData.ok) {
                const dbError = await resData.json();
                throw new Error(`❌ Falló MySQL: ${dbError.error || 'Error desconocido en Base de Datos'}`);
            }

            const updatedOrders = orders.map(o => {
                if (String(o.id) === String(orderId)) {
                    return {
                        ...o,
                        evidence: [...(o.evidence || []), {
                            id: Date.now(),
                            image: urlFoto,
                            uploadedBy: userName,
                            station: currentStation,
                            date: new Date().toLocaleString('es-EC')
                        }],
                        history: [...(o.history || []), {
                            action: `Subió evidencia física en ${currentStation}`,
                            user: userName,
                            date: new Date().toLocaleString('es-EC')
                        }]
                    };
                }
                return o;
            });

            setOrders(updatedOrders);
            setSelectedOrder(updatedOrders.find(o => String(o.id) === String(orderId)));
            showToast(`✅ Evidencia guardada para ${currentStation}`);

        } catch (error) {
            console.error("Error al subir imagen:", error);
            showAlert("Error Detallado", error.message);
        }
    };

    const CheckInput = ({ checked, onChange, label, textValue, onTextChange, placeholder }) => (
        <div className="flex items-center gap-2.5 font-mono text-sm py-1">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 cursor-pointer accent-slate-700" />
            <span className="text-slate-200 whitespace-nowrap font-semibold">{label}</span>
            {onTextChange && (
                <input type="text" value={textValue} onChange={(e) => onTextChange(e.target.value)} placeholder={placeholder} className="border-b border-slate-600 bg-transparent flex-1 px-1.5 py-0.5 focus:outline-none focus:border-amber-400 text-white" />
            )}
        </div>
    );

    // 🔥 MEJORA: Lógica de creación de orden con fecha automática y link a Maps
    const handleCreateOrder = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Fecha por defecto: si no ponen fecha límite, será HOY a las 11:59 PM
            let fechaFinal = newFormData.deadline;
            if (!fechaFinal) {
                const hoy = new Date();
                hoy.setHours(23, 59, 59, 999);
                fechaFinal = hoy.toISOString().slice(0, 19).replace('T', ' ');
            }

            const detallesCompletos = {
                oTrab: newFormData.oTrab,
                openSize: newFormData.openSize,
                notes: newFormData.notes,
                colorProof: newFormData.colorProof,
                stdData: newFormData.orderType === 'Estándar' ? stdForm : null,
                wfData: newFormData.orderType === 'Gran Formato' ? wfForm : null
            };

            const res = await fetch(`${API_URL}/api/ordenes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente: newFormData.client,
                    producto: newFormData.product,
                    cantidad: newFormData.quantity,
                    tipo: newFormData.orderType,
                    vendedor: newFormData.vendor,
                    direccion: newFormData.direccion,
                    destLat: newFormData.mapsLink || null, // Enviamos directamente el link de Maps
                    destLng: null, // Ya no se usa
                    fecha_limite: fechaFinal, // Fecha controlada
                    disenador: newFormData.designer,
                    detalles_tecnicos: JSON.stringify(detallesCompletos)
                })
            });

            if (!res.ok) throw new Error("Error al guardar la orden en MySQL");

            await cargarOrdenesDesdeBD();

            setIsModalOpen(false);
            setIsSubmitting(false);
            showToast("📦 Orden generada y enviada a planta");

            setNewFormData({
                orderType: 'Estándar', client: '', product: '', quantity: '1', vendor: userName,
                openSize: '', closedSize: '', notes: '', deadline: '', urgent: false, oTrab: '',
                designer: '', colorProof: false, direccion: '', mapsLink: ''
            });

        } catch (error) {
            console.error(error);
            showAlert("Error", "No se pudo crear la orden en la base de datos.");
            setIsSubmitting(false);
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        if (!userFormData.cedula || !userFormData.cedula.trim()) { showAlert("Campo Requerido", "Debes ingresar la cédula de identidad."); return; }

        try {
            const payload = {
                nombres: userFormData.name,
                email: userFormData.email,
                rol: userFormData.role,
                cedula: userFormData.cedula,
                celular: userFormData.telefono,
                telefono: userFormData.telefono
            };

            if (userFormData.id) {
                const res = await fetch(`${API_URL}/api/usuarios/${userFormData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Error al actualizar empleado');
                showToast('Empleado actualizado exitosamente');
            } else {
                const res = await fetch(`${API_URL}/api/usuarios`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Error al registrar empleado');
                showToast('Empleado registrado exitosamente');
            }

            await cargarUsuariosDesdeBD();
            setIsUsersModalOpen(false);
            setUserFormData({ id: null, role: 'OPERADOR', name: '', email: '', cedula: '', telefono: '' });
        } catch (err) {
            showAlert("Error", err.message);
        }
    };

    const handleEditClick = (user) => {
        setUserFormData({
            id: user.id,
            name: user.name || user.nombres || '',
            role: user.role || user.rol || 'OPERADOR',
            email: user.email || '',
            cedula: user.cedula || '',
            telefono: user.celular || user.telefono || ''
        });
    };

    const handleDeleteUser = (userId, uName) => {
        showConfirm("Revocar Acceso", `¿Está seguro de revocar el acceso al sistema de ${uName}?`, async () => {
            try {
                const res = await fetch(`${API_URL}/api/usuarios/${userId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Error al revocar acceso');
                await cargarUsuariosDesdeBD();
                closeDialog();
                showToast("Acceso de empleado revocado", "warning");
            } catch (err) {
                closeDialog();
                showAlert("Error", "No se pudo actualizar el estado del usuario.");
            }
        });
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = (order.client || order.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) || (order.id || '').toString().toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUrgent = filterUrgent ? order.urgent : true;
        const matchesMine = filterMine ? (order.assigned || order.chofer || '').toLowerCase().includes(userName.toLowerCase()) : true;
        return matchesSearch && matchesUrgent && matchesMine;
    });

    const filteredUsers = (users || []).filter(u =>
        (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.nombres && u.nombres.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.role && u.role.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.rol && u.rol.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.cedula && u.cedula.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.celular && u.celular.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.telefono && u.telefono.toLowerCase().includes(userSearchTerm.toLowerCase()))
    );

    const pendingApprovals = orders.filter(o => o.overrideRequested).length;
    const hasEvidenceInSelected = selectedOrder ? hasEvidenceForStation(selectedOrder, selectedOrder.status) : false;

    const designStaff = (users || []).filter(u => {
        const r = (u.role || u.rol || '').toUpperCase();
        return r.includes('DISENO') || r.includes('DISEÑADOR') || r.includes('DISENADOR');
    });

    const isSelectedCompleted = selectedOrder?.status === 'Completado';
    const selectedCurrentIndex = selectedOrder ? columns.indexOf(selectedOrder.status) : -1;
    const isSelectedActive = selectedCurrentIndex >= 0;

    return (
        <div className="min-h-screen bg-slate-950 p-4 md:p-8 lg:p-10 relative print:bg-white print:p-0 overflow-x-hidden flex flex-col text-slate-100">

            {/* TOP BAR / HEADER */}
            <div className="mb-6 md:mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <img src="/logo.svg" alt="WF" className="h-12 md:h-14 w-auto object-contain bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-inner" />
                    <div>
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            {isGerente ? 'Torre de Control ERP (Gerencia)' : `Área de Trabajo: ${userRole}`}
                        </h1>
                        <p className="text-blue-400 font-semibold text-sm md:text-base flex items-center gap-2 mt-0.5">
                            <Shield className="w-4 h-4 text-blue-400" /> Colaborador: <span className="text-slate-200">{userName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
                    {pendingApprovals > 0 && isGerente && (
                        <div className="bg-orange-500 text-white px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-xs md:text-sm font-bold animate-pulse">
                            <Bell className="w-4 h-4" /> {pendingApprovals} Solicitudes
                        </div>
                    )}

                    {isGerente && (
                        <button onClick={descargarReporteGerencialProduccion} className="bg-blue-600/90 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs md:text-sm font-bold shadow-lg border border-blue-400/30 transition-all cursor-pointer">
                            <FileText className="w-4 h-4" /> Reporte Gerencial (Producción)
                        </button>
                    )}

                    <button onClick={() => setIs2FAModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-slate-200 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs md:text-sm font-bold border border-slate-800 transition-colors cursor-pointer">
                        <ShieldCheck className="w-4 h-4 text-blue-400" /> 2FA
                    </button>

                    <button onClick={() => setIsHistoryModalOpen(true)} className="hidden md:flex bg-slate-900 hover:bg-slate-800 text-slate-200 px-4 py-2.5 rounded-xl items-center gap-2 text-xs md:text-sm font-bold border border-slate-800 transition-colors cursor-pointer">
                        <History className="w-4 h-4 text-emerald-400" /> Historial ({completedOrders.length})
                    </button>

                    <button onClick={toggleFullScreen} className="hidden lg:block bg-slate-900 hover:bg-slate-800 p-2.5 rounded-xl text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer">
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>

                    {isGerente && (
                        <button onClick={() => setIsUsersModalOpen(true)} className="hidden md:flex bg-slate-900 hover:bg-slate-800 text-slate-200 px-4 py-2.5 rounded-xl items-center gap-2 text-xs md:text-sm font-bold border border-slate-800 transition-colors cursor-pointer">
                            <Users className="w-4 h-4 text-purple-400" /> Personal
                        </button>
                    )}

                    <div className="flex flex-1 lg:flex-none justify-between items-center bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <span className="text-white text-sm md:text-base font-bold font-mono">{currentTime.toLocaleTimeString('es-EC', {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="text-slate-200 text-xs md:text-sm font-bold border-l border-slate-800 pl-3 truncate max-w-[140px] md:max-w-none">{userName}</span>
                        </div>
                        <button onClick={handleSecureLogout} className="hidden md:block text-slate-400 hover:text-red-400 ml-2.5 border-l border-slate-800 pl-2.5 transition-colors cursor-pointer">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>

                    {(userRole.toUpperCase() === 'VENTAS' || isGerente) && (
                        <button onClick={() => setIsModalOpen(true)} className="hidden md:flex bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-black text-xs md:text-sm items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer">
                            <Plus className="w-4 h-4" /> Nueva Orden
                        </button>
                    )}
                </div>
            </div>

            {/* VISTA MÓVIL / PANEL GPS PARA CONDUCTORES */}
            {isChofer && (
                <div className="mb-6 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-3.5">
                        <div className={`p-3 rounded-xl border ${gpsActive ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            <Truck className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white">Panel Móvil de Conductor - Ruta y GPS</h3>
                            <p className="text-xs text-slate-400">Transmite tu geolocalización en tiempo real a la gerencia mientras realizas despachos e instalaciones.</p>
                        </div>
                    </div>
                    <button onClick={() => setGpsActive(!gpsActive)} className={`px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer ${gpsActive ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                        {gpsActive ? '🛑 Desactivar Rastreo GPS' : '📍 Activar Rastreo GPS en Ruta'}
                    </button>
                </div>
            )}

            {/* BARRA DE PESTAÑAS PARA GERENCIA */}
            {isGerente && (
                <div className="flex items-center gap-3 mb-6 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 w-fit">
                    <button
                        type="button"
                        onClick={() => setGerenciaTab('kanban')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                            gerenciaTab === 'kanban'
                                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        <span>📦 Tablero de Órdenes</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setGerenciaTab('gps')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer relative ${
                            gerenciaTab === 'gps'
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>🛰️ Rastreo GPS en Vivo</span>
                        {Object.keys(driverLocations || {}).length > 0 && (
                            <span className="ml-1 bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full border border-emerald-400/30">
                                {Object.keys(driverLocations).length}
                            </span>
                        )}
                    </button>

                    {gerenciaTab === 'kanban' && (
                        <button
                            type="button"
                            onClick={handleCollapseEmptyColumns}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer border ${
                                collapsedColumns.length > 0
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                    : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                            }`}
                            title="Plegar o desplegar columnas sin órdenes"
                        >
                            <span>{collapsedColumns.length > 0 ? '📂 Mostrar Todas' : '⚡ Ocultar Vacías'}</span>
                            {collapsedColumns.length > 0 && (
                                <span className="bg-amber-400 text-slate-950 font-mono text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                    {collapsedColumns.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* SECCIÓN TORRE DE CONTROL GPS */}
            {isGerente && gerenciaTab === 'gps' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start mb-6">
                    {/* PANEL LATERAL DE CONDUCTORES */}
                    <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <Navigation className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                                    Flota en Ruta
                                </h3>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-mono font-semibold">
                                {Object.keys(driverLocations).length} activo(s)
                            </span>
                        </div>

                        {Object.keys(driverLocations).length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                Sin conductores transmitiendo señal GPS actualmente.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 max-h-[calc(100vh-290px)] overflow-y-auto pr-1">
                                {Object.keys(driverLocations).map((d) => {
                                    const assignedOrders = (orders || []).filter((o) => {
                                        const driverField = String(o.chofer || o.conductor || o.assignedTo || o.asignado_a || o.responsable || '').toLowerCase().trim();
                                        const targetDriver = String(d || '').toLowerCase().trim();
                                        const matchesDriver = driverField === targetDriver || driverField.includes(targetDriver) || targetDriver.includes(driverField);

                                        const currentStatus = String(o.estado || o.status || '').toLowerCase().trim();
                                        const isDespacho = currentStatus === 'despacho' || currentStatus === 'en ruta' || currentStatus === 'entrega';

                                        return matchesDriver && isDespacho;
                                    });

                                    const currentOrder = assignedOrders[0] || null;
                                    return (
                                        <div
                                            key={d}
                                            onClick={() => setSelectedDriver(d)}
                                            className={`p-4 rounded-xl border transition-all shadow-md cursor-pointer ${
                                                selectedDriver === d
                                                    ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-emerald-950/40'
                                                    : 'bg-slate-950 border-slate-800/90 hover:border-emerald-500/40 hover:bg-slate-900/60'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                    <span className="text-white font-bold text-base">{d}</span>
                                                </div>
                                                <span className="text-[11px] bg-emerald-500/15 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                                                    📍 Enfocar
                                                </span>
                                            </div>

                                            {currentOrder ? (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrder(currentOrder);
                                                        setOrderModalTab('produccion');
                                                    }}
                                                    className="bg-slate-900/60 hover:bg-slate-900 border border-sky-500/40 hover:border-sky-500/70 rounded-xl p-3 text-xs space-y-1.5 mb-2.5 cursor-pointer transition-all shadow-inner group"
                                                    title="Clic para ver detalle de la orden"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-bold text-sky-400 group-hover:underline">
                                                            #{currentOrder.id || currentOrder.orderNumber || 'ORDEN'}
                                                        </span>
                                                        <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30 font-semibold uppercase tracking-wider animate-pulse">
                                                            🚚 En reparto
                                                        </span>
                                                    </div>

                                                    <div className="text-slate-200 font-medium truncate">
                                                        <span className="text-slate-400 font-normal">Cliente: </span>
                                                        {currentOrder.cliente || currentOrder.client || 'Consumidor Final'}
                                                    </div>

                                                    {(currentOrder.producto || currentOrder.product) && (
                                                        <div className="text-slate-300 text-[11px] truncate">
                                                            <span className="text-slate-400">Prod: </span>
                                                            {currentOrder.producto || currentOrder.product}
                                                        </div>
                                                    )}

                                                    {(currentOrder.direccion || currentOrder.address) && (
                                                        <div className="text-slate-400 text-[10px] truncate flex items-center gap-1">
                                                            <span>📍</span> {currentOrder.direccion || currentOrder.address}
                                                        </div>
                                                    )}

                                                    {(currentOrder.detalles_tecnicos || currentOrder.notes) && (
                                                        <div className="text-slate-400 text-[10px] truncate italic bg-slate-950/60 border border-slate-800/80 px-2 py-1 rounded">
                                                            📌 {currentOrder.detalles_tecnicos || currentOrder.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="bg-slate-900/40 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-400 mb-2.5 flex items-center justify-between">
                                                    <span className="text-[11px]">Sin orden asignada</span>
                                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                                                        Disponible
                                                    </span>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const normalizar = (txt) =>
                                                        String(txt || '')
                                                            .toLowerCase()
                                                            .trim()
                                                            .replace(/[\s\-_]/g, '');

                                                    const target = normalizar(d);

                                                    let driverUser = (users || []).find((u) => {
                                                        const uNombre = normalizar(u.nombres || u.name || u.nombre || u.username);
                                                        const uEmailPrefix = normalizar((u.email || '').split('@')[0]);
                                                        const uEmail = normalizar(u.email || u.correo);
                                                        const uId = String(u.id || '');
                                                        return (
                                                            uNombre === target ||
                                                            uEmailPrefix === target ||
                                                            uEmail === target ||
                                                            uId === target
                                                        );
                                                    });

                                                    if (!driverUser) {
                                                        driverUser = (users || []).find((u) => {
                                                            const uNombre = normalizar(u.nombres || u.name || u.nombre || u.username);
                                                            return uNombre && (uNombre.startsWith(target) || target.startsWith(uNombre));
                                                        });
                                                    }

                                                    const rawPhone = driverUser?.celular || driverUser?.telefono || driverUser?.phone || driverUser?.whatsapp || '';
                                                    let cleanPhone = String(rawPhone).replace(/\D/g, '');
                                                    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
                                                        cleanPhone = '593' + cleanPhone.substring(1);
                                                    } else if (cleanPhone.length === 9) {
                                                        cleanPhone = '593' + cleanPhone;
                                                    }

                                                    if (!cleanPhone) {
                                                        alert(`El conductor "${d}" no tiene celular registrado en MySQL.\n\nEdítalo en el botón "👥 Personal" para guardarle su número.`);
                                                        return;
                                                    }

                                                    const driverDisplayName = driverUser?.nombres || driverUser?.name || d;
                                                    const orderMsg = currentOrder
                                                        ? `Hola ${driverDisplayName}, te escribo de Gerencia sobre la orden #${currentOrder.id || currentOrder.orderNumber || ''} para ${currentOrder.client || currentOrder.cliente || 'el cliente'}. ¿Cuál es tu estado de entrega?`
                                                        : `Hola ${driverDisplayName}, te escribo de Gerencia para consultar tu disponibilidad en ruta.`;

                                                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(orderMsg)}`, '_blank');
                                                }}
                                                className="w-full mt-1 mb-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 hover:border-emerald-500/70 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                                title="Abrir chat directo de WhatsApp con el chofer"
                                            >
                                                <span>💬 Contactar por WhatsApp</span>
                                            </button>

                                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900 font-mono">
                                                <span className="text-slate-500">
                                                    {Number(driverLocations[d].lat).toFixed(4)}, {Number(driverLocations[d].lng).toFixed(4)}
                                                </span>
                                                <span className="text-emerald-400 font-sans font-medium">
                                                    {driverLocations[d].timestamp || 'Reciente'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* MAPA UNIFICADO AISLADO CON Z-INDEX */}
                    <div className="lg:col-span-2 relative z-0">
                        <LiveUberMap
                            drivers={driverLocations}
                            selectedDriver={selectedDriver}
                            orders={orders}
                        />
                    </div>
                </div>
            )}

            {/* PANEL DE MÉTRICAS OPERATIVAS */}
            {!isGerente && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 print:hidden">
                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
                        <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Órdenes en Estación</span>
                            <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                                {filteredOrders.filter(o => activeColumns.includes(o.status)).length}
                            </span>
                        </div>
                        <div className="p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
                        <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Alta Prioridad</span>
                            <span className="text-2xl font-black text-rose-400 font-mono mt-0.5 block">
                                {filteredOrders.filter(o => activeColumns.includes(o.status) && o.urgent).length}
                            </span>
                        </div>
                        <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 rounded-xl">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
                        <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">En Pausa Técnica</span>
                            <span className="text-2xl font-black text-amber-400 font-mono mt-0.5 block">
                                {filteredOrders.filter(o => activeColumns.includes(o.status) && o.estaPausada).length}
                            </span>
                        </div>
                        <div className="p-3 bg-amber-600/10 border border-amber-500/20 text-amber-400 rounded-xl">
                            <Pause className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
                        <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Turno Activo</span>
                            <span className="text-sm font-bold text-emerald-400 truncate block mt-1">
                                {userName}
                            </span>
                        </div>
                        <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                            <Shield className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA KANBAN */}
            {(!isGerente || gerenciaTab === 'kanban') && (
                <>
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8 print:hidden bg-slate-900/60 p-3.5 md:p-4 rounded-2xl border border-slate-800/80">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4 md:w-5 md:h-5" />
                            <input type="text" placeholder="Buscar por cliente o código de orden (OP / WF)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm md:text-base focus:outline-none focus:border-blue-500 transition-colors" />
                        </div>
                        <div className="flex gap-2.5 items-center flex-wrap justify-between md:justify-start">
                            <button onClick={() => setFilterUrgent(!filterUrgent)} className={`px-4 py-2.5 md:py-3 rounded-xl border flex items-center gap-2 text-xs md:text-sm font-bold transition-all ${filterUrgent ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                <AlertCircle className="w-4 h-4" /> Urgentes
                            </button>
                            <button onClick={() => setFilterMine(!filterMine)} className={`hidden md:flex px-4 py-2.5 md:py-3 rounded-xl border items-center gap-2 text-xs md:text-sm font-bold transition-all ${filterMine ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                <Eye className="w-4 h-4" /> Mis Asignaciones
                            </button>
                            <button onClick={handlePrint} className="px-4 py-2.5 md:py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white flex items-center gap-2 text-xs md:text-sm font-bold transition-colors">
                                <Printer className="w-4 h-4" /> Imprimir
                            </button>
                        </div>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className={`flex-1 ${isGerente ? 'overflow-x-auto overflow-y-visible pb-28 snap-x snap-mandatory hide-scrollbar' : 'w-full pb-20'}`}>
                            <div className={`${
                                isGerente
                                    ? 'flex gap-5 min-w-max items-start px-1'
                                    : activeColumns.length === 1
                                        ? 'grid grid-cols-1 max-w-5xl mx-auto w-full'
                                        : activeColumns.length === 2
                                            ? 'grid grid-cols-1 md:grid-cols-2 gap-6 w-full'
                                            : 'grid grid-cols-1 md:grid-cols-3 gap-6 w-full'
                            }`}>
                                {activeColumns.map((column) => {
                                    const columnOrders = filteredOrders.filter((o) => o.status === column);
                                    const isCollapsed = isGerente && collapsedColumns.includes(column);

                                    return (
                                        <Droppable droppableId={column} key={column}>
                                            {(provided, snapshot) => (
                                                isCollapsed ? (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        onClick={() => toggleCollapseColumn(column)}
                                                        className={`w-13 shrink-0 bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-600 rounded-2xl py-4 px-1 transition-all flex flex-col items-center justify-between cursor-pointer select-none group shadow-lg min-h-[500px] ${
                                                            snapshot.isDraggingOver ? 'bg-slate-800 ring-2 ring-blue-500' : ''
                                                        }`}
                                                        title={`Clic para desplegar: ${column}`}
                                                    >
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-slate-400 group-hover:text-blue-400 text-xs transition-transform group-hover:scale-125">
                                                                ▶
                                                            </span>
                                                            <span className="bg-slate-800 border border-slate-700/80 text-slate-300 group-hover:text-white text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                                                                {columnOrders.length}
                                                            </span>
                                                        </div>

                                                        <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
                                                            <span className="text-slate-400 group-hover:text-slate-200 text-xs font-bold tracking-wider uppercase [writing-mode:vertical-rl] rotate-180">
                                                                {column}
                                                            </span>
                                                        </div>

                                                        <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-300">
                                                            Abrir
                                                        </span>
                                                        {provided.placeholder}
                                                    </div>
                                                ) : (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`
                                                            ${isGerente ? 'w-[80vw] sm:w-[320px] md:w-[340px] lg:w-[370px] shrink-0' : 'w-full'}
                                                            bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 transition-all flex flex-col ${
                                                            snapshot.isDraggingOver ? 'bg-slate-800/60 ring-2 ring-blue-500' : ''
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center mb-4 px-1">
                                                            <div className="flex items-center gap-2">
                                                                <h2 className="font-bold text-slate-200 text-sm md:text-base tracking-wide flex items-center gap-2">
                                                                    {column}
                                                                </h2>
                                                                <span className="bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                                                                    {columnOrders.length}
                                                                </span>
                                                            </div>

                                                            {isGerente && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleCollapseColumn(column)}
                                                                    className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                                                    title={`Plegar columna ${column}`}
                                                                >
                                                                    ◀
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col gap-3.5 min-h-[160px]">
                                                            {columnOrders.length === 0 && !snapshot.isDraggingOver && (
                                                                <div className="h-32 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-xl">
                                                                    <Info className="w-5 h-5 mb-1.5 opacity-40" />
                                                                    <span className="text-xs font-medium">Sin órdenes en esta estación</span>
                                                                </div>
                                                            )}

                                                            {columnOrders.map((order, index) => {
                                                                const isLocked = !canModifyOrder(order.status);
                                                                const stationDeadline = order.stationDeadlines?.[order.status] || order.deadline;
                                                                const timeMeta = formatTimeRemaining(stationDeadline);
                                                                const hasEvidence = order.evidence && order.evidence.length > 0;
                                                                const hasStationEv = hasEvidenceForStation(order, order.status);
                                                                const currentIndex = columns.indexOf(column);
                                                                const isLastColumn = currentIndex === columns.length - 1;

                                                                return (
                                                                    <Draggable draggableId={String(order.id)} index={index} key={order.id} isDragDisabled={isLocked || order.estaPausada}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                onClick={() => { setSelectedOrder({ ...order, isLocked }); setOrderModalTab('produccion'); }}
                                                                                className={`bg-slate-900/90 hover:bg-slate-850 p-4 md:p-5 rounded-xl shadow-lg border transition-all relative group cursor-pointer ${
                                                                                    order.estaPausada
                                                                                        ? 'border-amber-500/80 bg-amber-950/20 ring-1 ring-amber-500'
                                                                                        : isLocked
                                                                                            ? 'border-slate-800 opacity-80 cursor-not-allowed'
                                                                                            : 'border-slate-800 hover:border-slate-700'
                                                                                } ${snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105 z-50 ring-2 ring-blue-500' : ''}`}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-2.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className={`font-mono font-bold text-xs md:text-sm px-2.5 py-0.5 rounded-md ${order.type === 'Gran Formato' ? 'bg-purple-950 text-purple-300 border border-purple-800/60' : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'}`}>
                                                                                            {order.id}
                                                                                        </span>
                                                                                        {order.urgent && <AlertTriangle className="w-4 h-4 text-red-400" title="Urgente" />}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 print:hidden" onClick={(e) => e.stopPropagation()}>
                                                                                        {order.estaPausada ? (
                                                                                            <button onClick={() => handleResumeOrder(order)} className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 shadow animate-pulse">
                                                                                                <Play className="w-3.5 h-3.5 fill-current" /> {isGerente ? 'Reanudar' : 'Pausa'}
                                                                                            </button>
                                                                                        ) : (
                                                                                            <button onClick={() => handlePauseOrder(order)} className="text-slate-500 hover:text-amber-400 p-1 rounded hover:bg-slate-800 transition-colors" title="Pausar">
                                                                                                <Pause className="w-4 h-4" />
                                                                                            </button>
                                                                                        )}
                                                                                        {isLocked && <Lock className="w-4 h-4 text-slate-500" title="Solo lectura para tu rol" />}
                                                                                        {hasEvidence && <ImageIcon className={`w-4 h-4 ${hasStationEv ? 'text-emerald-400' : 'text-slate-500'}`} title={hasStationEv ? "Evidencia lista para esta estación" : "Evidencia de estaciones previas"} />}
                                                                                    </div>
                                                                                </div>

                                                                                {order.estaPausada && (
                                                                                    <div className="bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg text-xs text-amber-300 mb-2.5 font-medium">
                                                                                        ⚠️ <strong>Pausada:</strong> {order.motivoPausa}
                                                                                    </div>
                                                                                )}

                                                                                <h3 className="font-bold text-white text-base md:text-lg leading-snug mb-1 truncate">{order.client || order.cliente}</h3>
                                                                                <p className="text-xs md:text-sm text-slate-400 mb-3.5 truncate font-medium">{order.product || order.producto}</p>

                                                                                <div className="flex flex-col gap-2 text-xs md:text-sm bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg mb-3.5">
                                                                                    <div className="flex justify-between items-center text-slate-400">
                                                                                        <span>Resp:</span>
                                                                                        <strong className="text-blue-300 truncate max-w-[160px] font-semibold">{order.assigned || order.chofer || 'Sin Asignar'}</strong>
                                                                                    </div>
                                                                                    {timeMeta && (
                                                                                        <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/60">
                                                                                            <span className="text-slate-400 text-xs font-semibold">Término:</span>
                                                                                            <span className={`text-xs md:text-sm px-2.5 py-1 rounded border font-mono ${timeMeta.badgeClass}`}>
                                                                                                {timeMeta.label}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                    {!isGerente && !hasStationEv && (
                                                                                        <div className="pt-1.5 border-t border-slate-800/60 text-xs text-amber-400 flex items-center gap-1.5 font-medium">
                                                                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Requiere evidencia visual
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {!isLocked && !order.estaPausada && (
                                                                                    <div className="flex gap-2 print:hidden" onClick={(e) => e.stopPropagation()}>
                                                                                        {currentIndex > 0 && (
                                                                                            <button onClick={() => handleRetrocedeOrder(order)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60">
                                                                                                <ArrowLeft className="w-3.5 h-3.5" /> Atrás
                                                                                            </button>
                                                                                        )}
                                                                                        {!isLastColumn && (
                                                                                            <button onClick={() => handleAdvanceOrder(order)} className={`flex-1 text-white py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm ${!isGerente && !hasStationEv ? 'bg-slate-850 text-slate-400 hover:bg-slate-800 border border-slate-700' : 'bg-blue-600 hover:bg-blue-500'}`} title={!isGerente && !hasStationEv ? "Debes subir evidencia primero" : "Avanzar estación"}>
                                                                                                Avanzar <ArrowRight className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                        </div>
                                                        {provided.placeholder}
                                                    </div>
                                                )
                                            )}
                                        </Droppable>
                                    );
                                })}
                            </div>
                        </div>
                    </DragDropContext>
                </>
            )}

            {/* MODAL DETALLE DE ORDEN AMPLIADO */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 md:p-6 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] max-h-[88vh] overflow-hidden flex flex-col">
                        <div className={`p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white shrink-0 border-b ${selectedOrder.type === 'Gran Formato' ? 'bg-purple-950/40 border-purple-800/40' : 'bg-cyan-950/40 border-cyan-800/40'}`}>
                            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                <span className={`text-xs md:text-sm px-3.5 py-1.5 rounded-lg font-mono font-black uppercase ${selectedOrder.type === 'Gran Formato' ? 'bg-purple-600 text-white' : 'bg-cyan-600 text-white'}`}>
                                    {selectedOrder.id}
                                </span>
                                <h2 className="font-bold text-lg md:text-xl truncate text-white">{selectedOrder.client || selectedOrder.cliente}</h2>
                                {isSelectedCompleted ? (
                                    <span className="flex items-center gap-1.5 text-xs md:text-sm bg-emerald-900/90 text-emerald-200 border border-emerald-600 px-3.5 py-1.5 rounded-full font-bold shadow">
                                        <CheckCircle className="w-4 h-4 text-emerald-400" /> Completada / Historial
                                    </span>
                                ) : selectedOrder.isLocked ? (
                                    <span className="flex items-center gap-1 text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full"><Lock className="w-3 h-3" /> Lectura</span>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                    <button
                                        onClick={() => setOrderModalTab('produccion')}
                                        className={`px-3.5 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${orderModalTab === 'produccion' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        <Layers className="w-4 h-4" /> Ficha de Producción
                                    </button>
                                    {isGerente && (
                                        <button
                                            onClick={() => setOrderModalTab('auditoria')}
                                            className={`px-3.5 py-1.5 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${orderModalTab === 'auditoria' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            <Activity className="w-4 h-4" /> Auditoría MES (Admin)
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"><X className="w-6 h-6" /></button>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-sm md:text-base">
                            {orderModalTab === 'produccion' && (
                                <>
                                    <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-2.5">
                                        <div className="flex justify-between items-center text-sm md:text-base">
                                            <span className="text-slate-400 font-semibold">Trazabilidad MES en Planta</span>
                                            <span className={`text-xs md:text-sm font-bold px-3 py-0.5 rounded-full border ${isSelectedCompleted ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-600/20 text-blue-400 border-blue-500/30'}`}>
                                                {isSelectedCompleted ? '100% Completado (Archivado)' : `${getProgressPercentage(selectedOrder.status)}% Completado`}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                                            <div className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full transition-all duration-500" style={{ width: `${getProgressPercentage(selectedOrder.status)}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 text-sm md:text-base">
                                        <div><span className="text-xs text-slate-400 block uppercase font-bold mb-1">O / TRAB #</span><strong className="text-amber-400 font-mono text-base md:text-lg">{selectedOrder.wfData?.oTrab || selectedOrder.stdData?.oTrab || 'N/A'}</strong></div>
                                        <div className="col-span-2"><span className="text-xs text-slate-400 block uppercase font-bold mb-1">Producto</span><strong className="text-white text-base md:text-lg">{selectedOrder.product || selectedOrder.producto}</strong></div>
                                        <div><span className="text-xs text-slate-400 block uppercase font-bold mb-1">Límite General</span><strong className="text-red-400 font-mono text-sm md:text-base">{selectedOrder.deadline ? new Date(selectedOrder.deadline).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</strong></div>

                                        <div><span className="text-xs text-slate-400 block uppercase font-bold mb-1">Cantidad</span><strong className="text-white text-base">{selectedOrder.quantity || 1}</strong></div>
                                        <div><span className="text-xs text-slate-400 block uppercase font-bold mb-1">Medida Abierta</span><strong className="text-white text-base">{selectedOrder.openSize || selectedOrder.medida_abierta || 'N/A'}</strong></div>
                                        <div><span className="text-xs text-slate-400 block uppercase font-bold mb-1">Diseñador</span><strong className="text-cyan-300 text-base">{selectedOrder.wfData?.designer || selectedOrder.stdData?.designer || selectedOrder.disenador || 'N/A'}</strong></div>
                                        <div><span className="text-xs text-slate-400 block uppercase font-bold mb-1">Prueba Color</span><strong className={`text-base ${selectedOrder.wfData?.colorProof || selectedOrder.stdData?.colorProof ? 'text-emerald-400' : 'text-slate-500'}`}>{selectedOrder.wfData?.colorProof || selectedOrder.stdData?.colorProof ? '✓ Requerida' : 'No'}</strong></div>

                                        {/* --- INICIO DEL BOTÓN DE UBICACIÓN GPS --- */}
                                        <div className="col-span-2 md:col-span-4 mt-2 pt-3 border-t border-slate-700/50">
                                            <span className="text-xs text-slate-400 block uppercase font-bold mb-1">
                                                📍 Ubicación de Entrega / Despacho
                                            </span>
                                            {selectedOrder.direction && (
                                                <span className="text-sm text-slate-300 block mb-2">{selectedOrder.direction}</span>
                                            )}

                                            {/* Verificamos si destLat contiene un enlace real de maps (http) */}
                                            {selectedOrder.destLat && String(selectedOrder.destLat).includes('http') ? (
                                                <a
                                                    href={selectedOrder.destLat}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/40"
                                                >
                                                    <Navigation className="w-4 h-4" /> Iniciar Navegación en Maps
                                                </a>
                                            ) : (
                                                <span className="text-sm font-bold text-slate-500 italic block mt-1">
                                                    Sin enlace de GPS registrado
                                                </span>
                                            )}
                                        </div>
                                        {/* --- FIN DEL BOTÓN DE UBICACIÓN GPS --- */}
                                    </div>


                                    {selectedOrder.type === 'Estándar' && selectedOrder.stdData && (
                                        <div className="bg-slate-950/80 border border-slate-800 p-6 rounded-xl space-y-5">
                                            <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-cyan-400" /> Especificaciones Completas (OP No 001 - 15371)
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
                                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                                                    <span className="text-xs font-bold text-cyan-300 uppercase block mb-2">Materiales / Papel</span>
                                                    {selectedOrder.stdData.matBond && <p className="text-slate-200">✓ Papel Bond: {selectedOrder.stdData.matBondGr}g</p>}
                                                    {selectedOrder.stdData.matCoucheB && <p className="text-slate-200">✓ Couche Brillo: {selectedOrder.stdData.matCoucheBGr}g</p>}
                                                    {selectedOrder.stdData.matCoucheM && <p className="text-slate-200">✓ Couche Mate: {selectedOrder.stdData.matCoucheMGr}g</p>}
                                                    {selectedOrder.stdData.matCartulina && <p className="text-slate-200">✓ Cartulina: {selectedOrder.stdData.matCartulinaGr}g</p>}
                                                    {selectedOrder.stdData.matAdhesivoSeg && <p className="text-slate-200">✓ Adhesivo Seguridad ({selectedOrder.stdData.adhSegTipo})</p>}
                                                    {selectedOrder.stdData.matAdhesivoPoli && <p className="text-slate-200">✓ Adh. Polipropileno: {selectedOrder.stdData.matAdhesivoPoliText}</p>}
                                                    {selectedOrder.stdData.matOtros && <p className="text-slate-200">✓ Otros: {selectedOrder.stdData.matOtrosText}</p>}
                                                    <p className="text-slate-300 font-mono pt-1">Medida: {selectedOrder.stdData.medida} {selectedOrder.stdData.medidaOtro} | Total Planas: {selectedOrder.stdData.totalPlanas || 'N/A'}</p>
                                                    {selectedOrder.stdData.obsMateriales && <p className="text-slate-400 text-xs italic mt-2">Obs: {selectedOrder.stdData.obsMateriales}</p>}
                                                </div>

                                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                                                    <span className="text-xs font-bold text-blue-300 uppercase block mb-2">Impresión, Troquelado y Acabados</span>
                                                    {selectedOrder.stdData.impAccurio && <p className="text-slate-200">✓ Accurio Print ({selectedOrder.stdData.accTiro ? 'Tiro' : ''}{selectedOrder.stdData.accRetiro ? '/Retiro' : ''})</p>}
                                                    {selectedOrder.stdData.impOffset && <p className="text-slate-200">✓ Offset ({selectedOrder.stdData.offTiro ? 'Tiro' : ''}{selectedOrder.stdData.offRetiro ? '/Retiro' : ''})</p>}
                                                    {selectedOrder.stdData.impFlexo && <p className="text-slate-200">✓ Flexo ({selectedOrder.stdData.flexoTiro ? 'Tiro' : ''}{selectedOrder.stdData.flexoRetiro ? '/Retiro' : ''})</p>}
                                                    {(selectedOrder.stdData.planasImpresas || selectedOrder.stdData.planasDanadas) && (
                                                        <p className="text-xs text-slate-400 font-mono">Impresas: {selectedOrder.stdData.planasImpresas || '0'} | Dañadas: {selectedOrder.stdData.planasDanadas || '0'}</p>
                                                    )}
                                                    {(selectedOrder.stdData.lamMate || selectedOrder.stdData.lamBrillo) && (
                                                        <p className="text-slate-200">✓ Laminado: {selectedOrder.stdData.lamMate ? 'Mate ' : ''}{selectedOrder.stdData.lamBrillo ? 'Brillo ' : ''}</p>
                                                    )}
                                                    {selectedOrder.stdData.troqTroquelado && <p className="text-slate-200">✓ Troquelado: {selectedOrder.stdData.troqTroqueladoText || 'Sí'}</p>}
                                                    {selectedOrder.stdData.troqGrafado && <p className="text-slate-200">✓ Grafado: {selectedOrder.stdData.troqGrafadoText || 'Sí'}</p>}
                                                    {selectedOrder.stdData.acabGrapado && <p className="text-slate-200">✓ Grapado: {selectedOrder.stdData.acabGrapadoText || 'Sí'}</p>}
                                                    {selectedOrder.stdData.manfEmpacado && <p className="text-slate-200">✓ Empacado / Distribución</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedOrder.type === 'Gran Formato' && selectedOrder.wfData && (
                                        <div className="bg-slate-950/80 border border-slate-800 p-6 rounded-xl space-y-5">
                                            <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                                <Layers className="w-5 h-5 text-purple-400" /> Especificaciones Completas (WF No 002 - 5591)
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
                                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                                                    <span className="text-xs font-bold text-purple-300 uppercase block mb-2">Cama Plana e Impresión Plotter</span>
                                                    {selectedOrder.wfData.cpPvc && <p className="text-slate-200">✓ PVC: {selectedOrder.wfData.cpPvcText}</p>}
                                                    {selectedOrder.wfData.cpPlastipro && <p className="text-slate-200">✓ Plastipro: {selectedOrder.wfData.cpPlastiproText}</p>}
                                                    {selectedOrder.wfData.cpFomecore && <p className="text-slate-200">✓ Fomecore: {selectedOrder.wfData.cpFomecoreText}</p>}
                                                    {selectedOrder.wfData.cpCorrugado && <p className="text-slate-200">✓ C. Corrugado: {selectedOrder.wfData.cpCorrugadoText}</p>}
                                                    {selectedOrder.wfData.plotGalaxy160 && <p className="text-slate-200">✓ Plotter Galaxy 160</p>}
                                                    {selectedOrder.wfData.plotGalaxy180 && <p className="text-slate-200">✓ Plotter Galaxy 180</p>}
                                                    {selectedOrder.wfData.plotGalaxy320 && <p className="text-slate-200">✓ Plotter Galaxy 320</p>}
                                                    {selectedOrder.wfData.plotMimaki && <p className="text-slate-200">✓ Mimaki UJV 100 ({selectedOrder.wfData.mimakiCmyk ? 'CMYK ' : ''}{selectedOrder.wfData.mimakiClear ? 'Clear ' : ''}{selectedOrder.wfData.mimakiBlanco ? 'Blanco' : ''})</p>}
                                                </div>

                                                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                                                    <span className="text-xs font-bold text-emerald-300 uppercase block mb-2">Materiales, Acabados y Entrega Final</span>
                                                    {selectedOrder.wfData.matLona && <p className="text-slate-200">✓ Lona: {selectedOrder.wfData.lonaOnz} ONZ</p>}
                                                    {selectedOrder.wfData.matVinil && <p className="text-slate-200">✓ Vinil {selectedOrder.wfData.vinilOtro}</p>}
                                                    {selectedOrder.wfData.acabRefilado && <p className="text-slate-200">✓ Refilado</p>}
                                                    {selectedOrder.wfData.acabTroquelado && <p className="text-slate-200">✓ Troquelado</p>}
                                                    {selectedOrder.wfData.acabOjales && <p className="text-slate-200">✓ Ojales: {selectedOrder.wfData.acabOjalesText}</p>}
                                                    {selectedOrder.wfData.entInstalacion && <p className="text-emerald-300 font-bold">📦 Requiere Instalación en Sitio</p>}
                                                    {selectedOrder.wfData.indicaciones && <p className="text-slate-300 italic pt-1">Indicaciones: "{selectedOrder.wfData.indicaciones}"</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                        <div>
                                            <h4 className="font-bold text-sm md:text-base uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-400" /> Evidencias de Planta</h4>
                                            {selectedOrder.evidence && selectedOrder.evidence.length > 0 && (
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    {selectedOrder.evidence.map(ev => (
                                                        <div key={ev.id} onClick={() => setZoomedImage(String(ev.image))} className="rounded-xl border border-slate-800 overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors h-24 relative group">
                                                            <img src={String(ev.image)} alt="Evidencia" className="w-full h-full object-cover" />
                                                            <div className="absolute inset-x-0 bottom-0 bg-black/75 px-1.5 py-0.5 text-xs text-slate-300 truncate font-mono">
                                                                {ev.station || 'Planta'} • {ev.uploadedBy}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {!isSelectedCompleted && !selectedOrder.isLocked && (
                                                <div className="relative">
                                                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => handleFileUpload(e, selectedOrder.id)} />
                                                    <div className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm md:text-base font-bold border border-dashed transition-all ${!isGerente && !hasEvidenceInSelected ? 'bg-amber-950/30 border-amber-500 text-amber-300 animate-pulse' : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'}`}>
                                                        <UploadCloud className="w-5 h-5" /> {!hasEvidenceInSelected ? `Subir Foto Obligatoria (${selectedOrder.status})` : 'Subir Otra Foto / Acta'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-sm md:text-base uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2"><History className="w-5 h-5 text-blue-400" /> Historial de Cambios</h4>
                                            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 max-h-44 overflow-y-auto custom-scrollbar space-y-2 text-sm md:text-base">
                                                {selectedOrder.history?.map((log, i) => (
                                                    <div key={i} className="pb-2 border-b border-slate-850 last:border-none">
                                                        <p className="font-bold text-slate-300">{log.action}</p>
                                                        <p className="text-xs text-slate-500">{log.user} • {log.date}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {orderModalTab === 'auditoria' && isGerente && (
                                <div className="space-y-6 animate-in fade-in duration-200">
                                    <div className="bg-slate-950/80 border border-slate-800 p-5 md:p-6 rounded-xl space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                            <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                                <GitMerge className="w-5 h-5 text-purple-400" /> Diagrama de Tiempos: Planificado vs. Ejecutado Real
                                            </h3>
                                            <span className="text-xs text-slate-400 font-mono">Control y Supervisión MES</span>
                                        </div>

                                        <div className="overflow-x-auto pb-4 custom-scrollbar">
                                            <div className="flex items-start min-w-[760px] justify-between relative px-2 pt-3">
                                                {columns.map((col, idx) => {
                                                    const isCurrent = selectedOrder.status === col;
                                                    const actualRecord = selectedOrder.stationActuals?.[col];
                                                    const isPassed = isSelectedCompleted || !!actualRecord || columns.indexOf(selectedOrder.status) > idx;
                                                    const planDeadline = selectedOrder.stationDeadlines?.[col];

                                                    return (
                                                        <div key={col} className="flex flex-col items-center flex-1 relative z-10 text-center">
                                                            {idx < columns.length - 1 && (
                                                                <div className={`absolute top-4 md:top-4.5 left-1/2 w-full h-0.5 -z-10 transition-colors ${
                                                                    isPassed && !isCurrent ? 'bg-emerald-500' : 'bg-slate-800'
                                                                }`} />
                                                            )}
                                                            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                                                isCurrent && !isSelectedCompleted
                                                                    ? 'bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/20 animate-pulse'
                                                                    : isPassed
                                                                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                                                        : 'bg-slate-900 border-slate-700 text-slate-600'
                                                            }`}>
                                                                {isPassed ? '✓' : idx + 1}
                                                            </div>
                                                            <span className={`text-xs md:text-sm font-bold mt-2 truncate max-w-[85px] ${
                                                                isCurrent && !isSelectedCompleted ? 'text-blue-400' : isPassed ? 'text-slate-300' : 'text-slate-500'
                                                            }`}>
                                                                {col}
                                                            </span>
                                                            <div className="text-xs md:text-sm mt-1 font-mono">
                                                                {actualRecord ? (
                                                                    <span className="text-emerald-400 block font-bold">✓ {actualRecord.user || 'Listo'}</span>
                                                                ) : planDeadline ? (
                                                                    <span className="text-slate-300 block font-semibold">{new Date(planDeadline).toLocaleTimeString('es-EC', {hour:'2-digit', minute:'2-digit'})}</span>
                                                                ) : (
                                                                    <span className="text-slate-600 block">-</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden">
                                        <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800 text-sm md:text-base font-bold text-slate-300 uppercase tracking-wider">
                                            Registro Auditoría Estación por Estación (Límites y Entregas)
                                        </div>
                                        <div className="divide-y divide-slate-800/80 text-sm md:text-base font-mono">
                                            {columns.map((col) => {
                                                const actualRecord = selectedOrder.stationActuals?.[col];
                                                const planDeadline = selectedOrder.stationDeadlines?.[col];
                                                const isCurrent = selectedOrder.status === col;


                                                return (
                                                    <div key={col} className={`p-4 md:p-4.5 flex items-center justify-between ${isCurrent && !isSelectedCompleted ? 'bg-blue-950/30' : ''}`}>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-3 h-3 rounded-full ${isSelectedCompleted || actualRecord ? 'bg-emerald-400' : isCurrent ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'} `} />
                                                            <div>
                                                                <strong className="text-white text-base md:text-lg">{col}</strong>
                                                                <span className="text-slate-400 text-xs block font-mono mt-0.5">
                                                                    {actualRecord?.user ? actualRecord.user : '-'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-8">
                                                            <div className="text-right">
                                                                <span className="text-slate-400 text-xs uppercase block font-sans">Límite / Meta Plan:</span>
                                                                <span className="text-amber-300 text-sm md:text-base font-bold">
                                                                    {planDeadline ? new Date(planDeadline).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                                                                </span>
                                                            </div>
                                                            <div className="text-right min-w-[170px]">
                                                                <span className="text-slate-400 text-xs uppercase block font-sans">Ejecución Real:</span>
                                                                {actualRecord || isSelectedCompleted ? (
                                                                    <span className="text-emerald-400 font-bold text-sm md:text-base">
                                                                        {actualRecord?.date || 'Completado'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-500 italic text-sm">Pendiente</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 md:p-5 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
                            {/* 1. MODO CONSULTA HISTÓRICA */}
                            {isSelectedCompleted ? (
                                <div className="w-full bg-emerald-950/60 border border-emerald-800 p-3.5 rounded-xl text-emerald-300 text-sm md:text-base text-center font-bold flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" /> ORDEN FINALIZADA Y ARCHIVADA EN HISTORIAL (Modo Consulta)
                                </div>

                            ) : selectedOrder.estaPausada ? (
                                <div className="w-full bg-amber-950/60 border border-amber-800 p-3 rounded-xl text-amber-300 text-sm text-center font-bold animate-pulse">
                                    ⚠️ ORDEN EN PAUSA: Gerencia debe reanudar el proceso antes de avanzar.
                                </div>

                                /* 2. ESTACIÓN DE DESPACHO / INSTALACIÓN (LOGÍSTICA) */
                            ) : (selectedOrder.status === 'Despacho' || selectedOrder.status === 'Instalación' || selectedOrder.estado === 'Despacho') ? (
                                isChofer ? (
                                    /* --- VISTA CONDUCTOR: FOTO OBLIGATORIA PARA CERRAR --- */
                                    !hasEvidenceInSelected ? (
                                        <div className="w-full bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-amber-300 text-xs md:text-sm flex items-center justify-center gap-2 font-semibold animate-pulse">
                                            <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                                            <span>Debes subir la foto de entrega (acta o guía firmada) para poder finalizar el despacho.</span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                showConfirm("Confirmar Entrega", `¿Confirmar entrega y archivar la orden #${selectedOrder.id} con la evidencia adjunta?`, async () => {
                                                    try {
                                                        await fetch(`${API_URL}/api/ordenes/${selectedOrder.id}/entregar`, {
                                                            method: 'PUT'
                                                        });
                                                        const finishedOrder = {
                                                            ...selectedOrder,
                                                            status: 'Completado',
                                                            estado: 'Entregado',
                                                            completedAt: new Date().toLocaleString('es-EC'),
                                                            completedBy: userName
                                                        };
                                                        setCompletedOrders([finishedOrder, ...completedOrders]);
                                                        setOrdersState(prev => prev.filter(o => String(o.id) !== String(selectedOrder.id)));
                                                        await cargarOrdenesDesdeBD();
                                                        setSelectedOrder(null);
                                                        closeDialog();
                                                        showToast("🎉 Entrega completada y registrada en el historial");
                                                    } catch (err) {
                                                        showAlert("Error", "No se pudo actualizar la base de datos.");
                                                    }
                                                });
                                            }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-base transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40"
                                        >
                                            <CheckCircle className="w-6 h-6" /> Marcar como Entregado / Finalizar Despacho
                                        </button>
                                    )
                                ) : (
                                    /* --- VISTA GERENCIA: SUPERVISIÓN EN VIVO (SIN BOTÓN DE CIERRE) --- */
                                    <div className="w-full bg-sky-950/40 border border-sky-800/60 p-3.5 rounded-xl text-sky-300 text-xs md:text-sm flex flex-col sm:flex-row items-center justify-between gap-2 font-medium">
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-sky-400 animate-pulse" />
                                            <span>En ruta de entrega a cargo de: <strong className="text-white">{selectedOrder.chofer || selectedOrder.assigned || 'Conductor'}</strong></span>
                                        </div>
                                        <span className="text-[11px] bg-sky-900/60 text-sky-200 border border-sky-700/60 px-3 py-1 rounded-full font-semibold">
                                            Supervisión en vivo: Esperando entrega y foto del chofer
                                        </span>
                                    </div>
                                )

                                /* 3. OTRAS ESTACIONES DEL TABLERO */
                            ) : !isGerente && !hasEvidenceInSelected ? (
                                <div className="w-full bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-amber-300 text-sm flex items-center justify-center gap-2 font-semibold">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                                    <span>Debes subir obligatoriamente una foto o acta en <strong>"{selectedOrder.status}"</strong> para avanzar.</span>
                                </div>
                            ) : (
                                <>
                                    {isSelectedActive && selectedCurrentIndex > 0 ? (
                                        <button onClick={() => handleRetrocedeOrder(selectedOrder)} disabled={selectedOrder.isLocked} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer">
                                            <ArrowLeft className="w-5 h-5" /> Retroceder
                                        </button>
                                    ) : <div />}

                                    {isSelectedActive && selectedCurrentIndex < columns.length - 1 && (
                                        <button onClick={() => handleAdvanceOrder(selectedOrder)} disabled={selectedOrder.isLocked || (!isGerente && !hasEvidenceInSelected)} className={`px-7 py-3.5 rounded-xl font-bold text-sm md:text-base flex items-center gap-2 shadow-lg transition-all cursor-pointer ${!isGerente && !hasEvidenceInSelected ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'}`}>
                                            Avanzar a {columns[selectedCurrentIndex + 1]} <ArrowRight className="w-5 h-5" />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NUEVA ORDEN */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 md:p-6 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] max-h-[88vh] overflow-hidden flex flex-col">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 md:p-5 flex justify-between items-center text-white shrink-0">
                            <h2 className="font-bold text-lg md:text-xl flex items-center gap-2.5"><Plus className="w-6 h-6 text-amber-400" /> Crear Nueva Orden de Producción ({newFormData.orderType === 'Estándar' ? 'OP No 001 - 15371' : 'WF No 002 - 5591'})</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-xl cursor-pointer"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6 text-sm md:text-base">
                            <form onSubmit={handleCreateOrder} id="create-order-form" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Tipo de Orden</label>
                                        <select value={newFormData.orderType} onChange={(e) => setNewFormData({...newFormData, orderType: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl font-bold text-white text-sm focus:outline-none focus:border-amber-500">
                                            <option value="Estándar">Estándar (OP)</option>
                                            <option value="Gran Formato">Gran Formato (WF)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Cliente</label>
                                        <input required type="text" placeholder="Nombre del cliente" value={newFormData.client} onChange={(e) => setNewFormData({...newFormData, client: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Producto</label>
                                        <input required type="text" placeholder="Descripción del producto" value={newFormData.product} onChange={(e) => setNewFormData({...newFormData, product: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Cantidad</label>
                                        <input required type="number" min="1" value={newFormData.quantity} onChange={(e) => setNewFormData({...newFormData, quantity: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Fecha y Hora Límite (General)</label>
                                        <input type="datetime-local" value={newFormData.deadline} onChange={(e) => setNewFormData({...newFormData, deadline: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Diseñador Asignado (Solo Área de Diseño)</label>
                                        <select value={newFormData.designer} onChange={(e) => setNewFormData({...newFormData, designer: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500">
                                            <option value="">Seleccionar diseñador...</option>
                                            {designStaff.map(u => <option key={u.id} value={u.name || u.nombres}>{u.name || u.nombres} ({u.role || u.rol})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">O / Trabajo #</label>
                                        <input type="text" placeholder="Número OP / WF" value={newFormData.oTrab} onChange={(e) => setNewFormData({...newFormData, oTrab: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500 font-mono" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Medida Abierta</label>
                                        <input type="text" placeholder="ej: 33 x 48 cm" value={newFormData.openSize} onChange={(e) => setNewFormData({...newFormData, openSize: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500" />
                                    </div>

                                    {/* --- SECCIÓN LOGÍSTICA MEJORADA --- */}
                                    <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-700/50 pt-4 mt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-sky-400 uppercase mb-2 flex items-center gap-1.5">
                                                <Navigation className="w-3.5 h-3.5" /> Referencia de Dirección
                                            </label>
                                            <textarea
                                                rows="2"
                                                placeholder="Ej: Urdesa Central, calle principal junto a la farmacia..."
                                                value={newFormData.direccion}
                                                onChange={(e) => setNewFormData({...newFormData, direccion: e.target.value})}
                                                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 custom-scrollbar resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-emerald-400 uppercase mb-2">Enlace de Google Maps</label>
                                            <input
                                                type="url"
                                                placeholder="Pega aquí el enlace (ej: https://maps.app.goo.gl/...)"
                                                value={newFormData.mapsLink}
                                                onChange={(e) => setNewFormData({...newFormData, mapsLink: e.target.value})}
                                                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                                            />
                                            <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline mt-1.5 inline-block">
                                                Abrir Google Maps para buscar
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-5 md:col-span-3">
                                        <input type="checkbox" id="urgentCheck" checked={newFormData.urgent} onChange={(e) => setNewFormData({...newFormData, urgent: e.target.checked})} className="w-5 h-5 rounded-lg border-slate-800 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer" />
                                        <label htmlFor="urgentCheck" className="text-xs md:text-sm font-bold text-red-400 uppercase cursor-pointer">Marcar como Prioridad / Urgente</label>
                                    </div>
                                </div>

                                <div className="bg-slate-950/85 border border-slate-800 p-6 rounded-xl space-y-6">
                                    <h3 className="text-sm md:text-base font-bold text-amber-400 flex items-center gap-2 uppercase tracking-wider border-b border-slate-800 pb-3">
                                        <FileText className="w-5 h-5 text-amber-400" /> Ficha Técnica Oficial Completa ({newFormData.orderType === 'Estándar' ? 'OP No 001 - 15371' : 'WF No 002 - 5591'})
                                    </h3>

                                    {newFormData.orderType === 'Estándar' ? (
                                        <div className="space-y-6">
                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-4">
                                                <h4 className="text-xs uppercase font-bold text-cyan-400 tracking-wider">1. Materiales</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <CheckInput checked={stdForm.matBond} onChange={(val) => setStdForm({...stdForm, matBond: val})} label="PAPEL BOND" textValue={stdForm.matBondGr} onTextChange={(val) => setStdForm({...stdForm, matBondGr: val})} placeholder="GR." />
                                                    <CheckInput checked={stdForm.matCoucheB} onChange={(val) => setStdForm({...stdForm, matCoucheB: val})} label="COUCHE BRILLO" textValue={stdForm.matCoucheBGr} onTextChange={(val) => setStdForm({...stdForm, matCoucheBGr: val})} placeholder="GR." />
                                                    <CheckInput checked={stdForm.matCoucheM} onChange={(val) => setStdForm({...stdForm, matCoucheM: val})} label="COUCHE MATE" textValue={stdForm.matCoucheMGr} onTextChange={(val) => setStdForm({...stdForm, matCoucheMGr: val})} placeholder="GR." />
                                                    <CheckInput checked={stdForm.matCartulina} onChange={(val) => setStdForm({...stdForm, matCartulina: val})} label="CARTULINA" textValue={stdForm.matCartulinaGr} onTextChange={(val) => setStdForm({...stdForm, matCartulinaGr: val})} placeholder="GR." />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                                                    <div className="flex items-center gap-3 text-xs md:text-sm">
                                                        <span className="text-slate-300 font-bold uppercase font-mono">Papel Adhesivo Seguridad:</span>
                                                        <label className="flex items-center gap-1.5 cursor-pointer font-mono text-slate-200">
                                                            <input type="checkbox" checked={stdForm.adhSegTipo === 'Con Precorte'} onChange={() => setStdForm({...stdForm, matAdhesivoSeg: true, adhSegTipo: 'Con Precorte'})} className="accent-slate-700 w-4 h-4 cursor-pointer" /> Con Precorte
                                                        </label>
                                                        <label className="flex items-center gap-1.5 cursor-pointer font-mono text-slate-200">
                                                            <input type="checkbox" checked={stdForm.adhSegTipo === 'Sin Precorte'} onChange={() => setStdForm({...stdForm, matAdhesivoSeg: true, adhSegTipo: 'Sin Precorte'})} className="accent-slate-700 w-4 h-4 cursor-pointer" /> Sin Precorte
                                                        </label>
                                                    </div>
                                                    <CheckInput checked={stdForm.matAdhesivoPoli} onChange={(val) => setStdForm({...stdForm, matAdhesivoPoli: val})} label="ADHESIVO POLIPROPILENO" textValue={stdForm.matAdhesivoPoliText} onTextChange={(val) => setStdForm({...stdForm, matAdhesivoPoliText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.matOtros} onChange={(val) => setStdForm({...stdForm, matOtros: val})} label="OTROS" textValue={stdForm.matOtrosText} onTextChange={(val) => setStdForm({...stdForm, matOtrosText: val})} placeholder="" />
                                                    <div className="flex flex-col gap-2 font-mono text-sm pt-2">
                                                        <span className="text-slate-200 uppercase font-bold">OBSERVACIONES:</span>
                                                        <textarea rows="2" value={stdForm.obsMateriales} onChange={(e) => setStdForm({...stdForm, obsMateriales: e.target.value})} className="border border-slate-700 rounded bg-slate-900 w-full p-2 focus:outline-none focus:border-amber-400 text-white resize-y mt-1" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-800 text-sm font-mono text-slate-200">
                                                    <div className="space-y-2">
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={stdForm.med32x45} onChange={(e) => setStdForm({...stdForm, med32x45: e.target.checked, med33x48: false, medOtro: false, medida: '32,5 X 45 CM'})} className="accent-slate-700 w-4 h-4" /> 32,5 X 45 CM</label>
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={stdForm.med33x48} onChange={(e) => setStdForm({...stdForm, med33x48: e.target.checked, med32x45: false, medOtro: false, medida: '33 X 48 CM'})} className="accent-slate-700 w-4 h-4" /> 33 X 48 CM</label>
                                                        <div className="flex items-center gap-2">
                                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={stdForm.medOtro} onChange={(e) => setStdForm({...stdForm, medOtro: e.target.checked, med32x45: false, med33x48: false, medida: 'OTRO'})} className="accent-slate-700 w-4 h-4" /> OTRO</label>
                                                            <input type="text" value={stdForm.medidaOtro} onChange={(e) => setStdForm({...stdForm, medidaOtro: e.target.value})} className="border-b border-slate-500 bg-transparent flex-1 px-1 focus:outline-none focus:border-amber-400 text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center"><span className="uppercase">Cant. Planas</span><input type="text" value={stdForm.cantPlanas1} onChange={(e) => setStdForm({...stdForm, cantPlanas1: e.target.value})} className="border-b border-slate-500 bg-transparent w-32 px-1 focus:outline-none text-white text-right" /></div>
                                                        <div className="flex justify-between items-center"><span className="uppercase">Cant. Planas</span><input type="text" value={stdForm.cantPlanas2} onChange={(e) => setStdForm({...stdForm, cantPlanas2: e.target.value})} className="border-b border-slate-500 bg-transparent w-32 px-1 focus:outline-none text-white text-right" /></div>
                                                        <div className="flex justify-between items-center"><span className="uppercase">Cant. Adicionales</span><input type="text" value={stdForm.cantAdicionales} onChange={(e) => setStdForm({...stdForm, cantAdicionales: e.target.value})} className="border-b border-slate-500 bg-transparent w-32 px-1 focus:outline-none text-white text-right" /></div>
                                                        <div className="flex justify-between items-center font-bold text-amber-400"><span className="uppercase">TOTAL PLANAS</span><input type="text" value={stdForm.totalPlanas} onChange={(e) => setStdForm({...stdForm, totalPlanas: e.target.value})} className="border-b border-slate-500 bg-transparent w-32 px-1 focus:outline-none text-white text-right" /></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <h4 className="text-xs uppercase font-bold text-blue-400 tracking-wider">2. Área de Impresión</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-700 border border-slate-700 font-mono text-sm">
                                                    <div className="p-3 bg-slate-950/40">
                                                        <label className="flex justify-center items-center gap-2 font-bold text-white mb-3">
                                                            <input type="checkbox" checked={stdForm.impAccurio} onChange={(e) => setStdForm({...stdForm, impAccurio: e.target.checked})} className="accent-slate-700 w-4 h-4 cursor-pointer" /> ACCURIO PRINT C3070L
                                                        </label>
                                                        <div className="flex justify-center gap-6">
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300"><input type="checkbox" checked={stdForm.accTiro} onChange={(e) => setStdForm({...stdForm, accTiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TIRO</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300"><input type="checkbox" checked={stdForm.accRetiro} onChange={(e) => setStdForm({...stdForm, accRetiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> RETIRO</label>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-slate-950/40">
                                                        <label className="flex justify-center items-center gap-2 font-bold text-white mb-3">
                                                            <input type="checkbox" checked={stdForm.impOffset} onChange={(e) => setStdForm({...stdForm, impOffset: e.target.checked})} className="accent-slate-700 w-4 h-4 cursor-pointer" /> OFFSET
                                                        </label>
                                                        <div className="flex justify-center gap-6">
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300"><input type="checkbox" checked={stdForm.offTiro} onChange={(e) => setStdForm({...stdForm, offTiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TIRO</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300"><input type="checkbox" checked={stdForm.offRetiro} onChange={(e) => setStdForm({...stdForm, offRetiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> RETIRO</label>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-slate-950/40">
                                                        <label className="flex justify-center items-center gap-2 font-bold text-white mb-3">
                                                            <input type="checkbox" checked={stdForm.impFlexo} onChange={(e) => setStdForm({...stdForm, impFlexo: e.target.checked})} className="accent-slate-700 w-4 h-4 cursor-pointer" /> FLEXO
                                                        </label>
                                                        <div className="flex justify-center gap-6">
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300"><input type="checkbox" checked={stdForm.flexoTiro} onChange={(e) => setStdForm({...stdForm, flexoTiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TIRO</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300"><input type="checkbox" checked={stdForm.flexoRetiro} onChange={(e) => setStdForm({...stdForm, flexoRetiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> RETIRO</label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 font-mono text-sm pt-2">
                                                    <div className="flex items-center border border-slate-700 rounded bg-slate-950/40"><span className="bg-slate-800 p-2 text-slate-300 whitespace-nowrap border-r border-slate-700">Planas impresas</span><input type="text" value={stdForm.planasImpresas} onChange={(e) => setStdForm({...stdForm, planasImpresas: e.target.value})} className="bg-transparent flex-1 p-2 focus:outline-none text-white text-center" /></div>
                                                    <div className="flex items-center border border-slate-700 rounded bg-slate-950/40"><span className="bg-slate-800 p-2 text-slate-300 whitespace-nowrap border-r border-slate-700">Planas dañadas por máquina</span><input type="text" value={stdForm.planasDanadas} onChange={(e) => setStdForm({...stdForm, planasDanadas: e.target.value})} className="bg-transparent flex-1 p-2 focus:outline-none text-white text-center" /></div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <h4 className="text-xs uppercase font-bold text-purple-400 tracking-wider">3. Área de Laminado / Barniz</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono text-slate-200">
                                                    <div className="space-y-3 p-3 bg-slate-950/40 border border-slate-700 rounded-lg">
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-bold text-white uppercase w-20">LAMINADO</span>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.lamMate} onChange={(e) => setStdForm({...stdForm, lamMate: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MATE</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.lamBrillo} onChange={(e) => setStdForm({...stdForm, lamBrillo: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BRILLO</label>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="font-bold text-white uppercase w-20">LADOS</span>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.lamTiro} onChange={(e) => setStdForm({...stdForm, lamTiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TIRO</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.lamRetiro} onChange={(e) => setStdForm({...stdForm, lamRetiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> RETIRO</label>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3 p-3 bg-slate-950/40 border border-slate-700 rounded-lg">
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <span className="font-bold text-white uppercase w-12">UV</span>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.uvMate} onChange={(e) => setStdForm({...stdForm, uvMate: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MATE</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.uvBrillo} onChange={(e) => setStdForm({...stdForm, uvBrillo: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BRILLO</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.uvTotal} onChange={(e) => setStdForm({...stdForm, uvTotal: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TOTAL</label>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <span className="font-bold text-white uppercase w-12">LADOS</span>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.uvTiro} onChange={(e) => setStdForm({...stdForm, uvTiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TIRO</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.uvRetiro} onChange={(e) => setStdForm({...stdForm, uvRetiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> RETIRO</label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={stdForm.uvSect} onChange={(e) => setStdForm({...stdForm, uvSect: e.target.checked})} className="accent-slate-700 w-4 h-4" /> SECT</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider">4. Área Troquelado</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <CheckInput checked={stdForm.troqTroquelado} onChange={(val) => setStdForm({...stdForm, troqTroquelado: val})} label="TROQUELADO" textValue={stdForm.troqTroqueladoText} onTextChange={(val) => setStdForm({...stdForm, troqTroqueladoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.troqMedioCorte} onChange={(val) => setStdForm({...stdForm, troqMedioCorte: val})} label="MEDIO CORTE" textValue={stdForm.troqMedioCorteText} onTextChange={(val) => setStdForm({...stdForm, troqMedioCorteText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.troqGrafado} onChange={(val) => setStdForm({...stdForm, troqGrafado: val})} label="GRAFADO" textValue={stdForm.troqGrafadoText} onTextChange={(val) => setStdForm({...stdForm, troqGrafadoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.troqDesprendible} onChange={(val) => setStdForm({...stdForm, troqDesprendible: val})} label="DESPRENDIBLE" textValue={stdForm.troqDesprendibleText} onTextChange={(val) => setStdForm({...stdForm, troqDesprendibleText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.troqOtros} onChange={(val) => setStdForm({...stdForm, troqOtros: val})} label="OTROS" textValue={stdForm.troqOtrosText} onTextChange={(val) => setStdForm({...stdForm, troqOtrosText: val})} placeholder="" />
                                                </div>
                                                <div className="flex flex-col gap-2 font-mono text-sm pt-2">
                                                    <span className="text-slate-200 uppercase font-bold">OBSERVACIONES:</span>
                                                    <textarea rows="2" value={stdForm.troqObs} onChange={(e) => setStdForm({...stdForm, troqObs: e.target.value})} className="border border-slate-700 rounded bg-slate-900 w-full p-2 focus:outline-none focus:border-amber-400 text-white resize-y mt-1" />
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider">5. Área Acabados Varios</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <CheckInput checked={stdForm.acabGrapado} onChange={(val) => setStdForm({...stdForm, acabGrapado: val})} label="GRAPADO" textValue={stdForm.acabGrapadoText} onTextChange={(val) => setStdForm({...stdForm, acabGrapadoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.acabNumerado} onChange={(val) => setStdForm({...stdForm, acabNumerado: val})} label="NUMERADO" textValue={stdForm.acabNumeradoText} onTextChange={(val) => setStdForm({...stdForm, acabNumeradoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.acabDoblado} onChange={(val) => setStdForm({...stdForm, acabDoblado: val})} label="DOBLADO" textValue={stdForm.acabDobladoText} onTextChange={(val) => setStdForm({...stdForm, acabDobladoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.acabAnillado} onChange={(val) => setStdForm({...stdForm, acabAnillado: val})} label="ANILLADO" textValue={stdForm.acabAnilladoText} onTextChange={(val) => setStdForm({...stdForm, acabAnilladoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.acabPerforado} onChange={(val) => setStdForm({...stdForm, acabPerforado: val})} label="PERFORADO" textValue={stdForm.acabPerforadoText} onTextChange={(val) => setStdForm({...stdForm, acabPerforadoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.acabPlastificado} onChange={(val) => setStdForm({...stdForm, acabPlastificado: val})} label="PLASTIFICADO" textValue={stdForm.acabPlastificadoText} onTextChange={(val) => setStdForm({...stdForm, acabPlastificadoText: val})} placeholder="" />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                                    <CheckInput checked={stdForm.acabOtros} onChange={(val) => setStdForm({...stdForm, acabOtros: val})} label="OTROS" textValue={stdForm.acabOtrosText} onTextChange={(val) => setStdForm({...stdForm, acabOtrosText: val})} placeholder="" />
                                                </div>
                                                <div className="flex flex-col gap-2 font-mono text-sm pt-2">
                                                    <span className="text-slate-200 uppercase font-bold">OBSERVACIONES:</span>
                                                    <textarea rows="2" value={stdForm.acabObs} onChange={(e) => setStdForm({...stdForm, acabObs: e.target.value})} className="border border-slate-700 rounded bg-slate-900 w-full p-2 focus:outline-none focus:border-amber-400 text-white resize-y mt-1" />
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider">6. Manufactura</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <CheckInput checked={stdForm.manfPegado} onChange={(val) => setStdForm({...stdForm, manfPegado: val})} label="PEGADO" textValue={stdForm.manfPegadoText} onTextChange={(val) => setStdForm({...stdForm, manfPegadoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.manfAcetato} onChange={(val) => setStdForm({...stdForm, manfAcetato: val})} label="ACETATO" textValue={stdForm.manfAcetatoText} onTextChange={(val) => setStdForm({...stdForm, manfAcetatoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.manfEmblocado} onChange={(val) => setStdForm({...stdForm, manfEmblocado: val})} label="EMBLOCADO" textValue={stdForm.manfEmblocadoText} onTextChange={(val) => setStdForm({...stdForm, manfEmblocadoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.manfCinta} onChange={(val) => setStdForm({...stdForm, manfCinta: val})} label="CINTA DOBLE FAZ" textValue={stdForm.manfCintaText} onTextChange={(val) => setStdForm({...stdForm, manfCintaText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.manfEnfajillado} onChange={(val) => setStdForm({...stdForm, manfEnfajillado: val})} label="ENFAJILLADO" textValue={stdForm.manfEnfajilladoText} onTextChange={(val) => setStdForm({...stdForm, manfEnfajilladoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.manfRefilado} onChange={(val) => setStdForm({...stdForm, manfRefilado: val})} label="REFILADO" textValue={stdForm.manfRefiladoText} onTextChange={(val) => setStdForm({...stdForm, manfRefiladoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.manfCordon} onChange={(val) => setStdForm({...stdForm, manfCordonText: val})} label="CORDÓN/CINTA" textValue={stdForm.manfCordonText} onTextChange={(val) => setStdForm({...stdForm, manfCordonText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.manfOtros} onChange={(val) => setStdForm({...stdForm, manfOtrosText: val})} label="OTROS" textValue={stdForm.manfOtrosText} onTextChange={(val) => setStdForm({...stdForm, manfOtrosText: val})} placeholder="" />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                                                    <CheckInput checked={stdForm.manfEmpacado} onChange={(val) => setStdForm({...stdForm, manfEmpacado: val})} label="EMPACADO" textValue={stdForm.manfEmpacadoText} onTextChange={(val) => setStdForm({...stdForm, manfEmpacadoText: val})} placeholder="" />
                                                    <CheckInput checked={stdForm.manfDistribucion} onChange={(val) => setStdForm({...stdForm, manfDistribucion: val})} label="DISTRIBUCIÓN" textValue={stdForm.manfDistribucionText} onTextChange={(val) => setStdForm({...stdForm, manfDistribucionText: val})} placeholder="" />
                                                </div>
                                                <div className="flex flex-col gap-2 font-mono text-sm pt-2">
                                                    <span className="text-slate-200 uppercase font-bold">OBSERVACIONES:</span>
                                                    <textarea rows="2" value={stdForm.manfObs} onChange={(e) => setStdForm({...stdForm, manfObs: e.target.value})} className="border border-slate-700 rounded bg-slate-900 w-full p-2 focus:outline-none focus:border-amber-400 text-white resize-y mt-1" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                                <h4 className="text-xs uppercase font-bold text-purple-400 tracking-wider">1. Impresión Directa - Cama Plana</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <CheckInput checked={wfForm.cpPvc} onChange={(val) => setWfForm({...wfForm, cpPvc: val})} label="PVC" textValue={wfForm.cpPvcText} onTextChange={(val) => setWfForm({...wfForm, cpPvcText: val})} placeholder="espesor" />
                                                    <CheckInput checked={wfForm.cpPlastipro} onChange={(val) => setWfForm({...wfForm, cpPlastipro: val})} label="PLASTIPRO" textValue={wfForm.cpPlastiproText} onTextChange={(val) => setWfForm({...wfForm, cpPlastiproText: val})} placeholder="espesor" />
                                                    <CheckInput checked={wfForm.cpFomecore} onChange={(val) => setWfForm({...wfForm, cpFomecore: val})} label="FOMECORE" textValue={wfForm.cpFomecoreText} onTextChange={(val) => setWfForm({...wfForm, cpFomecoreText: val})} placeholder="espesor" />
                                                    <CheckInput checked={wfForm.cpPoliestireno} onChange={(val) => setWfForm({...wfForm, cpPoliestirenoText: val})} label="POLIESTIRENO" textValue={wfForm.cpPoliestirenoText} onTextChange={(val) => setWfForm({...wfForm, cpPoliestirenoText: val})} placeholder="espesor" />
                                                    <CheckInput checked={wfForm.cpCorrugado} onChange={(val) => setWfForm({...wfForm, cpCorrugadoText: val})} label="C. CORRUGADO FLAUTA" textValue={wfForm.cpCorrugadoText} onTextChange={(val) => setWfForm({...wfForm, cpCorrugadoText: val})} placeholder="detalles" />
                                                    <CheckInput checked={wfForm.cpOtros} onChange={(val) => setWfForm({...wfForm, cpOtrosText: val})} label="OTROS" textValue={wfForm.cpOtrosText} onTextChange={(val) => setWfForm({...wfForm, cpOtrosText: val})} placeholder="detalles" />
                                                </div>
                                                <div className="flex gap-4 items-center pt-2 border-t border-slate-800 text-sm font-mono text-slate-200">
                                                    <span className="uppercase font-bold">PLIEGOS:</span>
                                                    <input type="text" value={wfForm.cpPliegos} onChange={(e) => setWfForm({...wfForm, cpPliegos: e.target.value})} className="bg-transparent border-b border-slate-500 text-white p-1 focus:outline-none focus:border-amber-400 w-32" />
                                                    <label className="flex items-center gap-1.5 cursor-pointer ml-4"><input type="checkbox" checked={wfForm.cpTiro} onChange={(e) => setWfForm({...wfForm, cpTiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TIRO</label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={wfForm.cpRetiro} onChange={(e) => setWfForm({...wfForm, cpRetiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> RETIRO</label>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/50 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-2">
                                                <div className="p-4 space-y-4 border-b md:border-b-0 md:border-r border-slate-800">
                                                    <h4 className="text-xs uppercase font-bold text-blue-400 tracking-wider text-center bg-slate-950/40 p-2 rounded">2. IMPRESIÓN PLOTTER</h4>
                                                    <div className="grid grid-cols-2 gap-4 text-sm font-mono text-slate-200">
                                                        <div className="space-y-3">
                                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.plotGalaxy160} onChange={(e) => setWfForm({...wfForm, plotGalaxy160: e.target.checked})} className="accent-slate-700 w-4 h-4" /> GALAXY 160</label>
                                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.plotGalaxy180} onChange={(e) => setWfForm({...wfForm, plotGalaxy180: e.target.checked})} className="accent-slate-700 w-4 h-4" /> GALAXY 180</label>
                                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.plotGalaxy320} onChange={(e) => setWfForm({...wfForm, plotGalaxy320: e.target.checked})} className="accent-slate-700 w-4 h-4" /> GALAXY 320</label>
                                                        </div>
                                                        <div className="space-y-2 border-l border-slate-700 pl-4">
                                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.plotMimaki} onChange={(e) => setWfForm({...wfForm, plotMimaki: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MIMAKI UJV 100</label>
                                                            <div className="pl-6 space-y-2">
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.mimakiCmyk} onChange={(e) => setWfForm({...wfForm, mimakiCmyk: e.target.checked})} className="accent-slate-700 w-4 h-4" /> CMYK</label>
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.mimakiClear} onChange={(e) => setWfForm({...wfForm, mimakiClear: e.target.checked})} className="accent-slate-700 w-4 h-4" /> CLEAR</label>
                                                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.mimakiBlanco} onChange={(e) => setWfForm({...wfForm, mimakiBlanco: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BLANCO</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-4 space-y-4">
                                                    <h4 className="text-xs uppercase font-bold text-blue-400 tracking-wider text-center bg-slate-950/40 p-2 rounded">SUSTRATOS</h4>
                                                    <div className="grid grid-cols-2 gap-2 text-sm font-mono text-slate-200">
                                                        <div className="space-y-2">
                                                            <CheckInput checked={wfForm.sustPvc} onChange={(val) => setWfForm({...wfForm, sustPvc: val})} label="PVC" textValue={wfForm.sustPvcText} onTextChange={(val) => setWfForm({...wfForm, sustPvcText: val})} placeholder="" />
                                                            <CheckInput checked={wfForm.sustCarton} onChange={(val) => setWfForm({...wfForm, sustCarton: val})} label="CARTON FLAUTA" textValue={wfForm.sustCartonText} onTextChange={(val) => setWfForm({...wfForm, sustCartonText: val})} placeholder="" />
                                                            <CheckInput checked={wfForm.sustFomecore} onChange={(val) => setWfForm({...wfForm, sustFomecoreText: val})} label="FOMECORE" textValue={wfForm.sustFomecoreText} onTextChange={(val) => setWfForm({...wfForm, sustFomecoreText: val})} placeholder="" />
                                                            <CheckInput checked={wfForm.sustPlastipro} onChange={(val) => setWfForm({...wfForm, sustPlastiproText: val})} label="PLASTIPRO" textValue={wfForm.sustPlastiproText} onTextChange={(val) => setWfForm({...wfForm, sustPlastiproText: val})} placeholder="" />
                                                            <div className="flex items-center gap-2 pt-2">
                                                                <span className="font-bold">PLIEGOS:</span>
                                                                <input type="text" value={wfForm.sustPliegos} onChange={(e) => setWfForm({...wfForm, sustPliegos: e.target.value})} className="border-b border-slate-500 bg-transparent flex-1 focus:outline-none text-white p-1" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3 pl-4 border-l border-slate-700">
                                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.sustTiro} onChange={(e) => setWfForm({...wfForm, sustTiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TIRO</label>
                                                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.sustRetiro} onChange={(e) => setWfForm({...wfForm, sustRetiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> RETIRO</label>
                                                            <CheckInput checked={wfForm.sustOtros} onChange={(val) => setWfForm({...wfForm, sustOtros: val})} label="OTROS" textValue={wfForm.sustOtrosText} onTextChange={(val) => setWfForm({...wfForm, sustOtrosText: val})} placeholder="" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col font-mono text-sm">
                                                <h4 className="text-xs uppercase font-bold text-cyan-400 tracking-wider text-center bg-slate-950/60 p-2 rounded-t-xl border-b border-slate-800">3. MATERIALES</h4>

                                                <div className="p-3 border-b border-slate-800 flex flex-wrap items-center gap-4 text-slate-200">
                                                    <label className="font-bold text-white flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded"><input type="checkbox" checked={wfForm.matLona} onChange={(e) => setWfForm({...wfForm, matLona: e.target.checked})} className="accent-amber-500 w-4 h-4" /> LONA</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lonaMate} onChange={(e) => setWfForm({...wfForm, lonaMate: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MATE</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lonaBrillo} onChange={(e) => setWfForm({...wfForm, lonaBrillo: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BRILLO</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lonaMesh} onChange={(e) => setWfForm({...wfForm, lonaMesh: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MESH</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lonaTraslucida} onChange={(e) => setWfForm({...wfForm, lonaTraslucida: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TRASLÚCIDA</label>
                                                    <div className="flex items-center gap-2 ml-auto"><span className="font-bold">ONZ</span> <input type="text" value={wfForm.lonaOnz} onChange={(e) => setWfForm({...wfForm, lonaOnz: e.target.value})} className="border-b border-slate-500 bg-transparent w-16 p-1 focus:outline-none text-white text-center" /></div>
                                                </div>

                                                <div className="p-3 border-b border-slate-800 flex flex-wrap items-center gap-4 text-slate-200">
                                                    <label className="font-bold text-white flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded"><input type="checkbox" checked={wfForm.matVinil} onChange={(e) => setWfForm({...wfForm, matVinil: e.target.checked})} className="accent-amber-500 w-4 h-4" /> VINIL</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.vinilMate} onChange={(e) => setWfForm({...wfForm, vinilMate: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MATE</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.vinilBrillo} onChange={(e) => setWfForm({...wfForm, vinilBrillo: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BRILLO</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.vinilTransp} onChange={(e) => setWfForm({...wfForm, vinilTransp: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TRANSPARENTE</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.vinilRemov} onChange={(e) => setWfForm({...wfForm, vinilRemov: e.target.checked})} className="accent-slate-700 w-4 h-4" /> REMOVIBLE</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.vinilMicro} onChange={(e) => setWfForm({...wfForm, vinilMicro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MICROPERFORADO</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.vinilBlock} onChange={(e) => setWfForm({...wfForm, vinilBlock: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BLOCK OUT</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.vinilFoto} onChange={(e) => setWfForm({...wfForm, vinilFoto: e.target.checked})} className="accent-slate-700 w-4 h-4" /> FOTOLUMINISCENTE</label>
                                                    <div className="flex items-center gap-2 mt-2 w-full"><span className="font-bold">OTRO:</span> <input type="text" value={wfForm.vinilOtro} onChange={(e) => setWfForm({...wfForm, otroOtroText: e.target.value})} className="border-b border-slate-500 bg-transparent flex-1 p-1 focus:outline-none text-white" /></div>
                                                </div>

                                                <div className="p-3 border-b border-slate-800 flex flex-wrap items-center gap-6 text-slate-200">
                                                    <label className="font-bold text-white flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded"><input type="checkbox" checked={wfForm.matLam} onChange={(e) => setWfForm({...wfForm, matLam: e.target.checked})} className="accent-amber-500 w-4 h-4" /> LAMINADO</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lamMate} onChange={(e) => setWfForm({...wfForm, lamMate: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MATE</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lamBrillo} onChange={(e) => setWfForm({...wfForm, lamBrillo: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BRILLO</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lamFloor} onChange={(e) => setWfForm({...wfForm, lamFloor: e.target.checked})} className="accent-slate-700 w-4 h-4" /> FLOORGRAPHIC</label>
                                                    <div className="border-l border-slate-600 pl-6 flex gap-4 ml-auto">
                                                        <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lamTiro} onChange={(e) => setWfForm({...wfForm, lamTiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TIRO</label>
                                                        <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.lamRetiro} onChange={(e) => setWfForm({...wfForm, lamRetiro: e.target.checked})} className="accent-slate-700 w-4 h-4" /> RETIRO</label>
                                                    </div>
                                                </div>

                                                <div className="p-3 flex flex-wrap items-center gap-4 text-slate-200">
                                                    <label className="font-bold text-white flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded"><input type="checkbox" checked={wfForm.matOtros} onChange={(e) => setWfForm({...wfForm, matOtros: e.target.checked})} className="accent-amber-500 w-4 h-4" /> OTROS</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.otroBlue} onChange={(e) => setWfForm({...wfForm, otroBlue: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BLUEBACK</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.otroBack} onChange={(e) => setWfForm({...wfForm, otroBack: e.target.checked})} className="accent-slate-700 w-4 h-4" /> BACKLIGHT</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.otroPet} onChange={(e) => setWfForm({...wfForm, otroPet: e.target.checked})} className="accent-slate-700 w-4 h-4" /> PET BANNER</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.otroTela} onChange={(e) => setWfForm({...wfForm, otroTela: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TELA</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.otroArenado} onChange={(e) => setWfForm({...wfForm, otroArenado: e.target.checked})} className="accent-slate-700 w-4 h-4" /> ARENADO</label>
                                                    <label className="flex items-center gap-1.5"><input type="checkbox" checked={wfForm.otroVinilCorte} onChange={(e) => setWfForm({...wfForm, otroVinilCorte: e.target.checked})} className="accent-slate-700 w-4 h-4" /> VINIL DE CORTE</label>
                                                    <div className="flex items-center gap-2 mt-2 w-full"><span className="font-bold">OTRO:</span> <input type="text" value={wfForm.otroOtroText} onChange={(e) => setWfForm({...wfForm, otroOtroText: e.target.value})} className="border-b border-slate-500 bg-transparent flex-1 p-1 focus:outline-none text-white" /></div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col font-mono text-sm">
                                                <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider text-center bg-slate-950/60 p-2 border-b border-slate-800">4. ACABADOS</h4>
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-800 text-slate-200">
                                                    <div className="space-y-3">
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.acabRefilado} onChange={(e) => setWfForm({...wfForm, acabRefilado: e.target.checked})} className="accent-slate-700 w-4 h-4" /> REFILADO</label>
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.acabMedioCorte} onChange={(e) => setWfForm({...wfForm, acabMedioCorte: e.target.checked})} className="accent-slate-700 w-4 h-4" /> MEDIO CORTE</label>
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.acabDoblado} onChange={(e) => setWfForm({...wfForm, acabDoblado: e.target.checked})} className="accent-slate-700 w-4 h-4" /> DOBLADO</label>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.acabTroquelado} onChange={(e) => setWfForm({...wfForm, acabTroquelado: e.target.checked})} className="accent-slate-700 w-4 h-4" /> TROQUELADO</label>
                                                        <CheckInput checked={wfForm.acabPegado} onChange={(val) => setWfForm({...wfForm, acabPegado: val})} label="PEGADO" textValue={wfForm.acabPegadoText} onTextChange={(val) => setWfForm({...wfForm, acabPegadoText: val})} placeholder="" />
                                                        <CheckInput checked={wfForm.acabOjales} onChange={(val) => setWfForm({...wfForm, acabOjales: val})} label="OJALES" textValue={wfForm.acabOjalesText} onTextChange={(val) => setWfForm({...wfForm, acabOjalesText: val})} placeholder="" />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.acabGrafado} onChange={(e) => setWfForm({...wfForm, acabGrafado: e.target.checked})} className="accent-slate-700 w-4 h-4" /> GRAFADO</label>
                                                        <CheckInput checked={wfForm.acabBolsillo} onChange={(val) => setWfForm({...wfForm, acabBolsillo: val})} label="BOLSILLO" textValue={wfForm.acabBolsilloText} onTextChange={(val) => setWfForm({...wfForm, acabBolsilloText: val})} placeholder="" />
                                                        <CheckInput checked={wfForm.acabOtro} onChange={(val) => setWfForm({...wfForm, acabOtro: val})} label="OTRO" textValue={wfForm.acabOtroText} onTextChange={(val) => setWfForm({...wfForm, acabOtroText: val})} placeholder="" />
                                                    </div>
                                                    <div className="col-span-full pt-1">
                                                        <CheckInput checked={wfForm.acabCinta} onChange={(val) => setWfForm({...wfForm, acabCintaText: val})} label="CINTA DOBLE FAZ" textValue={wfForm.acabCintaText} onTextChange={(val) => setWfForm({...wfForm, acabCintaText: val})} placeholder="" />
                                                    </div>
                                                    <div className="col-span-full flex flex-col gap-2 pt-1">
                                                        <span className="uppercase font-bold">OBSERVACIONES:</span>
                                                        <textarea rows="2" value={wfForm.acabObs} onChange={(e) => setWfForm({...wfForm, acabObs: e.target.value})} className="border border-slate-700 rounded bg-slate-900 w-full p-2 focus:outline-none focus:border-amber-400 text-white resize-y mt-1" />
                                                    </div>
                                                </div>

                                                <h4 className="text-xs uppercase font-bold text-emerald-400 tracking-wider text-center bg-slate-950/60 p-2 border-b border-slate-800">ENTREGA FINAL</h4>
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-200">
                                                    <CheckInput checked={wfForm.entEmpacado} onChange={(val) => setWfForm({...wfForm, entEmpacado: val})} label="EMPACADO" textValue={wfForm.entEmpacadoText} onTextChange={(val) => setWfForm({...wfForm, entEmpacadoText: val})} placeholder="" />
                                                    <CheckInput checked={wfForm.entEnfajillado} onChange={(val) => setWfForm({...wfForm, entEnfajillado: val})} label="ENFAJILLADO" textValue={wfForm.entEnfajilladoText} onTextChange={(val) => setWfForm({...wfForm, entEnfajilladoText: val})} placeholder="" />
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={wfForm.entDistribucion} onChange={(e) => setWfForm({...wfForm, entDistribucion: e.target.checked})} className="accent-slate-700 w-4 h-4" /> DISTRIBUCIÓN</label>
                                                    <label className="flex items-center gap-2 cursor-pointer text-amber-400 font-bold"><input type="checkbox" checked={wfForm.entInstalacion} onChange={(e) => setWfForm({...wfForm, entInstalacion: e.target.checked})} className="accent-amber-500 w-4 h-4" /> INSTALACIÓN</label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-2">
                                    <label className="block text-xs font-bold text-slate-300 uppercase">Observaciones o Notas de Producción / Indicaciones Adicionales</label>
                                    <textarea rows="3" placeholder="Instrucciones especiales para planta..." value={newFormData.notes} onChange={(e) => setNewFormData({...newFormData, notes: e.target.value})} className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500" />
                                </div>
                            </form>
                        </div>
                        <div className="p-4 md:p-5 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm cursor-pointer shadow">Cancelar</button>
                            <button type="submit" form="create-order-form" disabled={isSubmitting} className="px-7 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm md:text-base shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2">
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Crear Orden en Planta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL GESTIÓN DE PERSONAL */}
            {isUsersModalOpen && isGerente && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 md:p-6 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 md:p-5 flex justify-between items-center text-white shrink-0">
                            <h2 className="font-bold text-base md:text-lg flex items-center gap-2.5"><Users className="w-5 h-5 text-purple-400" /> Gestión de Personal y Accesos</h2>
                            <button onClick={() => { setIsUsersModalOpen(false); setUserFormData({ id: null, role: 'OPERADOR', name: '', email: '', cedula: '', telefono: '' }); setUserSearchTerm(''); }} className="text-slate-400 hover:text-white p-2 rounded-xl"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 md:p-7 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1 custom-scrollbar text-sm md:text-base">
                            <div>
                                <h3 className="font-bold text-xs md:text-sm uppercase tracking-wider text-slate-300 mb-3.5 pb-2 border-b border-slate-800 flex items-center gap-2">
                                    {userFormData.id ? <><Edit className="w-4 h-4 text-blue-400" /> Modificar Empleado</> : <><Plus className="w-4 h-4 text-blue-400" /> Registrar Nuevo Empleado</>}
                                </h3>
                                <form onSubmit={handleSaveUser} className="space-y-4">
                                    <div>
                                        <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1.5">Nombre Completo</label>
                                        <input required type="text" value={userFormData.name} onChange={(e) => setUserFormData({...userFormData, name: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm md:text-base text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1.5">Cédula de Identidad *</label>
                                            <div className="relative">
                                                <input required type="text" value={userFormData.cedula} onChange={(e) => setUserFormData({...userFormData, cedula: e.target.value})} placeholder="ej: 0912345678" className="w-full p-3 pr-16 bg-slate-950 border border-slate-800 rounded-xl text-sm md:text-base text-white focus:outline-none focus:border-blue-500 font-mono" />
                                                {userFormData.cedula && (
                                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${/^\d{10}$/.test(userFormData.cedula.trim()) ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {/^\d{10}$/.test(userFormData.cedula.trim()) ? '✓' : `${userFormData.cedula.trim().length}/10`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1.5">Celular / Teléfono</label>
                                            <div className="relative">
                                                <input type="tel" value={userFormData.telefono} onChange={(e) => setUserFormData({...userFormData, telefono: e.target.value})} placeholder="ej: 0991234567" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm md:text-base text-white focus:outline-none focus:border-blue-500 font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1.5">Correo Electrónico (Acceso ERP)</label>
                                        <input required type="email" value={userFormData.email} onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} placeholder="ej: usuario@wideformat.com.ec" className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm md:text-base text-white focus:outline-none focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1.5">Rol en Planta</label>
                                        <select value={userFormData.role} onChange={(e) => setUserFormData({...userFormData, role: e.target.value})} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm md:text-base font-bold text-white focus:outline-none focus:border-blue-500">
                                            <option value="VENTAS">Ventas</option>
                                            <option value="DISENO">Diseño (Pre-prensa)</option>
                                            <option value="BODEGA">Bodega</option>
                                            <option value="OPERADOR">Operador (Impresión)</option>
                                            <option value="ACABADOS">Acabados</option>
                                            <option value="MANUFACTURA">Manufactura</option>
                                            <option value="CHOFER">Chofer (Despacho / Instalación)</option>
                                            <option value="GERENCIA">Gerencia (Administrador)</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        {userFormData.id && (<button type="button" onClick={() => setUserFormData({ id: null, role: 'OPERADOR', name: '', email: '', cedula: '', telefono: '' })} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 rounded-xl text-xs md:text-sm cursor-pointer">Cancelar</button>)}
                                        <button type="submit" className={`flex-1 text-white font-bold py-3 rounded-xl text-xs md:text-sm shadow-md cursor-pointer ${userFormData.id ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'}`}>{userFormData.id ? 'Actualizar Datos' : 'Guardar Empleado'}</button>
                                    </div>
                                </form>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3.5 pb-2 border-b border-slate-800">
                                    <h3 className="font-bold text-xs md:text-sm uppercase tracking-wider text-slate-300">Personal Registrado ({filteredUsers.length})</h3>
                                </div>
                                <div className="relative mb-3.5">
                                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <input type="text" placeholder="Buscar por nombre, cédula, celular o rol..." value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm text-white focus:outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
                                    {filteredUsers.map(u => (
                                        <div key={u.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-800/80 bg-slate-950/60">
                                            <div className="truncate pr-2">
                                                <p className="font-bold text-sm md:text-base text-white truncate">{u.name || u.nombres}</p>
                                                <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-400 font-mono mt-0.5">
                                                    <span>C.I: {u.cedula || 'N/A'}</span>
                                                    {(u.celular || u.telefono) && (
                                                        <span className="text-emerald-400 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" /> {u.celular || u.telefono}
                                                        </span>
                                                    )}
                                                </div>
                                                {u.email && <p className="text-xs text-blue-400 truncate mt-0.5">{u.email}</p>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">{u.role || u.rol}</span>
                                                <button onClick={() => handleEditClick(u)} className="text-slate-400 hover:text-blue-400 p-2 rounded-lg hover:bg-slate-800 cursor-pointer" title="Editar"><Edit className="w-4 h-4" /></button>
                                                {u.email !== userEmail && (<button onClick={() => handleDeleteUser(u.id, u.name || u.nombres)} className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800 cursor-pointer" title="Revocar"><Trash2 className="w-4 h-4" /></button>)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL HISTORIAL */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 md:p-6 print:hidden animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl h-[88vh] max-h-[88vh] overflow-hidden flex flex-col">
                        <div className="bg-slate-950 border-b border-slate-800 p-4 md:p-5 flex justify-between items-center shrink-0">
                            <h2 className="font-bold text-base md:text-lg flex items-center gap-2"><History className="w-5 h-5 text-emerald-400" /> Registro Histórico de Planta</h2>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-xl cursor-pointer"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-4 custom-scrollbar text-sm md:text-base">
                            {completedOrders.length === 0 ? (<div className="text-center py-20 text-slate-500 text-sm">No hay órdenes completadas.</div>) : (
                                completedOrders.map(order => (
                                    <div key={order.id} onClick={() => { setSelectedOrder({ ...order, isLocked: true }); setIsHistoryModalOpen(false); setOrderModalTab('produccion'); }} className="bg-slate-950/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 md:p-5 space-y-2 cursor-pointer transition-all shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${order.type === 'Gran Formato' ? 'bg-purple-950 text-purple-300' : 'bg-cyan-950 text-cyan-300'}`}>{order.type}</span>
                                                <h3 className="font-bold text-white text-base md:text-lg mt-1.5">{order.client || order.cliente}</h3>
                                                <p className="text-xs md:text-sm text-slate-300">{order.product || order.producto} (ID: {order.id})</p>
                                                <p className="text-xs text-emerald-400 font-semibold mt-1">✓ Finalizado por {order.completedBy} el {order.completedAt} — <span className="underline">Haz clic para abrir ficha completa</span></p>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); showConfirm("Eliminar", `¿Desea eliminar del registro la orden ${order.id}?`, () => { setCompletedOrders(completedOrders.filter(o => o.id !== order.id)); closeDialog(); showToast("Registro eliminado"); }); }} className="text-slate-400 hover:text-red-400 p-2 rounded-xl hover:bg-slate-800 cursor-pointer" title="Eliminar registro"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2FA */}
            {is2FAModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                        <button onClick={() => setIs2FAModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 z-10 cursor-pointer"><X className="w-5 h-5" /></button>
                        <Setup2FA currentUser={currentUser} onClose={() => setIs2FAModalOpen(false)} />
                    </div>
                </div>
            )}

            {/* MODAL ZOOM DE IMÁGENES */}
            {zoomedImage && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
                    <div className="relative max-w-5xl w-full flex flex-col items-center">
                        <button onClick={() => setZoomedImage(null)} className="absolute top-2 right-2 text-white hover:text-red-400 p-2 z-50 bg-black/50 rounded-full cursor-pointer"><X className="w-6 h-6" /></button>
                        <img src={String(zoomedImage)} alt="Ampliada" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
                        <div className="mt-4"><a href={String(zoomedImage)} download="Evidencia_ERP.png" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm shadow-lg flex items-center gap-2"><Download className="w-4 h-4" /> Descargar Evidencia</a></div>
                    </div>
                </div>
            )}

            {/* DIÁLOGOS DE CONFIRMACIÓN */}
            {dialog.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl shadow-2xl w-full max-w-sm md:max-w-md overflow-hidden">
                        <div className={`p-4 md:p-5 flex gap-2 text-xs md:text-sm font-bold uppercase tracking-wider ${dialog.type === 'alert' ? 'bg-red-950 text-red-300 border-b border-red-900/60' : 'bg-slate-950 text-slate-200 border-b border-slate-800'}`}>{dialog.title}</div>
                        <div className="p-5 md:p-6">
                            <p className="text-xs md:text-sm mb-4 text-slate-300 leading-relaxed">{dialog.message}</p>
                            {dialog.type === 'prompt' && <textarea autoFocus className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm text-white mb-4 focus:outline-none focus:border-blue-500" rows="3" value={dialog.inputValue} onChange={(e) => setDialog({...dialog, inputValue: e.target.value})}/>}
                            <div className="flex justify-end gap-2.5">
                                {(dialog.type === 'confirm' || dialog.type === 'prompt') && <button onClick={closeDialog} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs md:text-sm font-bold rounded-xl text-slate-300 cursor-pointer">Cancelar</button>}
                                <button onClick={() => dialog.onConfirm(dialog.type === 'prompt' ? dialog.inputValue : undefined)} className={`px-5 py-2.5 text-white text-xs md:text-sm font-bold rounded-xl shadow cursor-pointer ${dialog.type === 'alert' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>{dialog.type === 'alert' ? 'Entendido' : 'Confirmar'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST FLOTANTE */}
            {toast.visible && <div className={`fixed bottom-20 md:bottom-6 right-1/2 translate-x-1/2 md:translate-x-0 md:right-6 z-[9999] flex items-center gap-2.5 px-5 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-xs md:text-sm border whitespace-nowrap ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-600/50 text-emerald-200' : 'bg-amber-950 border-amber-600/50 text-amber-200'}`}>{toast.message}</div>}

            {/* BARRA INFERIOR MOBILE */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex justify-around items-center p-2.5 z-30 pb-safe">
                <button onClick={() => setFilterMine(!filterMine)} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${filterMine ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>
                    <Eye className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Mis Órdenes</span>
                </button>
                <button onClick={() => setIsHistoryModalOpen(true)} className="flex flex-col items-center p-2 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors">
                    <History className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Historial</span>
                </button>
                {(userRole.toUpperCase() === 'VENTAS' || isGerente) && (
                    <button onClick={() => setIsModalOpen(true)} className="flex flex-col items-center -mt-8 bg-amber-500 p-4 rounded-full text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] border-4 border-slate-950">
                        <Plus className="w-6 h-6" />
                    </button>
                )}
                {isGerente && (
                    <button onClick={() => setIsUsersModalOpen(true)} className="flex flex-col items-center p-2 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
                        <Users className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Personal</span>
                    </button>
                )}
                <button onClick={handleSecureLogout} className="flex flex-col items-center p-2 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                    <LogOut className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Salir</span>
                </button>
            </div>
        </div>
    );
};

export default KanbanBoard;