/**
 * Blue Water - Archivo de Configuración Comercial Unificada
 * Este archivo centraliza los datos de la empresa para evitar discrepancias
 * en futuras actualizaciones.
 */

const BLUE_WATER_CONFIG = {
    // Configuración de Google Maps Platform
    // Coloque aquí su API Key restringida cuando la genere en Google Cloud Console.
    // Si se deja vacía (''), el sistema opera en modo respaldo interactivo (fallback)
    // informando al cliente y permitiéndole confirmar por WhatsApp sin interrumpir la venta.
    googleMaps: {
        apiKey: '',
        defaultCenter: {
            lat: 0.8117,
            lng: -77.7186
        },
        defaultZoom: 15,
        tulcanBounds: {
            north: 0.8450,
            south: 0.7800,
            east: -77.6850,
            west: -77.7550
        }
    },
    empresa: {
        nombre: 'Blue Water',
        ciudad: 'Tulcán',
        provincia: 'Carchi',
        pais: 'Ecuador',
        direccion: 'Avenida 20 de Mayo y antigua vía a El Ángel, Tulcán, Carchi, Ecuador',
        direccionCorta: 'Avenida 20 de Mayo y antigua vía a El Ángel, Tulcán',
        mapsQueryUrl: 'https://maps.google.com/?q=Avenida+20+de+Mayo+y+antigua+via+a+El+Angel+Tulcan+Ecuador'
    },
    contacto: {
        telefonoDisplay: '097 874 5607',
        whatsappNumber: '593978745607',
        whatsappLink: 'https://wa.me/593978745607'
    },
    tiempos: {
        entregaEstimada: 'de 1 a 2 horas',
        entregaTextoCompleto: 'Recibe tu pedido en un tiempo estimado de 1 a 2 horas, dependiendo de la ubicación y disponibilidad del servicio.'
    },
    // NOTA: Pendiente de confirmación entre Horario A y Horario B según solicitud del usuario.
    horarios: {
        horarioA: {
            lunesASabado: '07:00 – 17:00',
            domingos: '08:00 – 13:00'
        },
        horarioB: {
            lunesASabado: '07:30 – 18:30',
            domingos: '08:00 – 13:00'
        }
    },
    cobertura: {
        sectores: [
            'Centro',
            'Tajamar',
            'La Laguna',
            'Zona UPEC',
            'El Rosario',
            'Redondel del Manteño',
            'San José',
            'Sara Espíndola',
            'Terminal Terrestre'
        ]
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BLUE_WATER_CONFIG;
}
