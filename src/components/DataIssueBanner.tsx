import { AlertTriangle, ShieldAlert, WifiOff, DatabaseZap, HelpCircle } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

// Derived from the same config src/lib/firebase.ts initializes from, instead
// of a hardcoded project/database id — the project switched once already
// (personal project → team's, now back to a new personal one), and a
// hardcoded id here silently pointed these console links at the wrong
// project through that whole migration.
const FIREBASE_CONSOLE = `https://console.firebase.google.com/project/${firebaseConfig.projectId}`;
// The console's URL slug for the default database is "-default-", not the
// literal "(default)" the SDK itself expects — the two names diverge here.
const consoleDatabaseId = firebaseConfig.firestoreDatabaseId === '(default)' ? '-default-' : firebaseConfig.firestoreDatabaseId;
const FIRESTORE_PATH = `firestore/databases/${consoleDatabaseId}`;

export type DataIssueKind = 'quota' | 'permissions' | 'network' | 'index' | 'unknown';

export interface DataIssue {
  kind: DataIssueKind;
  code: string;
  context: string;
  message: string;
}

interface CopyForKind {
  icon: typeof AlertTriangle;
  title: string;
  body: string;
  /** Omitted when there is nothing useful for the user to click — a network
   *  blip has no console page that fixes it. */
  action?: { label: string; href: string };
}

/** One entry per failure kind. The whole point of this component is that these
 *  read differently: the old single banner told everyone their quota was
 *  exhausted and sent them to the billing dialog, which is the wrong diagnosis
 *  and the wrong fix for four of these five cases. */
const COPY: Record<DataIssueKind, CopyForKind> = {
  quota: {
    icon: AlertTriangle,
    title: 'Límite de cuota de Firestore superado.',
    body: 'Se han agotado las lecturas gratuitas del día. La app está mostrando un catálogo de demostración en memoria hasta que se restablezca la cuota o se habilite facturación.',
    action: {
      label: 'Habilitar facturación',
      href: `${FIREBASE_CONSOLE}/${FIRESTORE_PATH}/data?openUpgradeDialog=true`,
    },
  },
  permissions: {
    icon: ShieldAlert,
    title: 'Firestore ha denegado el acceso a los datos.',
    body: 'Las reglas de seguridad han rechazado la consulta. No es un problema de cuota: normalmente es el rol de tu usuario, los proyectos que tienes asignados, o un documento con un campo que falta y que hace fallar la evaluación de la regla para toda la colección.',
    action: {
      label: 'Revisar reglas',
      href: `${FIREBASE_CONSOLE}/${FIRESTORE_PATH}/rules`,
    },
  },
  network: {
    icon: WifiOff,
    title: 'Sin conexión con Firestore.',
    body: 'No se ha podido contactar con la base de datos. La app está mostrando datos de demostración; se reconectará automáticamente en cuanto vuelva la conexión.',
  },
  index: {
    icon: DatabaseZap,
    title: 'Falta un índice en Firestore.',
    body: 'La consulta necesita un índice compuesto que no existe todavía. El mensaje de error completo de la consola del navegador incluye un enlace directo para crearlo con un clic.',
    action: {
      label: 'Ver índices',
      href: `${FIREBASE_CONSOLE}/${FIRESTORE_PATH}/indexes`,
    },
  },
  unknown: {
    icon: HelpCircle,
    title: 'Error inesperado al cargar los datos.',
    body: 'Firestore ha devuelto un error que la app no sabe clasificar. El detalle completo está en la consola del navegador.',
  },
};

/** Replaces the previous hardcoded "quota exceeded" bar. Always surfaces the
 *  raw Firestore error code and which listener failed — those two strings are
 *  what make a report actionable, and neither was visible before. */
export default function DataIssueBanner({ issue, isDemo }: { issue: DataIssue; isDemo: boolean }) {
  const copy = COPY[issue.kind];
  const Icon = copy.icon;

  return (
    <div
      role="alert"
      className="bg-amber-500 text-amber-950 font-medium px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-600/30 text-xs shadow-md z-50"
    >
      <div className="flex items-start gap-2 min-w-0">
        <Icon size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <strong className="font-extrabold">{copy.title}</strong>{' '}
          <span>{copy.body}</span>
          <p className="mt-1 font-mono text-[11px] text-amber-950/70 break-words">
            {issue.code} · listener: {issue.context}
            {isDemo && ' · mostrando datos de demostración'}
          </p>
        </div>
      </div>
      {copy.action && (
        <a
          href={copy.action.href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 self-start sm:self-center bg-amber-950 text-white font-bold px-4 py-1.5 rounded-lg hover:bg-amber-900 transition-all text-[11px] shadow-sm uppercase tracking-wider"
        >
          {copy.action.label}
        </a>
      )}
    </div>
  );
}
