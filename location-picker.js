/**
 * Blue Water - Módulo de Selector de Ubicación en Google Maps y Geolocalización
 * Arquitectura modular y responsive para checkout en hogares.html y restaurantes.html
 */

class BlueWaterLocationPicker {
    constructor(options = {}) {
        this.containerId = options.containerId || 'bw-map-selector-container';
        this.onLocationConfirmed = options.onLocationConfirmed || function() {};
        this.onLocationCleared = options.onLocationCleared || function() {};
        
        // Configuración geográfica (Tulcán por defecto)
        const cfgMaps = (typeof BLUE_WATER_CONFIG !== 'undefined' && BLUE_WATER_CONFIG.googleMaps) ? BLUE_WATER_CONFIG.googleMaps : {};
        this.apiKey = cfgMaps.apiKey || '';
        this.defaultCenter = cfgMaps.defaultCenter || { lat: 0.8117, lng: -77.7186 };
        this.defaultZoom = cfgMaps.defaultZoom || 15;
        this.bounds = cfgMaps.tulcanBounds || {
            north: 0.8450,
            south: 0.7800,
            east: -77.6850,
            west: -77.7550
        };

        // Estado interno
        this.map = null;
        this.marker = null;
        this.autocomplete = null;
        this.currentCoords = null; // { lat, lng } temporal
        this.confirmedCoords = null; // { lat, lng } confirmado
        this.isMapVisible = false;
        this.isGoogleMapsLoaded = false;
        this.isGoogleMapsAvailable = false;
        this.isLocating = false;
        this.geoFallbackMode = false;

        this.initDOM();
    }

    initDOM() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="bw-location-picker">
                <!-- Botonera Inicial de Selección -->
                <div class="bw-location-actions" id="${this.containerId}-actions">
                    <button type="button" class="bw-btn-location bw-btn-geo" id="${this.containerId}-btn-geo">
                        <i class="fas fa-crosshairs"></i>
                        <span>Usar mi ubicación actual</span>
                    </button>
                    <button type="button" class="bw-btn-location bw-btn-map" id="${this.containerId}-btn-map">
                        <i class="fas fa-map-marked-alt"></i>
                        <span>Seleccionar en el mapa</span>
                    </button>
                </div>

                <!-- Alertas y Mensajes de Estado -->
                <div class="bw-location-alert" id="${this.containerId}-alert" style="display: none;"></div>

                <!-- Panel del Mapa Interactivo (oculto inicialmente) -->
                <div class="bw-map-wrapper" id="${this.containerId}-map-wrapper" style="display: none;">
                    <div class="bw-map-toolbar">
                        <div class="bw-map-search-box">
                            <i class="fas fa-search"></i>
                            <input type="text" id="${this.containerId}-search" class="bw-map-search-input" placeholder="Buscar calle, barrio o lugar en Tulcán..." autocomplete="off">
                            <button type="button" class="bw-map-search-clear" id="${this.containerId}-search-clear" style="display:none;" title="Limpiar búsqueda">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <button type="button" class="bw-map-btn-recenter" id="${this.containerId}-btn-recenter" title="Centrar en mi ubicación">
                            <i class="fas fa-location-arrow"></i>
                        </button>
                    </div>

                    <!-- Contenedor Real del Mapa Google -->
                    <div id="${this.containerId}-map-canvas" class="bw-map-canvas">
                        <div class="bw-map-loading">
                            <i class="fas fa-circle-notch fa-spin"></i>
                            <span>Cargando mapa interactivo...</span>
                        </div>
                    </div>

