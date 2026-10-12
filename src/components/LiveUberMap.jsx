import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LiveUberMap({ drivers = {}, selectedDriver = null, orders = [] }) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const routesRef = useRef({});
    const destMarkersRef = useRef({});
    const destRoutesRef = useRef({});
    const [isExpanded, setIsExpanded] = useState(false);

    // Extraer coordenadas de destino de la orden (soporta múltiples nomenclaturas de ERP)
    const getOrderDestinationCoords = (order) => {
        if (!order) return null;
        const lat = order.destLat || order.destinoLat || order.deliveryLat || order.latitud || order.lat;
        const lng = order.destLng || order.destinoLng || order.deliveryLng || order.longitud || order.lng;

        if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
            return [Number(lat), Number(lng)];
        }
        return null;
    };

    // Ajustar cámara para mostrar a toda la flota y sus destinos simultáneamente
    const handleFitAll = () => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const coords = [];

        // Coordenadas de los vehículos
        Object.values(drivers).forEach((d) => {
            if (d?.lat && d?.lng) coords.push([Number(d.lat), Number(d.lng)]);
        });

        // Coordenadas de los destinos activos
        Object.values(destMarkersRef.current).forEach((marker) => {
            if (marker) coords.push([marker.getLatLng().lat, marker.getLatLng().lng]);
        });

        if (coords.length === 1) {
            map.flyTo(coords[0], 16, { animate: true, duration: 1.2 });
        } else if (coords.length > 1) {
            map.fitBounds(coords, {
                padding: [70, 70],
                maxZoom: 16,
                animate: true,
                duration: 1.2
            });
        }
    };

    // Redimensionar el mapa al alternar pantalla completa
    useEffect(() => {
        if (mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
            }, 250);
        }
    }, [isExpanded]);

    // Inicializar mapa base
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView([-2.1894, -79.8891], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        mapInstanceRef.current = map;
    }, []);

    // Controlar marcadores de vehículos, metas (🏁) y rutas en vivo
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        const currentDriverNames = Object.keys(drivers);

        currentDriverNames.forEach((name) => {
            const data = drivers[name];
            if (!data?.lat || !data?.lng) return;

            const pos = [Number(data.lat), Number(data.lng)];

            // Buscar orden asignada en Despacho o En Ruta
            const order = orders.find((o) => {
                const assigned = (o.assignedTo || o.chofer || o.conductor || o.responsable || '').toLowerCase().trim();
                const isDriver = assigned === name.toLowerCase().trim() || assigned.includes(name.toLowerCase().trim());
                const status = (o.status || o.estado || '').toLowerCase().trim();
                const isDespacho = status === 'despacho' || status === 'en ruta' || status === 'entrega';
                return isDriver && isDespacho;
            });

            // 1. Popup del conductor
            const orderContent = order
                ? `
          <div style="margin-top:6px; padding-top:6px; border-top:1px solid #1e293b; font-size:11px;">
            <p style="margin:0; color:#38bdf8; font-weight:bold; font-family:monospace;">#${order.id || order.orderNumber || 'ORDEN'}</p>
            <p style="margin:2px 0 0; color:#cbd5e1;"><b>Cliente:</b> ${order.client || order.cliente || 'Consumidor Final'}</p>
            ${order.product ? `<p style="margin:2px 0 0; color:#94a3b8;"><b>Prod:</b> ${order.product}</p>` : ''}
            ${order.address || order.direccion ? `<p style="margin:2px 0 0; color:#64748b;"><b>Dir:</b> ${order.address || order.direccion}</p>` : ''}
          </div>
        `
                : '<p style="margin:4px 0 0; font-size:11px; color:#94a3b8;">Disponible / Sin orden asignada</p>';

            const popupHtml = `
        <div style="background:#020617; color:#f8fafc; padding:8px 12px; border-radius:10px; font-family:sans-serif; border:1px solid #10b981; min-width:190px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <span style="font-weight:bold; color:#34d399; font-size:13px;">🚚 ${name}</span>
            <span style="font-size:10px; background:rgba(16,185,129,0.15); color:#34d399; padding:1px 6px; border-radius:4px; font-family:monospace;">En vivo</span>
          </div>
          ${orderContent}
        </div>
      `;

            // 2. Marcador del vehículo (🚚)
            if (!markersRef.current[name]) {
                const truckIcon = L.divIcon({
                    className: 'custom-uber-pin',
                    html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 46px; height: 46px;">
              <div style="position: absolute; width: 42px; height: 42px; background: rgba(16, 185, 129, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 34px; height: 34px; background: #020617; border: 2.5px solid #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.85); font-size: 16px;">
                🚚
              </div>
            </div>
          `,
                    iconSize: [46, 46],
                    iconAnchor: [23, 23]
                });

                const marker = L.marker(pos, { icon: truckIcon })
                    .addTo(map)
                    .bindPopup(popupHtml);

                markersRef.current[name] = marker;

                // Historial de recorrido (Verde esmeralda)
                routesRef.current[name] = {
                    coords: [pos],
                    line: L.polyline([pos], {
                        color: '#10b981',
                        weight: 3.5,
                        opacity: 0.8,
                        dashArray: '6, 8',
                        lineCap: 'round'
                    }).addTo(map)
                };
            } else {
                const marker = markersRef.current[name];
                marker.setLatLng(pos);
                marker.setPopupContent(popupHtml);

                const routeData = routesRef.current[name];
                const lastPos = routeData.coords[routeData.coords.length - 1];
                if (!lastPos || lastPos[0] !== pos[0] || lastPos[1] !== pos[1]) {
                    routeData.coords.push(pos);
                    routeData.line.setLatLngs(routeData.coords);
                }
            }

            // 3. Marcador de Destino (🏁) y Ruta de Entrega (Cian)
            const destPos = getOrderDestinationCoords(order);

            if (destPos) {
                const destPopupHtml = `
          <div style="background:#020617; color:#f8fafc; padding:8px 12px; border-radius:10px; font-family:sans-serif; border:1px solid #38bdf8; min-width:200px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
              <span style="font-weight:bold; color:#38bdf8; font-size:13px;">🏁 Destino de Entrega</span>
              <span style="font-size:10px; background:rgba(56,189,248,0.15); color:#38bdf8; padding:1px 6px; border-radius:4px; font-family:monospace;">#${order.id || order.orderNumber || ''}</span>
            </div>
            <div style="margin-top:4px; font-size:11px;">
              <p style="margin:2px 0 0; color:#cbd5e1;"><b>Cliente:</b> ${order.client || order.cliente || 'Consumidor Final'}</p>
              <p style="margin:2px 0 0; color:#94a3b8;"><b>Dirección:</b> ${order.address || order.direccion || 'Ubicación registrada'}</p>
              ${order.product ? `<p style="margin:2px 0 0; color:#64748b;"><b>Producto:</b> ${order.product}</p>` : ''}
            </div>
          </div>
        `;

                if (!destMarkersRef.current[name]) {
                    const flagIcon = L.divIcon({
                        className: 'custom-destination-pin',
                        html: `
              <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
                <div style="position: absolute; width: 40px; height: 40px; background: rgba(56, 189, 248, 0.3); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: relative; width: 32px; height: 32px; background: #020617; border: 2.5px solid #38bdf8; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.85); font-size: 15px;">
                  🏁
                </div>
              </div>
            `,
                        iconSize: [44, 44],
                        iconAnchor: [22, 22]
                    });

                    const destMarker = L.marker(destPos, { icon: flagIcon })
                        .addTo(map)
                        .bindPopup(destPopupHtml);

                    destMarkersRef.current[name] = destMarker;

                    // Trazado de ruta hacia el destino
                    destRoutesRef.current[name] = L.polyline([pos, destPos], {
                        color: '#38bdf8',
                        weight: 3.5,
                        opacity: 0.9,
                        dashArray: '8, 8',
                        lineCap: 'round'
                    }).addTo(map);
                } else {
                    destMarkersRef.current[name].setLatLng(destPos);
                    destMarkersRef.current[name].setPopupContent(destPopupHtml);
                    destRoutesRef.current[name].setLatLngs([pos, destPos]);
                }
            } else {
                // Si la orden ya no tiene destino asignado o cambió de estado, retirar pin y línea
                if (destMarkersRef.current[name]) {
                    destMarkersRef.current[name].remove();
                    delete destMarkersRef.current[name];
                }
                if (destRoutesRef.current[name]) {
                    destRoutesRef.current[name].remove();
                    delete destRoutesRef.current[name];
                }
            }
        });

        // Limpieza de choferes desconectados
        Object.keys(markersRef.current).forEach((name) => {
            if (!drivers[name]) {
                markersRef.current[name].remove();
                delete markersRef.current[name];

                if (routesRef.current[name]) {
                    routesRef.current[name].line.remove();
                    delete routesRef.current[name];
                }
                if (destMarkersRef.current[name]) {
                    destMarkersRef.current[name].remove();
                    delete destMarkersRef.current[name];
                }
                if (destRoutesRef.current[name]) {
                    destRoutesRef.current[name].remove();
                    delete destRoutesRef.current[name];
                }
            }
        });
    }, [drivers, orders]);

    // Enfoque dinámico al seleccionar un chofer
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !selectedDriver || !drivers[selectedDriver]) return;

        const driverPos = [
            Number(drivers[selectedDriver].lat),
            Number(drivers[selectedDriver].lng)
        ];

        const destMarker = destMarkersRef.current[selectedDriver];

        // Si tiene destino asignado, encuadrar ambos puntos; si no, enfocar el vehículo
        if (destMarker) {
            const destPos = [destMarker.getLatLng().lat, destMarker.getLatLng().lng];
            map.fitBounds([driverPos, destPos], {
                padding: [80, 80],
                maxZoom: 16,
                animate: true,
                duration: 1.4
            });
        } else {
            map.flyTo(driverPos, 16, {
                animate: true,
                duration: 1.4
            });
        }

        if (markersRef.current[selectedDriver]) {
            markersRef.current[selectedDriver].openPopup();
        }
    }, [selectedDriver, drivers]);

    return (
        <div
            className={`transition-all duration-300 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 ${
                isExpanded
                    ? 'fixed inset-3 z-[9999] border-emerald-500/60 shadow-[0_0_60px_rgba(0,0,0,0.9)]'
                    : 'relative w-full'
            }`}
        >
            <style>{`
        .uber-night-map .leaflet-tile {
          filter: brightness(0.7) invert(1) contrast(2.4) hue-rotate(205deg) saturate(0.25) brightness(0.85) !important;
        }
      `}</style>

            {/* Controles de cabecera */}
            <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
                <div className="bg-slate-900/90 backdrop-blur border border-emerald-500/30 px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-xs font-semibold text-emerald-400 font-mono uppercase tracking-wider">
                        {Object.keys(drivers).length} Vehículo(s) en Línea
                    </span>
                </div>

                {Object.keys(drivers).length > 0 && (
                    <button
                        type="button"
                        onClick={handleFitAll}
                        className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/50 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Encuadrar todos los vehículos y sus destinos"
                    >
                        <span>🗺️ Ver Flota</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                    <span>{isExpanded ? '🗗 Reducir' : '⛶ Pantalla Completa'}</span>
                </button>
            </div>

            <div
                ref={mapContainerRef}
                className="uber-night-map"
                style={{
                    height: isExpanded ? 'calc(100vh - 24px)' : 'calc(100vh - 210px)',
                    minHeight: '640px',
                    width: '100%'
                }}
            />
        </div>
    );
}