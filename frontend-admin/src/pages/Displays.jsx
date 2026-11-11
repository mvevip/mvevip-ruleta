import React from 'react';
import { Tv, Mail } from 'lucide-react';
import { useAdmin, API_URL } from '../context/AdminContext';
import { PageHeader, EmptyState } from '../components/ui';
import DisplaysManager from '../components/DisplaysManager';

/** Pantallas y videos del frente elegido (el correo no tiene pantallas físicas). */
export default function Displays() {
  const { meta, group, getAdminHeaders, toast } = useAdmin();

  return (
    <div className="space-y-4 anim-fade-in">
      <PageHeader
        title="Pantallas y videos"
        icon={Tv}
        subtitle={`${meta.isFair ? `Feria de ${group.city}` : meta.title}: video de espera, QR, ruleta y carrusel de imágenes que se ven en el stand.`}
      />
      {meta.front === 'mail' ? (
        <EmptyState
          icon={Mail}
          title="El correo no tiene pantallas"
          text="La ruleta del correo se juega en el celular de cada persona. Elige Pantalla o Kiosco en el selector de arriba para ajustar lo que se ve en el stand."
        />
      ) : (
        <DisplaysManager
          key={meta.key}
          apiUrl={API_URL}
          getAdminHeaders={getAdminHeaders}
          stand={meta.key}
          standLabel={meta.title}
          screenPath={meta.screenPath}
          formPath={meta.formPath}
          onNotification={(msg) => toast(msg)}
        />
      )}
    </div>
  );
}