                    <!-- Panel de Coordenadas y Confirmación dentro del Mapa -->
                    <div class="bw-map-footer">
                        <div class="bw-coords-preview">
                            <i class="fas fa-map-pin" style="color: #38bdf8;"></i>
                            <span id="${this.containerId}-coords-text">Mueve el mapa o el marcador para fijar el punto exacto.</span>
                        </div>
                        <div class="bw-map-footer-btns">
                            <button type="button" class="bw-btn-cancel-map" id="${this.containerId}-btn-cancel">
                                Cancelar
                            </button>
                            <button type="button" class="bw-btn-confirm-location" id="${this.containerId}-btn-confirm">
                                <i class="fas fa-check-circle"></i>
                                <span>Confirmar ubicación</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Caja de Estado: Ubicación Confirmada -->
                <div class="bw-location-confirmed-box" id="${this.containerId}-confirmed-box" style="display: none;">
                    <div class="bw-confirmed-badge">
                        <div class="bw-confirmed-icon">
                            <i class="fas fa-check"></i>
                        </div>
                        <div class="bw-confirmed-text">
                            <strong>Ubicación de entrega seleccionada</strong>
                            <span id="${this.containerId}-confirmed-coords-label">Lat: 0.000000, Lng: 0.000000</span>
                        </div>
                    </div>
                    <button type="button" class="bw-btn-modify-location" id="${this.containerId}-btn-modify">
                        <i class="fas fa-pen"></i>
                        <span>Modificar ubicación</span>
                    </button>
                </div>
            </div>
        `;

        // Referencias directas
        this.btnGeo = document.getElementById(`${this.containerId}-btn-geo`);
        this.btnMap = document.getElementById(`${this.containerId}-btn-map`);
        this.actionsContainer = document.getElementById(`${this.containerId}-actions`);
        this.alertBox = document.getElementById(`${this.containerId}-alert`);
        this.mapWrapper = document.getElementById(`${this.containerId}-map-wrapper`);
        this.mapCanvas = document.getElementById(`${this.containerId}-map-canvas`);
        this.searchInput = document.getElementById(`${this.containerId}-search`);
        this.searchClear = document.getElementById(`${this.containerId}-search-clear`);
        this.btnRecenter = document.getElementById(`${this.containerId}-btn-recenter`);
        this.coordsText = document.getElementById(`${this.containerId}-coords-text`);
        this.btnConfirm = document.getElementById(`${this.containerId}-btn-confirm`);
        this.btnCancel = document.getElementById(`${this.containerId}-btn-cancel`);
        this.confirmedBox = document.getElementById(`${this.containerId}-confirmed-box`);
        this.confirmedLabel = document.getElementById(`${this.containerId}-confirmed-coords-label`);
        this.btnModify = document.getElementById(`${this.containerId}-btn-modify`);

        this.bindEvents();
    }

    bindEvents() {
        this.btnGeo.addEventListener('click', () => this.handleGeolocationClick());
        this.btnMap.addEventListener('click', () => this.openManualMap());
        this.btnConfirm.addEventListener('click', () => this.confirmCurrentLocation());
        this.btnCancel.addEventListener('click', () => this.cancelMapSelection());
        this.btnModify.addEventListener('click', () => this.modifyLocation());
        this.btnRecenter.addEventListener('click', () => this.handleGeolocationClick(true));

        this.searchClear.addEventListener('click', () => {
            this.searchInput.value = '';
            this.searchClear.style.display = 'none';
            this.searchInput.focus();
        });

        this.searchInput.addEventListener('input', () => {
            this.searchClear.style.display = this.searchInput.value ? 'block' : 'none';
        });

        // Prevenir envío involuntario de formulario al pulsar Enter en el input de búsqueda del mapa
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    showAlert(message, type = 'info', persistent = false) {
        this.alertBox.className = `bw-location-alert bw-alert-${type}`;
        this.alertBox.innerHTML = message;
        this.alertBox.style.display = 'flex';

        if (!persistent && type !== 'warning' && type !== 'danger') {
            setTimeout(() => {
                if (this.alertBox.innerHTML === message) {
                    this.alertBox.style.display = 'none';
                }
            }, 6000);
        }
    }

    clearAlert() {
        this.alertBox.style.display = 'none';
        this.alertBox.innerHTML = '';
    }

    /**
     * Carga asíncrona de Google Maps API (solo bajo demanda)
     */
    loadGoogleMapsAPI() {
        return new Promise((resolve) => {
            // Si ya está en ventana global
            if (window.google && window.google.maps) {
                this.isGoogleMapsLoaded = true;
                this.isGoogleMapsAvailable = true;
                return resolve(true);
            }

            // Si no hay API Key configurada
            if (!this.apiKey || this.apiKey.trim() === '' || this.apiKey === 'TU_API_KEY_AQUI') {
                this.isGoogleMapsAvailable = false;
                return resolve(false);
            }

            // Si ya hay un script cargándose
            const existingScript = document.getElementById('bw-google-maps-script');
            if (existingScript) {
                existingScript.addEventListener('load', () => {
                    this.isGoogleMapsLoaded = true;
                    this.isGoogleMapsAvailable = true;
                    resolve(true);
                });
                existingScript.addEventListener('error', () => {
                    this.isGoogleMapsAvailable = false;
                    resolve(false);
                });
                return;
            }

            // Inyectar script con libraries=places
            const script = document.createElement('script');
            script.id = 'bw-google-maps-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(this.apiKey)}&libraries=places&language=es&region=EC`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                this.isGoogleMapsLoaded = true;
                this.isGoogleMapsAvailable = true;
                resolve(true);
            };
            script.onerror = () => {
                this.isGoogleMapsAvailable = false;
                resolve(false);
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Inicialización del objeto google.maps.Map
     */
    async initMapInstance(initialCoords = null) {
        const isLoaded = await this.loadGoogleMapsAPI();
        
        if (!isLoaded || !window.google || !window.google.maps) {
            this.handleMapUnavailable(initialCoords);
            return false;
        }

        const centerPos = initialCoords || this.confirmedCoords || this.defaultCenter;

        try {
            if (!this.map) {
                this.map = new google.maps.Map(this.mapCanvas, {
                    center: centerPos,
                    zoom: this.defaultZoom,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: true,
                    zoomControl: true,
                    styles: [
                        { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
                        { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
                        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6f9ba5" }] },
                        { featureType: "road", elementType: "geometry", stylers: [{ color: "#304a7d" }] },
                        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#98a5be" }] },
                        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] }
                    ]
                });

                // Crear marcador arrastrable
                this.marker = new google.maps.Marker({
                    position: centerPos,
                    map: this.map,
                    draggable: true,
                    title: "Punto de entrega en Tulcán",
                    animation: google.maps.Animation.DROP
                });

                // Eventos del marcador y del mapa
                this.marker.addListener('dragend', (e) => {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    this.setCurrentCoords({ lat, lng }, "Marcador ajustado manualmente");
                });

                this.map.addListener('click', (e) => {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    this.marker.setPosition(e.latLng);
                    this.setCurrentCoords({ lat, lng }, "Punto seleccionado en el mapa");
                });

                // Autocompletado de lugares acotado a Tulcán
                if (google.maps.places) {
                    const defaultBounds = new google.maps.LatLngBounds(
                        new google.maps.LatLng(this.bounds.south, this.bounds.west),
                        new google.maps.LatLng(this.bounds.north, this.bounds.east)
                    );

                    this.autocomplete = new google.maps.places.Autocomplete(this.searchInput, {
                        bounds: defaultBounds,
                        componentRestrictions: { country: 'ec' },
                        fields: ['geometry', 'name', 'formatted_address'],
                        strictBounds: false
                    });

                    this.autocomplete.addListener('place_changed', () => {
                        const place = this.autocomplete.getPlace();
                        if (!place.geometry || !place.geometry.location) {
                            this.showAlert("No encontramos detalles del lugar buscado. Por favor intenta seleccionar el punto en el mapa.", "warning");
                            return;
                        }

                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        const pos = { lat, lng };

                        this.map.setCenter(pos);
                        this.map.setZoom(17);
                        this.marker.setPosition(pos);
                        this.setCurrentCoords(pos, place.name || "Dirección encontrada en Tulcán");
                    });
                }
            } else {
                this.map.setCenter(centerPos);
                this.marker.setPosition(centerPos);
            }

            this.setCurrentCoords(centerPos, initialCoords ? "Ubicación detectada por GPS (por favor confirma o ajusta si es necesario)" : "Ubicación en Tulcán");
            
            // Refrescar tamaño tras visibilidad
            setTimeout(() => {
                if (this.map && google.maps.event) {
                    google.maps.event.trigger(this.map, 'resize');
                    this.map.setCenter(centerPos);
                }
            }, 200);

            return true;
        } catch (err) {
            console.error("Error al inicializar Google Maps:", err);
            this.handleMapUnavailable(initialCoords);
            return false;
        }
    }

    /**
     * Fallback cuando Google Maps no está disponible o no tiene API Key
     */
    handleMapUnavailable(initialCoords = null) {
        this.isGoogleMapsAvailable = false;
        this.geoFallbackMode = true;

        if (initialCoords) {
            this.currentCoords = initialCoords;
            this.mapCanvas.innerHTML = `
                <div class="bw-map-fallback">
                    <div class="bw-fallback-icon"><i class="fas fa-satellite-dish"></i></div>
                    <h4>Coordenadas obtenidas mediante GPS</h4>
                    <p>Latitud: <code>${initialCoords.lat.toFixed(6)}</code> | Longitud: <code>${initialCoords.lng.toFixed(6)}</code></p>
                    <small>El visor gráfico de mapa interactivo está en modo respaldo. Puedes confirmar estas coordenadas directamente para tu pedido.</small>
                </div>
            `;
            this.coordsText.innerHTML = `GPS: <code>${initialCoords.lat.toFixed(5)}, ${initialCoords.lng.toFixed(5)}</code>`;
            this.mapWrapper.style.display = 'block';
        } else {
            this.mapCanvas.innerHTML = `
                <div class="bw-map-fallback">
                    <div class="bw-fallback-icon"><i class="fas fa-info-circle"></i></div>
                    <h4>Servicio de mapa interactivo temporalmente en espera</h4>
                    <p>Puedes continuar ingresando tu <strong>Dirección escrita</strong> y una <strong>Referencia</strong> en el formulario.</p>
                    <small>Nuestro equipo de Blue Water confirmará la ubicación exacta directamente contigo por WhatsApp al recibir el pedido.</small>
                </div>
            `;
            this.coordsText.innerHTML = `Modo contingencia sin mapa gráfico.`;
            this.mapWrapper.style.display = 'block';
            this.showAlert("El servicio de mapa gráfico no está disponible actualmente. Puedes continuar con tu dirección escrita y te contactaremos por WhatsApp.", "warning", true);
        }
    }

    /**
     * Acción: Usar mi ubicación actual
     */
    handleGeolocationClick(isRecenter = false) {
        if (!navigator.geolocation) {
            this.showAlert("Tu navegador o dispositivo no soporta geolocalización automática. Por favor utiliza «Seleccionar en el mapa».", "warning");
            return;
        }

        // Feedback de carga
        const targetBtn = isRecenter ? this.btnRecenter : this.btnGeo;
        const originalContent = targetBtn.innerHTML;
        targetBtn.disabled = true;
        targetBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Detectando ubicación...</span>`;
        this.clearAlert();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                targetBtn.disabled = false;
                targetBtn.innerHTML = originalContent;

                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                this.openMapWrapper();
                await this.initMapInstance(coords);

                this.showAlert("📍 Ubicación detectada. Por favor verifica que el marcador corresponda a tu casa o local y presiona <strong>«Confirmar ubicación»</strong>.", "info");
            },
            (error) => {
                targetBtn.disabled = false;
                targetBtn.innerHTML = originalContent;

                let msg = "No pudimos obtener tu ubicación actual. ";
                if (error.code === error.PERMISSION_DENIED) {
                    msg += "No autorizaste el permiso de ubicación en el navegador. Por favor selecciona tu punto manualmente con el botón <strong>«Seleccionar en el mapa»</strong>.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    msg += "La señal GPS no está disponible en este momento. Por favor selecciona tu ubicación en el mapa.";
                } else if (error.code === error.TIMEOUT) {
                    msg += "Se agotó el tiempo de espera para obtener las coordenadas. Por favor intenta de nuevo o selecciona en el mapa.";
                } else {
                    msg += "Por favor selecciona tu ubicación en el mapa manualmente.";
                }
                this.showAlert(msg, "warning", true);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    /**
     * Acción: Seleccionar en el mapa manualmente
     */
    async openManualMap() {
        this.clearAlert();
        this.openMapWrapper();
        const startPos = this.confirmedCoords || this.defaultCenter;
        await this.initMapInstance(startPos);
    }

    openMapWrapper() {
        this.mapWrapper.style.display = 'block';
        this.actionsContainer.style.display = 'none';
        this.confirmedBox.style.display = 'none';
    }

    setCurrentCoords(coords, label = "") {
        this.currentCoords = {
            lat: Number(coords.lat),
            lng: Number(coords.lng)
        };
        const latFmt = this.currentCoords.lat.toFixed(6);
        const lngFmt = this.currentCoords.lng.toFixed(6);
        this.coordsText.innerHTML = `Punto seleccionado: <code>${latFmt}, ${lngFmt}</code> ${label ? `<br><small style="color: #94a3b8;">${label}</small>` : ''}`;
    }

    /**
     * Confirmar ubicación
     */
    confirmCurrentLocation() {
        // En fallback sin coordenadas
        if (this.geoFallbackMode && !this.currentCoords) {
            this.confirmedCoords = null;
            this.mapWrapper.style.display = 'none';
            this.actionsContainer.style.display = 'flex';
            this.onLocationConfirmed(null, true); // true = fallback mode
            return;
        }

        if (!this.currentCoords) {
            this.showAlert("Por favor selecciona un punto en el mapa antes de confirmar.", "warning");
            return;
        }

        this.confirmedCoords = { ...this.currentCoords };
        this.mapWrapper.style.display = 'none';
        this.actionsContainer.style.display = 'none';
        this.confirmedBox.style.display = 'flex';

        this.confirmedLabel.textContent = `Lat: ${this.confirmedCoords.lat.toFixed(6)}, Lng: ${this.confirmedCoords.lng.toFixed(6)}`;
        this.clearAlert();

        // Notificar callback al formulario padre
        this.onLocationConfirmed(this.confirmedCoords, false);
    }

    cancelMapSelection() {
        this.mapWrapper.style.display = 'none';
        if (this.confirmedCoords) {
            this.confirmedBox.style.display = 'flex';
            this.actionsContainer.style.display = 'none';
        } else {
            this.confirmedBox.style.display = 'none';
            this.actionsContainer.style.display = 'flex';
        }
        this.clearAlert();
    }

    /**
     * Modificar ubicación ya confirmada
     */
    modifyLocation() {
        this.confirmedBox.style.display = 'none';
        this.openManualMap();
    }

    /**
     * Reseteo cuando se cambia a Retiro en Planta o se limpia el formulario
     */
    reset() {
        this.currentCoords = null;
        this.confirmedCoords = null;
        if (this.mapWrapper) this.mapWrapper.style.display = 'none';
        if (this.confirmedBox) this.confirmedBox.style.display = 'none';
        if (this.actionsContainer) this.actionsContainer.style.display = 'flex';
        if (this.alertBox) {
            this.alertBox.style.display = 'none';
            this.alertBox.innerHTML = '';
        }
        if (this.searchInput) this.searchInput.value = '';
        this.onLocationCleared();
    }

    /**
     * Obtiene el enlace de Google Maps en el formato exacto requerido:
     * https://www.google.com/maps?q=LATITUD,LONGITUD
     */
    getGoogleMapsUrl() {
        if (!this.confirmedCoords) return '';
        return `https://www.google.com/maps?q=${this.confirmedCoords.lat.toFixed(6)},${this.confirmedCoords.lng.toFixed(6)}`;
    }

    hasConfirmedLocation() {
        return !!this.confirmedCoords;
    }
}

if (typeof window !== 'undefined') {
    window.BlueWaterLocationPicker = BlueWaterLocationPicker;
}
