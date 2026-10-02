import { useState, useEffect } from 'react';
import { Clock, AlertCircle, CheckCircle, X, Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const defaultOrders = [
    { id: 'WF-101', client: 'Coca Cola', material: 'Lona 13oz', size: '3x2m', status: 'Pre-prensa', assigned: 'Ana (Diseño)', urgent: false },
    { id: 'WF-102', client: 'Banco Pichincha', material: 'Vinil Adhesivo', size: '1x1m', status: 'Impresión', assigned: 'Carlos (Impresión)', urgent: true },
];

const columns = ['Pre-prensa', 'Impresión', 'Acabados', 'Despacho'];

const KanbanBoard = () => {
    // Cargar órdenes desde el localStorage si existen, de lo contrario usar las predeterminadas
    const [orders, setOrders] = useState(() => {
        const savedOrders = localStorage.getItem('wideformat_orders');
        return savedOrders ? JSON.parse(savedOrders) : defaultOrders;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newFormData, setNewFormData] = useState({ client: '', material: 'Lona 13oz', size: '', assigned: 'Ana (Diseño)', urgent: false });

    // Guardar en localStorage cada vez que las órdenes cambien
    useEffect(() => {
        localStorage.setItem('wideformat_orders', JSON.stringify(orders));
    }, [orders]);

    const onDragEnd = (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const updatedOrders = orders.map(order =>
            order.id === draggableId ? { ...order, status: destination.droppableId } : order
        );

        setOrders(updatedOrders);
    };

    const handleCreateOrder = (e) => {
        e.preventDefault();
        const newId = `WF-${Math.floor(Math.random() * 900) + 100}`;
        const newOrder = { id: newId, ...newFormData, status: 'Pre-prensa' };
        setOrders([...orders, newOrder]);
        setIsModalOpen(false);
        setNewFormData({ client: '', material: 'Lona 13oz', size: '', assigned: 'Ana (Diseño)', urgent: false });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-dark via-brand-primary/90 to-brand-dark p-4 md:p-8 relative">

            {/* Cabecera */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <img src="/logo.svg" alt="Wide Format" className="h-12 w-auto object-contain bg-white/10 backdrop-blur-sm p-2 rounded-lg" />
                    <div>
                        <h1 className="text-2xl font-bold text-white shadow-sm">Torre de Control de Producción</h1>
                        <p className="text-brand-accent font-medium">Órdenes Activas</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-brand-accent hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    Crear Nueva Orden
                </button>
            </div>

            {/* Contexto Global de Arrastrar y Soltar */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {columns.map(column => (

                        <Droppable droppableId={column} key={column}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`bg-slate-100 rounded-xl p-4 min-h-[500px] transition-colors ${snapshot.isDraggingOver ? 'bg-slate-200 ring-2 ring-brand-primary' : ''}`}
                                >
                                    <h2 className="font-bold text-slate-700 mb-4 flex justify-between items-center">
                                        {column}
                                        <span className="bg-white text-slate-500 text-xs py-1 px-2 rounded-full shadow-sm">
                      {orders.filter(o => o.status === column).length}
                    </span>
                                    </h2>

                                    <div className="space-y-4">
                                        {orders.filter(order => order.status === column).map((order, index) => (

                                            <Draggable draggableId={order.id} index={index} key={order.id}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`bg-white p-4 rounded-lg shadow-sm border-l-4 transition-all hover:shadow-md 
                              ${order.urgent ? 'border-red-500' : 'border-brand-primary'}
                              ${snapshot.isDragging ? 'shadow-xl rotate-2 opacity-90' : ''}
                            `}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="font-bold text-sm text-slate-800">{order.id}</span>
                                                            {order.urgent && <AlertCircle className="w-4 h-4 text-red-500" />}
                                                        </div>
                                                        <h3 className="font-bold text-brand-dark mb-1">{order.client}</h3>
                                                        <p className="text-xs text-slate-500 mb-3">{order.material} • {order.size}</p>

                                                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                                                            <Clock className="w-3 h-3" />
                                                            <span>{order.assigned}</span>
                                                        </div>

                                                        {column === 'Despacho' && (
                                                            <div className="mt-4 w-full flex items-center justify-center gap-2 bg-green-50 text-green-700 text-xs font-bold py-2 rounded">
                                                                <CheckCircle className="w-4 h-4" />
                                                                Listo para entrega
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </Draggable>

                                        ))}
                                        {provided.placeholder}
                                    </div>
                                </div>
                            )}
                        </Droppable>

                    ))}
                </div>
            </DragDropContext>

            {/* Modal de Nueva Orden */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-brand-dark p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold text-lg">Ingresar Nueva Orden</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Cliente</label>
                                <input required type="text" value={newFormData.client} onChange={(e) => setNewFormData({...newFormData, client: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-primary outline-none" placeholder="Ej. Pronaca" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
                                    <select value={newFormData.material} onChange={(e) => setNewFormData({...newFormData, material: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-primary outline-none">
                                        <option>Lona 13oz</option>
                                        <option>Vinil Adhesivo</option>
                                        <option>Microperforado</option>
                                        <option>Acrílico</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dimensiones</label>
                                    <input required type="text" value={newFormData.size} onChange={(e) => setNewFormData({...newFormData, size: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-primary outline-none" placeholder="Ej. 2x1.5m" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Asignar a (Pre-prensa)</label>
                                <select value={newFormData.assigned} onChange={(e) => setNewFormData({...newFormData, assigned: e.target.value})} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-brand-primary outline-none">
                                    <option>Ana (Diseño)</option>
                                    <option>Jorge (Pre-prensa)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <input type="checkbox" id="urgent" checked={newFormData.urgent} onChange={(e) => setNewFormData({...newFormData, urgent: e.target.checked})} className="w-4 h-4 text-brand-primary rounded" />
                                <label htmlFor="urgent" className="text-sm font-medium text-red-600">Marcar como trabajo urgente</label>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 bg-brand-primary hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors">Generar Ordenes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KanbanBoard;