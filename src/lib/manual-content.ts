/**
 * @fileOverview Contenido estructurado del Manual de Usuario de Dosimat Pro.
 * Este archivo es el "Manual Vivo" que se actualiza con cada cambio funcional.
 */

export interface ManualSection {
  id: string;
  title: string;
  description: string;
  steps: string[];
  tips?: string[];
}

export const MANUAL_CONTENT: ManualSection[] = [
  {
    id: "general",
    title: "Introducción a Dosimat Pro",
    description: "Dosimat Pro es una plataforma integral diseñada para la gestión operativa y financiera de empresas de mantenimiento de piscinas. Centraliza el control de clientes, la logística de reparto (hojas de ruta), el inventario técnico y el pago de honorarios al personal.",
    steps: [
      "Acceso Seguro: Ingresa con tu mail y contraseña autorizada.",
      "Dashboard: Visualiza de un vistazo tus saldos totales en pesos y dólares, además de las deudas pendientes de cobro.",
      "Vincular Dispositivo: En el menú lateral, usa el botón 'Vincular Dispositivo' para recibir alertas críticas en tu celular o PC."
    ]
  },
  {
    id: "customers",
    title: "Gestión de Clientes",
    description: "Tu cartera de clientes es el núcleo del sistema. Aquí controlas quiénes son, dónde están y cuánto te deben.",
    steps: [
      "Alta de Clientes: Registra nombre, dirección, zona y si es un cliente de reposición periódica.",
      "Equipos en Comodato: Marca si el cliente tiene un dosificador de la empresa para un seguimiento especial.",
      "Estado de Cuenta: Usa el icono del 'Recibo' para ver qué facturas debe un cliente. Puedes copiar este resumen para enviarlo por WhatsApp.",
      "Filtros de Deuda: Filtra rápidamente quiénes tienen saldo negativo para gestionar cobranzas."
    ],
    tips: [
      "Usa el botón de Google Maps para abrir la dirección exacta del cliente directamente en tu GPS.",
      "Si un cliente tiene saldo a favor, el sistema lo mostrará en color verde."
    ]
  },
  {
    id: "routes",
    title: "Logística y Hojas de Ruta",
    description: "Optimiza el reparto diario. El proceso se divide en tres estados claros: Planificación, En Camino y Finalizada.",
    steps: [
      "Planificación: El administrador selecciona qué clientes visitar y cuántos bidones de cloro/ácido se estima entregar.",
      "Carga de Camioneta: Usa el resumen de carga (cloro/ácido total) para preparar el vehículo antes de salir.",
      "En Camino: Al 'Iniciar Entrega', el repositor puede ver la lista en su móvil y completar las entregas reales y cobros realizados.",
      "Finalización: Al terminar el día, se cierra la jornada. Esto deja los datos listos para ser operados financieramente."
    ],
    tips: [
      "El repositor solo puede ver las rutas que están en estado 'En Camino'.",
      "Usa el botón de imprimir para entregarle al chofer una copia física de la hoja de ruta si fuera necesario."
    ]
  },
  {
    id: "transactions",
    title: "Operaciones y Finanzas",
    description: "Registro de toda la actividad económica del negocio.",
    steps: [
      "Ventas y Reposiciones: Registra la salida de productos. El sistema descuenta el stock y actualiza el saldo del cliente.",
      "Cobros: Registra el ingreso de dinero. Puedes 'Imputar' este pago a facturas específicas que el cliente deba.",
      "Gastos: Registra salidas de dinero por compras o servicios externos, clasificándolos por rubro.",
      "Ajustes: Úsalos para corregir saldos de clientes o cajas sin generar movimientos de stock."
    ],
    tips: [
      "Total Operación vs Movimiento de Caja: El primero es el valor facturado; el segundo es el efectivo real que entró/salió.",
      "Si el cliente no paga en el momento, el sistema genera automáticamente una deuda en su cuenta corriente."
    ]
  },
  {
    id: "payouts",
    title: "Liquidación de Honorarios",
    description: "Proceso para pagar al personal (Repositor / Comunicador) basado en su desempeño real.",
    steps: [
      "Configuración: En 'Equipo', define cuánto gana cada miembro por bidón, por hora o su sueldo base.",
      "Nueva Liquidación: Selecciona al colaborador y el rango de fechas. Marca las entregas que vas a pagar.",
      "Caja de Pago: Elige de qué caja sale el dinero del sueldo. El sistema restará el saldo y marcará las rutas como 'Liquidadas'.",
      "Reversión: Si cometes un error, puedes eliminar la liquidación y el sistema restaurará los saldos anteriores."
    ]
  },
  {
    id: "inventory",
    title: "Inventario y Producción",
    description: "Control de stock de productos simples y fabricados.",
    steps: [
      "Catálogo: Define precios en ARS y USD para cada producto.",
      "Productos Compuestos (BOM): Define qué insumos (tapas, etiquetas, etc.) componen un producto terminado.",
      "Plan de Armado: Crea una orden de producción. El sistema te dirá qué materiales te faltan comprar.",
      "Órdenes de Compra: Gestiona pedidos a proveedores para reponer materiales faltantes."
    ],
    tips: [
      "Al 'Finalizar Armado', el sistema descuenta automáticamente los insumos y suma el producto final al stock de forma inteligente."
    ]
  },
  {
    id: "templates",
    title: "Plantillas de Comunicación",
    description: "Personaliza tus mensajes de WhatsApp y Email para ahorrar tiempo.",
    steps: [
      "Marcadores: Usa {{Nombre}}, {{Saldo_ARS}} o {{Detalle_Items}} para que el sistema complete los datos del cliente automáticamente.",
      "Marcadores Dinámicos: Usa {{?Nombre de Dato}} para que el sistema te pregunte valores manuales al momento de enviar.",
      "Envío Masivo: Puedes enviar un mismo aviso a todos los clientes filtrados (ej: aviso de feriado o cambio de precios)."
    ]
  }
];
