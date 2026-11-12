import { LayoutDashboard, Users, Ticket, Award, Tv, Compass, BarChart3, Settings, QrCode } from 'lucide-react';

// Menú del Admin (escritorio: barra lateral; móvil: barra inferior + "Más")
export const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { page: 'resumen', label: 'Resumen', icon: LayoutDashboard, hint: 'Lo más importante de hoy' },
      { page: 'leads', label: 'Leads', icon: Users, hint: 'Personas registradas' },
      { page: 'canje', label: 'Canjear premios', icon: Ticket, hint: 'Entregar un premio' }
    ]
  },
  {
    label: 'Gestión',
    items: [
      { page: 'premios', label: 'Premios', icon: Award, hint: 'Stock y probabilidades' },
      { page: 'pantallas', label: 'Pantallas y videos', icon: Tv, hint: 'Qué se ve en el stand' },
      { page: 'qr', label: 'Códigos QR', icon: QrCode, hint: 'QR que cambian de destino' },
      { page: 'destinos', label: 'Destinos', icon: Compass, hint: 'Destinos soñados' }
    ]
  },
  {
    label: 'Análisis',
    items: [{ page: 'metricas', label: 'Métricas', icon: BarChart3, hint: 'Cifras por evento' }]
  },
  {
    label: 'Sistema',
    items: [{ page: 'ajustes', label: 'Ajustes', icon: Settings, hint: 'Feria, canales, notificaciones' }]
  }
];

// Accesos de la barra inferior en móvil (el resto va en "Más")
export const BOTTOM_ITEMS = ['resumen', 'leads', 'canje', 'premios'];
